import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://ruygjqgoowqvxoqxqyzq.supabase.co";
const SUPABASE_KEY = "sb_publishable_V5vOWaT5DRS3wCPk7VCGNA_K7pwvBvL";
const DEDE_URL = "https://selfsync-agent-production.up.railway.app";
const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
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

// ── Auth helpers ─────────────────────────────────────────────
async function signIn(email, password) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Login failed");
  return data;
}

async function signUp(email, password) {
  const res = await fetch(`${AUTH_URL}/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || "Signup failed");
  return data;
}

async function signOut(token) {
  await fetch(`${AUTH_URL}/logout`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${token}` },
  });
}

async function refreshToken(refresh) {
  const res = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error("Session expired");
  return data;
}

// ── DB helpers ───────────────────────────────────────────────
function makeHeaders(token) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

async function dbFetch(path, token, opts = {}) {
  const res = await fetch(`${API}${path}`, { headers: makeHeaders(token), ...opts });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

// ── Main App ─────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("sb_session");
    if (stored) {
      try {
        const s = JSON.parse(stored);
        setSession(s);
      } catch {}
    }
    setLoading(false);
  }, []);

  const handleSignIn = async (email, password) => {
    const data = await signIn(email, password);
    const s = { access_token: data.access_token, refresh_token: data.refresh_token, user: data.user };
    localStorage.setItem("sb_session", JSON.stringify(s));
    setSession(s);
  };

  const handleSignUp = async (email, password) => {
    await signUp(email, password);
    await handleSignIn(email, password);
  };

  const handleSignOut = async () => {
    if (session) await signOut(session.access_token).catch(() => {});
    localStorage.removeItem("sb_session");
    setSession(null);
  };

  if (loading) {
    return (
      <div style={{ minHeight:"100vh", background:"#0B0E17", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:"#4B5563", fontSize:14 }}>Loading...</div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage onSignIn={handleSignIn} onSignUp={handleSignUp} />;
  }

  return <Dashboard session={session} onSignOut={handleSignOut} />;
}

