export default function BodygraphPlaceholder() {
  return (
    <svg
      className="bodygraph"
      viewBox="0 0 120 180"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Your bodygraph"
    >
      <g fill="none" stroke="#D9D2EE" strokeWidth="1.4">
        <line x1="60" y1="20" x2="60" y2="44" />
        <line x1="60" y1="60" x2="60" y2="74" />
        <line x1="60" y1="90" x2="60" y2="110" />
        <line x1="60" y1="128" x2="60" y2="150" />
        <line x1="44" y1="120" x2="30" y2="132" />
        <line x1="76" y1="120" x2="90" y2="132" />
        <line x1="76" y1="86" x2="88" y2="120" />
      </g>
      {/* head */}
      <polygon
        points="60,10 70,26 50,26"
        fill="#fff"
        stroke="#C9C0E6"
        strokeWidth="1.4"
      />
      {/* ajna */}
      <polygon
        points="50,60 70,60 60,44"
        fill="#fff"
        stroke="#C9C0E6"
        strokeWidth="1.4"
      />
      {/* throat (defined) */}
      <rect x="49" y="74" width="22" height="16" rx="3" fill="#6A4BD6" />
      {/* G (defined) */}
      <rect
        x="49"
        y="104"
        width="22"
        height="22"
        rx="3"
        transform="rotate(45 60 115)"
        fill="#6A4BD6"
      />
      {/* heart */}
      <polygon
        points="84,116 96,116 90,126"
        fill="#fff"
        stroke="#C9C0E6"
        strokeWidth="1.4"
      />
      {/* spleen */}
      <polygon
        points="20,128 40,138 20,148"
        fill="#fff"
        stroke="#C9C0E6"
        strokeWidth="1.4"
      />
      {/* solar plexus */}
      <polygon
        points="100,128 80,138 100,148"
        fill="#fff"
        stroke="#C9C0E6"
        strokeWidth="1.4"
      />
      {/* sacral (defined) */}
      <rect x="49" y="130" width="22" height="18" rx="3" fill="#FFB020" />
      {/* root */}
      <rect
        x="49"
        y="156"
        width="22"
        height="16"
        rx="3"
        fill="#fff"
        stroke="#C9C0E6"
        strokeWidth="1.4"
      />
    </svg>
  );
}
