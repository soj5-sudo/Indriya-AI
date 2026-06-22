/** The Indriya wordmark — serif, letter-spaced, with a small gem motif. */
export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <path d="M8 1l4 4-4 10-4-10z" fill="var(--gold)" />
        <path d="M8 1l4 4H4z" fill="var(--gold-soft)" />
      </svg>
      <span className="font-display tracking-[0.35em] uppercase">
        Indriya
      </span>
    </span>
  );
}