// ── Auth Page ────────────────────────────────────────────────
function AuthPage({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email || !password) return setError("Please fill in all fields");
    setLoading(true); setError("");
    try {
      if (mode === "login") await onSignIn(email, password);
      else await onSignUp(email, password);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:"100vh", background:"#0B0E17", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',system-ui,sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        .btn{cursor:pointer;border:none;border-radius:8px;font-family:inherit;font-weight:600;transition:all 0.15s}
        .btn:hover{filter:brightness(1.1)}
        .input{background:#1A1F2E;border:1px solid #2D3448;border-radius:8px;padding:12px 16px;color:#E2E8F0;font-family:inherit;font-size:14px;outline:none;width:100%;transition:border 0.2s}
        .input:focus{border-color:#3B82F6}
      `}</style>

      <div style={{ width:"100%", maxWidth:420, padding:"0 24px" }}>
        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ width:56, height:56, background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28, margin:"0 auto 16px" }}>🛒</div>
          <div style={{ fontSize:26, fontWeight:700, color:"#E2E8F0", letterSpacing:-0.5 }}>SellSync</div>
          <div style={{ fontSize:12, color:"#4B5563", letterSpacing:2, textTransform:"uppercase", marginTop:4 }}>E-Commerce Intelligence</div>
        </div>

        {/* Card */}
        <div style={{ background:"#141929", border:"1px solid #1E2440", borderRadius:16, padding:32 }}>
          {/* Tabs */}
          <div style={{ display:"flex", marginBottom:28, background:"#0D1120", borderRadius:10, padding:4 }}>
            {["login","signup"].map(m=>(
              <button key={m} className="btn" onClick={()=>{ setMode(m); setError(""); }}
                style={{ flex:1, padding:"8px 0", fontSize:13, background:mode===m?"linear-gradient(135deg,#3B82F6,#8B5CF6)":"transparent", color:mode===m?"#fff":"#4B5563" }}>
                {m==="login"?"Sign In":"Create Account"}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background:"#1a0d0d", border:"1px solid #EF4444", borderRadius:8, padding:"10px 14px", color:"#EF4444", fontSize:13, marginBottom:20 }}>
              ⚠️ {error}
            </div>
          )}

          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:8 }}>Email</label>
              <input className="input" type="email" value={email} onChange={e=>setEmail(e.target.value)}
                placeholder="seller@example.com" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
            </div>
            <div>
              <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:8 }}>Password</label>
              <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&handleSubmit()} />
            </div>
            <button className="btn" onClick={handleSubmit} disabled={loading}
              style={{ background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", color:"#fff", padding:"14px 0", fontSize:14, marginTop:8, opacity:loading?0.7:1 }}>
              {loading ? "⏳ Please wait..." : mode==="login" ? "Sign In →" : "Create Account →"}
            </button>
          </div>

          {mode==="login" && (
            <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#4B5563" }}>
              Don't have an account?{" "}
              <span style={{ color:"#3B82F6", cursor:"pointer" }} onClick={()=>setMode("signup")}>Sign up free</span>
            </div>
          )}
          {mode==="signup" && (
            <div style={{ textAlign:"center", marginTop:20, fontSize:13, color:"#4B5563" }}>
              Already have an account?{" "}
              <span style={{ color:"#3B82F6", cursor:"pointer" }} onClick={()=>setMode("login")}>Sign in</span>
            </div>
          )}
        </div>

        <div style={{ textAlign:"center", marginTop:24, fontSize:11, color:"#374151" }}>
          Powered by Dede AI · Built for Malaysian E-Commerce Sellers
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────
function Dashboard({ session, onSignOut }) {
  const token = session.access_token;
  const userId = session.user?.id;

  const [activeNav, setActiveNav] = useState("Dashboard");
  const [skus, setSkus] = useState([]);
  const [activity, setActivity] = useState([]);
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("All");
  const [platFilter, setPlatFilter] = useState("all");
  const [showSkuModal, setShowSkuModal] = useState(false);
  const [showCompModal, setShowCompModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [posting, setPosting] = useState(false);
  const [scanning, setScanning] = useState({});
  const [selectedComp, setSelectedComp] = useState(null);
  const [compProducts, setCompProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  const db = useCallback((path, opts) => dbFetch(path, token, opts), [token]);

  const loadData = useCallback(async () => {
    try {
      const [s, a, c] = await Promise.all([
        db("/skus?order=created_at.desc"),
        db("/activity_log?order=created_at.desc&limit=20"),
        db("/competitors?order=created_at.desc"),
      ]);
      setSkus(s); setActivity(a); setCompetitors(c); setError(null);
    } catch(e) { setError("Failed to load data: " + e.message); }
    finally { setLoading(false); }
  }, [db]);

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000);
    return () => clearInterval(iv);
  }, [loadData]);

  const log = async (message) => {
    await db("/activity_log", { method:"POST", body: JSON.stringify({ message, user_id: userId }) }).catch(()=>{});
    setActivity(a => [{ id: Date.now(), message, created_at: new Date().toISOString() }, ...a.slice(0,19)]);
  };

  // SKU operations
  const createSku = async (sku) => {
    const rows = await db("/skus", { method:"POST", body: JSON.stringify({ ...sku, user_id: userId }) });
    return rows[0];
  };
  const updateSku = async (id, patch) => {
    const rows = await db(`/skus?id=eq.${id}`, { method:"PATCH", body: JSON.stringify(patch) });
    return rows[0];
  };
  const deleteSku = async (id) => db(`/skus?id=eq.${id}`, { method:"DELETE" });

  // Competitor operations
  const addCompetitor = async (data) => {
    const rows = await db("/competitors", { method:"POST", body: JSON.stringify({ ...data, user_id: userId }) });
    return rows[0];
  };
  const deleteCompetitor = async (id) => db(`/competitors?id=eq.${id}`, { method:"DELETE" });
  const loadCompProducts = async (comp) => {
    setSelectedComp(comp); setLoadingProducts(true); setCompProducts([]); setScanResult(null);
    try { setCompProducts(await db(`/competitor_products?competitor_id=eq.${comp.id}&order=checked_at.desc&limit=30`)); }
    catch(e) { console.error(e); }
    finally { setLoadingProducts(false); }
  };

  const handleScan = async (comp) => {
    setScanning(s => ({ ...s, [comp.id]: true })); setScanResult(null);
    try {
      const res = await fetch(`${DEDE_URL}/analyze-competitor`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ url: comp.url })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      if (data.products.length) {
        await db("/competitor_products", { method:"POST", body: JSON.stringify(
          data.products.map(p => ({ competitor_id: comp.id, product_name: p.name, price: p.price, original_price: p.original_price, discount_pct: p.discount_pct, rating: p.rating, sold_count: p.sold_count, screenshot_url: data.screenshotUrl, raw_data: p }))
        )});
      }
      await db(`/competitors?id=eq.${comp.id}`, { method:"PATCH", body: JSON.stringify({ last_checked: new Date().toISOString() }) });
      await log(`🔍 Scanned "${comp.name}" — ${data.products.length} products found`);
      setScanResult({ ...data, competitorName: comp.name });
      if (selectedComp?.id === comp.id) setCompProducts(await db(`/competitor_products?competitor_id=eq.${comp.id}&order=checked_at.desc&limit=30`));
      await loadData();
    } catch(e) { alert("Scan failed: " + e.message); }
    finally { setScanning(s => ({ ...s, [comp.id]: false })); }
  };

  const postSingle = async (id, platId) => {
    const field = `platform_${platId}`;
    setSkus(prev => prev.map(s => s.id!==id?s:{...s,[field]:"syncing"}));
    await new Promise(r => setTimeout(r,2000));
    const updated = await updateSku(id, { [field]:"live", last_sync:"Just now" });
    setSkus(prev => prev.map(s => s.id!==id?s:{...s,...updated}));
    const sku = skus.find(s=>s.id===id);
    const plat = PLATFORMS.find(p=>p.id===platId);
    await log(`✅ "${sku?.name?.split(" ").slice(0,3).join(" ")}" posted to ${plat?.label}`);
  };

  const handleSaveSku = async (form) => {
    setSaving(true);
    try {
      if (editItem) {
        const updated = await updateSku(editItem.id, { sku_code:form.sku_code, name:form.name, category:form.category, price:form.price, stock:form.stock, image:form.image });
        setSkus(prev=>prev.map(s=>s.id===editItem.id?{...s,...updated}:s));
        await log(`✏️ Updated "${form.name.split(" ").slice(0,3).join(" ")}"`);
      } else {
        const newSku = await createSku({ sku_code:form.sku_code, name:form.name, category:form.category, price:form.price, stock:form.stock, image:form.image, platform_shopee:"draft", platform_lazada:"draft", platform_tiktok:"draft", sales_shopee:0, sales_lazada:0, sales_tiktok:0, last_sync:"Never" });
        setSkus(prev=>[newSku,...prev]);
        await log(`➕ Added "${form.name.split(" ").slice(0,3).join(" ")}"`);
      }
      setShowSkuModal(false);
    } catch(e) { alert("Error: "+e.message); }
    finally { setSaving(false); }
  };

  const filtered = skus.filter(s => {
    const ms = s.name.toLowerCase().includes(search.toLowerCase()) || s.sku_code.toLowerCase().includes(search.toLowerCase());
    const mc = catFilter==="All" || s.category===catFilter;
    const mp = platFilter==="all" || s[`platform_${platFilter}`]!=="draft";
    return ms && mc && mp;
  });

  const totalLive = skus.reduce((a,s) => a + ["shopee","lazada","tiktok"].filter(p=>s[`platform_${p}`]==="live").length, 0);
  const totalFailed = skus.reduce((a,s) => a + ["shopee","lazada","tiktok"].filter(p=>s[`platform_${p}`]==="failed").length, 0);
  const totalSales = skus.reduce((a,s) => a + (s.sales_shopee||0) + (s.sales_lazada||0) + (s.sales_tiktok||0), 0);
  const toggleSelect = id => setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);
  const toggleAll = () => setSelected(selected.length===filtered.length?[]:filtered.map(s=>s.id));

  const NAV = [
    { icon:"📊", label:"Dashboard" },
    { icon:"📦", label:"SKU Manager" },
    { icon:"🔍", label:"Competitors", badge: competitors.length },
    { icon:"📈", label:"Analytics" },
    { icon:"🔔", label:"Alerts" },
    { icon:"⚙️", label:"Platforms" },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#0B0E17", fontFamily:"'DM Sans',system-ui,sans-serif", color:"#E2E8F0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:#1A1F2E}
        ::-webkit-scrollbar-thumb{background:#2D3448;border-radius:4px}
        .btn{cursor:pointer;border:none;border-radius:8px;font-family:inherit;font-weight:600;transition:all 0.15s}
        .btn:hover{filter:brightness(1.1);transform:translateY(-1px)}
        .btn:active{transform:translateY(0)}
        .row-hover:hover{background:#141929!important}
        .plat-pill{cursor:pointer;border-radius:6px;padding:3px 8px;font-size:11px;font-weight:600;border:none;transition:all 0.15s}
        .card{background:#141929;border:1px solid #1E2440;border-radius:14px}
        .input{background:#1A1F2E;border:1px solid #2D3448;border-radius:8px;padding:10px 14px;color:#E2E8F0;font-family:inherit;font-size:14px;outline:none;width:100%;transition:border 0.2s}
        .input:focus{border-color:#3B82F6}
        .checkbox{width:16px;height:16px;cursor:pointer;accent-color:#3B82F6}
        .fade-in{animation:fadeIn 0.3s ease}
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        .pulse{animation:pulse 2s infinite}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .spin{animation:spin 1s linear infinite;display:inline-block}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
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
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ fontSize:12, color:"#4B5563" }}>👤 {session.user?.email}</div>
          <div style={{ display:"flex", alignItems:"center", gap:6, background:"#141929", borderRadius:20, padding:"6px 12px" }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", boxShadow:"0 0 6px #10B981" }} className="pulse" />
            <span style={{ fontSize:11, color:"#10B981", fontWeight:600 }}>Live</span>
          </div>
          <button className="btn" onClick={loadData} style={{ background:"#1A1F2E", color:"#6B7280", padding:"6px 12px", fontSize:12 }}>↺</button>
          <button className="btn" onClick={onSignOut} style={{ background:"#2D1B1B", color:"#EF4444", padding:"6px 14px", fontSize:12 }}>Sign Out</button>
        </div>
      </div>

      <div style={{ display:"flex", height:"calc(100vh - 60px)" }}>
        {/* Sidebar */}
        <div style={{ width:220, background:"#0D1120", borderRight:"1px solid #1E2440", padding:"20px 0", display:"flex", flexDirection:"column", flexShrink:0 }}>
          {NAV.map(item=>(
            <div key={item.label} onClick={()=>setActiveNav(item.label)}
              style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 20px", cursor:"pointer",
                background:activeNav===item.label?"#141929":"transparent",
                borderLeft:activeNav===item.label?"3px solid #3B82F6":"3px solid transparent",
                color:activeNav===item.label?"#E2E8F0":"#4B5563", fontSize:13, fontWeight:activeNav===item.label?600:400 }}>
              <span style={{ fontSize:15 }}>{item.icon}</span>
              {item.label}
              {item.badge>0&&<span style={{ marginLeft:"auto", background:"#1E3A5F", color:"#3B82F6", borderRadius:10, padding:"1px 7px", fontSize:10, fontWeight:700 }}>{item.badge}</span>}
            </div>
          ))}
          <div style={{ flex:1 }} />
          <div style={{ padding:"16px 20px", borderTop:"1px solid #1E2440" }}>
            <div style={{ fontSize:10, color:"#4B5563", fontWeight:600, letterSpacing:1, marginBottom:4 }}>ACCOUNT</div>
            <div style={{ fontSize:11, color:"#10B981" }}>✓ Authenticated</div>
            <div style={{ fontSize:10, color:"#374151", marginTop:2, wordBreak:"break-all" }}>{session.user?.email}</div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1, overflowY:"auto", padding:"24px 28px", display:"flex", flexDirection:"column", gap:20 }}>
          {error&&<div style={{ background:"#1a0d0d", border:"1px solid #EF4444", borderRadius:8, padding:"12px 16px", color:"#EF4444", fontSize:13 }}>⚠️ {error}</div>}

          {loading ? (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", flex:1, flexDirection:"column", gap:16 }}>
              <span className="spin" style={{ fontSize:32 }}>⟳</span>
              <div style={{ color:"#4B5563", fontSize:14 }}>Loading your data...</div>
            </div>
          ) : activeNav==="Competitors" ? (
            <CompetitorsView competitors={competitors} selectedComp={selectedComp} compProducts={compProducts}
              loadingProducts={loadingProducts} scanning={scanning} scanResult={scanResult}
              onScan={handleScan} onSelect={loadCompProducts}
              onDelete={async id=>{ if(!confirm("Remove competitor?")) return; await deleteCompetitor(id); if(selectedComp?.id===id){setSelectedComp(null);setCompProducts([]);} await loadData(); }}
              onAdd={()=>setShowCompModal(true)} skus={skus} />
          ) : (
            <>
              {/* Stats */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 }}>
                {[
                  { label:"Total SKUs", value:skus.length, icon:"📦", color:"#3B82F6" },
                  { label:"Live Listings", value:totalLive, icon:"🟢", color:"#10B981", sub:"across all platforms" },
                  { label:"Failed Posts", value:totalFailed, icon:"🔴", color:"#EF4444", sub:"needs attention" },
                  { label:"Total Sales", value:totalSales, icon:"💰", color:"#F59E0B", sub:"units this month" },
                ].map(st=>(
                  <div key={st.label} className="card" style={{ padding:"18px 20px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                      <div>
                        <div style={{ fontSize:10, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>{st.label}</div>
                        <div style={{ fontSize:32, fontWeight:700, color:st.color, fontFamily:"'DM Mono',monospace", letterSpacing:-1 }}>{st.value}</div>
                        {st.sub&&<div style={{ fontSize:10, color:"#374151", marginTop:4 }}>{st.sub}</div>}
                      </div>
                      <span style={{ fontSize:22 }}>{st.icon}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Controls */}
              <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap" }}>
                <input className="input" placeholder="🔍  Search SKU..." value={search} onChange={e=>setSearch(e.target.value)} style={{ maxWidth:280 }} />
                <select className="input" value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{ width:"auto" }}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
                <select className="input" value={platFilter} onChange={e=>setPlatFilter(e.target.value)} style={{ width:"auto" }}>
                  <option value="all">All Platforms</option>
                  {PLATFORMS.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
                <div style={{ flex:1 }} />
                {selected.length>0&&(
                  <button className="btn" disabled={posting}
                    onClick={async()=>{ setPosting(true); for(const id of selected) for(const p of PLATFORMS) await postSingle(id,p.id); setSelected([]); setPosting(false); }}
                    style={{ background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", color:"#fff", padding:"10px 20px", fontSize:13, opacity:posting?0.7:1 }}>
                    {posting?"⏳ Posting…":`🚀 Post ${selected.length} to All`}
                  </button>
                )}
                <button className="btn" onClick={()=>{ setEditItem(null); setShowSkuModal(true); }} style={{ background:"#10B981", color:"#fff", padding:"10px 20px", fontSize:13 }}>＋ Add SKU</button>
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
                      {filtered.map(sku=>(
                        <tr key={sku.id} className="row-hover fade-in" style={{ borderBottom:"1px solid #141929", background:selected.includes(sku.id)?"#141D33":"transparent" }}>
                          <td style={{ padding:"12px 16px" }}><input type="checkbox" className="checkbox" checked={selected.includes(sku.id)} onChange={()=>toggleSelect(sku.id)} /></td>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                              <div style={{ width:36, height:36, background:"#1A1F2E", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{sku.image}</div>
                              <div>
                                <div style={{ fontWeight:600, color:"#E2E8F0", fontSize:13 }}>{sku.name}</div>
                                <div style={{ color:"#4B5563", fontSize:11, fontFamily:"'DM Mono',monospace", marginTop:2 }}>{sku.sku_code}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding:"12px 16px" }}><span style={{ background:"#1A1F2E", borderRadius:6, padding:"2px 8px", fontSize:11, color:"#6B7280" }}>{sku.category}</span></td>
                          <td style={{ padding:"12px 16px", fontFamily:"'DM Mono',monospace", color:"#10B981", fontWeight:600 }}>{Number(sku.price).toFixed(2)}</td>
                          <td style={{ padding:"12px 16px", fontFamily:"'DM Mono',monospace", color:sku.stock<30?"#EF4444":"#E2E8F0" }}>{sku.stock<30&&"⚠️ "}{sku.stock}</td>
                          {PLATFORMS.map(plat=>{
                            const st=sku[`platform_${plat.id}`]||"draft";
                            const cfg=STATUS[st]||STATUS.draft;
                            const sales=sku[`sales_${plat.id}`]||0;
                            return (
                              <td key={plat.id} style={{ padding:"12px 16px" }}>
                                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                  <button className="plat-pill" style={{ background:cfg.bg, color:cfg.color, display:"flex", alignItems:"center", gap:4, width:"fit-content" }}
                                    onClick={()=>{ if(st==="draft"||st==="failed") postSingle(sku.id,plat.id); }}>
                                    {st==="syncing"&&<span className="pulse">⟳</span>}{cfg.label}
                                    {(st==="draft"||st==="failed")&&<span style={{ fontSize:9 }}>↑</span>}
                                  </button>
                                  {sales>0&&<span style={{ fontSize:10, color:"#4B5563", fontFamily:"'DM Mono',monospace" }}>{sales} sold</span>}
                                </div>
                              </td>
                            );
                          })}
                          <td style={{ padding:"12px 16px", color:"#4B5563", fontSize:11, whiteSpace:"nowrap" }}>{sku.last_sync}</td>
                          <td style={{ padding:"12px 16px" }}>
                            <div style={{ display:"flex", gap:6 }}>
                              <button className="btn" onClick={()=>{ setEditItem(sku); setShowSkuModal(true); }} style={{ background:"#1A1F2E", color:"#6B7280", padding:"6px 10px", fontSize:12 }}>✏️</button>
                              <button className="btn" onClick={()=>PLATFORMS.forEach(p=>postSingle(sku.id,p.id))} style={{ background:"#1E3A5F", color:"#3B82F6", padding:"6px 10px", fontSize:12 }}>🔄</button>
                              <button className="btn" onClick={async()=>{ if(!confirm("Delete?")) return; await deleteSku(sku.id); setSkus(prev=>prev.filter(s=>s.id!==sku.id)); }} style={{ background:"#2D1B1B", color:"#EF4444", padding:"6px 10px", fontSize:12 }}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filtered.length===0&&<tr><td colSpan={10} style={{ padding:"40px", textAlign:"center", color:"#374151" }}>{skus.length===0?"No SKUs yet. Click '+ Add SKU' to get started.":"No SKUs match your filters."}</td></tr>}
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
              <span style={{ fontSize:11, color:"#10B981" }}>Your account</span>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:8, overflowY:"auto", flex:1 }}>
            {activity.map((a,i)=>(
              <div key={a.id||i} className="fade-in" style={{ background:"#141929", borderRadius:8, padding:"10px 12px", borderLeft:"2px solid #1E3A5F" }}>
                <div style={{ fontSize:12, color:"#CBD5E1", lineHeight:1.5 }}>{a.message}</div>
                <div style={{ fontSize:10, color:"#374151", marginTop:4 }}>{new Date(a.created_at).toLocaleTimeString()}</div>
              </div>
            ))}
            {activity.length===0&&<div style={{ color:"#374151", fontSize:12 }}>No activity yet.</div>}
          </div>
          <div style={{ paddingTop:16, borderTop:"1px solid #1E2440" }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#4B5563", textTransform:"uppercase", marginBottom:10 }}>Sales This Month</div>
            {PLATFORMS.map(p=>{
              const total=skus.reduce((acc,s)=>acc+(s[`sales_${p.id}`]||0),0);
              const max=Math.max(...PLATFORMS.map(pl=>skus.reduce((a,s)=>a+(s[`sales_${pl.id}`]||0),0)),1);
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

      {/* SKU Modal */}
      {showSkuModal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowSkuModal(false); }}>
          <div className="card fade-in" style={{ width:520, maxHeight:"90vh", overflowY:"auto", padding:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700 }}>{editItem?"Edit SKU":"Add New SKU"}</div>
                <div style={{ fontSize:12, color:"#4B5563", marginTop:2 }}>Saved to your account</div>
              </div>
              <button className="btn" onClick={()=>setShowSkuModal(false)} style={{ background:"#1A1F2E", color:"#6B7280", padding:"6px 12px", fontSize:16 }}>✕</button>
            </div>
            <SKUForm initial={editItem} saving={saving} onSave={handleSaveSku} />
          </div>
        </div>
      )}

      {/* Competitor Modal */}
      {showCompModal&&(
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100 }}
          onClick={e=>{ if(e.target===e.currentTarget) setShowCompModal(false); }}>
          <div className="card fade-in" style={{ width:500, padding:28 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:700 }}>Add Competitor</div>
                <div style={{ fontSize:12, color:"#4B5563", marginTop:2 }}>Dede will monitor this store for you</div>
              </div>
              <button className="btn" onClick={()=>setShowCompModal(false)} style={{ background:"#1A1F2E", color:"#6B7280", padding:"6px 12px", fontSize:16 }}>✕</button>
            </div>
            <CompetitorForm saving={saving} onSave={async(form)=>{ setSaving(true); try{ await addCompetitor(form); await log(`➕ Competitor "${form.name}" added`); await loadData(); setShowCompModal(false); }catch(e){alert("Error: "+e.message);}finally{setSaving(false);} }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Competitors View ─────────────────────────────────────────
function CompetitorsView({ competitors, selectedComp, compProducts, loadingProducts, scanning, scanResult, onScan, onSelect, onDelete, onAdd, skus }) {
  const avgOurPrice = skus.length ? skus.reduce((a,s)=>a+Number(s.price),0)/skus.length : 0;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h2 style={{ fontSize:22, fontWeight:700, letterSpacing:-0.5 }}>🔍 Competitor Monitor</h2>
          <p style={{ color:"#4B5563", fontSize:13, marginTop:4 }}>Dede scans competitor stores and extracts pricing intelligence</p>
        </div>
        <button className="btn" onClick={onAdd} style={{ background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", color:"#fff", padding:"10px 20px", fontSize:13 }}>＋ Add Competitor</button>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
        {competitors.map(comp=>(
          <div key={comp.id} className="card" onClick={()=>onSelect(comp)}
            style={{ padding:18, cursor:"pointer", border:selectedComp?.id===comp.id?"1px solid #3B82F6":"1px solid #1E2440" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:"#E2E8F0", marginBottom:4 }}>{comp.name}</div>
                <div style={{ display:"flex", gap:8 }}>
                  <span style={{ fontSize:11, background:"#1A1F2E", color:"#6B7280", borderRadius:6, padding:"2px 8px" }}>{comp.platform}</span>
                  <span style={{ fontSize:10, color:"#10B981" }}>● active</span>
                </div>
              </div>
              <button className="btn" onClick={e=>{ e.stopPropagation(); onDelete(comp.id); }} style={{ background:"#2D1B1B", color:"#EF4444", padding:"4px 8px", fontSize:11 }}>🗑</button>
            </div>
            <div style={{ fontSize:11, color:"#374151", marginBottom:12, wordBreak:"break-all", lineHeight:1.4 }}>🔗 {comp.url.length>60?comp.url.slice(0,60)+"...":comp.url}</div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:10, color:"#4B5563" }}>{comp.last_checked?`Scanned: ${new Date(comp.last_checked).toLocaleString()}`:"Never scanned"}</span>
              <button className="btn" onClick={e=>{ e.stopPropagation(); onScan(comp); }} disabled={scanning[comp.id]}
                style={{ background:scanning[comp.id]?"#1A1F2E":"#0D2D0D", color:scanning[comp.id]?"#6B7280":"#10B981", border:"1px solid", borderColor:scanning[comp.id]?"#2D3448":"#10B981", padding:"6px 14px", fontSize:12 }}>
                {scanning[comp.id]?<><span className="spin">⟳</span> Scanning…</>:"▶ Scan Now"}
              </button>
            </div>
          </div>
        ))}
        {competitors.length===0&&(
          <div style={{ gridColumn:"1/-1", textAlign:"center", padding:"60px", color:"#374151" }}>
            <div style={{ fontSize:40, marginBottom:16 }}>🔍</div>
            <div style={{ fontSize:16, fontWeight:600, color:"#4B5563", marginBottom:8 }}>No Competitors Monitored Yet</div>
            <div style={{ fontSize:13 }}>Click "＋ Add Competitor" to start monitoring</div>
          </div>
        )}
      </div>

      {scanResult&&(
        <div className="fade-in" style={{ background:"#0D2D0D", border:"1px solid #10B981", borderRadius:10, padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ color:"#10B981", fontWeight:700, fontSize:14, marginBottom:4 }}>✅ Scan Complete — {scanResult.competitorName}</div>
            <div style={{ color:"#6B7280", fontSize:12 }}>{scanResult.products?.length||0} products extracted · {new Date(scanResult.scanned_at).toLocaleTimeString()}</div>
          </div>
          <a href={scanResult.screenshotUrl} target="_blank" rel="noopener noreferrer"
            style={{ color:"#3B82F6", fontSize:12, textDecoration:"none", background:"#1E3A5F", padding:"8px 14px", borderRadius:8 }}>
            🖼️ View Screenshot
          </a>
        </div>
      )}

      {selectedComp&&(
        <div className="card" style={{ overflow:"hidden" }}>
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #1E2440", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:15, fontWeight:700 }}>{selectedComp.name}</div>
              <div style={{ fontSize:11, color:"#4B5563", marginTop:2 }}>{compProducts.length} products · Click "▶ Scan Now" to refresh</div>
            </div>
            {avgOurPrice>0&&<div style={{ fontSize:12, color:"#4B5563" }}>Our avg: <span style={{ color:"#10B981", fontWeight:700, fontFamily:"'DM Mono',monospace" }}>RM {avgOurPrice.toFixed(2)}</span></div>}
          </div>
          {loadingProducts?(
            <div style={{ padding:"40px", textAlign:"center", color:"#4B5563" }}><span className="spin">⟳</span> Loading...</div>
          ):(
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#0F1523", borderBottom:"1px solid #1E2440" }}>
                    {["#","Product","Price","Original","Discount","Rating","Sold","vs Our Avg","Scanned"].map(h=>(
                      <th key={h} style={{ padding:"12px 14px", textAlign:"left", color:"#4B5563", fontWeight:600, fontSize:11, letterSpacing:1, textTransform:"uppercase", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {compProducts.map((p,i)=>{
                    const cheaper = p.price && avgOurPrice && p.price < avgOurPrice;
                    return (
                      <tr key={p.id} className="row-hover fade-in" style={{ borderBottom:"1px solid #141929" }}>
                        <td style={{ padding:"12px 14px", color:"#4B5563", fontFamily:"'DM Mono',monospace", fontSize:12 }}>{i+1}</td>
                        <td style={{ padding:"12px 14px", maxWidth:220 }}>
                          <div style={{ color:"#E2E8F0", fontWeight:500, fontSize:12, lineHeight:1.4 }}>{p.product_name}</div>
                        </td>
                        <td style={{ padding:"12px 14px", fontFamily:"'DM Mono',monospace", color:cheaper?"#EF4444":"#10B981", fontWeight:700 }}>
                          {p.price?`RM ${Number(p.price).toFixed(2)}`:"—"}
                        </td>
                        <td style={{ padding:"12px 14px", fontFamily:"'DM Mono',monospace", color:"#6B7280", fontSize:12 }}>
                          {p.original_price?`RM ${Number(p.original_price).toFixed(2)}`:"—"}
                        </td>
                        <td style={{ padding:"12px 14px" }}>
                          {p.discount_pct?<span style={{ background:"#FEF2F2", color:"#EF4444", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>-{p.discount_pct}%</span>:"—"}
                        </td>
                        <td style={{ padding:"12px 14px", color:"#F59E0B", fontFamily:"'DM Mono',monospace", fontSize:12 }}>{p.rating||"—"}</td>
                        <td style={{ padding:"12px 14px", color:"#6B7280", fontSize:12 }}>{p.sold_count||"—"}</td>
                        <td style={{ padding:"12px 14px" }}>
                          {p.price&&avgOurPrice?(
                            <span style={{ background:cheaper?"#FEF2F2":"#ECFDF5", color:cheaper?"#EF4444":"#10B981", borderRadius:6, padding:"3px 8px", fontSize:11, fontWeight:600 }}>
                              {cheaper?`⚠️ RM${(avgOurPrice-p.price).toFixed(2)} cheaper`:"✅ We're OK"}
                            </span>
                          ):"—"}
                        </td>
                        <td style={{ padding:"12px 14px", color:"#374151", fontSize:11, whiteSpace:"nowrap" }}>{new Date(p.checked_at).toLocaleString()}</td>
                      </tr>
                    );
                  })}
                  {compProducts.length===0&&<tr><td colSpan={9} style={{ padding:"30px", textAlign:"center", color:"#374151" }}>No products scanned yet. Click "▶ Scan Now" above.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Forms ────────────────────────────────────────────────────
function CompetitorForm({ onSave, saving }) {
  const [form, setForm] = useState({ name:"", platform:"Shopee", url:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Competitor Name</label>
        <input className="input" value={form.name} onChange={e=>set("name",e.target.value)} placeholder="e.g. Top Earbuds Store" />
      </div>
      <div>
        <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Platform</label>
        <select className="input" value={form.platform} onChange={e=>set("platform",e.target.value)}>
          {["Shopee","Lazada","TikTok Shop","Other"].map(p=><option key={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Store or Search URL</label>
        <input className="input" value={form.url} onChange={e=>set("url",e.target.value)} placeholder="https://www.lazada.com.my/catalog/?q=wireless+earbuds" />
        <div style={{ fontSize:11, color:"#374151", marginTop:6 }}>💡 Use a search or category URL for best results</div>
      </div>
      <button className="btn" onClick={()=>onSave(form)} disabled={saving||!form.name||!form.url}
        style={{ background:"linear-gradient(135deg,#3B82F6,#8B5CF6)", color:"#fff", padding:"12px 0", fontSize:14, opacity:(saving||!form.name||!form.url)?0.6:1 }}>
        {saving?"⏳ Saving...":"➕ Add Competitor"}
      </button>
    </div>
  );
}

function SKUForm({ initial, onSave, saving }) {
  const [form, setForm] = useState({
    sku_code: initial?.sku_code||`SKU-${Math.floor(Math.random()*900)+100}`,
    name: initial?.name||"", category: initial?.category||"Electronics",
    price: initial?.price||"", stock: initial?.stock||"", image: initial?.image||"📦",
  });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      <div>
        <label style={{ fontSize:11, color:"#4B5563", fontWeight:600, letterSpacing:1, textTransform:"uppercase", display:"block", marginBottom:6 }}>Product Icon</label>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          {EMOJIS.map(e=>(
            <button key={e} onClick={()=>set("image",e)} style={{ width:36, height:36, background:form.image===e?"#1E3A5F":"#1A1F2E", border:form.image===e?"2px solid #3B82F6":"2px solid transparent", borderRadius:8, fontSize:18, cursor:"pointer" }}>{e}</button>
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
        {saving?"⏳ Saving...":initial?"💾 Save Changes":"➕ Add SKU"}
      </button>
    </div>
  );
}
