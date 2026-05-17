use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::Result;
use futures_util::StreamExt;
use mdns_sd::ServiceDaemon;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message};
use uuid::Uuid;

pub type SignalingState = Arc<Mutex<SignalingInner>>;

pub struct SignalingInner {
    pub peer_id: String,
    pub display_name: String,
    pub hostname: String,
    pub ip: String,
    pub port: u16,
    /// Outbound message senders keyed by remote peer_id
    pub connections: HashMap<String, mpsc::UnboundedSender<String>>,
    /// Kept alive here so advertising runs for the entire app lifetime.
    pub mdns_daemon: Option<ServiceDaemon>,
}

/// Binds the WebSocket listener on a random LAN port and stores the assigned port in state.
/// Returns the bound listener so the caller can drive it with `run_server`.
pub async fn init_server(state: &SignalingState) -> Result<TcpListener> {
    let listener = TcpListener::bind("0.0.0.0:0").await?;
    let port = listener.local_addr()?.port();
    state.lock().await.port = port;
    tracing::info!("Signaling server bound on port {port}");
    Ok(listener)
}

/// Accept loop — runs forever. Spawn this in a background task after calling `init_server`.
pub async fn run_server(listener: TcpListener, state: SignalingState, app: AppHandle) -> Result<()> {
    loop {
        let (stream, peer_addr) = listener.accept().await?;
        let state = state.clone();
        let app = app.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_incoming(stream, peer_addr, state, app).await {
                tracing::warn!("Signaling connection error from {peer_addr}: {e}");
            }
        });
    }
}

async fn handle_incoming(
    stream: TcpStream,
    _peer_addr: SocketAddr,
    _state: SignalingState,
    app: AppHandle,
) -> Result<()> {
    let ws = tokio_tungstenite::accept_async(stream).await?;
    let (_write, mut read) = ws.split();

    while let Some(msg) = read.next().await {
        if let Message::Text(text) = msg? {
            #[derive(serde::Deserialize)]
            struct Envelope {
                from_peer_id: String,
                payload: String,
            }

            if let Ok(env) = serde_json::from_str::<Envelope>(&text) {
                #[derive(Serialize, Clone)]
                struct EventPayload {
                    #[serde(rename = "fromPeerId")]
                    from_peer_id: String,
                    payload: String,
                }
                let _ = app.emit(
                    "signaling-message-received",
                    EventPayload {
                        from_peer_id: env.from_peer_id,
                        payload: env.payload,
                    },
                );
            }
        }
    }
    Ok(())
}

/// Initiate an outbound WebSocket connection to a peer's signaling server.
pub async fn connect_to_peer(
    address: String,
    peer_id: String,
    state: &SignalingState,
    app: AppHandle,
) -> Result<()> {
    let (ws, _) = connect_async(&address).await?;
    let (mut write, mut read) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    state.lock().await.connections.insert(peer_id.clone(), tx);

    // Outbound relay
    tokio::spawn(async move {
        use futures_util::SinkExt;
        while let Some(msg) = rx.recv().await {
            let _ = write.send(Message::Text(msg)).await;
        }
    });

    // Inbound relay
    tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = read.next().await {
            #[derive(Serialize, Clone)]
            struct EventPayload {
                #[serde(rename = "fromPeerId")]
                from_peer_id: String,
                payload: String,
            }
            let _ = app.emit(
                "signaling-message-received",
                EventPayload {
                    from_peer_id: peer_id.clone(),
                    payload: text,
                },
            );
        }
    });

    Ok(())
}

/// Send a signaling message to a connected peer.
/// Wraps `payload` in the envelope `handle_incoming` expects:
///   { "from_peer_id": "<local id>", "payload": "<raw payload>" }
pub async fn send_message(peer_id: String, payload: String, state: &SignalingState) -> Result<()> {
    let s = state.lock().await;
    if let Some(tx) = s.connections.get(&peer_id) {
        let envelope = serde_json::json!({
            "from_peer_id": s.peer_id,
            "payload": payload,
        })
        .to_string();
        tx.send(envelope)?;
    }
    Ok(())
}

/// Build the initial SignalingInner. Called once in lib.rs setup.
pub fn build_inner(peer_id: String, display_name: String) -> SignalingInner {
    let hostname = detect_hostname();
    let ip = local_ip_address::local_ip()
        .map(|a| a.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    SignalingInner {
        peer_id,
        display_name,
        hostname,
        ip,
        port: 0,
        connections: HashMap::new(),
        mdns_daemon: None,
    }
}

fn detect_hostname() -> String {
    if let Ok(h) = std::env::var("HOSTNAME") {
        return h;
    }
    if let Ok(h) = std::fs::read_to_string("/etc/hostname") {
        let trimmed = h.trim().to_string();
        if !trimmed.is_empty() {
            return trimmed;
        }
    }
    std::process::Command::new("hostname")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "unknown.local".to_string())
}

/// Generate a new peer UUID.
pub fn new_peer_id() -> String {
    Uuid::new_v4().to_string()
}
