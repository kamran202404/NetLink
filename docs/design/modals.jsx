// modals.jsx — incoming call, settings, file offer dialog

function IncomingCallModal({peer, onAccept, onDecline}){
  return (
    <div className="modal-scrim" onClick={onDecline}>
      <div className="modal" onClick={(e)=>e.stopPropagation()} style={{width:420}}>
        <div style={{
          padding:"28px 22px 20px",
          textAlign:"center",
          background:"radial-gradient(120% 80% at 50% 0%, oklch(0.30 0.06 165 / .35), transparent 60%)",
        }}>
          <div style={{
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            width:84,height:84,borderRadius:42,
            background:"oklch(0.27 0.014 250)",border:"1px solid var(--line)",
            position:"relative",marginBottom:14,
          }}>
            <span style={{
              position:"absolute",inset:-6,borderRadius:48,
              border:"2px solid var(--accent)",opacity:.4,
              animation:"ring 1.6s ease-out infinite",
            }}/>
            <span style={{
              position:"absolute",inset:-14,borderRadius:54,
              border:"2px solid var(--accent)",opacity:.2,
              animation:"ring 1.6s ease-out .4s infinite",
            }}/>
            <Avatar peer={peer} size="lg" showStatus={false}/>
          </div>
          <div className="label-tiny" style={{color:"var(--accent)",marginBottom:6}}>incoming video call</div>
          <div style={{fontSize:18,fontWeight:600}}>{peer.name}</div>
          <div className="mono dim" style={{fontSize:11,marginTop:4}}>
            {peer.hostname} · {peer.ip}:{peer.port}
          </div>
        </div>

        <div style={{
          display:"flex",justifyContent:"center",gap:30,padding:"18px 22px 24px",
          borderTop:"1px solid var(--line-soft)",
        }}>
          <CallControl icon={I.PhoneOff} label="Decline" danger onClick={onDecline}/>
          <CallControl icon={I.Mic}      label="Audio"   on={false} onClick={()=>onAccept(false)}/>
          <CallControl icon={I.Video}    label="Accept"  on={false} onClick={()=>onAccept(true)}/>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({onClose, displayName, setDisplayName, dark, setDark}){
  const [tab, setTab] = React.useState("identity");
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e)=>e.stopPropagation()} style={{width:640,maxWidth:"94vw"}}>
        <div className="row" style={{padding:"14px 18px",borderBottom:"1px solid var(--line-soft)",justifyContent:"space-between"}}>
          <h3>Settings</h3>
          <button className="iconbtn" onClick={onClose}><I.X size={15}/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"160px 1fr",minHeight:380}}>
          {/* sidenav */}
          <div className="col" style={{padding:"12px 8px",borderRight:"1px solid var(--line-soft)",gap:2,background:"oklch(0.20 0.012 250)"}}>
            {[
              ["identity","Identity",I.Users],
              ["devices","Devices",I.Camera],
              ["network","Network",I.Wifi],
              ["storage","Storage",I.Folder],
              ["appearance","Appearance",I.Sun],
              ["advanced","Advanced",I.Cpu],
            ].map(([k,label,Ic])=>(
              <button key={k} onClick={()=>setTab(k)} className="row" style={{
                gap:8,padding:"7px 10px",borderRadius:7,
                fontSize:12.5,color: tab===k ? "var(--text)" : "var(--text-dim)",
                background: tab===k ? "oklch(0.26 0.014 250)" : "transparent",
                border:"1px solid " + (tab===k ? "var(--line)" : "transparent"),
                cursor:"default",justifyContent:"flex-start",
              }}>
                <Ic size={14}/> {label}
              </button>
            ))}
          </div>

          {/* content */}
          <div className="scroll" style={{padding:"18px 22px",overflowY:"auto"}}>
            {tab==="identity" && (
              <div className="col" style={{gap:14}}>
                <SField label="Display name" desc="Shown to peers instead of your UUID.">
                  <input
                    value={displayName}
                    onChange={(e)=>setDisplayName(e.target.value)}
                    style={{
                      width:"100%",padding:"8px 10px",borderRadius:8,
                      background:"var(--bg-2)",border:"1px solid var(--line)",color:"var(--text)",
                      fontSize:13,
                    }}/>
                </SField>
                <SField label="Peer ID" desc="Generated once on first launch. Persists locally.">
                  <div className="row mono" style={{
                    background:"var(--bg-2)",border:"1px solid var(--line)",borderRadius:8,
                    padding:"8px 10px",justifyContent:"space-between",fontSize:12,color:"var(--text-dim)",
                  }}>
                    <span>{ME.id}</span>
                    <button className="iconbtn" style={{width:24,height:24}}><I.Copy size={12}/></button>
                  </div>
                </SField>
                <SField label="Hostname / Signaling endpoint">
                  <div className="mono" style={{fontSize:12,color:"var(--text-dim)"}}>
                    {ME.hostname}<br/>
                    <span style={{color:"var(--accent)"}}>ws://{ME.ip}:{ME.port}</span> (LAN-only)
                  </div>
                </SField>
              </div>
            )}
            {tab==="devices" && (
              <div className="col" style={{gap:14}}>
                <SField label="Camera">
                  <SSelect value="FaceTime HD Camera" options={["FaceTime HD Camera","Logi C920 (USB)","OBS Virtual Camera"]}/>
                </SField>
                <SField label="Microphone">
                  <SSelect value="MacBook Pro Microphone" options={["MacBook Pro Microphone","Røde NT-USB","Logi C920 (USB)"]}/>
                  <div style={{marginTop:10,padding:"10px 12px",borderRadius:8,background:"var(--bg-2)",border:"1px solid var(--line-soft)"}}>
                    <div className="label-tiny" style={{marginBottom:6}}>Input level</div>
                    <div style={{height:6,borderRadius:3,background:"oklch(0.20 0.012 250)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:"42%",background:"linear-gradient(90deg, var(--accent), oklch(0.80 0.16 75))"}}/>
                    </div>
                  </div>
                </SField>
                <SField label="Speaker">
                  <SSelect value="MacBook Pro Speakers" options={["MacBook Pro Speakers","AirPods Pro","Studio Monitors"]}/>
                </SField>
              </div>
            )}
            {tab==="network" && (
              <div className="col" style={{gap:14}}>
                <SField label="mDNS service" desc="Advertised on the local network so peers can find you.">
                  <div className="mono" style={{fontSize:12,color:"var(--text-dim)"}}>_p2pchat._tcp.local</div>
                </SField>
                <SField label="Discovery interface">
                  <SSelect value="en0 · Wi-Fi · studio-wifi" options={["en0 · Wi-Fi · studio-wifi","en1 · Ethernet"]}/>
                </SField>
                <SField label="ICE policy">
                  <div className="mono dim" style={{fontSize:12}}>host candidates only · no STUN/TURN · iceTransportPolicy: "all"</div>
                </SField>
                <SField label="Signaling port">
                  <div className="mono dim" style={{fontSize:12}}>random ephemeral · currently <span style={{color:"var(--accent)"}}>{ME.port}</span></div>
                </SField>
              </div>
            )}
            {tab==="storage" && (
              <div className="col" style={{gap:14}}>
                <SField label="Download folder">
                  <div className="row" style={{gap:8}}>
                    <div className="mono" style={{flex:1,padding:"8px 10px",background:"var(--bg-2)",border:"1px solid var(--line)",borderRadius:8,fontSize:12}}>
                      ~/NetLink/Received
                    </div>
                    <button className="btn"><I.Folder size={13}/> Choose…</button>
                  </div>
                </SField>
                <SField label="Chat history" desc="Stored in local SQLite. Never leaves this machine.">
                  <div className="row" style={{gap:8}}>
                    <button className="btn"><I.Download size={13}/> Export…</button>
                    <button className="btn"><I.Trash size={13}/> Clear all</button>
                  </div>
                </SField>
              </div>
            )}
            {tab==="appearance" && (
              <div className="col" style={{gap:14}}>
                <SField label="Theme">
                  <div className="row" style={{gap:6}}>
                    {[["dark","Dark",I.Moon],["light","Light",I.Sun],["system","System",I.Cpu]].map(([k,label,Ic])=>(
                      <button key={k} onClick={()=>setDark(k==="dark"?true:k==="light"?false:dark)}
                        className="btn sm"
                        style={{
                          background: (k==="dark"&&dark) || (k==="light"&&!dark) ? "oklch(0.28 0.014 250)" : "transparent",
                          borderColor: "var(--line)"
                        }}>
                        <Ic size={13}/> {label}
                      </button>
                    ))}
                  </div>
                </SField>
                <SField label="Density">
                  <div className="row" style={{gap:6}}>
                    {["compact","regular","comfy"].map(d=>(
                      <button key={d} className="btn sm">{d}</button>
                    ))}
                  </div>
                </SField>
              </div>
            )}
            {tab==="advanced" && (
              <div className="col" style={{gap:14}}>
                <SField label="Bufferedamount thresholds">
                  <div className="mono dim" style={{fontSize:12}}>pause @ 8 MB · resume @ 2 MB</div>
                </SField>
                <SField label="Sliding window">
                  <div className="mono dim" style={{fontSize:12}}>max 8 chunks in flight · chunk size 64 KB</div>
                </SField>
                <SField label="Logs">
                  <button className="btn"><I.FileText size={13}/> Reveal log file</button>
                </SField>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SField({label, desc, children}){
  return (
    <div className="col" style={{gap:5}}>
      <div className="row" style={{justifyContent:"space-between"}}>
        <div style={{fontSize:12.5,fontWeight:600}}>{label}</div>
      </div>
      {desc && <div className="dim" style={{fontSize:11.5,lineHeight:1.45}}>{desc}</div>}
      <div style={{marginTop:4}}>{children}</div>
    </div>
  );
}

function SSelect({value, options}){
  const [v,setV] = React.useState(value);
  return (
    <select value={v} onChange={(e)=>setV(e.target.value)} style={{
      width:"100%",padding:"7px 10px",borderRadius:8,
      background:"var(--bg-2)",border:"1px solid var(--line)",color:"var(--text)",
      fontSize:13,fontFamily:"inherit",appearance:"none",
    }}>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  );
}

// ring animation
if (typeof document !== "undefined" && !document.getElementById("ring-anim")) {
  const s = document.createElement("style"); s.id = "ring-anim";
  s.textContent = `@keyframes ring{0%{transform:scale(.9);opacity:.6}100%{transform:scale(1.25);opacity:0}}`;
  document.head.appendChild(s);
}

Object.assign(window, { IncomingCallModal, SettingsModal, SField, SSelect });
