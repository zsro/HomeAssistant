export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="logo-lockup" aria-label="Home Assistant">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 40 40" role="img">
          <path d="M8.5 18.3 20 8l11.5 10.3v12.2a2 2 0 0 1-2 2h-19a2 2 0 0 1-2-2Z" />
          <path d="M15 32.5V23h10v9.5M13 17.6l7-6.3 7 6.3" />
        </svg>
      </span>
      {!compact && <span>Home Assistant</span>}
    </div>
  );
}
