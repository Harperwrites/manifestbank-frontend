import LegalDoc from '@/app/components/LegalDoc'

export const metadata = {
  title: 'Privacy Policy',
  description: 'Review the ManifestBank™ Privacy Policy and how data is handled.',
}

export default function PrivacyPage() {
  return <LegalDoc kind="privacy" />
}
