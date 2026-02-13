import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ManifestBank™ About Us',
}

export default function AboutPage() {
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
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: -6 }}>
          <img
            src="/ManifestBank%E2%84%A2%20Business%20overlays%20and%20docs.png"
            alt="ManifestBank™"
            style={{ maxWidth: '100%', height: 'auto', width: 520 }}
          />
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600 }}>
          About Us
        </div>
        <p style={{ marginTop: 12 }}>
          ManifestBank™ is a digital self-organization, reflection, and awareness platform. It is
          designed to support users in observing patterns, clarifying intentions, and aligning
          identity with conscious action.
        </p>
        <p>
          ManifestBank™ is not a financial institution. It is not a bank, credit union, lender,
          broker, investment adviser, fiduciary, or payment processor. ManifestBank™ does not hold,
          manage, transmit, insure, safeguard, or move money or financial assets of any kind.
        </p>
        <p>
          Instead, ManifestBank™ functions as a conceptual and reflective framework. A structured
          digital environment where users may document goals, intentions, reflections, and
          self-directed observations related to their personal development.
        </p>
        <p>
          The platform is informational and experiential in nature. Outcomes are not guaranteed and
          are dependent entirely on the user’s individual choices, actions, and interpretations.
        </p>

        <div style={{ marginTop: 18, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
          Platform Purpose
        </div>
        <p style={{ marginTop: 8 }}>ManifestBank™ exists to support:</p>
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Goal-setting and intention tracking</div>
          <div>Personal reflection and awareness</div>
          <div>Habit observation and self-organization</div>
          <div>Identity alignment through disciplined self-review</div>
        </div>
        <p style={{ marginTop: 12 }}>
          The platform does not provide financial, investment, legal, medical, or psychological
          advice. Users are encouraged to seek qualified professionals for any decisions requiring
          such expertise.
        </p>

        <div style={{ marginTop: 18, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
          The Ether™
        </div>
        <p style={{ marginTop: 8 }}>
          The Ether™ is the communication and reflection layer within ManifestBank™.
        </p>
        <p>
          The Ether™ allows users to exchange messages, reflections, and insights in a manner
          designed to prioritize intention, clarity, and consent. Depending on user settings and use
          cases, messages may be ephemeral or stored in accordance with the platform’s Privacy
          Policy.
        </p>
        <p>
          The Ether™ is not traditional social media. It is not optimized for virality, influence,
          or engagement manipulation. It exists to support conscious communication, private
          reflection, and user-directed interaction.
        </p>
        <p>
          ManifestBank™ does not monitor, endorse, or verify the content of user-generated messages
          beyond what is required for platform integrity, safety, and lawful operation.
        </p>

        <div style={{ marginTop: 18, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
          User Responsibility &amp; Agency
        </div>
        <p style={{ marginTop: 8 }}>ManifestBank™ is a self-directed platform.</p>
        <p>Users remain fully responsible for:</p>
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Their interpretations of platform content</div>
          <div>Their decisions, actions, and behaviors</div>
          <div>How they apply insights gained through reflection</div>
        </div>
        <p style={{ marginTop: 10 }}>
          The platform provides tools. It does not provide guarantees.
        </p>

        <div style={{ marginTop: 18, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
          Privacy &amp; Ethics
        </div>
        <p style={{ marginTop: 8 }}>
          ManifestBank™ is designed with respect for user autonomy, privacy, and consent. Data
          collection, storage, and use are governed strictly by the Privacy Policy.
        </p>
        <p>We believe awareness requires trust. Trust requires transparency.</p>

        <div style={{ marginTop: 18, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
          Who This Platform Serves
        </div>
        <p style={{ marginTop: 8 }}>ManifestBank™ is for individuals who:</p>
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Value clarity over chaos</div>
          <div>Understand that awareness precedes outcomes</div>
          <div>Prefer intentional tools over reactive systems</div>
          <div>Choose responsibility over dependency</div>
        </div>
        <p style={{ marginTop: 10 }}>
          It is for users who recognize that structure does not limit freedom, it refines it.
        </p>

        <div style={{ marginTop: 18, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
          Founder’s Note
        </div>
        <p style={{ marginTop: 8 }}>
          ManifestBank™ was not created to tell people what to believe, how to think, or what to
          pursue. It was created as a mirror.
        </p>
        <p>
          Over time, I noticed that what most people call “manifestation” often skips the most
          important step: responsibility. Responsibility for attention. Responsibility for identity.
          Responsibility for repeated choices.
        </p>
        <p>I wanted a space that honored that truth.</p>
        <p>
          ManifestBank™ is built on the idea that awareness organizes reality more reliably than
          wishful thinking. That consistency compounds more powerfully than motivation. And that
          identity, when observed honestly, becomes editable.
        </p>
        <p>This platform does not promise transformation. It supports it.</p>
        <p>
          It does not create wealth, health, or success. It helps users observe how they relate to
          those ideas and whether their actions match their intentions.
        </p>
        <p>
          In a world optimized for distraction, ManifestBank™ is an invitation to pause, reflect,
          and choose deliberately.
        </p>
        <p>Use it as a tool. Use it as a ledger. Use it as a checkpoint.</p>
        <p>But always remember, the power is not in the platform. It’s in you.</p>
        <p style={{ marginTop: 10, fontWeight: 600 }}>— Founder, ManifestBank™</p>
      </section>
    </main>
  )
}
