import { useState, useEffect, useRef, useCallback } from "react";

const SUPABASE_URL = "https://ruygjqgoowqvxoqxqyzq.supabase.co";
const SUPABASE_KEY = "sb_publishable_V5vOWaT5DRS3wCPk7VCGNA_K7pwvBvL";

const HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=representation",
};

const API = `${SUPABASE_URL}/rest/v1`;

const PLATFORMS = [
  { id: "shopee", label: "Shopee", color: "#EE4D2D", bg: "#FFF1EE" },
  { id: "lazada", label: "Lazada", color: "#1A56FF", bg: "#EEF2FF" },
  { id: "tiktok", label: "TikTok Shop", color: "#FE2C55", bg: "#FFF0F3" },
];

const STATUS = {
  live:    { label: "Live",     color: "#10B981", bg: "#ECFDF5" },
  pending: { label: "Pending",  color: "#F59E0B", bg: "#FFFBEB" },
  failed:  { label: "Failed",   color: "#EF4444", bg: "#FEF2F2" },
  draft:   { label: "Draft",    color: "#6B7280", bg: "#F9FAFB" },
  syncing: { label: "Syncing…", color: "#8B5CF6", bg: "#F5F3FF" },
};

const CATS = ["All","Electronics","Kitchen","Beauty","Furniture","Food","Fashion","Sports","Others"];
const EMOJIS = ["📦","🎧","🖥","👗","👟","🍜","🌹","🪵","🫙","💊","🎮","📱","🏠","🚗","⌚"];

// ── Supabase helpers ─────────────────────────────────────────
async function dbFetch(path, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: HEADERS, ...opts });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function getSkus() {
  return dbFetch("/skus?order=created_at.desc");
}

async function createSku(sku) {
  const rows = await dbFetch("/skus", {
    method: "POST",
    body: JSON.stringify(sku),
  });
  return rows[0];
}

