import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Contact ManifestBank™ with questions, feedback, or support needs. We’ll respond as soon as possible.',
}

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children
}
