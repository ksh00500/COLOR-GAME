export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="Color Line Strategy">
      <span className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>COLOR LINE</strong>
          <small>STRATEGY</small>
        </span>
      )}
    </div>
  );
}

