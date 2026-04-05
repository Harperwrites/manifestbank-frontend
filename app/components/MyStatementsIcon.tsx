'use client'

type MyStatementsIconProps = {
  size?: number
}

export default function MyStatementsIcon({ size = 18 }: MyStatementsIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M6.25 4.75h9.7l2.05 2.1v10.9a1.9 1.9 0 0 1-1.9 1.9h-9.85a1.9 1.9 0 0 1-1.9-1.9v-11.1a1.9 1.9 0 0 1 1.9-1.9Z"
        fill="rgba(182, 121, 103, 0.12)"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path
        d="M15.95 4.75v2.6a1 1 0 0 0 1 1H19"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.5"
      />
      <path d="M7.55 10.05h8.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.44" />
      <path d="M7.55 12.55h6.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.44" />
      <path d="M7.55 15.05h7.65" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.44" />
      <path d="M7.75 7.6h2.05" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.52" />
    </svg>
  )
}
