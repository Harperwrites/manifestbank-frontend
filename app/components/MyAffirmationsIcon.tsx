'use client'

type MyAffirmationsIconProps = {
  size?: number
}

export default function MyAffirmationsIcon({ size = 18 }: MyAffirmationsIconProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true">
      <path
        className="mb-affirmations-heart-fill"
        d="M12 19.1 10.95 18.16C7.2 14.83 4.75 12.64 4.75 9.95c0-2.2 1.72-3.85 3.9-3.85 1.23 0 2.41.58 3.15 1.5.74-.92 1.92-1.5 3.15-1.5 2.18 0 3.9 1.65 3.9 3.85 0 2.69-2.45 4.88-6.2 8.21L12 19.1Z"
        fill="currentColor"
        opacity="0"
      />
      <path
        d="M12 19.1 10.95 18.16C7.2 14.83 4.75 12.64 4.75 9.95c0-2.2 1.72-3.85 3.9-3.85 1.23 0 2.41.58 3.15 1.5.74-.92 1.92-1.5 3.15-1.5 2.18 0 3.9 1.65 3.9 3.85 0 2.69-2.45 4.88-6.2 8.21L12 19.1Z"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
