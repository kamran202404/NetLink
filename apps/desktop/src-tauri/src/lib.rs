mod commands;
mod mdns;
mod signaling;

use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Manager;

use signaling::SignalingState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("netlink_desktop_lib=info")),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_local_peer_info,
            commands::set_display_name,
            commands::start_mdns_advertising,
            commands::stop_mdns,
            commands::get_local_signaling_address,
            commands::connect_to_signaling,
            commands::send_signaling_message,
            commands::get_setting,
            commands::set_setting,
        ])
        .setup(|app| {
            use tauri_plugin_store::StoreExt;

            // --- 1. Load or generate stable identity ---
            let store = app.store("settings.json")?;

            let peer_id = store
                .get("peer_id")
                .and_then(|v| v.as_str().map(String::from))
                .unwrap_or_else(|| {
                    let id = signaling::new_peer_id();
                    store.set("peer_id", serde_json::json!(id.clone()));
                    let _ = store.save();
                    id
                });

            let display_name = store
                .get("display_name")
                .and_then(|v| v.as_str().map(String::from))
                .unwrap_or_else(|| "NetLink User".to_string());

            // --- 2. Build state and create the ONE shared mDNS daemon ---
            // A single ServiceDaemon is used for both advertising and browsing.
            // Two separate daemons on the same machine both bind to port 5353;
            // the OS then delivers incoming multicast to whichever it picks,
            // causing asymmetric discovery (B can't see A half the time).
            let inner = signaling::build_inner(peer_id, display_name);
            let state: SignalingState = Arc::new(Mutex::new(inner));

            let mdns_daemon = mdns_sd::ServiceDaemon::new()
                .expect("Failed to create mDNS daemon");
            state.blocking_lock().mdns_daemon = Some(mdns_daemon);

            app.manage(state.clone());

            // --- 3. Bind signaling server → advertise → run accept loop ---
            let handle = app.handle().clone();
            let state_srv = state.clone();
            tauri::async_runtime::spawn(async move {
                match signaling::init_server(&state_srv).await {
                    Ok(listener) => {
                        if let Err(e) = mdns::start_advertising(&state_srv).await {
                            tracing::error!("mDNS advertising error: {e}");
                        }
                        if let Err(e) = signaling::run_server(listener, state_srv, handle).await {
                            tracing::error!("Signaling server error: {e}");
                        }
                    }
                    Err(e) => tracing::error!("Failed to bind signaling server: {e}"),
                }
            });

            // --- 4. mDNS browser (uses the same shared daemon) ---
            let handle = app.handle().clone();
            let local_peer_id = state.blocking_lock().peer_id.clone();
            let state_browser = state.clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = mdns::start_browser(handle, state_browser, local_peer_id).await {
                    tracing::error!("mDNS browser error: {e}");
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
