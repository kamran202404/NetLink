use std::collections::HashMap;

use anyhow::Result;
use mdns_sd::{ServiceDaemon, ServiceEvent, ServiceInfo};
use tauri::{AppHandle, Emitter};

use crate::signaling::SignalingState;

const SERVICE_TYPE: &str = "_p2pchat._tcp.local.";

#[derive(serde::Serialize, Clone)]
struct PeerDiscoveredPayload {
    id: String,
    name: String,
    hostname: String,
    address: String,
    port: u16,
}

#[derive(serde::Serialize, Clone)]
struct PeerLostPayload {
    id: String,
}

/// Continuously browses for peers advertising `_p2pchat._tcp.local.` and emits
/// `peer-discovered` / `peer-lost` events to the frontend.
pub async fn start_browser(app: AppHandle) -> Result<()> {
    let mdns = ServiceDaemon::new()?;
    let receiver = mdns.browse(SERVICE_TYPE)?;

    // Maps mDNS fullname → peer_id so ServiceRemoved can emit the correct id.
    let mut peer_id_by_fullname: HashMap<String, String> = HashMap::new();

    loop {
        match receiver.recv_async().await? {
            ServiceEvent::ServiceResolved(info) => {
                let id = info
                    .get_property_val_str("peer_id")
                    .unwrap_or("")
                    .to_string();
                if !id.is_empty() {
                    peer_id_by_fullname.insert(info.get_fullname().to_string(), id.clone());
                }
                let name = info
                    .get_property_val_str("display_name")
                    .unwrap_or(info.get_hostname())
                    .to_string();
                // mDNS hostnames include a trailing dot; strip it.
                let hostname = info.get_hostname().trim_end_matches('.').to_string();
                let address = info
                    .get_addresses()
                    .iter()
                    .next()
                    .map(|a| a.to_string())
                    .unwrap_or_default();
                let port = info.get_port();

                let _ = app.emit(
                    "peer-discovered",
                    PeerDiscoveredPayload { id, name, hostname, address, port },
                );
            }
            ServiceEvent::ServiceRemoved(_, fullname) => {
                // Prefer the peer_id stored during ServiceResolved; fall back to
                // splitting the fullname on '.' (peer_ids are UUIDs, no dots).
                let id = peer_id_by_fullname
                    .remove(&fullname)
                    .unwrap_or_else(|| {
                        fullname
                            .splitn(2, '.')
                            .next()
                            .unwrap_or(&fullname)
                            .to_string()
                    });
                let _ = app.emit("peer-lost", PeerLostPayload { id });
            }
            _ => {}
        }
    }
}

/// Advertises this instance on the LAN under `_p2pchat._tcp.local.`.
/// Reads peer_id, display_name, hostname, ip, and port from `state`.
/// Must be called after `signaling::init_server` has assigned the port.
pub async fn start_advertising(state: &SignalingState) -> Result<()> {
    let s = state.lock().await;
    let mdns = ServiceDaemon::new()?;

    let mut props = HashMap::new();
    props.insert("peer_id".to_string(), s.peer_id.clone());
    props.insert("display_name".to_string(), s.display_name.clone());

    let service = ServiceInfo::new(
        SERVICE_TYPE,
        &s.peer_id,
        &s.hostname,
        s.ip.as_str(),
        s.port,
        props,
    )?;
    mdns.register(service)?;
    tracing::info!(
        "mDNS: advertising as '{}' on {}:{} (peer_id={})",
        s.display_name,
        s.ip,
        s.port,
        s.peer_id
    );
    Ok(())
}
