import LegalDoc from '@/app/components/LegalDoc'

export const metadata = {
  title: 'Terms & Conditions',
  description:
    'Read the ManifestBank™ Terms & Conditions that govern access and use of the platform.',
}

export default function TermsPage() {
  return <LegalDoc kind="terms" />
}
