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
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#16213e" />
        </linearGradient>
        <linearGradient id="pm-letter" x1="10" y1="24" x2="110" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>
      </defs>
      {/* Dark background */}
      <rect width="120" height="120" rx="24" fill="url(#pm-bg)" />
      {/* Thin border */}
      <rect x="1.5" y="1.5" width="117" height="117" rx="22.5" stroke="rgba(255,255,255,0.08)" strokeWidth="1" fill="none" />
      {/* P — with play triangle as the counter space */}
      <path
        d="M14 96V24h22c16 0 26 9 26 21s-10 21-26 21H28v30H14Z"
        fill="url(#pm-letter)"
      />
      {/* Play triangle cut out of the P's bowl */}
      <path
        d="M33 36l14 9-14 9Z"
        fill="#1a1a2e"
      />
      {/* M — bold angular */}
      <path
        d="M68 96V24h10l12 32 12-32h10v72h-12V52l-10 28-10-28v44H68Z"
        fill="url(#pm-letter)"
      />
      {/* Accent bar — film strip / timeline */}
      <rect x="14" y="106" width="92" height="3" rx="1.5" fill="#e94560" />
    </svg>
  );
}

export default Logo;
