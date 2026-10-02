const paths = {
  mail: "M3 5h18v14H3V5Zm0 1 9 7 9-7",
  lock: "M5 10h14v11H5V10Zm3 0V6a4 4 0 0 1 8 0v4m-4 5v2",
  eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  eyeOff: "m3 3 18 18M10 5.2A12 12 0 0 1 12 5c6 0 10 7 10 7a21 21 0 0 1-3 3.7M6.3 6.3A22 22 0 0 0 2 12s4 7 10 7a12 12 0 0 0 5.7-1.7M10 10a3 3 0 0 0 4 4",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  employees: "M8 6V4h8v2M3 7h18v14H3V7Zm0 5 9 4 9-4M10 12h4",
  specialties: "m14 6 4-4 4 4-4 4M3 21l10-10M3 3l6 6m-6-6v5h5m7 7 6 6m-6-6v5h5",
  admins: "M12 3 3 7v5c0 5 9 9 9 9s9-4 9-9V7l-9-4Zm-4 9 3 3 5-6",
  buildings: "M4 21V3h12v18M16 9h4v12M8 7h4M8 11h4M8 15h4M2 21h20",
  units: "m3 10 9-7 9 7v11H3V10Zm6 11v-8h6v8",
  incidents: "M5 3h14v18H5V3Zm4 5h6m-6 4h6m-6 4h4",
  profile: "M20 21v-2a7 7 0 0 0-14 0v2M17 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  search: "m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  plus: "M12 5v14M5 12h14", close: "m6 6 12 12M6 18 18 6",
  edit: "m16 3 5 5L9 20l-6 1 1-6L16 3Zm-2 2 5 5",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7",
  logout: "M9 3H3v18h6m5-14 5 5-5 5m-7-5h14",
  menu: "M3 6h18M3 12h18M3 18h18", check: "m5 12 4 4L19 6",
  arrow: "m9 5 7 7-7 7", refresh: "M20 7V2m0 5h-5M4 17v5m0-5h5M4 8a8 8 0 0 1 14-3l2 2M4 17l2 2a8 8 0 0 0 14-3",
};

export default function Icon({ name, size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[name] || paths.users} />
  </svg>;
}
