// A gallery of event photos with one face picked out — what FaceFind does.
// Static on purpose; the only motion is a soft pulse on the match marker.
const tiles = [
  { x: 24, y: 28, w: 84, h: 100, tone: 'a' },
  { x: 116, y: 28, w: 84, h: 62, tone: 'b' },
  { x: 208, y: 28, w: 88, h: 100, tone: 'c' },
  { x: 116, y: 98, w: 84, h: 62, tone: 'c' },
  { x: 24, y: 136, w: 84, h: 62, tone: 'b' },
  { x: 208, y: 136, w: 88, h: 62, tone: 'a' },
];

function Person({ cx, cy, s = 1, hi = false }) {
  return (
    <g className={hi ? 'mi-person hi' : 'mi-person'}>
      <circle cx={cx} cy={cy} r={9 * s} />
      <path d={`M${cx - 17 * s} ${cy + 34 * s}c1-15 8-21 ${17 * s}-21s${16 * s} 6 ${17 * s} 21z`} />
    </g>
  );
}

export default function ScanIllustration() {
  return (
    <svg viewBox="0 0 320 300" width="100%" role="img" aria-label="A grid of event photos with one person highlighted by a match frame, next to a selfie">
      <defs>
        <style>{`
          .mi-tile-a { fill: color-mix(in srgb, var(--primary) 16%, var(--bg-elevated)); }
          .mi-tile-b { fill: color-mix(in srgb, var(--accent) 16%, var(--bg-elevated)); }
          .mi-tile-c { fill: var(--bg-sunken); }
          .mi-person { fill: var(--text-muted); opacity: 0.32; }
          .mi-person.hi { fill: var(--primary); opacity: 1; }
          .mi-frame { fill: none; stroke: var(--accent); stroke-width: 3; }
          .mi-chip { fill: var(--accent); }
          .mi-chip-text { fill: #fff; font: 700 10px Inter, sans-serif; }
          .mi-selfie { fill: var(--bg-elevated); stroke: var(--primary); stroke-width: 3; }
          .mi-link { stroke: var(--accent); stroke-width: 2; stroke-dasharray: 3 4; fill: none; }
          .mi-pulse { fill: var(--accent); opacity: 0.25; transform-origin: 152px 62px; animation: mi-pulse 2.6s ease-in-out infinite; }
          @keyframes mi-pulse { 0%,100% { transform: scale(1); opacity: 0.25; } 50% { transform: scale(1.5); opacity: 0; } }
        `}</style>
      </defs>

      {tiles.map((t, i) => (
        <rect key={i} className={`mi-tile-${t.tone}`} x={t.x} y={t.y} width={t.w} height={t.h} rx="10" />
      ))}

      <Person cx={66} cy={64} s={1.1} />
      <Person cx={158} cy={54} s={0.8} hi />
      <Person cx={252} cy={66} s={1.05} />
      <Person cx={158} cy={122} s={0.7} />
      <Person cx={66} cy={160} s={0.7} />
      <Person cx={252} cy={160} s={0.7} />

      {/* match frame around the highlighted face */}
      <circle className="mi-pulse" cx="152" cy="62" r="4" />
      <rect className="mi-frame" x="124" y="34" width="68" height="52" rx="8" />
      <rect className="mi-chip" x="128" y="24" width="34" height="16" rx="8" />
      <text className="mi-chip-text" x="145" y="35.5" textAnchor="middle">You</text>

      {/* selfie that drives the search */}
      <path className="mi-link" d="M160 206 C160 222 160 226 160 232" />
      <circle className="mi-selfie" cx="160" cy="262" r="30" />
      <circle cx="160" cy="254" r="9" fill="var(--primary)" />
      <path d="M143 282c1-11 8-16 17-16s16 5 17 16z" fill="var(--primary)" />
    </svg>
  );
}