async function updateSku(id, patch) {
  const rows = await dbFetch(`/skus?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  return rows[0];
}

async function deleteSku(id) {
  await dbFetch(`/skus?id=eq.${id}`, { method: "DELETE" });
}

async function getActivity() {
  return dbFetch("/activity_log?order=created_at.desc&limit=20");
}

async function logActivity(message) {
  await dbFetch("/activity_log", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

// ── App ──────────────────────────────────────────────────────
export default function App() {
  const [skus, setSkus] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [platFilter, setPlatFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [posting, setPosting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeNav, setActiveNav] = useState("Dashboard");

  const loadData = useCallback(async () => {
    try {
      const [s, a] = await Promise.all([getSkus(), getActivity()]);
      setSkus(s);
      setActivity(a);
      setError(null);
    } catch (e) {
      setError("Failed to connect to database. Check your Supabase config.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000);
    return () => clearInterval(iv);
  }, [loadData]);

  const filtered = skus.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.sku_code.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "All" || s.category === catFilter;
    const matchPlat = platFilter === "all" || s[`platform_${platFilter}`] !== "draft";
    return matchSearch && matchCat && matchPlat;
  });

  const totalLive = skus.reduce((a, s) =>
    a + ["shopee","lazada","tiktok"].filter(p => s[`platform_${p}`] === "live").length, 0);
  const totalFailed = skus.reduce((a, s) =>
    a + ["shopee","lazada","tiktok"].filter(p => s[`platform_${p}`] === "failed").length, 0);
  const totalSales = skus.reduce((a, s) =>
    a + (s.sales_shopee||0) + (s.sales_lazada||0) + (s.sales_tiktok||0), 0);

  const toggleSelect = id => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s,id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(s=>s.id));

  const postSingle = async (id, platId) => {
    const field = `platform_${platId}`;
    setSkus(prev => prev.map(s => s.id !== id ? s : { ...s, [field]: "syncing" }));
    await new Promise(r => setTimeout(r, 2000));
    const updated = await updateSku(id, { [field]: "live", last_sync: "Just now" });
    setSkus(prev => prev.map(s => s.id !== id ? s : { ...s, ...updated }));
    const sku = skus.find(s => s.id === id);
    const plat = PLATFORMS.find(p => p.id === platId);
    const msg = `✅ "${sku?.name?.split(" ").slice(0,3).join(" ")}" posted to ${plat?.label}`;
    await logActivity(msg);
    setActivity(a => [{ id: Date.now(), message: msg, created_at: new Date().toISOString() }, ...a.slice(0,19)]);
  };

  const bulkPost = async () => {
    if (!selected.length) return;
    setPosting(true);
    for (const id of selected) {
      for (const plat of PLATFORMS) {
        await postSingle(id, plat.id);
      }
    }
    const msg = `🚀 Bulk posted ${selected.length} SKU(s) to all platforms`;
    await logActivity(msg);
    setActivity(a => [{ id: Date.now(), message: msg, created_at: new Date().toISOString() }, ...a.slice(0,19)]);
    setSelected([]);
    setPosting(false);
  };

  const handleDelete = async id => {
    if (!confirm("Delete this SKU?")) return;
    await deleteSku(id);
    setSkus(prev => prev.filter(s => s.id !== id));
    setSelected(prev => prev.filter(x => x !== id));
    await logActivity(`🗑️ SKU deleted`);
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editItem) {
        const updated = await updateSku(editItem.id, {
          sku_code: form.sku_code, name: form.name, category: form.category,
          price: form.price, stock: form.stock, image: form.image,
        });
        setSkus(prev => prev.map(s => s.id === editItem.id ? { ...s, ...updated } : s));
        await logActivity(`✏️ SKU "${form.name.split(" ").slice(0,3).join(" ")}" updated`);
      } else {
        const newSku = await createSku({
          sku_code: form.sku_code, name: form.name, category: form.category,
          price: form.price, stock: form.stock, image: form.image,
          platform_shopee: "draft", platform_lazada: "draft", platform_tiktok: "draft",
          sales_shopee: 0, sales_lazada: 0, sales_tiktok: 0, last_sync: "Never",
        });
        setSkus(prev => [newSku, ...prev]);
        await logActivity(`➕ New SKU "${form.name.split(" ").slice(0,3).join(" ")}" added`);
      }
      await loadData();
      setShowModal(false);
    } catch(e) {
      alert("Error saving: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0B0E17", fontFamily:"'DM Sans', system-ui, sans-serif", color:"#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-track { background:#1A1F2E; }
        ::-webkit-scrollbar-thumb { background:#2D3448; border-radius:4px; }
        .btn { cursor:pointer; border:none; border-radius:8px; font-family:inherit; font-weight:600; transition:all 0.15s; }
        .btn:hover { filter:brightness(1.1); transform:translateY(-1px); }
        .btn:active { transform:translateY(0); }
        .row-hover:hover { background:#141929 !important; }
        .plat-pill { cursor:pointer; border-radius:6px; padding:3px 8px; font-size:11px; font-weight:600; border:none; transition:all 0.15s; }
        .plat-pill:hover { filter:brightness(0.9); }
        .card { background:#141929; border:1px solid #1E2440; border-radius:14px; }
        .input { background:#1A1F2E; border:1px solid #2D3448; border-radius:8px; padding:10px 14px; color:#E2E8F0; font-family:inherit; font-size:14px; outline:none; width:100%; transition:border 0.2s; }
        .input:focus { border-color:#3B82F6; }
        .checkbox { width:16px; height:16px; cursor:pointer; accent-color:#3B82F6; }
        .fade-in { animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(-4px)} to{opacity:1;transform:translateY(0)} }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>

      {/* Header */}
      <div style={{ background:"#0D1120", borderBottom:"1px solid #1E2440", padding:"0 28px", display:"flex", alignItems:"center", justifyContent:"space-between", height:60 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:34, height:34, background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🛒</div>
          <div>
            <div style={{ fontSize:15, fontWeight:700, letterSpacing:-0.3 }}>SellSync</div>
            <div style={{ fontSize:9, color:"#4B5563", letterSpacing:2, textTransform:"uppercase" }}>E-Commerce Intelligence</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"#141929", borderRadius:20, padding:"6px 12px" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 6px #10B981" }} className="pulse" />
            <span style={{ fontSize:11, color:"#10B981", fontWeight:600 }}>Supabase Live</span>
          </div>
          <button className="btn" onClick={loadData} style={{ background:"#1A1F2E", color:"#6B7280", padding:"6px 12px", fontSize:12 }}>
            ↺ Sync
          </button>
        </div>
      </div>

      <div style={{ display:"flex", height:"calc(100vh - 60px)" }}>

        {/* Sidebar */}
        <div style={{ width:220, background:"#0D1120", borderRight:"1px solid #1E2440", padding:"20px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
          {[
            { icon:"📊", label:"Dashboard" },
            { icon:"📦", label:"SKU Manager" },
            { icon:"📈", label:"Analytics" },
            { icon:"🔔", label:"Alerts" },
            { icon:"⚙️", label:"Platforms" },
          ].map(item => (
            <div key={item.label} onClick={() => setActiveNav(item.label)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 20px", cursor:"pointer",
                background:activeNav===item.label?"#141929":"transparent",
                borderLeft:activeNav===item.label?"3px solid #3B82F6":"3px solid transparent",
                color:activeNav===item.label?"#E2E8F0":"#4B5563", fontSize:13,
                fontWeight:activeNav===item.label?600:400, transition:"all 0.15s" }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>{item.label}
            </div>
          ))}
          <div style={{ flex:1 }} />
          <div style={{ padding:"16px 20px", borderTop:"1px solid #1E2440" }}>
            <div style={{ fontSize:10, color:"#4B5563", fontWeight:600, letterSpacing:1, marginBottom:6 }}>DATABASE</div>
            <div style={{ fontSize:11, color:"#10B981" }}>✓ Supabase Connected</div>
            <div style={{ fontSize:10, color:"#374151", marginTop:3 }}>{skus.length} SKUs stored</div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1, overflowY:"auto", padding:"24px 28px", display:"flex", flexDirection:"column", gap:20 }}>

          {error && (
            <div style={{ background:"#1a0d0d", border:"1px solid #EF4444", borderRadius:8, padding:"12px 16px", color:"#EF4444", fontSize:13 }}>
              ⚠️ {error}
            </div>
          )}

          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1, flexDirection:"column", gap:16 }}>
              <div style={{ fontSize:32 }} className="spin">⟳</div>
              <div style={{ color:"#4B5563", fontSize:14 }}>Loading from Supabase...</div>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
                {[
                  { label:"Total SKUs", value:skus.length, icon:"📦", color:"#3B82F6" },
                  { label:"Live Listings", value:totalLive, icon:"🟢", color:"#10B981", sub:"across all platforms" },
                  { label:"Failed Posts", value:totalFailed, icon:"🔴", color:"#EF4444", sub:"needs attention" },
                  { label:"Total Sales", value:totalSales, icon:"💰", color:"#F59E0B", sub:"units this month" },
                ].map(st => (
                  <div key={st.label} className="card" style={{ padding:"18px 20px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:10, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>{st.label}</div>
                        <div style={{ fontSize:32, fontWeight:700, color:st.color, fontFamily:"'DM Mono',monospace", letterSpacing:-1 }}>{st.value}</div>
                        {st.sub && <div style={{ fontSize:10, color:"#374151", marginTop:4 }}>{st.sub}</div>}
                      </div>
                      <span style={{ fontSize:22 }}>{st.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                <input className="input" placeholder="🔍  Search SKU name or code…" value={search} onChange={e=>setSearch(e.target.value)} style={{ maxWidth:280 }} />
                <select className="input" value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{ width:"auto" }}>
                  {CATS.map(c=><option key={c}>{c}</option>)}
                </select>
                <select className="input" value={platFilter} onChange={e=>setPlatFilter(e.target.value)} style={{ width:"auto" }}>
                  <option value="all">All Platforms</option>
                  {PLATFORMS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <div style={{ flex:1 }} />
                {selected.length > 0 && (
                  <button className="btn" onClick={bulkPost} disabled={posting}
                    style={{ background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", color:"#fff", padding:"10px 20px", fontSize:13, opacity:posting?0.7:1 }}>
                    {posting ? "⏳ Posting…" : `🚀 Post ${selected.length} SKU(s) to All`}
                  </button>
                )}
                <button className="btn" onClick={()=>{ setEditItem(null); setShowModal(true); }}
                  style={{ background:"#10B981", color:"#fff", padding:"10px 20px", fontSize:13 }}>
                  ＋ Add SKU
                </button>
              </div>

              {/* Table */}
              <div className="card" style={{ overflow:"hidden" }}>
                <div style={{ overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ borderBottom:"1px solid #1E2440", background:"#0F1523" }}>
                        <th style={{ padding:"12px 16px", width:40 }}>
                          <input type="checkbox" className="checkbox" checked={selected.length===filtered.length&&filtered.length>0} onChange={toggleAll} />
                        </th>
                        {["Product","Category","Price (RM)","Stock","Shopee","Lazada","TikTok Shop","Last Sync","Actions"].map(h=>(
                          <th key={h} style={{ padding:"12px 16px", textAlign:"left", color:"#4B5563", fontWeight:600, fontSize:11, letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(sku => (
                        <tr key={sku.id} className="row-hover fade-in"
                          style={{ borderBottom:"1px solid #141929", background:selected.includes(sku.id)?"#141D33":"transparent", transition:"background 0.15s" }}>
                          <td style={{ padding:"12px 16px" }}>
                            <input type="checkbox" className="checkbox" checked={selected.includes(sku.id)} onChange={()=>toggleSelect(sku.id)} />
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:36, height:36, background:"#1A1F2E", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{sku.image}</div>
                              <div>
                                <div style={{ fontWeight:600, color:"#E2E8F0", fontSize:13 }}>{sku.name}</div>
                                <div style={{ color:"#4B5563", fontSize:11, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{sku.sku_code}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px" }}>
                            <span style={{ background:"#1A1F2E", borderRadius:6, padding:"2px 8px", fontSize:11, color:"#6B7280" }}>{sku.category}</span>
                          </td>
                          <td style={{ padding:"12px 16px", fontFamily:"'DM Mono',monospace", color:"#10B981", fontWeight:600 }}>
                            {Number(sku.price).toFixed(2)}
                          </td>
                          <td style={{ padding:"12px 16px", fontFamily:"'DM Mono',monospace", color:sku.stock < 30 ? "#EF4444" : "#E2E8F0" }}>
                            {sku.stock < 30 && "⚠️ "}{sku.stock}
                          </td>
                          {PLATFORMS.map(plat => {
                            const st = sku[`platform_${plat.id}`] || "draft";
                            const cfg = STATUS[st] || STATUS.draft;
                            const sales = sku[`sales_${plat.id}`] || 0;
                            return (
                              <td key={plat.id} style={{ padding:"12px 16px" }}>
                                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                  <button className="plat-pill"
                                    style={{ background:cfg.bg, color:cfg.color, display:"flex", alignItems:"center", gap:4, width:"fit-content" }}
                                    onClick={()=>{ if(st==="draft"||st==="failed") postSingle(sku.id, plat.id); }}
                                    title={st==="draft"||st==="failed"?"Click to post":""}>
                                    {st==="syncing" && <span className="pulse">⟳</span>}
                                    {cfg.label}
                                    {(st==="draft"||st==="failed") && <span style={{ fontSize:9 }}>↑</span>}
                                  </button>
                                  {sales > 0 && <span style={{ fontSize:10, color:"#4B5563", fontFamily:"'DM Mono',monospace" }}>{sales} sold</span>}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ padding:"12px 16px", color:"#4B5563", fontSize:11, whiteSpace:"nowrap" }}>{sku.last_sync}</td>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button className="btn" onClick={()=>{ setEditItem(sku); setShowModal(true); }}
                                style={{ background:"#1A1F2E", color:"#6B7280", padding:"6px 10px", fontSize:12 }}>✏️</button>
                              <button className="btn" onClick={()=>PLATFORMS.forEach(p=>postSingle(sku.id, p.id))}
                                style={{ background:"#1E3A5F", color:"#3B82F6", padding:"6px 10px", fontSize:12 }}>🔄</button>
                              <button className="btn" onClick={()=>handleDelete(sku.id)}
                                style={{ background:"#2D1B1B", color:"#EF4444", padding:"6px 10px", fontSize:12 }}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && (
                        <tr><td colSpan={10} style={{ padding:"40px", textAlign:"center", color:"#374151" }}>
                          {skus.length === 0 ? "No SKUs yet. Click '+ Add SKU' to get started." : "No SKUs match your filters."}
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Activity Feed */}
        <div style={{ width:260, background:"#0D1120", borderLeft:"1px solid #1E2440", padding:20, display:"flex", flexDirection:"column", gap:12, flexShrink:0 }}>
          <div>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#4B5563", textTransform:"uppercase", marginBottom:10 }}>Live Activity</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 6px #10B981" }} className="pulse" />
              <span style={{ fontSize:11, color:"#10B981" }}>Synced from Supabase</span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, overflowY:"auto", flex:1 }}>
            {activity.map((a,i) => (
              <div key={a.id||i} className="fade-in" style={{ background:"#141929", borderRadius:8, padding:"10px 12px", borderLeft:"2px solid #1E3A5F" }}>
                <div style={{ fontSize:12, color:"#CBD5E1", lineHeight:1.5 }}>{a.message}</div>
                <div style={{ fontSize:10, color:"#374151", marginTop:4 }}>
                  {new Date(a.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <div style={{ color:"#374151", fontSize:12 }}>No activity yet.</div>
            )}
          </div>

          {/* Platform Sales */}
          <div style={{ paddingTop:16, borderTop:"1px solid #1E2440" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#4B5563", textTransform:"uppercase", marginBottom:10 }}>Sales This Month</div>
            {PLATFORMS.map(p => {
              const total = skus.reduce((acc,s) => acc + (s[`sales_${p.id}`]||0), 0);
              const max = Math.max(...PLATFORMS.map(pl => skus.reduce((a,s) => a+(s[`sales_${pl.id}`]||0),0)), 1);
              return (
                <div key={p.id} style={{ marginBottom:10 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontSize:12, color:"#6B7280" }}>{p.label}</span>
                    <span style={{ fontSize:12, fontFamily:"'DM Mono',monospace", color:p.color }}>{total}</span>
                  </div>
                  <div style={{ height:4, background:"#1E2440", borderRadius:4, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(total/max)*100}%`, background:p.color, borderRadius:4, transition:"width 0.5s" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowModal(false); }}>
          <div className="card fade-in" style={{ width:520, maxHeight:"90vh", overflowY:"auto", padding:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700 }}>{editItem ? "Edit SKU" : "Add New SKU"}</div>
                <div style={{ fontSize:12, color:"#4B5563", marginTop:2 }}>Saved directly to Supabase database</div>
              </div>
              <button className="btn" onClick={()=>setShowModal(false)} style={{ background:"#1A1F2E", color:"#6B7280", padding:"6px 12px", fontSize:16 }}>✕</button>
            </div>
            <SKUForm initial={editItem} saving={saving} onSave={handleSave} />
          </div>
        </div>
      )}
    </div>
  );
}

