// app.jsx — root component, state, layout

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#8AE6BF",
  "density": "regular",
  "showTechMetadata": true,
  "scenario": "idle",
  "dark": true
}/*EDITMODE-END*/;

function useDurationTick(active){
  const [t, setT] = React.useState(0);
  React.useEffect(()=>{
    if (!active) return;
    setT(0);
    const id = setInterval(()=>setT(x=>x+1), 1000);
    return ()=>clearInterval(id);
  }, [active]);
  return t;
}

function App(){
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply accent + dark to root
  React.useEffect(()=>{
    const r = document.documentElement;
    r.style.setProperty("--accent", oklchFromHex(tweaks.accent));
    r.style.setProperty("--accent-dim", oklchFromHex(tweaks.accent, .45, .1));
    // dark mode toggle
    if (!tweaks.dark){
      r.style.setProperty("--bg", "oklch(0.985 0.003 250)");
      r.style.setProperty("--bg-2", "oklch(0.965 0.004 250)");
      r.style.setProperty("--surface", "oklch(0.99 0.003 250)");
      r.style.setProperty("--surface-2", "oklch(0.95 0.005 250)");
      r.style.setProperty("--line", "oklch(0.86 0.005 250)");
      r.style.setProperty("--line-soft", "oklch(0.92 0.004 250)");
      r.style.setProperty("--text", "oklch(0.18 0.008 250)");
      r.style.setProperty("--text-dim", "oklch(0.40 0.008 250)");
      r.style.setProperty("--text-mute", "oklch(0.58 0.008 250)");
      document.body.style.background = "#f7f8fa";
    } else {
      // restore defaults by stripping inline overrides
      ["--bg","--bg-2","--surface","--surface-2","--line","--line-soft","--text","--text-dim","--text-mute"].forEach(k=>r.style.removeProperty(k));
      document.body.style.background = "#0b0d10";
    }
  }, [tweaks.accent, tweaks.dark]);

  // App state
  const [tab, setTab] = React.useState("chats"); // "calls" | "chats" | "files"
  const [activePeerId, setActivePeerId] = React.useState("8a4f-2bc1-9d7e-401a");
  const [query, setQuery] = React.useState("");

  // Call state
  const [inCall, setInCall] = React.useState(null); // peerId
  const [callState, setCallState] = React.useState({ muted:false, videoOff:false, speaker:true, screenshare:false });
  const callDur = useDurationTick(!!inCall);

  // Incoming call simulation tied to scenario
  const [incoming, setIncoming] = React.useState(null); // peerId or null
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  // Chat state — mutable copy
  const [messages, setMessages] = React.useState(()=>JSON.parse(JSON.stringify(MESSAGES)));
  const [transfers, setTransfers] = React.useState(()=>JSON.parse(JSON.stringify(TRANSFERS)));
  const [displayName, setDisplayName] = React.useState(ME.name);
  const [toasts, setToasts] = React.useState([]);
  const [chatPanelInCall, setChatPanelInCall] = React.useState(true);

  // React to scenario tweak
  React.useEffect(()=>{
    switch(tweaks.scenario){
      case "idle":
        setInCall(null); setIncoming(null); setSettingsOpen(false);
        setTab("chats");
        break;
      case "in-call":
        setIncoming(null); setSettingsOpen(false);
        setInCall("8a4f-2bc1-9d7e-401a");
        setTab("calls");
        break;
      case "incoming":
        setInCall(null); setSettingsOpen(false);
        setIncoming("f019-cc20-7a3b-8845");
        break;
      case "files":
        setInCall(null); setIncoming(null); setSettingsOpen(false);
        setTab("files");
        break;
      case "settings":
        setSettingsOpen(true);
        break;
    }
  }, [tweaks.scenario]);

  // Progress simulation
  React.useEffect(()=>{
    const id = setInterval(()=>{
      setTransfers(ts => ts.map(t=>{
        if (t.state!=="transferring") return t;
        const inc = (t.speed * 1024 * 1024) / t.size; // fraction per second
        const sent = Math.min(1, t.sent + inc);
        const eta = sent>=1 ? 0 : (t.size*(1-sent))/(t.speed*1024*1024);
        const chunksDone = Math.round(sent * t.chunks.total);
        return {...t, sent, eta, chunks: {...t.chunks, done: chunksDone}, state: sent>=1?"complete":"transferring"};
      }));
    }, 1000);
    return ()=>clearInterval(id);
  }, []);

  const peers = PEERS; // static
  const activePeer = peers.find(p=>p.id===activePeerId) || peers[0];

  const onSelect = (id)=>setActivePeerId(id);
  const onCall = (id, video=true)=>{
    setActivePeerId(id);
    setInCall(id);
    setCallState(s=>({...s, videoOff: !video}));
    setTab("calls");
    setTweak("scenario","in-call");
  };

  const onSendMessage = (text)=>{
    const id = "m"+Math.random().toString(36).slice(2,8);
    const t = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit"});
    setMessages(prev => ({
      ...prev,
      [activePeerId]: [...(prev[activePeerId]||[]), { id, who:"me", t, text, state:"sent" }]
    }));
    // simulate delivery → read
    setTimeout(()=>setMessages(prev => ({
      ...prev,
      [activePeerId]: (prev[activePeerId]||[]).map(m=>m.id===id?{...m,state:"delivered"}:m)
    })), 400);
    setTimeout(()=>setMessages(prev => ({
      ...prev,
      [activePeerId]: (prev[activePeerId]||[]).map(m=>m.id===id?{...m,state:"read"}:m)
    })), 1400);
  };

  const onCallAction = (a)=>{
    if (a==="mute") setCallState(s=>({...s,muted:!s.muted}));
    else if (a==="video") setCallState(s=>({...s,videoOff:!s.videoOff}));
    else if (a==="screen") setCallState(s=>({...s,screenshare:!s.screenshare}));
    else if (a==="end") { setInCall(null); setTweak("scenario","idle"); addToast({icon:"phone",text:`Call with ${activePeer.name} ended · ${fmtDuration(callDur)}`}); }
    else if (a==="file") { setTab("files"); addToast({icon:"file",text:"Open Files tab to send"});}
  };

  const onTransferAction = (id, a)=>{
    setTransfers(ts => ts.map(t=>{
      if (t.id!==id) return t;
      if (a==="accept") return {...t, state:"transferring", speed: 8 + Math.random()*8, eta: t.size/((8+Math.random()*8)*1024*1024)};
      if (a==="decline") return null;
      if (a==="cancel") return null;
      if (a==="pause") return {...t, speed:0};
      return t;
    }).filter(Boolean));
    if (a==="accept") addToast({icon:"check",text:"Accepted incoming file"});
    if (a==="decline") addToast({icon:"x",text:"Declined incoming file"});
  };

  const addToast = (t)=>{
    const id = Math.random().toString(36).slice(2,8);
    setToasts(prev=>[...prev,{...t,id}]);
    setTimeout(()=>setToasts(prev=>prev.filter(x=>x.id!==id)), 3500);
  };

  // Unread badge counts
  const unreadChats = peers.reduce((s,p)=>s + (p.unread||0), 0);
  const offerCount  = transfers.filter(t=>t.state==="offered").length;

  // chat panel split layout: when in-call AND on calls tab AND chatPanelInCall: split the stage
  const showChatInCall = inCall && tab==="calls" && chatPanelInCall;

  return (
    <div className="app" style={{fontSize: tweaks.density==="compact"?13:tweaks.density==="comfy"?15:14}}>
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
          <button className={`tab${tab==="calls"?" active":""}`} onClick={()=>setTab("calls")}>
            <I.Phone size={14}/> Calls
            {inCall && <span className="badge" style={{background:"var(--accent)"}}>●</span>}
          </button>
          <button className={`tab${tab==="chats"?" active":""}`} onClick={()=>setTab("chats")}>
            <I.Chat size={14}/> Chats
            {unreadChats>0 && <span className="badge">{unreadChats}</span>}
          </button>
          <button className={`tab${tab==="files"?" active":""}`} onClick={()=>setTab("files")}>
            <I.File size={14}/> Files
            {offerCount>0 && <span className="badge" style={{background:"var(--warn)",color:"#0b0d10"}}>{offerCount}</span>}
          </button>
        </nav>

        <div className="topright">
          <div className="net-pill" title={`Connected on ${ME.hostname}`}>
            <span className="dot"/>LAN <code>{ME.ip}</code>
          </div>
          <button className="iconbtn" title="Notifications"><I.Bell size={15}/></button>
          <button className={`iconbtn${settingsOpen?" active":""}`} title="Settings" onClick={()=>setSettingsOpen(true)}>
            <I.Settings size={15}/>
          </button>
        </div>
      </header>

      <div className="body">
        <Sidebar
          peers={peers}
          activePeerId={activePeerId}
          onSelect={onSelect}
          onCall={(id)=>onCall(id,true)}
          density={tweaks.density}
          query={query}
          setQuery={setQuery}
        />

        <main style={{minWidth:0,display:"grid",gridTemplateColumns: showChatInCall ? "1fr 360px" : "1fr"}}>
          {/* Main content */}
          <div style={{minWidth:0,minHeight:0,overflow:"hidden"}}>
            {tab==="calls" && (
              inCall
                ? <ActiveCall peer={activePeer} callState={{...callState, duration: callDur}}
                    onAction={onCallAction}
                    onChatPanel={()=>setChatPanelInCall(v=>!v)}
                    chatPanelOpen={chatPanelInCall}/>
                : <NoActiveCall peers={peers} onCall={onCall}/>
            )}
            {tab==="chats" && (
              <ChatsView
                peer={activePeer}
                messages={messages[activePeer.id]||[]}
                onSend={onSendMessage}
                onCall={()=>onCall(activePeer.id,false)}
                onVideo={()=>onCall(activePeer.id,true)}
                showTech={tweaks.showTechMetadata}
              />
            )}
            {tab==="files" && (
              <FilesView transfers={transfers} peers={peers} onAction={onTransferAction}/>
            )}
          </div>

          {/* Embedded chat side panel when in call */}
          {showChatInCall && (
            <aside style={{borderLeft:"1px solid var(--line)",background:"var(--bg-2)",minHeight:0,minWidth:0}}>
              <ChatsView
                peer={activePeer}
                messages={messages[activePeer.id]||[]}
                onSend={onSendMessage}
                onCall={()=>onCall(activePeer.id,false)}
                onVideo={()=>onCall(activePeer.id,true)}
                embedded
                showTech={tweaks.showTechMetadata}
              />
            </aside>
          )}
        </main>
      </div>

      {/* Modals */}
      {incoming && (
        <IncomingCallModal
          peer={peers.find(p=>p.id===incoming)}
          onAccept={(video)=>{ setIncoming(null); onCall(incoming, video); }}
          onDecline={()=>{ setIncoming(null); setTweak("scenario","idle"); addToast({text:"Call declined"}); }}
        />
      )}
      {settingsOpen && (
        <SettingsModal
          onClose={()=>{setSettingsOpen(false); if (tweaks.scenario==="settings") setTweak("scenario","idle");}}
          displayName={displayName} setDisplayName={setDisplayName}
          dark={tweaks.dark} setDark={(v)=>setTweak("dark",v)}
        />
      )}

      {/* Toasts */}
      <div className="toasts">
        {toasts.map(t=>(
          <div className="toast" key={t.id}>
            <span style={{color:"var(--accent)"}}>●</span>
            <span>{t.text}</span>
          </div>
        ))}
      </div>

      {/* Tweaks */}
      <TweaksPanel>
        <TweakSection label="Scenario"/>
        <TweakSelect
          label="Show"
          value={tweaks.scenario}
          options={[
            {value:"idle", label:"Idle — chat thread"},
            {value:"in-call", label:"Active call w/ chat"},
            {value:"incoming", label:"Incoming call modal"},
            {value:"files", label:"File transfers"},
            {value:"settings", label:"Settings panel"},
          ]}
          onChange={(v)=>setTweak("scenario",v)}
        />

        <TweakSection label="Appearance"/>
        <TweakToggle label="Dark mode" value={tweaks.dark} onChange={(v)=>setTweak("dark",v)}/>
        <TweakColor label="Accent" value={tweaks.accent}
          options={["#8AE6BF","#7CC8FF","#E8B25C","#E08AB0","#B79CFF"]}
          onChange={(v)=>setTweak("accent",v)}/>
        <TweakRadio label="Density" value={tweaks.density}
          options={["compact","regular","comfy"]}
          onChange={(v)=>setTweak("density",v)}/>

        <TweakSection label="Detail"/>
        <TweakToggle label="Show tech metadata"
          value={tweaks.showTechMetadata}
          onChange={(v)=>setTweak("showTechMetadata",v)}/>

      </TweaksPanel>
    </div>
  );
}

