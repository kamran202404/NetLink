use std::collections::HashMap;
use std::net::IpAddr;
use std::time::Instant;

use anyhow::Result;
use mdns_sd::{ServiceEvent, ServiceInfo};
use tauri::{AppHandle, Emitter};

use crate::signaling::SignalingState;

pub const SERVICE_TYPE: &str = "_p2pchat._tcp.local.";

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

/// Registers this instance on the LAN under `_p2pchat._tcp.local.` using the
/// single shared `ServiceDaemon` stored in `state`.  Must be called after
/// `signaling::init_server` has set the port.
pub async fn start_advertising(state: &SignalingState) -> Result<()> {
    let s = state.lock().await;

    let mdns = s.mdns_daemon.as_ref()
        .ok_or_else(|| anyhow::anyhow!("mDNS daemon not initialised — call init_daemon first"))?;

    let mut props = HashMap::new();
    props.insert("peer_id".to_string(), s.peer_id.clone());
    props.insert("display_name".to_string(), s.display_name.clone());

    let hostname = if s.hostname.ends_with(".local.") {
        s.hostname.clone()
    } else if s.hostname.ends_with(".local") {
        format!("{}.", s.hostname)
    } else {
        format!("{}.local.", s.hostname)
    };

    // Advertise EVERY routable IPv4.  A single-IP advertisement breaks asymmetric
    // discovery on hosts with multiple interfaces: the peer may receive the
    // multicast announcement on a different interface than the one whose address
    // we advertised, and end up unable to dial back.
    let addrs: Vec<IpAddr> = if s.all_ips.is_empty() {
        vec![s.ip.parse().unwrap_or(IpAddr::V4(std::net::Ipv4Addr::LOCALHOST))]
    } else {
        s.all_ips.clone()
    };

    let service = ServiceInfo::new(
        SERVICE_TYPE,
        &s.peer_id,
        &hostname,
        &addrs[..],
        s.port,
        props,
    )?;

    mdns.register(service)?;
    tracing::info!(
        "mDNS: advertising as '{}' on {:?}:{} (peer_id={})",
        s.display_name, addrs, s.port, s.peer_id
    );
    Ok(())
}

/// Browses for peers using the single shared `ServiceDaemon` from `state`.
/// Filters out the local peer via `local_peer_id`.
/// Emits `peer-discovered` / `peer-lost` Tauri events to the frontend.
pub async fn start_browser(
    app: AppHandle,
    state: SignalingState,
    local_peer_id: String,
) -> Result<()> {
    // Grab the receiver while holding the lock briefly; release before looping.
    let receiver = {
        let s = state.lock().await;
        let mdns = s.mdns_daemon.as_ref()
            .ok_or_else(|| anyhow::anyhow!("mDNS daemon not initialised"))?;
        mdns.browse(SERVICE_TYPE)?
    };

    // fullname → peer_id, so ServiceRemoved can emit the right id.
    let mut peer_id_by_fullname: HashMap<String, String> = HashMap::new();
    // peer_id → last-resolved instant; suppresses spurious peer-lost on restart.
    let mut last_resolved: HashMap<String, Instant> = HashMap::new();

    tracing::info!("mDNS: browser started, watching for {SERVICE_TYPE}");
    loop {
        match receiver.recv_async().await? {
            ServiceEvent::ServiceFound(_, fullname) => {
                tracing::debug!("mDNS: found (unresolved) {fullname}");
            }

            ServiceEvent::ServiceResolved(info) => {
                let id = info
                    .get_property_val_str("peer_id")
                    .unwrap_or("")
                    .to_string();

                if id == local_peer_id {
                    tracing::debug!("mDNS: skipping self ({id})");
                    continue;
                }

                let raw_addrs: Vec<IpAddr> =
                    info.get_addresses().iter().copied().collect();
                tracing::info!(
                    "mDNS: resolved {} — id={:?} addrs={:?} port={}",
                    info.get_fullname(), id, raw_addrs, info.get_port()
                );

                if !id.is_empty() {
                    peer_id_by_fullname.insert(info.get_fullname().to_string(), id.clone());
                    last_resolved.insert(id.clone(), Instant::now());
                }

                let name = info
                    .get_property_val_str("display_name")
                    .unwrap_or(info.get_hostname())
                    .to_string();
                let hostname = info.get_hostname().trim_end_matches('.').to_string();
                let address = pick_best_address(&raw_addrs);
                if address.is_empty() {
                    tracing::warn!(
                        "mDNS: no usable address among {:?} for peer {id}, skipping",
                        raw_addrs
                    );
                    continue;
                }
                let port = info.get_port();

                let _ = app.emit(
                    "peer-discovered",
                    PeerDiscoveredPayload { id, name, hostname, address, port },
                );
            }

            ServiceEvent::ServiceRemoved(_, fullname) => {
                tracing::info!("mDNS: service removed {fullname}");
                let id = peer_id_by_fullname
                    .remove(&fullname)
                    .unwrap_or_else(|| {
                        fullname.splitn(2, '.').next().unwrap_or(&fullname).to_string()
                    });

                // Suppress removal if the peer re-resolved within the last 3 s.
                // This prevents a peer disappearing when it restarts and the
                // goodbye packet for the old registration arrives after the new one.
                let recently_resolved = last_resolved
                    .get(&id)
                    .map(|t| t.elapsed().as_secs() < 3)
                    .unwrap_or(false);

                if recently_resolved {
                    tracing::debug!("mDNS: suppressing peer-lost for {id} (re-resolved recently)");
                } else {
                    last_resolved.remove(&id);
                    let _ = app.emit("peer-lost", PeerLostPayload { id });
                }
            }

            other => {
                tracing::debug!("mDNS: browser event {:?}", other);
            }
        }
    }
}

/// Choose the address most likely to be reachable from us.  Prefers routable
/// IPv4 (private LAN ranges), then any other IPv4, then IPv6 (skipping link-
/// local since those require a scope id).  Returns "" if nothing usable.
fn pick_best_address(addrs: &[IpAddr]) -> String {
    let mut routable_v4 = None;
    let mut any_v4 = None;
    let mut any_v6 = None;
    for ip in addrs {
        match ip {
            IpAddr::V4(v4) if !v4.is_loopback() && !v4.is_link_local() && !v4.is_unspecified() => {
                let is_private = v4.is_private();
                if is_private && routable_v4.is_none() {
                    routable_v4 = Some(*ip);
                }
                if any_v4.is_none() {
                    any_v4 = Some(*ip);
                }
            }
            IpAddr::V6(v6)
                if !v6.is_loopback() && !v6.is_unspecified() && !is_ipv6_link_local(v6) =>
            {
                if any_v6.is_none() {
                    any_v6 = Some(*ip);
                }
            }
            _ => {}
        }
    }
    routable_v4
        .or(any_v4)
        .or(any_v6)
        .map(|ip| ip.to_string())
        .unwrap_or_default()
}

fn is_ipv6_link_local(v6: &std::net::Ipv6Addr) -> bool {
    let seg = v6.segments()[0];
    (seg & 0xffc0) == 0xfe80
}