function SKUForm({ initial, onSave, saving }) {
  const [form, setForm] = useState({
    sku_code: initial?.sku_code || `SKU-${Math.floor(Math.random()*900)+100}`,
    name: initial?.name || "",
    category: initial?.category || "Electronics",
    price: initial?.price || "",
    stock: initial?.stock || "",
    image: initial?.image || "📦",
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Product Icon</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {EMOJIS.map(e=>(
            <button key={e} onClick={()=>set("image",e)}
              style={{ width:36, height:36, background:form.image===e?"#1E3A5F":"#1A1F2E",
                border:form.image===e?"2px solid #3B82F6":"2px solid transparent",
                borderRadius:8, fontSize:18, cursor:"pointer" }}>{e}</button>
          ))}
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div>
          <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>SKU Code</label>
          <input className="input" value={form.sku_code} onChange={e=>set("sku_code",e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Category</label>
          <select className="input" value={form.category} onChange={e=>set("category",e.target.value)}>
            {["Electronics","Kitchen","Beauty","Furniture","Food","Fashion","Sports","Others"].map(c=><option key={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Product Name</label>
        <input className="input" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Premium Wireless Earbuds Pro" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        <div>
          <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Price (RM)</label>
          <input className="input" type="number" value={form.price} onChange={e=>set("price",parseFloat(e.target.value))} placeholder="0.00" />
        </div>
        <div>
          <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Stock Qty</label>
          <input className="input" type="number" value={form.stock} onChange={e=>set("stock",parseInt(e.target.value))} placeholder="0" />
        </div>
      </div>
      <button className="btn" onClick={()=>onSave(form)} disabled={saving}
        style={{ background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", color:"#fff", padding:"12px 0", fontSize:14, opacity:saving?0.7:1 }}>
        {saving ? "⏳ Saving to Supabase..." : editItem ? "💾 Save Changes" : "➕ Add SKU"}
      </button>
    </div>
  );
}
