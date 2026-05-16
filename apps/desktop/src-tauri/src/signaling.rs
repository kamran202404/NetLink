use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;

use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tokio::net::TcpListener;
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
}

impl SignalingInner {
    pub fn new() -> Self {
        let peer_id = Uuid::new_v4().to_string();
        let hostname = std::env::var("HOSTNAME")
            .or_else(|_| std::env::var("COMPUTERNAME"))
            .unwrap_or_else(|_| "unknown.local".into());
        // TODO: replace with real local IP detection
        let ip = "127.0.0.1".to_string();
        Self {
            peer_id,
            display_name: "NetLink User".into(),
            hostname,
            ip,
            port: 0, // assigned after bind
            connections: HashMap::new(),
        }
    }
}

/// Starts the local WebSocket signaling server on a random port.
/// Call once at app startup; the assigned port is stored in `SignalingInner.port`.
pub async fn start_server(state: SignalingState, app: AppHandle) -> Result<()> {
    let listener = TcpListener::bind("0.0.0.0:0").await?;
    let addr: SocketAddr = listener.local_addr()?;
    state.lock().await.port = addr.port();

    tracing::info!("Signaling server listening on {addr}");

    loop {
        let (stream, peer_addr) = listener.accept().await?;
        let state = state.clone();
        let app = app.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_incoming(stream, peer_addr, state, app).await {
                tracing::warn!("Signaling connection error: {e}");
            }
        });
    }
}

async fn handle_incoming(
    stream: tokio::net::TcpStream,
    _peer_addr: SocketAddr,
    state: SignalingState,
    app: AppHandle,
) -> Result<()> {
    let ws = tokio_tungstenite::accept_async(stream).await?;
    let (mut write, mut read) = ws.split();

    while let Some(msg) = read.next().await {
        let msg = msg?;
        if let Message::Text(text) = msg {
            #[derive(serde::Deserialize)]
            struct Envelope { from_peer_id: String, payload: String }

            if let Ok(env) = serde_json::from_str::<Envelope>(&text) {
                #[derive(Serialize, Clone)]
                struct EventPayload { #[serde(rename = "fromPeerId")] from_peer_id: String, payload: String }
                let _ = app.emit("signaling-message-received", EventPayload {
                    from_peer_id: env.from_peer_id,
                    payload: env.payload,
                });
            }
        }
    }
    Ok(())
}

pub async fn connect_to_peer(
    address: String,
    peer_id: String,
    state: State<'_, SignalingState>,
    app: AppHandle,
) -> Result<()> {
    let (ws, _) = connect_async(&address).await?;
    let (mut write, mut read) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    state.lock().await.connections.insert(peer_id.clone(), tx);

    // Outbound relay
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let _ = write.send(Message::Text(msg)).await;
        }
    });

    // Inbound relay
    tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = read.next().await {
            #[derive(Serialize, Clone)]
            struct EventPayload { #[serde(rename = "fromPeerId")] from_peer_id: String, payload: String }
            let _ = app.emit("signaling-message-received", EventPayload {
                from_peer_id: peer_id.clone(),
                payload: text,
            });
        }
    });

    Ok(())
}

pub async fn send_message(
    peer_id: String,
    payload: String,
    state: State<'_, SignalingState>,
) -> Result<()> {
    let s = state.lock().await;
    if let Some(tx) = s.connections.get(&peer_id) {
        tx.send(payload)?;
    }
    Ok(())
}
