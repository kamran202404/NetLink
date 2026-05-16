// sidebar.jsx — left peers list

const SIG_BARS = ({n=4})=>{
  const bars=[1,2,3,4];
  return (
    <span className="sig" style={{display:"inline-flex",gap:2,alignItems:"flex-end",height:12}}>
      {bars.map(b=>(
        <span key={b} style={{
          width:3, height:3+b*2.2, borderRadius:1,
          background: b<=n ? "var(--accent)" : "oklch(0.36 0.01 250)"
        }}/>
      ))}
    </span>
  );
};

function Avatar({peer, size, showStatus=true}){
  const isMe = peer.id === ME.id;
  const status = peer.status==="in-call" ? "busy"
               : peer.status==="idle" ? "idle"
               : peer.status==="offline" ? "off"
               : "";
  return (
    <span className={"av"+(size?` ${size}`:"")} style={{background: peer.color}}>
      {peer.isService
        ? <I.Server size={size==="lg"?22:size==="sm"?13:16} stroke="#0b0d10" sw={2}/>
        : peer.initials}
      {showStatus && <i className={`status ${status}`}/>}
    </span>
  );
}

function PeerRow({peer, active, onClick, onCall, density}){
  const isInCall = peer.status === "in-call";
  return (
    <div
      onClick={onClick}
      className={`peer-row${active?" active":""}`}
      style={{
        display:"grid",
        gridTemplateColumns:"auto 1fr auto",
        alignItems:"center",
        gap:10,
        padding: density==="compact" ? "6px 10px" : "9px 10px",
        borderRadius:8,
        cursor:"default",
        background: active ? "oklch(0.27 0.018 250)" : "transparent",
        border: "1px solid " + (active ? "var(--line)" : "transparent"),
        position:"relative",
      }}
    >
      <Avatar peer={peer}/>
      <div className="col" style={{minWidth:0}}>
        <div className="row" style={{justifyContent:"space-between", gap:8}}>
          <div style={{fontSize:13,fontWeight:500,color:"var(--text)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {peer.name}
          </div>
          <div className="mono" style={{fontSize:10,color:"var(--text-mute)"}}>{peer.lastSeen}</div>
        </div>
        <div className="row mono" style={{fontSize:10.5,color:"var(--text-mute)",gap:6,marginTop:2}}>
          <SIG_BARS n={peer.signal}/>
          <span style={{opacity:.85}}>{peer.ip}</span>
          {peer.status==="in-call" && <span style={{color:"var(--warn)"}}>· in call</span>}
        </div>
      </div>
      {peer.unread>0 ? (
        <span className="mono" style={{
          minWidth:18,height:18,padding:"0 5px",borderRadius:9,
          background:"var(--accent)",color:"#0b0d10",
          fontSize:10,fontWeight:600,display:"inline-flex",alignItems:"center",justifyContent:"center"
        }}>{peer.unread}</span>
      ) : (
        <button title="Call" className="iconbtn" style={{width:26,height:26}} onClick={(e)=>{e.stopPropagation();onCall&&onCall();}}>
          <I.Phone size={14}/>
        </button>
      )}
    </div>
  );
}

function Sidebar({peers, activePeerId, onSelect, onCall, density, query, setQuery}){
  const me = ME;
  const filtered = peers.filter(p=>{
    if (!query) return true;
    const q = query.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.hostname.toLowerCase().includes(q) || p.ip.includes(q);
  });

  const online = filtered.filter(p=>p.status!=="idle" && p.status!=="offline");
  const idle = filtered.filter(p=>p.status==="idle");

  return (
    <aside style={{
      borderRight:"1px solid var(--line)",
      background:"oklch(0.19 0.012 250)",
      display:"flex",flexDirection:"column",minHeight:0,
    }}>
      {/* Me header */}
      <div style={{padding:"12px 14px 10px",borderBottom:"1px solid var(--line-soft)"}}>
        <div className="row" style={{gap:10}}>
          <Avatar peer={{...me, initials:me.initials, color:me.color}} size="" showStatus={false}/>
          <div className="col" style={{minWidth:0,flex:1}}>
            <div className="row" style={{justifyContent:"space-between"}}>
              <div style={{fontSize:13,fontWeight:600}}>{me.name}</div>
              <span className="mono" style={{fontSize:10,color:"var(--accent)"}}>● online</span>
            </div>
            <div className="mono" style={{fontSize:10,color:"var(--text-mute)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
              {me.hostname} · {me.ip}:{me.port}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{padding:"10px 12px 6px"}}>
        <div className="row" style={{
          background:"var(--bg-2)",border:"1px solid var(--line-soft)",
          borderRadius:8,padding:"6px 10px",gap:8
        }}>
          <I.Search size={14} stroke="var(--text-mute)"/>
          <input
            value={query}
            onChange={(e)=>setQuery(e.target.value)}
            placeholder="Search peers, IPs…"
            style={{
              flex:1,background:"transparent",border:0,outline:0,color:"var(--text)",
              fontFamily:"var(--sans)",fontSize:12.5
            }}
          />
          {query && <button className="iconbtn" style={{width:20,height:20}} onClick={()=>setQuery("")}><I.X size={12}/></button>}
        </div>
      </div>

      {/* Discovery banner */}
      <div style={{padding:"4px 14px 10px"}}>
        <div className="row mono" style={{justifyContent:"space-between",fontSize:10,color:"var(--text-mute)"}}>
          <span>discovering · _p2pchat._tcp.local</span>
          <span style={{display:"inline-flex",gap:4,alignItems:"center"}}>
            <span style={{width:6,height:6,borderRadius:3,background:"var(--accent)",animation:"pulse 1.6s ease-out infinite"}}/>
            {peers.length} found
          </span>
        </div>
      </div>

      {/* Peer list */}
      <div className="scroll" style={{flex:1,overflowY:"auto",padding:"0 8px 12px"}}>
        <div className="label-tiny" style={{padding:"4px 6px"}}>On the network</div>
        <div className="col" style={{gap:2}}>
          {online.map(p=>(
            <PeerRow key={p.id} peer={p} active={p.id===activePeerId}
              onClick={()=>onSelect(p.id)} onCall={()=>onCall(p.id)} density={density}/>
          ))}
        </div>

        {idle.length>0 && (
          <>
            <div className="label-tiny" style={{padding:"12px 6px 4px"}}>Idle</div>
            <div className="col" style={{gap:2,opacity:.78}}>
              {idle.map(p=>(
                <PeerRow key={p.id} peer={p} active={p.id===activePeerId}
                  onClick={()=>onSelect(p.id)} onCall={()=>onCall(p.id)} density={density}/>
              ))}
            </div>
          </>
        )}

        {filtered.length===0 && (
          <div style={{padding:"24px 8px",textAlign:"center",color:"var(--text-mute)",fontSize:12}}>
            No peers match “{query}”.
          </div>
        )}
      </div>

      {/* footer mini status */}
      <div style={{
        borderTop:"1px solid var(--line-soft)",
        padding:"8px 14px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
      }}>
        <div className="row mono" style={{fontSize:10,gap:8,color:"var(--text-mute)"}}>
          <I.Lock size={11}/> direct · no relay
        </div>
        <div className="row mono" style={{fontSize:10,gap:8,color:"var(--text-mute)"}}>
          <I.Wifi size={11} stroke="var(--accent)"/> studio-wifi
        </div>
      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar, Avatar, SIG_BARS, PeerRow });
