'use client'

type MyJournalIconProps = {
  size?: number
}

export default function MyJournalIcon({ size = 18 }: MyJournalIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        d="M4.55 16.55c1.45-.08 2.96-.1 4.52-.1 1.06 0 2.01.19 2.93.58.92-.39 1.87-.58 2.93-.58 1.56 0 3.07.02 4.52.1"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinecap="round"
        opacity="0.28"
      />
      <path
        d="M4.9 17.65c1.32-.07 2.72-.09 4.17-.09 1.07 0 2.01.18 2.93.56.92-.38 1.86-.56 2.93-.56 1.45 0 2.85.02 4.17.09"
        stroke="currentColor"
        strokeWidth="0.95"
        strokeLinecap="round"
        opacity="0.2"
      />
      <path
        d="M4.85 6.55h5.35c.85 0 1.64.18 2.3.56v10.34a4.3 4.3 0 0 0-2.3-.62H4.85A1.85 1.85 0 0 1 3 14.98V8.4c0-1.02.83-1.85 1.85-1.85Z"
        fill="rgba(182, 121, 103, 0.12)"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path
        d="M19.15 6.55H13.8c-.85 0-1.64.18-2.3.56v10.34a4.3 4.3 0 0 1 2.3-.62h5.35A1.85 1.85 0 0 0 21 14.98V8.4c0-1.02-.83-1.85-1.85-1.85Z"
        fill="rgba(182, 121, 103, 0.16)"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path d="M12 7.05v10.4" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" opacity="0.1" />
      <path d="M5.95 9.4h3.1" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity="0.44" />
      <path d="M5.95 11.6h3.75" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity="0.44" />
      <path d="M14.3 9.4h3.1" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity="0.44" />
      <path d="M14.3 11.6h3.75" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity="0.44" />
      <path d="M4.65 7.7h.95" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity="0.36" />
      <path d="M18.4 7.7h.95" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" opacity="0.36" />
    </svg>
  )
}
