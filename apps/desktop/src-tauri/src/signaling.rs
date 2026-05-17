use std::collections::HashMap;
use std::net::{IpAddr, SocketAddr};
use std::sync::Arc;

use anyhow::Result;
use futures_util::{SinkExt, StreamExt};
use mdns_sd::ServiceDaemon;
use serde::{Deserialize, Serialize};
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
    /// Primary advertised IP (first routable IPv4).  Kept as `String` for the
    /// `local-peer-info` UI pill.  For mDNS, `all_ips` is the source of truth.
    pub ip: String,
    /// All routable IPv4 addresses on this host.  Advertised together so peers
    /// on any reachable interface receive a usable address.
    pub all_ips: Vec<IpAddr>,
    pub port: u16,
    /// Active signaling channels keyed by remote peer_id.  Populated by both
    /// `connect_to_peer` (outbound dial) and `handle_incoming` (inbound accept),
    /// so a peer can reply to us even if it never managed to discover our
    /// `ip:port` over mDNS.
    pub connections: HashMap<String, mpsc::UnboundedSender<String>>,
    /// Kept alive here so advertising runs for the entire app lifetime.
    pub mdns_daemon: Option<ServiceDaemon>,
}

#[derive(Deserialize)]
struct InboundEnvelope {
    from_peer_id: String,
    payload: String,
}

#[derive(Serialize, Clone)]
struct InboundEventPayload {
    #[serde(rename = "fromPeerId")]
    from_peer_id: String,
    payload: String,
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
    peer_addr: SocketAddr,
    state: SignalingState,
    app: AppHandle,
) -> Result<()> {
    let ws = tokio_tungstenite::accept_async(stream).await?;
    let (mut write, mut read) = ws.split();

    // Outbound side: spawn a relay task that drains `rx` onto the WS write half.
    // `tx` is registered in `state.connections[remote_peer_id]` once we learn
    // the remote peer's id from the first envelope, so `send_message` can route
    // replies back through the same socket.
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    let write_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if write.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    let mut remote_peer_id: Option<String> = None;

    while let Some(msg) = read.next().await {
        let Ok(Message::Text(text)) = msg else { continue };

        let Ok(env) = serde_json::from_str::<InboundEnvelope>(&text) else {
            tracing::warn!("Signaling: malformed envelope from {peer_addr}: {text}");
            continue;
        };

        // Register tx in connections on first message (and overwrite later if the
        // remote re-uses the same socket for a new session — last-writer-wins).
        if remote_peer_id.as_deref() != Some(&env.from_peer_id) {
            let mut s = state.lock().await;
            s.connections.insert(env.from_peer_id.clone(), tx.clone());
            drop(s);
            tracing::info!(
                "Signaling: registered inbound channel for {} (from {peer_addr})",
                env.from_peer_id
            );
            remote_peer_id = Some(env.from_peer_id.clone());
        }

        let _ = app.emit(
            "signaling-message-received",
            InboundEventPayload {
                from_peer_id: env.from_peer_id,
                payload: env.payload,
            },
        );
    }

    // Socket closed — remove from connections only if this socket is still the
    // registered one (a fresher outbound dial may have replaced it).
    if let Some(id) = remote_peer_id {
        let mut s = state.lock().await;
        if let Some(existing) = s.connections.get(&id) {
            if existing.same_channel(&tx) {
                s.connections.remove(&id);
                tracing::info!("Signaling: inbound channel for {id} closed");
            }
        }
    }
    drop(tx);
    let _ = write_task.await;
    Ok(())
}

/// Initiate an outbound WebSocket connection to a peer's signaling server.
/// Idempotent: returns Ok immediately if a channel for `peer_id` already exists
/// (either an earlier outbound dial or an inbound socket accepted from this peer).
pub async fn connect_to_peer(
    address: String,
    peer_id: String,
    state: &SignalingState,
    app: AppHandle,
) -> Result<()> {
    if state.lock().await.connections.contains_key(&peer_id) {
        tracing::debug!("Signaling: connect_to_peer({peer_id}) — already connected, skipping");
        return Ok(());
    }

    let (ws, _) = connect_async(&address).await?;
    let (mut write, mut read) = ws.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();

    state.lock().await.connections.insert(peer_id.clone(), tx.clone());
    tracing::info!("Signaling: outbound channel established to {peer_id} at {address}");

    // Outbound relay
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if write.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    // Inbound relay — strip the {from_peer_id, payload} envelope before emitting.
    let state_for_cleanup = state.clone();
    let peer_id_for_relay = peer_id.clone();
    tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = read.next().await {
            let Ok(env) = serde_json::from_str::<InboundEnvelope>(&text) else {
                tracing::warn!("Signaling: malformed envelope on outbound socket to {peer_id_for_relay}: {text}");
                continue;
            };
            let _ = app.emit(
                "signaling-message-received",
                InboundEventPayload {
                    from_peer_id: env.from_peer_id,
                    payload: env.payload,
                },
            );
        }

        // Socket closed — drop our entry if it's still the one we registered.
        let mut s = state_for_cleanup.lock().await;
        if let Some(existing) = s.connections.get(&peer_id_for_relay) {
            if existing.same_channel(&tx) {
                s.connections.remove(&peer_id_for_relay);
                tracing::info!("Signaling: outbound channel to {peer_id_for_relay} closed");
            }
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
    let all_ips = detect_lan_ipv4s();
    let ip = all_ips
        .first()
        .map(|a| a.to_string())
        .unwrap_or_else(|| "127.0.0.1".to_string());

    tracing::info!("Local LAN IPv4 addresses: {:?}", all_ips);

    SignalingInner {
        peer_id,
        display_name,
        hostname,
        ip,
        all_ips,
        port: 0,
        connections: HashMap::new(),
        mdns_daemon: None,
    }
}

/// Enumerate all IPv4 interface addresses that are usable on a LAN: skips
/// loopback, link-local (169.254.x), unspecified, and broadcast.  Falls back to
/// `local_ip_address::local_ip()` if the per-interface lookup returns nothing.
fn detect_lan_ipv4s() -> Vec<IpAddr> {
    let mut ips: Vec<IpAddr> = match local_ip_address::list_afinet_netifas() {
        Ok(list) => list
            .into_iter()
            .filter_map(|(_, ip)| match ip {
                IpAddr::V4(v4)
                    if !v4.is_loopback()
                        && !v4.is_link_local()
                        && !v4.is_unspecified()
                        && !v4.is_broadcast() =>
                {
                    Some(IpAddr::V4(v4))
                }
                _ => None,
            })
            .collect(),
        Err(_) => Vec::new(),
    };

    if ips.is_empty() {
        if let Ok(ip) = local_ip_address::local_ip() {
            ips.push(ip);
        }
    }
    ips
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