// hex → oklch helper (very lightweight, gives roughly correct OK perceptual values)
function oklchFromHex(hex, lOverride, cOverride){
  const m = hex.replace("#","").match(/.{2}/g);
  if (!m) return hex;
  const [r,g,b] = m.map(s=>parseInt(s,16)/255);
  // sRGB → linear
  const lin = (v)=> v<=.04045 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4);
  const R = lin(r), G = lin(g), B = lin(b);
  // OKLab
  const l = Math.cbrt(0.4122214708*R + 0.5363325363*G + 0.0514459929*B);
  const m_ = Math.cbrt(0.2119034982*R + 0.6806995451*G + 0.1073969566*B);
  const s_ = Math.cbrt(0.0883024619*R + 0.2817188376*G + 0.6299787005*B);
  const L = 0.2104542553*l + 0.7936177850*m_ - 0.0040720468*s_;
  const a = 1.9779984951*l - 2.4285922050*m_ + 0.4505937099*s_;
  const b2= 0.0259040371*l + 0.7827717662*m_ - 0.8086757660*s_;
  const C = Math.sqrt(a*a+b2*b2);
  let H = Math.atan2(b2,a) * 180/Math.PI;
  if (H<0) H+=360;
  const Lf = lOverride ?? L;
  const Cf = cOverride ?? C;
  return `oklch(${Lf.toFixed(3)} ${Cf.toFixed(3)} ${H.toFixed(1)})`;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
