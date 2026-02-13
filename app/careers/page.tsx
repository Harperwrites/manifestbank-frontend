'use client'

import Navbar from '@/app/components/Navbar'

export default function CareersPage() {
  return (
    <main>
      <Navbar />
      <section style={{ maxWidth: 980, margin: '0 auto', padding: '40px 20px 80px' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 600 }}>
          Careers at ManifestBank™
        </div>
        <p style={{ marginTop: 14 }}>
          At ManifestBank™, we are building tools that prioritize awareness, integrity, and
          conscious design in a world optimized for speed and noise.
        </p>
        <p>
          Our work sits at the intersection of clarity, technology, and responsibility. Every
          decision we make is guided by a simple belief: when people are supported in organizing
          their inner world, they create better outcomes in the outer one.
        </p>
        <p>
          We are not interested in building just another app.
          <br />
          We are here to build infrastructure for intentional living.
        </p>

        <div style={{ marginTop: 20, fontFamily: 'var(--font-serif)', fontSize: 22 }}>Our Mission</div>
        <p style={{ marginTop: 8 }}>
          To design thoughtful, ethical digital systems that help people observe patterns, align
          identity with action, and engage with their lives more deliberately.
        </p>
        <p>
          We believe meaningful work happens when purpose and precision meet. Our mission shapes
          how we build, how we collaborate, and how we show up for one another.
        </p>

        <div style={{ marginTop: 20, fontFamily: 'var(--font-serif)', fontSize: 22 }}>How We Work</div>
        <p style={{ marginTop: 8 }}>ManifestBank™ is built by people who value:</p>
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Clarity over chaos</div>
          <div>Depth over hype</div>
          <div>Responsibility over shortcuts</div>
          <div>Thoughtful execution over noise</div>
        </div>
        <p style={{ marginTop: 10 }}>
          We operate with high standards and mutual respect. We encourage autonomy, clear
          communication, and long-term thinking. Everyone here is trusted to own their work and
          contribute meaningfully.
        </p>

        <div style={{ marginTop: 20, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
          What We Look For
        </div>
        <p style={{ marginTop: 8 }}>We are drawn to people who:</p>
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Think critically and act intentionally</div>
          <div>Take ownership of outcomes, not just tasks</div>
          <div>Care deeply about ethical design and user trust</div>
          <div>Are comfortable building things that matter quietly</div>
          <div>Value growth, reflection, and self-awareness</div>
        </div>
        <p style={{ marginTop: 10 }}>
          Titles matter less than integrity. Curiosity matters more than credentials.
        </p>

        <div style={{ marginTop: 20, fontFamily: 'var(--font-serif)', fontSize: 22 }}>Our Culture</div>
        <p style={{ marginTop: 8 }}>Our culture is grounded, focused, and human. We value:</p>
        <div style={{ display: 'grid', gap: 6 }}>
          <div>Psychological safety</div>
          <div>Honest feedback</div>
          <div>Clear boundaries</div>
          <div>Sustainable work rhythms</div>
          <div>Space for deep focus</div>
        </div>
        <p style={{ marginTop: 10 }}>
          We believe the best work happens when people feel respected, trusted, and aligned with
          the mission.
        </p>

        <div style={{ marginTop: 20, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
          What You’ll Help Build
        </div>
        <p style={{ marginTop: 8 }}>At ManifestBank™, you’ll contribute to:</p>
        <div style={{ display: 'grid', gap: 6 }}>
          <div>A platform centered on intentional use, not dependency</div>
          <div>Systems that respect user autonomy and privacy</div>
          <div>Thoughtful tools for reflection, organization, and clarity</div>
          <div>A brand built on trust, not urgency</div>
        </div>
        <p style={{ marginTop: 10 }}>
          Your work will shape how people interact with themselves, not just with technology.
        </p>

        <div style={{ marginTop: 20, fontFamily: 'var(--font-serif)', fontSize: 22 }}>
          Growth &amp; Opportunity
        </div>
        <p style={{ marginTop: 8 }}>
          We are committed to long-term growth, both as a company and as individuals. We support
          learning, skill expansion, and evolution that aligns with our values and vision.
        </p>
        <p>
          Here, growth is not performative.
          <br />
          It’s practiced.
        </p>

        <div style={{ marginTop: 20, fontFamily: 'var(--font-serif)', fontSize: 22 }}>Join the Work</div>
        <p style={{ marginTop: 8 }}>
          If you are motivated by purpose, grounded execution, and building something that values
          awareness as much as innovation, you’ll feel at home here.
        </p>
        <p>ManifestBank™ is a place for builders who move with intention.</p>

        <div style={{ marginTop: 26 }}>
          <a
            href="/careers/open-roles"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 22px',
              borderRadius: 999,
              border: '1px solid rgba(182, 121, 103, 0.6)',
              background: 'linear-gradient(135deg, #c88a77, #b67967)',
              color: '#fff',
              textDecoration: 'none',
              fontWeight: 600,
            }}
          >
            Join our team!
          </a>
        </div>
      </section>
    </main>
  )
}
