// files.jsx — Files view: transfers list (active/queued/completed) + send

function TransferRow({t, peers, onAccept, onDecline, onCancel, onPause}){
  const peer = peers.find(p=>p.id===t.peerId);
  const isIn = t.direction==="in";
  const pct = Math.round(t.sent*100);
  const isComplete = t.state==="complete";
  const isOffered = t.state==="offered";
  const isFailed = t.state==="failed";

  const stateColor = isComplete ? "var(--accent)"
                   : isFailed   ? "var(--danger)"
                   : isOffered  ? "var(--warn)"
                   : "var(--accent)";

  return (
    <div style={{
      display:"grid",
      gridTemplateColumns:"36px 1fr 200px 160px",
      gap:14,alignItems:"center",
      padding:"14px 16px",
      borderRadius:12,
      background: isOffered ? "oklch(0.22 0.04 75 / 0.4)" : "var(--surface)",
      border:"1px solid " + (isOffered ? "oklch(0.42 0.10 75)" : "var(--line-soft)"),
    }}>
      {/* File icon */}
      <span style={{
        width:36,height:36,borderRadius:8,
        background:"oklch(0.25 0.02 250)",
        display:"inline-flex",alignItems:"center",justifyContent:"center",
        color: stateColor,
      }}>
        {isIn ? <I.Download size={17}/> : <I.Upload size={17}/>}
      </span>

      {/* Name + meta + progress */}
      <div className="col" style={{minWidth:0,gap:6}}>
        <div className="row" style={{gap:10,minWidth:0}}>
          <span style={{
            fontSize:13.5,fontWeight:500,
            overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",
          }}>{t.name}</span>
          <span className="mono dim" style={{fontSize:10.5}}>{fmtBytes(t.size)}</span>
          {isOffered && (
            <span className="mono" style={{
              padding:"2px 6px",borderRadius:4,fontSize:10,fontWeight:600,
              background:"oklch(0.42 0.12 75)",color:"#0b0d10",letterSpacing:".04em",
            }}>INCOMING OFFER</span>
          )}
          {isComplete && (
            <span className="mono" style={{
              padding:"2px 6px",borderRadius:4,fontSize:10,fontWeight:600,
              background:"oklch(0.30 0.08 165)",color:"var(--accent)",
            }}>✓ COMPLETE</span>
          )}
        </div>

        {/* Progress bar */}
        {!isOffered && (
          <div style={{position:"relative",height:6,background:"oklch(0.20 0.012 250)",borderRadius:3,overflow:"hidden"}}>
            <div style={{
              position:"absolute",inset:"0 auto 0 0",width:`${pct}%`,
              background:`linear-gradient(90deg, ${stateColor}, oklch(0.78 0.13 175))`,
              transition:"width .3s",
            }}/>
            {/* Sliding window markers (only mid-transfer) */}
            {!isComplete && t.chunks.inflight>0 && (
              <div style={{
                position:"absolute",left:`${pct}%`,top:0,bottom:0,width:36,
                background:"linear-gradient(90deg, oklch(0.78 0.13 175 / .6), transparent)",
                animation:"slide 1.1s linear infinite",
              }}/>
            )}
          </div>
        )}

        <div className="row mono" style={{fontSize:10.5,gap:14,color:"var(--text-mute)",flexWrap:"wrap"}}>
          {peer && <span>from {peer.name}</span>}
          <span>SHA-256 <span style={{color:"var(--text-dim)"}}>{t.sha}</span></span>
          {!isComplete && !isOffered && (
            <>
              <span>chunk {t.chunks.done.toLocaleString()}/{t.chunks.total.toLocaleString()}</span>
              <span>{t.chunks.inflight} in-flight</span>
            </>
          )}
        </div>
      </div>

      {/* Speed/ETA */}
      <div className="col mono" style={{fontSize:11,gap:3,color:"var(--text-dim)"}}>
        {isOffered ? (
          <>
            <div>offered just now</div>
            <div className="dim">awaiting your decision…</div>
          </>
        ) : isComplete ? (
          <>
            <div style={{color:"var(--accent)"}}>verified · {fmtBytes(t.size)}</div>
            <div className="dim">saved to ~/NetLink/Received</div>
          </>
        ) : (
          <>
            <div style={{color:"var(--text)"}}>{t.speed.toFixed(1)} MB/s · {pct}%</div>
            <div className="dim">eta {fmtEta(t.eta)} · {fmtBytes(t.size * (1-t.sent))} left</div>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="row" style={{justifyContent:"flex-end",gap:6}}>
        {isOffered && (
          <>
            <button className="btn sm primary" onClick={onAccept}><I.Check size={13}/> Accept</button>
            <button className="btn sm" onClick={onDecline}><I.X size={13}/> Decline</button>
          </>
        )}
        {!isOffered && !isComplete && (
          <>
            <button className="iconbtn" title="Pause" onClick={onPause}><I.Pause size={14}/></button>
            <button className="iconbtn" title="Cancel" onClick={onCancel}><I.X size={14}/></button>
          </>
        )}
        {isComplete && (
          <>
            <button className="btn sm"><I.Folder size={13}/> Reveal</button>
            <button className="iconbtn" title="More"><I.More size={14}/></button>
          </>
        )}
      </div>
    </div>
  );
}

function FilesView({transfers, peers, onAction}){
  const [filter, setFilter] = React.useState("all");
  const offered = transfers.filter(t=>t.state==="offered");
  const active = transfers.filter(t=>t.state==="transferring");
  const done = transfers.filter(t=>t.state==="complete");

  const filtered = filter==="incoming" ? transfers.filter(t=>t.direction==="in")
                 : filter==="outgoing" ? transfers.filter(t=>t.direction==="out")
                 : filter==="active"   ? active
                 : filter==="complete" ? done
                 : transfers;

  const totalActive = active.reduce((s,t)=>s+t.speed, 0);

  return (
    <div className="col" style={{height:"100%",minHeight:0}}>
      {/* Header */}
      <div style={{padding:"18px 22px 12px",borderBottom:"1px solid var(--line-soft)"}}>
        <div className="row" style={{justifyContent:"space-between"}}>
          <div>
            <div style={{fontSize:20,fontWeight:600,letterSpacing:-.2}}>Files</div>
            <div className="dim" style={{fontSize:13,marginTop:3}}>
              Chunked over a dedicated DataChannel. 64KB chunks, 8-frame window, SHA-256 verified.
            </div>
          </div>
          <div className="row" style={{gap:8}}>
            <button className="btn"><I.Folder size={14}/> Open download folder</button>
            <button className="btn primary"><I.Plus size={14}/> Send file…</button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="row mono" style={{gap:24,marginTop:14}}>
          <Stat label="active" value={active.length}/>
          <Stat label="throughput" value={`${totalActive.toFixed(1)} MB/s`} accent/>
          <Stat label="completed today" value={done.length}/>
          <Stat label="offered" value={offered.length} warn={offered.length>0}/>
          <div style={{flex:1}}/>
          <div className="row" style={{gap:2,background:"var(--surface)",border:"1px solid var(--line-soft)",borderRadius:8,padding:2}}>
            {[
              ["all","All"],["active","Active"],["incoming","Incoming"],
              ["outgoing","Outgoing"],["complete","Done"]
            ].map(([k,label])=>(
              <button key={k} onClick={()=>setFilter(k)}
                className="btn sm ghost"
                style={{
                  background: filter===k ? "oklch(0.28 0.014 250)" : "transparent",
                  border:"1px solid " + (filter===k ? "var(--line)" : "transparent"),
                  padding:"4px 10px",
                }}>{label}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Drag-drop hint */}
      <div className="scroll" style={{flex:1,overflowY:"auto",padding:"14px 22px 22px"}}>
        {offered.length>0 && (
          <>
            <div className="label-tiny" style={{margin:"4px 4px 8px"}}>Awaiting your decision</div>
            <div className="col" style={{gap:8}}>
              {offered.map(t=>(
                <TransferRow key={t.id} t={t} peers={peers}
                  onAccept={()=>onAction(t.id,"accept")}
                  onDecline={()=>onAction(t.id,"decline")}/>
              ))}
            </div>
          </>
        )}

        {active.length>0 && (
          <>
            <div className="label-tiny" style={{margin:"18px 4px 8px"}}>In progress</div>
            <div className="col" style={{gap:8}}>
              {active.filter(t=>filter==="all"||filter==="active"||(filter==="incoming"&&t.direction==="in")||(filter==="outgoing"&&t.direction==="out")).map(t=>(
                <TransferRow key={t.id} t={t} peers={peers}
                  onPause={()=>onAction(t.id,"pause")}
                  onCancel={()=>onAction(t.id,"cancel")}/>
              ))}
            </div>
          </>
        )}

        {done.length>0 && (
          <>
            <div className="label-tiny" style={{margin:"18px 4px 8px"}}>Completed</div>
            <div className="col" style={{gap:8}}>
              {done.filter(t=>filter==="all"||filter==="complete"||(filter==="incoming"&&t.direction==="in")||(filter==="outgoing"&&t.direction==="out")).map(t=>(
                <TransferRow key={t.id} t={t} peers={peers}/>
              ))}
            </div>
          </>
        )}

        {/* Drop zone */}
        <div style={{
          marginTop:22,padding:"22px",borderRadius:14,
          border:"1.5px dashed var(--line)",
          background:"linear-gradient(180deg, oklch(0.20 0.012 250), oklch(0.18 0.012 250))",
          textAlign:"center",
        }}>
          <div className="row" style={{justifyContent:"center",gap:10,fontSize:13,color:"var(--text-dim)"}}>
            <I.Upload size={16} stroke="var(--text-dim)"/>
            Drop files here to send. They never leave the LAN.
          </div>
          <div className="mono dim" style={{fontSize:10.5,marginTop:6}}>
            transfers are chunked and resumable · paused transfers persist across reconnect
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({label, value, accent, warn}){
  return (
    <div className="col" style={{gap:2}}>
      <div className="label-tiny" style={{fontSize:9.5}}>{label}</div>
      <div className="mono" style={{
        fontSize:18,fontWeight:600,letterSpacing:-.5,
        color: accent ? "var(--accent)" : warn ? "var(--warn)" : "var(--text)"
      }}>{value}</div>
    </div>
  );
}

// add slide keyframes once
if (typeof document !== "undefined" && !document.getElementById("files-anim")) {
  const s = document.createElement("style"); s.id = "files-anim";
  s.textContent = `@keyframes slide{from{transform:translateX(-36px)}to{transform:translateX(0)}}`;
  document.head.appendChild(s);
}

Object.assign(window, { FilesView, TransferRow, Stat });
