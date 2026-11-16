import type { CSSProperties } from 'react'

type BrandProps = {
  /** Quadrado branco com marca verde, para fundos escuros. */
  inverted?: boolean
}

export function Brand({ inverted = false }: BrandProps) {
  const markStyle: CSSProperties = {
    width: 40,
    height: 40,
    borderRadius: 13,
    background: inverted ? '#FFFFFF' : '#21594A',
    color: inverted ? '#21594A' : '#FFFFFF',
    display: 'grid',
    placeItems: 'center',
    flex: 'none',
  }
  const textStyle: CSSProperties = {
    fontFamily: 'var(--font-bricolage), var(--font-figtree), sans-serif',
    fontWeight: 700,
    fontSize: 22,
    letterSpacing: '0.02em',
    color: inverted ? '#FFFFFF' : '#1A2A24',
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={markStyle}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width={24} height={24}>
          <path
            d="M12 7v3M12 10H5v4M12 10h7v4M12 10v4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="5" r="2.6" fill="currentColor" />
          <circle cx="5" cy="17" r="2.6" fill="currentColor" />
          <circle cx="12" cy="17" r="2.6" fill="currentColor" />
          <circle cx="19" cy="17" r="2.6" fill="currentColor" />
        </svg>
      </span>
      <b data-brand-text style={textStyle}>
        JETRO
      </b>
    </div>
  )
}
