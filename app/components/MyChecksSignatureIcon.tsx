'use client'

type MyChecksSignatureIconProps = {
  size?: number
}

export default function MyChecksSignatureIcon({ size = 18 }: MyChecksSignatureIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <rect
        x="2.85"
        y="6.15"
        width="18.3"
        height="11.7"
        rx="2.2"
        fill="rgba(182, 121, 103, 0.12)"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path d="M5.75 9.65h11.7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" opacity="0.42" />
      <path d="M5.75 12.15h7.95" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" opacity="0.42" />
      <path
        d="M6 15.4c1-.92 1.72-1.36 2.3-1.36.59 0 .9.47 1.24.95.31.42.56.64.94.64.49 0 .86-.34 1.26-.78.42-.47.9-.98 1.68-.98.89 0 1.45.61 2.5 1.53"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M16.6 15.45h1.95" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" opacity="0.55" />
    </svg>
  )
}
