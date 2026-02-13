import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ManifestBank™ FAQ',
}

export default function FaqPage() {
  return (
    <main style={{ maxWidth: 980, margin: '24px auto', padding: '0 18px 40px' }}>
      <section
        style={{
          background: 'rgba(248, 242, 235, 0.88)',
          borderRadius: 24,
          border: '1px solid rgba(95, 74, 62, 0.18)',
          padding: '28px 26px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600 }}>
          Frequently Asked Questions
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>What is ManifestBank™?</div>
          <p style={{ marginTop: 6 }}>
            ManifestBank™ is a digital self-organization and reflection platform. It helps users
            track goals, intentions, habits, and personal insights in a structured, intentional way.
          </p>
          <p>
            ManifestBank™ is designed to support awareness, clarity, and disciplined self-alignment.
            It does not manage or handle money.
          </p>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>Is ManifestBank™ a bank or financial institution?</div>
          <p style={{ marginTop: 6 }}>No.</p>
          <p>
            ManifestBank™ is not a bank, credit union, lender, broker, investment adviser,
            fiduciary, or payment processor. It does not hold, move, insure, transmit, or safeguard
            money or financial assets of any kind.
          </p>
          <p>
            The platform uses financial language symbolically to support reflection, organization,
            and intention-setting only.
          </p>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>What is The Ether™?</div>
          <p style={{ marginTop: 6 }}>
            The Ether™ is the communication and reflection layer within ManifestBank™.
          </p>
          <p>
            It allows users to exchange messages, reflections, and insights in a space designed for
            intentional interaction rather than distraction. The Ether™ supports private messaging
            and conscious dialogue based on user settings.
          </p>
          <p>It is not traditional social media.</p>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>Does ManifestBank™ guarantee results?</div>
          <p style={{ marginTop: 6 }}>No.</p>
          <p>
            ManifestBank™ does not guarantee financial, personal, or professional outcomes. Any
            insights or results gained from using the platform depend entirely on the user’s
            individual choices, consistency, and actions.
          </p>
          <p>The platform provides tools, not promises.</p>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>Is ManifestBank™ financial, legal, or medical advice?</div>
          <p style={{ marginTop: 6 }}>No.</p>
          <p>
            ManifestBank™ does not provide financial, investment, legal, medical, or psychological
            advice. Content within the platform is informational and reflective in nature.
          </p>
          <p>Users should consult licensed professionals for decisions requiring professional expertise.</p>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>How is my data handled?</div>
          <p style={{ marginTop: 6 }}>
            User data is handled in accordance with our Privacy Policy.
          </p>
          <p>
            We prioritize transparency, user autonomy, and ethical data practices. Data is collected
            only as necessary to operate and improve the platform, and users retain control over
            their content and settings.
          </p>
          <p>We do not sell user data.</p>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>Are messages on The Ether™ private?</div>
          <p style={{ marginTop: 6 }}>
            Privacy depends on how the user chooses to use the platform and the specific feature
            settings in use.
          </p>
          <p>
            Some messages may be ephemeral, while others may be stored to support platform
            functionality. Details are outlined clearly in the Privacy Policy.
          </p>
          <p>Users are responsible for the content they share.</p>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>Who is ManifestBank™ for?</div>
          <p style={{ marginTop: 6 }}>
            ManifestBank™ is for individuals who want to live and build with greater intention.
          </p>
          <p>
            It serves creators, professionals, builders, and everyday users who value clarity,
            responsibility, and self-awareness and who prefer structured reflection over reactive
            systems.
          </p>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>Is ManifestBank™ free to use?</div>
          <p style={{ marginTop: 6 }}>
            ManifestBank™ may offer free and paid features depending on platform updates and
            offerings.
          </p>
          <p>
            Any pricing, subscriptions, or feature access will be clearly disclosed within the
            platform prior to purchase.
          </p>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontWeight: 600 }}>How can I stay updated on new features or opportunities?</div>
          <p style={{ marginTop: 6 }}>
            Platform updates, feature releases, and opportunities are shared directly within
            ManifestBank™ and through official communication channels.
          </p>
          <p>
            We grow deliberately and release features in alignment with the platform’s mission and
            values.
          </p>
        </div>
      </section>
    </main>
  )
}
