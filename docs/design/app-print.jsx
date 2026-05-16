// app-print.jsx — multi-page print rendering of NetLink scenarios

// ---- Constants ----
const PAGE_W = 1400;
const PAGE_H = 900;

function PageFrame({label, sub, children}){
  return (
    <section className="print-page">
      <div className="print-page-header">
        <div className="print-page-label">{label}</div>
        <div className="print-page-sub">{sub}</div>
      </div>
      <div className="print-app-host">
        {children}
      </div>
    </section>
  );
}

// AppShell — pure-render version of NetLink without state changes that flicker.
function StaticShell({scenario}){
  const tab = scenario==="files" ? "files"
            : scenario==="in-call" ? "calls"
            : "chats";
  const activePeerId = scenario==="incoming" ? "8a4f-2bc1-9d7e-401a"
                     : scenario==="in-call"  ? "8a4f-2bc1-9d7e-401a"
                     : "8a4f-2bc1-9d7e-401a";
  const activePeer = PEERS.find(p=>p.id===activePeerId);
  const callDur = 482; // 8:02
  const callState = { muted:false, videoOff:false, speaker:true, screenshare:false, duration: callDur };
  const showChatInCall = scenario==="in-call";
  const peers = PEERS;

  const unreadChats = peers.reduce((s,p)=>s + (p.unread||0), 0);
  const offerCount  = TRANSFERS.filter(t=>t.state==="offered").length;

  return (
    <div className="app print-app">
      {/* Top bar */}
      <header className="topbar">
        <div className="row" style={{gap:14}}>
          <div className="traffic"><i/><i/><i/></div>
          <div className="row" style={{gap:8,color:"var(--text)",fontSize:13,fontWeight:600,letterSpacing:.2}}>
            <span style={{color:"var(--accent)"}}><I.Logo size={18}/></span>
            NetLink
          </div>
        </div>

        <nav className="tabs">
          <button className={`tab${tab==="calls"?" active":""}`}>
            <I.Phone size={14}/> Calls
            {scenario==="in-call" && <span className="badge" style={{background:"var(--accent)"}}>●</span>}
          </button>
          <button className={`tab${tab==="chats"?" active":""}`}>
            <I.Chat size={14}/> Chats
            {unreadChats>0 && <span className="badge">{unreadChats}</span>}
          </button>
          <button className={`tab${tab==="files"?" active":""}`}>
            <I.File size={14}/> Files
            {offerCount>0 && <span className="badge" style={{background:"var(--warn)",color:"#0b0d10"}}>{offerCount}</span>}
          </button>
        </nav>

        <div className="topright">
          <div className="net-pill">
            <span className="dot"/>LAN <code>{ME.ip}</code>
          </div>
          <button className="iconbtn"><I.Bell size={15}/></button>
          <button className="iconbtn"><I.Settings size={15}/></button>
        </div>
      </header>

      <div className="body">
        <Sidebar
          peers={peers}
          activePeerId={activePeerId}
          onSelect={()=>{}}
          onCall={()=>{}}
          density="regular"
          query=""
          setQuery={()=>{}}
        />

        <main style={{minWidth:0,display:"grid",gridTemplateColumns: showChatInCall ? "1fr 360px" : "1fr"}}>
          <div style={{minWidth:0,minHeight:0,overflow:"hidden"}}>
            {tab==="calls" && (
              <ActiveCall peer={activePeer} callState={callState}
                onAction={()=>{}} onChatPanel={()=>{}} chatPanelOpen={true}/>
            )}
            {tab==="chats" && (
              <ChatsView
                peer={activePeer}
                messages={MESSAGES[activePeer.id]||[]}
                onSend={()=>{}}
                onCall={()=>{}}
                onVideo={()=>{}}
                showTech={true}
              />
            )}
            {tab==="files" && (
              <FilesView transfers={TRANSFERS} peers={peers} onAction={()=>{}}/>
            )}
          </div>

          {showChatInCall && (
            <aside style={{borderLeft:"1px solid var(--line)",background:"var(--bg-2)",minHeight:0,minWidth:0}}>
              <ChatsView
                peer={activePeer}
                messages={MESSAGES[activePeer.id]||[]}
                onSend={()=>{}}
                onCall={()=>{}}
                onVideo={()=>{}}
                embedded
                showTech={true}
              />
            </aside>
          )}
        </main>
      </div>

      {/* Inline modal renderings — scoped to the page frame, not full-viewport scrim */}
      {scenario==="incoming" && (
        <div className="print-modal-overlay">
          <IncomingCallModal
            peer={PEERS.find(p=>p.id==="f019-cc20-7a3b-8845")}
            onAccept={()=>{}} onDecline={()=>{}}
          />
        </div>
      )}
      {scenario==="settings" && (
        <div className="print-modal-overlay">
          <SettingsModal
            onClose={()=>{}}
            displayName={ME.name} setDisplayName={()=>{}}
            dark={true} setDark={()=>{}}
          />
        </div>
      )}
    </div>
  );
}

function PrintRoot(){
  // Apply accent to root (matches default tweaks)
  React.useEffect(()=>{
    document.documentElement.style.setProperty("--accent", "oklch(0.85 0.13 165)");
  }, []);

  const pages = [
    { id:"chat",     label:"Chats",                  sub:"Idle thread with Daniel · DataChannel open",       scenario:"idle"     },
    { id:"in-call",  label:"Active call · chat panel", sub:"Direct P2P, host-only ICE, side-by-side chat",    scenario:"in-call"  },
    { id:"files",    label:"Files · transfers",      sub:"Active transfers, sliding window, offered file",  scenario:"files"    },
    { id:"incoming", label:"Incoming call",          sub:"Modal with caller identity + technical address",  scenario:"incoming" },
    { id:"settings", label:"Settings",               sub:"Identity / Devices / Network / Storage",          scenario:"settings" },
  ];

  return (
    <>
      {pages.map(p => (
        <PageFrame key={p.id} label={p.label} sub={p.sub}>
          <StaticShell scenario={p.scenario}/>
        </PageFrame>
      ))}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<PrintRoot/>);
