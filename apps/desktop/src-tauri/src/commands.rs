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

#[tauri::command]
pub async fn start_mdns_advertising(
    port: u16,
    state: State<'_, SignalingState>,
) -> Result<(), String> {
    crate::mdns::start_advertising(port, state).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_mdns(state: State<'_, SignalingState>) -> Result<(), String> {
    crate::mdns::stop_advertising(state).await;
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
    crate::signaling::connect_to_peer(address, peer_id, state, app)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn send_signaling_message(
    peer_id: String,
    payload: String,
    state: State<'_, SignalingState>,
) -> Result<(), String> {
    crate::signaling::send_message(peer_id, payload, state)
        .await
        .map_err(|e| e.to_string())
}
