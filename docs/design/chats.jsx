// chats.jsx — Chats view (thread + input + DataChannel detail)

function MessageBubble({msg, peer}){
  const me = msg.who === "me";
  return (
    <div style={{
      display:"flex",
      flexDirection: me ? "row-reverse" : "row",
      gap:8,alignItems:"flex-end",
    }}>
      {!me && <Avatar peer={peer} size="sm" showStatus={false}/>}
      <div style={{maxWidth:"min(64ch, 70%)"}}>
        {msg.attach ? (
          <FileAttachment a={msg.attach} mine={me}/>
        ) : (
          <div style={{
            padding:"8px 12px",borderRadius:12,
            background: me ? "var(--accent)" : "oklch(0.26 0.012 250)",
            color: me ? "#0b0d10" : "var(--text)",
            fontSize:13.5, lineHeight:1.5,
            borderTopRightRadius: me?4:12,
            borderTopLeftRadius: me?12:4,
          }}>{msg.text}</div>
        )}
        <div className="mono" style={{
          display:"flex",justifyContent: me ? "flex-end" : "flex-start",
          gap:6,fontSize:10,color:"var(--text-mute)",marginTop:4,
        }}>
          <span>{msg.t}</span>
          {me && (
            <span style={{color: msg.state==="read" ? "var(--accent)" : "var(--text-mute)"}}>
              {msg.state==="read" ? "✓✓ read" : msg.state==="delivered" ? "✓✓ delivered" : "✓ sent"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function FileAttachment({a, mine}){
  return (
    <div style={{
      display:"flex",alignItems:"center",gap:10,
      padding:"10px 12px",borderRadius:12,
      background:"oklch(0.26 0.012 250)",border:"1px solid var(--line-soft)",
      borderTopRightRadius: mine?4:12,
      borderTopLeftRadius: mine?12:4,
    }}>
      <span style={{
        width:38,height:38,borderRadius:8,
        background:"oklch(0.22 0.04 30)",color:"var(--text)",
        display:"inline-flex",alignItems:"center",justifyContent:"center",
      }}>
        <I.FileText size={18}/>
      </span>
      <div className="col">
        <div style={{fontSize:13,fontWeight:500}}>{a.name}</div>
        <div className="mono dim" style={{fontSize:11}}>{a.size} · SHA-256 verified</div>
      </div>
      <button className="btn sm" style={{marginLeft:8}}><I.Download size={12}/> Save</button>
    </div>
  );
}

function ChatHeader({peer, onCall, onVideo, onMore, embedded}){
  return (
    <div style={{
      display:"flex",alignItems:"center",justifyContent:"space-between",
      padding: embedded ? "10px 12px" : "12px 18px",
      borderBottom:"1px solid var(--line-soft)",
      background: embedded ? "transparent" : "oklch(0.20 0.012 250)",
    }}>
      <div className="row" style={{gap:12}}>
        <Avatar peer={peer}/>
        <div className="col">
          <div className="row" style={{gap:8}}>
            <span style={{fontSize:14,fontWeight:600}}>{peer.name}</span>
            <span style={{
              display:"inline-flex",alignItems:"center",gap:4,
              fontSize:10.5,color:peer.status==="in-call"?"var(--warn)":"var(--accent)"
            }}>
              <span style={{width:6,height:6,borderRadius:3,background:"currentColor"}}/>
              {peer.status==="in-call" ? "in another call" : "connected · direct"}
            </span>
          </div>
          <div className="mono dim" style={{fontSize:10.5,marginTop:1}}>
            {peer.hostname} · {peer.ip}:{peer.port} · rtt {peer.ping}ms
          </div>
        </div>
      </div>
      {!embedded && (
        <div className="row" style={{gap:4}}>
          <button className="iconbtn" title="Voice call" onClick={onCall}><I.Phone size={15}/></button>
          <button className="iconbtn" title="Video call" onClick={onVideo}><I.Video size={15}/></button>
          <button className="iconbtn" title="Send file"><I.Paperclip size={15}/></button>
          <div style={{width:1,height:18,background:"var(--line-soft)",margin:"0 4px"}}/>
          <button className="iconbtn" title="More"><I.More size={15}/></button>
        </div>
      )}
    </div>
  );
}

function ChatsView({peer, messages, onSend, onCall, onVideo, embedded, showTech=true}){
  const [text, setText] = React.useState("");
  const scrollRef = React.useRef(null);

  React.useEffect(()=>{
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages.length, peer.id]);

  if (!peer) return null;
  const list = messages || [];

  return (
    <div style={{display:"grid",gridTemplateRows: embedded ? "auto 1fr auto" : "auto 1fr auto auto", height:"100%",minHeight:0}}>
      <ChatHeader peer={peer} onCall={onCall} onVideo={onVideo} embedded={embedded}/>

      <div ref={scrollRef} className="scroll" style={{
        overflowY:"auto",padding: embedded ? "14px 12px" : "18px 22px",
        display:"flex",flexDirection:"column",gap:10,
      }}>
        {/* Day separator */}
        <div style={{
          alignSelf:"center",fontSize:10.5,color:"var(--text-mute)",
          padding:"3px 10px",borderRadius:999,border:"1px solid var(--line-soft)",
          background:"var(--bg-2)",
        }}>Today</div>

        {/* Connection trace banner */}
        {showTech && (
          <div className="mono" style={{
            alignSelf:"center", padding:"6px 10px",
            border:"1px dashed var(--line)",borderRadius:8,
            fontSize:10.5,color:"var(--text-mute)",
            display:"inline-flex",gap:8,alignItems:"center",
          }}>
            <span style={{color:"var(--accent)"}}>●</span>
            DataChannel “chat” open · ordered, reliable · 64KB MTU
          </div>
        )}

        {list.map(m => <MessageBubble key={m.id} msg={m} peer={peer}/>)}

        {/* Typing indicator (sometimes) */}
        {peer.id === "8a4f-2bc1-9d7e-401a" && (
          <div className="row" style={{gap:8,marginTop:4}}>
            <Avatar peer={peer} size="sm" showStatus={false}/>
            <div style={{
              padding:"10px 14px",borderRadius:12,background:"oklch(0.26 0.012 250)",
              display:"inline-flex",gap:4,
            }}>
              <Dot delay={0}/><Dot delay={.15}/><Dot delay={.3}/>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{padding:"10px 14px",borderTop:"1px solid var(--line-soft)"}}>
        <div className="row" style={{
          background:"var(--surface)",border:"1px solid var(--line)",borderRadius:10,
          padding:"6px 8px",gap:6,
        }}>
          <button className="iconbtn"><I.Paperclip size={16}/></button>
          <input
            value={text} onChange={(e)=>setText(e.target.value)}
            onKeyDown={(e)=>{if(e.key==="Enter"&&text.trim()){onSend(text.trim());setText("");}}}
            placeholder={`Message ${peer.name}…`}
            style={{
              flex:1,background:"transparent",border:0,outline:0,
              color:"var(--text)",fontFamily:"var(--sans)",fontSize:13.5,padding:"6px 4px",
            }}
          />
          <button
            className={"btn sm primary"}
            style={{opacity: text.trim()?1:.45}}
            onClick={()=>{if(text.trim()){onSend(text.trim());setText("");}}}
          ><I.Send size={13}/> Send</button>
        </div>
      </div>

      {/* Tech footer for embedded? skip */}
      {!embedded && showTech && (
        <div className="mono" style={{
          padding:"6px 18px 10px",fontSize:10,color:"var(--text-mute)",
          display:"flex",justifyContent:"space-between",borderTop:"1px solid var(--line-soft)",
          background:"var(--bg-2)"
        }}>
          <span>e2e: WebRTC SRTP · DTLS-SRTP fingerprint matches</span>
          <span>chat DataChannel · {list.length} msgs · last ack 0.4s ago</span>
        </div>
      )}
    </div>
  );
}

function Dot({delay=0}){
  return (
    <span style={{
      width:6,height:6,borderRadius:3,background:"var(--text-dim)",
      animation:"bounce 1s ease-in-out infinite",animationDelay:`${delay}s`
    }}/>
  );
}

// add bounce keyframes once
if (typeof document !== "undefined" && !document.getElementById("chat-anim")) {
  const s = document.createElement("style"); s.id = "chat-anim";
  s.textContent = `@keyframes bounce{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-3px);opacity:1}}`;
  document.head.appendChild(s);
}

Object.assign(window, { ChatsView, ChatHeader, MessageBubble });
