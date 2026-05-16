mod commands;
mod mdns;
mod signaling;


#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
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
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            // Start mDNS browser in a background task so peers are
            // discovered as soon as the app opens.
            tauri::async_runtime::spawn(async move {
                if let Err(e) = mdns::start_browser(handle).await {
                    tracing::error!("mDNS browser error: {e}");
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
