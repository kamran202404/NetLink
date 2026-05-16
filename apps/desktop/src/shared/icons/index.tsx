import type { SVGProps } from 'react';

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  sw?: number;   // strokeWidth
  stroke?: string;
}

function Ic({ size = 16, sw = 1.6, stroke = 'currentColor', fill, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill ?? 'none'}
      stroke={stroke}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const Phone    = (p: IconProps) => <Ic {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></Ic>;
export const PhoneOff = (p: IconProps) => <Ic {...p}><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.26a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 5 13M4 4l16 16"/></Ic>;
export const Video    = (p: IconProps) => <Ic {...p}><path d="M23 7l-7 5 7 5V7zM3 5h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/></Ic>;
export const VideoOff = (p: IconProps) => <Ic {...p}><path d="M16 16V8a2 2 0 0 0-2-2H4M2 2l20 20M22 8l-6 4 6 4V8Z"/></Ic>;
export const Mic      = (p: IconProps) => <Ic {...p}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3ZM19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></Ic>;
export const MicOff   = (p: IconProps) => <Ic {...p}><path d="M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 19v4M8 23h8"/></Ic>;
export const Chat     = (p: IconProps) => <Ic {...p}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z"/></Ic>;
export const File     = (p: IconProps) => <Ic {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z M14 2v6h6"/></Ic>;
export const FileText = (p: IconProps) => <Ic {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6ZM14 2v6h6M16 13H8M16 17H8M10 9H8"/></Ic>;
export const Settings = (p: IconProps) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></Ic>;
export const Search   = (p: IconProps) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Ic>;
export const Plus     = (p: IconProps) => <Ic {...p}><path d="M12 5v14M5 12h14"/></Ic>;
export const X        = (p: IconProps) => <Ic {...p}><path d="M18 6 6 18M6 6l12 12"/></Ic>;
export const Check    = (p: IconProps) => <Ic {...p}><path d="M20 6 9 17l-5-5"/></Ic>;
export const Send     = (p: IconProps) => <Ic {...p}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z"/></Ic>;
export const Paperclip= (p: IconProps) => <Ic {...p}><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 1 1-2.83-2.83l8.49-8.48"/></Ic>;
export const Download = (p: IconProps) => <Ic {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></Ic>;
export const Upload   = (p: IconProps) => <Ic {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></Ic>;
export const Folder   = (p: IconProps) => <Ic {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11Z"/></Ic>;
export const Users    = (p: IconProps) => <Ic {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></Ic>;
export const Server   = (p: IconProps) => <Ic {...p}><rect x="2" y="3" width="20" height="8" rx="2"/><rect x="2" y="13" width="20" height="8" rx="2"/><path d="M6 7h.01M6 17h.01"/></Ic>;
export const Wifi     = (p: IconProps) => <Ic {...p}><path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/></Ic>;
export const Shield   = (p: IconProps) => <Ic {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/></Ic>;
export const Lock     = (p: IconProps) => <Ic {...p}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></Ic>;
export const Camera   = (p: IconProps) => <Ic {...p}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v11Z"/><circle cx="12" cy="13" r="4"/></Ic>;
export const More     = (p: IconProps) => <Ic {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></Ic>;
export const Bell     = (p: IconProps) => <Ic {...p}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></Ic>;
export const Sun      = (p: IconProps) => <Ic {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></Ic>;
export const Moon     = (p: IconProps) => <Ic {...p}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></Ic>;
export const Pause    = (p: IconProps) => <Ic {...p}><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></Ic>;
export const Trash    = (p: IconProps) => <Ic {...p}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></Ic>;
export const Speaker  = (p: IconProps) => <Ic {...p}><path d="M11 5 6 9H2v6h4l5 4V5ZM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></Ic>;
export const Screen   = (p: IconProps) => <Ic {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></Ic>;
export const Cpu      = (p: IconProps) => <Ic {...p}><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3"/></Ic>;
export const ArrowUp  = (p: IconProps) => <Ic {...p}><path d="M12 19V5M5 12l7-7 7 7"/></Ic>;
export const ArrowDown= (p: IconProps) => <Ic {...p}><path d="M12 5v14M19 12l-7 7-7-7"/></Ic>;
export const Copy     = (p: IconProps) => <Ic {...p}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></Ic>;

// NetLink logo — 4 corner nodes + center node with connecting lines
export const Logo = (p: IconProps) => (
  <Ic {...p} sw={1.8}>
    <circle cx="6" cy="6" r="2.4"/>
    <circle cx="18" cy="6" r="2.4"/>
    <circle cx="6" cy="18" r="2.4"/>
    <circle cx="18" cy="18" r="2.4"/>
    <circle cx="12" cy="12" r="2.4"/>
    <path d="M7.7 7.7L10.3 10.3M16.3 7.7L13.7 10.3M7.7 16.3L10.3 13.7M16.3 16.3L13.7 13.7"/>
  </Ic>
);
