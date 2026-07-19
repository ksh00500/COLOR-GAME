import { useId } from "react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  const maskId = `tango-brand-mask-${useId().replace(/:/g, "")}`;

  return (
    <div className="brand-mark" aria-label="Tango 탕고">
      <span className="brand-symbol" aria-hidden="true">
        <svg viewBox="0 0 92 58" role="presentation">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="92" height="58">
              <rect width="92" height="58" fill="white" />
              <circle cx="34" cy="32" r="4.6" fill="black" />
              <circle cx="61" cy="24" r="4.6" fill="black" />
            </mask>
          </defs>
          <g mask={`url(#${maskId})`}>
            <rect className="brand-tile brand-tile-red" x="5" y="20" width="32" height="32" rx="9" transform="rotate(-9 21 36)" />
            <rect className="brand-tile brand-tile-blue" x="31" y="12" width="32" height="32" rx="9" transform="rotate(-3 47 28)" />
            <rect className="brand-tile brand-tile-green" x="57" y="4" width="32" height="32" rx="9" transform="rotate(8 73 20)" />
          </g>
        </svg>
      </span>
      {!compact && (
        <span className="brand-copy">
          <strong>TANGO</strong>
        </span>
      )}
    </div>
  );
}

