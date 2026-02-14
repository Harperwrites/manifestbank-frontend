import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Careers',
  description:
    'Careers at ManifestBank™. Join a team focused on clarity, integrity, and intentional design.',
}

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return children
}
