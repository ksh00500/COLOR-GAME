export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand-mark" aria-label="Tango 탕고">
      <span className="brand-symbol" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>TANGO</strong>
          <small>땅땅땅</small>
        </span>
      )}
    </div>
  );
}

