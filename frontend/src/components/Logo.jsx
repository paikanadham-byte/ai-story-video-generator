function Logo({ size = 34 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <linearGradient id="pm-bg" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <linearGradient id="pm-accent" x1="60" y1="0" x2="60" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      {/* Background */}
      <rect width="120" height="120" rx="28" fill="url(#pm-bg)" />
      <rect width="120" height="120" rx="28" fill="url(#pm-accent)" />
      {/* P */}
      <path
        d="M18 94V26h20c14 0 22 8 22 18.5S52 63 38 63H30v31H18Z M30 37v16h7c6 0 10-3.2 10-8s-4-8-10-8H30Z"
        fill="white"
        fillRule="evenodd"
      />
      {/* M */}
      <path
        d="M66 94V26h3.5L84 62l14.5-36H102v68H91V48L80 76h-0L66 44"
        fill="white"
        fillOpacity="0"
      />
      <path d="M66 94V26h11l8 24 8-24h11v68h-11V50l-8 22-8-22v44H66Z" fill="white" />
      {/* Subtle play accent */}
      <circle cx="104" cy="16" r="5" fill="rgba(6,182,212,0.5)" />
    </svg>
  );
}

export default Logo;
