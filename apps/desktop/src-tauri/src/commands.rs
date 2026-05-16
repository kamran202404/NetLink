use serde::Serialize;
use tauri::State;

use crate::signaling::SignalingState;

#[derive(Serialize)]
pub struct LocalPeerInfo {
    pub id: String,
    pub name: String,
    pub hostname: String,
    pub ip: String,
    pub port: u16,
}

#[tauri::command]
pub async fn get_local_peer_info(
    state: State<'_, SignalingState>,
) -> Result<LocalPeerInfo, String> {
    let s = state.inner().lock().await;
    Ok(LocalPeerInfo {
        id: s.peer_id.clone(),
        name: s.display_name.clone(),
        hostname: s.hostname.clone(),
        ip: s.ip.clone(),
        port: s.port,
    })
}

#[tauri::command]
pub async fn set_display_name(
    name: String,
    state: State<'_, SignalingState>,
) -> Result<(), String> {
    state.inner().lock().await.display_name = name;
    Ok(())
}

/// Restart mDNS advertising (e.g. after a display name change).
/// The signaling server must already be running (port must be non-zero).
#[tauri::command]
pub async fn start_mdns_advertising(
    state: State<'_, SignalingState>,
) -> Result<(), String> {
    crate::mdns::start_advertising(state.inner())
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_mdns(_state: State<'_, SignalingState>) -> Result<(), String> {
    // mdns-sd daemon stops when the ServiceDaemon is dropped.
    // A future enhancement can track the daemon handle here.
    Ok(())
}

#[tauri::command]
pub async fn get_local_signaling_address(
    state: State<'_, SignalingState>,
) -> Result<String, String> {
    let s = state.inner().lock().await;
    Ok(format!("ws://{}:{}", s.ip, s.port))
}

#[tauri::command]
pub async fn connect_to_signaling(
    address: String,
    peer_id: String,
    state: State<'_, SignalingState>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    crate::signaling::connect_to_peer(address, peer_id, state.inner(), app)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_signaling_message(
    peer_id: String,
    payload: String,
    state: State<'_, SignalingState>,
) -> Result<(), String> {
    crate::signaling::send_message(peer_id, payload, state.inner())
        .await
        .map_err(|e| e.to_string())
}
