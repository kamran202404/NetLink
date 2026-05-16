// data.jsx — mock state and helpers

const ME = {
  id: "p1f2-3a9b-c4d5-e6f0",
  name: "Mira K.",
  hostname: "mira-mbp.local",
  ip: "192.168.1.42",
  port: 51874,
  os: "macOS 14.4",
  initials: "MK",
  color: "oklch(0.82 0.16 165)",
};

const PEERS = [
  {
    id: "8a4f-2bc1-9d7e-401a",
    name: "Daniel Hu",
    hostname: "daniel-thinkpad.local",
    ip: "192.168.1.51", port: 49231, os: "Linux", initials: "DH",
    color: "oklch(0.78 0.13 35)", status: "online",
    signal: 4, ping: 3, lastSeen: "now", unread: 2,
  },
  {
    id: "f019-cc20-7a3b-8845",
    name: "Sora Tanaka",
    hostname: "sora-precision.local",
    ip: "192.168.1.78", port: 52001, os: "Windows 11", initials: "ST",
    color: "oklch(0.75 0.13 280)", status: "in-call",
    signal: 4, ping: 5, lastSeen: "now", unread: 0,
  },
  {
    id: "26c3-1118-bb0e-9911",
    name: "Júlia Almeida",
    hostname: "julia-mbp.local",
    ip: "192.168.1.66", port: 50112, os: "macOS 14.2", initials: "JA",
    color: "oklch(0.80 0.13 80)", status: "online",
    signal: 3, ping: 8, lastSeen: "now", unread: 0,
  },
  {
    id: "7715-90fa-ab32-cc01",
    name: "Studio NAS",
    hostname: "studio-nas.local",
    ip: "192.168.1.10", port: 51200, os: "Linux", initials: "NA",
    color: "oklch(0.75 0.10 220)", status: "online",
    signal: 4, ping: 1, lastSeen: "now", unread: 0,
    isService: true,
  },
  {
    id: "31df-2200-49ee-7780",
    name: "Marco Bianchi",
    hostname: "marco-laptop.local",
    ip: "192.168.1.92", port: 50988, os: "Windows 10", initials: "MB",
    color: "oklch(0.78 0.13 12)", status: "idle",
    signal: 2, ping: 22, lastSeen: "2m", unread: 0,
  },
  {
    id: "9921-baf0-1c33-66de",
    name: "Aiyana Cloud",
    hostname: "aiyana-fedora.local",
    ip: "192.168.1.103", port: 51331, os: "Linux", initials: "AC",
    color: "oklch(0.80 0.13 175)", status: "idle",
    signal: 3, ping: 11, lastSeen: "5m", unread: 0,
  },
];

// Chat threads keyed by peer id
const MESSAGES = {
  "8a4f-2bc1-9d7e-401a": [
    { id:"m1", who:"them", t:"10:14", text:"hey, you on?", state:"read"},
    { id:"m2", who:"me",   t:"10:14", text:"yep — about to start the kickoff", state:"read"},
    { id:"m3", who:"them", t:"10:15", text:"sending you the latest deck so you can pull it up locally — no cloud, file's 84 mb 😅", state:"read"},
    { id:"m4", who:"them", t:"10:15", text:"", state:"read", attach: { name:"kickoff-v3.key", size:"84.2 MB", kind:"keynote" }},
    { id:"m5", who:"me",   t:"10:16", text:"got it, hash matches. let's hop on a call when you're ready", state:"delivered"},
    { id:"m6", who:"them", t:"10:16", text:"calling now", state:"read"},
  ],
  "f019-cc20-7a3b-8845": [
    { id:"m1", who:"them", t:"09:02", text:"morning! coffee before standup?", state:"read"},
    { id:"m2", who:"me",   t:"09:03", text:"yes pls. on my way down", state:"read"},
  ],
  "26c3-1118-bb0e-9911": [
    { id:"m1", who:"me",   t:"yest", text:"need the raw footage from sat shoot when you're free", state:"read"},
    { id:"m2", who:"them", t:"yest", text:"queuing it up — 12 gb, gonna leave the box on overnight to push", state:"read"},
  ],
  "7715-90fa-ab32-cc01": [],
  "31df-2200-49ee-7780": [
    { id:"m1", who:"them", t:"Mon", text:"left you the revised contract on shared drive", state:"read"},
  ],
  "9921-baf0-1c33-66de": [],
};

// Active and completed file transfers
const TRANSFERS = [
  {
    id:"t-9d2a",
    name:"kickoff-v3.key",
    size: 84.2 * 1024 * 1024,
    sent: 0.62,
    direction:"in",
    peerId:"8a4f-2bc1-9d7e-401a",
    speed: 11.4, // MB/s
    chunks:{ total: 1347, done: 836, inflight: 8 },
    sha:"a3f9c2b8e1d04f7e23b8...c41a",
    state:"transferring",
    eta: 5,
  },
  {
    id:"t-71fb",
    name:"raw_footage_sat.zip",
    size: 12.4 * 1024 * 1024 * 1024,
    sent: 0.18,
    direction:"in",
    peerId:"26c3-1118-bb0e-9911",
    speed: 28.6,
    chunks:{ total: 203_456, done: 36_622, inflight: 8 },
    sha:"7c1d9a44b22f1e0a98b7...e0fa",
    state:"transferring",
    eta: 380,
  },
  {
    id:"t-22aa",
    name:"weekly-notes.md",
    size: 14_233,
    sent: 1,
    direction:"out",
    peerId:"f019-cc20-7a3b-8845",
    speed: 0,
    chunks:{ total: 1, done: 1, inflight: 0 },
    sha:"e91f...77a3",
    state:"complete",
    eta: 0,
  },
  {
    id:"t-44c1",
    name:"build-artifact-2026-05-12.tar.zst",
    size: 412 * 1024 * 1024,
    sent: 1,
    direction:"out",
    peerId:"26c3-1118-bb0e-9911",
    speed: 0,
    chunks:{ total: 6594, done: 6594, inflight: 0 },
    sha:"55c4...ab02",
    state:"complete",
    eta: 0,
  },
  {
    id:"t-55de",
    name:"design-system-v2.zip",
    size: 38 * 1024 * 1024,
    sent: 0,
    direction:"in",
    peerId:"31df-2200-49ee-7780",
    speed: 0,
    chunks:{ total: 609, done: 0, inflight: 0 },
    sha:"d10e...0091",
    state:"offered",
    eta: 0,
  },
];

// Helpers
function fmtBytes(b){
  if (b < 1024) return `${b} B`;
  const u = ["KB","MB","GB","TB"];
  let n = b/1024, i=0;
  while (n >= 1024 && i < u.length-1){ n/=1024; i++; }
  return `${n.toFixed(n<10?2:1)} ${u[i]}`;
}
function fmtEta(s){
  if (!s) return "—";
  if (s < 60) return `${Math.round(s)}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${Math.round(s%60)}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}
function fmtDuration(s){
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = s%60;
  const pad = (n)=>String(n).padStart(2,"0");
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}
function shortId(id){ return id.slice(0,4) + "…" + id.slice(-4); }

Object.assign(window, { ME, PEERS, MESSAGES, TRANSFERS, fmtBytes, fmtEta, fmtDuration, shortId });
