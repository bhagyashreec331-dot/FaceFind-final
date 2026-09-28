// FaceFind mark: a solid tile holding a face-and-shoulders silhouette,
// framed by viewfinder corners, with a coral "match" dot.
export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="var(--primary)" />
      <g stroke="var(--on-primary)" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity="0.9">
        <path d="M7 11V9.5A2.5 2.5 0 0 1 9.5 7H11" />
        <path d="M25 11V9.5A2.5 2.5 0 0 0 22.5 7H21" />
        <path d="M7 21v1.5A2.5 2.5 0 0 0 9.5 25H11" />
        <path d="M25 21v1.5a2.5 2.5 0 0 1-2.5 2.5H21" />
      </g>
      <circle cx="16" cy="13.4" r="3.6" fill="var(--on-primary)" />
      <path d="M9.6 23.4c.6-3.6 3.2-5.6 6.4-5.6s5.8 2 6.4 5.6" fill="var(--on-primary)" />
      <circle cx="25" cy="7" r="3.2" fill="var(--accent)" stroke="var(--primary)" strokeWidth="1.6" />
    </svg>
  );
}
