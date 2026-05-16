use anyhow::Result;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use tauri::{AppHandle, Emitter, State};

use crate::signaling::SignalingState;

const SERVICE_TYPE: &str = "_p2pchat._tcp.local.";

#[derive(serde::Serialize, Clone)]
struct PeerDiscoveredPayload {
    id: String,
    name: String,
    address: String,
    port: u16,
}

#[derive(serde::Serialize, Clone)]
struct PeerLostPayload {
    id: String,
}

pub async fn start_browser(app: AppHandle) -> Result<()> {
    let mdns = ServiceDaemon::new()?;
    let receiver = mdns.browse(SERVICE_TYPE)?;

    loop {
        let event = receiver.recv_async().await?;
        match event {
            ServiceEvent::ServiceResolved(info) => {
                let id = info.get_property_val_str("peer_id").unwrap_or("").to_string();
                let name = info.get_property_val_str("display_name").unwrap_or(info.get_hostname()).to_string();
                let address = info
                    .get_addresses()
                    .iter()
                    .next()
                    .map(|a| a.to_string())
                    .unwrap_or_default();
                let port = info.get_port();

                let _ = app.emit("peer-discovered", PeerDiscoveredPayload { id, name, address, port });
            }
            ServiceEvent::ServiceRemoved(_, fullname) => {
                // Use the fullname as the id fallback; real id would come from TXT record
                let _ = app.emit("peer-lost", PeerLostPayload { id: fullname });
            }
            _ => {}
        }
    }
}

pub async fn start_advertising(port: u16, state: State<'_, SignalingState>) -> Result<()> {
    let s = state.inner().lock().await;
    let mdns = ServiceDaemon::new()?;
    let mut props = std::collections::HashMap::new();
    props.insert("peer_id".to_string(), s.peer_id.clone());
    props.insert("display_name".to_string(), s.display_name.clone());
    let service = ServiceInfo::new(
        SERVICE_TYPE,
        &s.peer_id,
        &s.hostname,
        s.ip.as_str(),
        port,
        props,
    )?;
    mdns.register(service)?;
    Ok(())
}

pub async fn stop_advertising(_state: State<'_, SignalingState>) {
    // mdns-sd daemon is dropped when the state is cleaned up; explicit unregister can be added here
}
