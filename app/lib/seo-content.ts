import type { Metadata } from 'next'

export const SITE_URL = 'https://manifestbank.app'

export type RelatedLink = {
  href: string
  title: string
  description: string
}

export type SeoSection = {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export type FaqItem = {
  question: string
  answer: string
}

export type SeoPageEntry = {
  slug: string
  path: string
  kind: 'core' | 'feature' | 'compare' | 'blog'
  title: string
  description: string
  h1: string
  keyword: string
  intro: string
  heroEyebrow: string
  complianceNote: string
  sections: SeoSection[]
  faq?: FaqItem[]
  relatedHrefs: string[]
  ctaTitle?: string
  ctaCopy?: string
  ctaLabel?: string
}

const complianceNote =
  'ManifestBank™ is not a financial institution and does not hold, move, insure, or manage money. It is a wealth visualization platform for reflection, behavioral support, mindset support, and guided digital tools.'

const linkCatalog: Record<string, Omit<RelatedLink, 'href'>> = {
  '/manifest-bank': {
    title: 'Manifest Bank',
    description: 'Learn how ManifestBank™ reframes the idea of a bank into a digital reflection platform.',
  },
  '/manifestbank': {
    title: 'ManifestBank',
    description: 'Understand the ManifestBank™ brand, category, and platform position in one place.',
  },
  '/manifestbank-app': {
    title: 'ManifestBank App',
    description: 'See how the ManifestBank™ app blends reflection, identity, and guided tools.',
  },
  '/manifestbank-app-review': {
    title: 'ManifestBank App Review',
    description: 'A clear overview of what the platform does, who it serves, and what it does not do.',
  },
  '/manifestation-bank-app': {
    title: 'Manifestation Bank App',
    description: 'Explore how ManifestBank™ approaches manifestation through structure and reflection.',
  },
  '/manifestation-app': {
    title: 'Manifestation App',
    description: 'See why ManifestBank™ fits users searching for a premium manifestation app.',
  },
  '/manifesting-app': {
    title: 'Manifesting App',
    description: 'Compare ManifestBank™ with broader manifesting app searches and expectations.',
  },
  '/affirmation-app': {
    title: 'Affirmation App',
    description: 'Learn how affirmations fit inside a richer platform for identity and behavior change.',
  },
  '/money-affirmation-app': {
    title: 'Money Affirmation App',
    description: 'Position money affirmations inside a more disciplined wealth reflection workflow.',
  },
  '/wealth-visualization-platform': {
    title: 'Wealth Visualization Platform',
    description: 'The core category page for ManifestBank™ as a premium digital wealth visualization platform.',
  },
  '/manifestation-driven-finance': {
    title: 'Manifestation Driven Finance',
    description: 'A structured explanation of manifestation-driven finance without regulated-service claims.',
  },
  '/behavioral-fintech': {
    title: 'Behavioral Fintech',
    description: 'See how ManifestBank™ blends behavioral finance ideas with reflective digital tools.',
  },
  '/mindset-finance': {
    title: 'Mindset Finance',
    description: 'Explore mindset finance through intention, awareness, and repeated financial behaviors.',
  },
  '/financial-manifestation-app': {
    title: 'Financial Manifestation App',
    description: 'A compliance-safe explanation of financial manifestation app search intent.',
  },
  '/features/ai-teller': {
    title: 'AI Teller',
    description: 'Guided AI-driven support for reflection, clarity, and behavioral pattern recognition.',
  },
  '/features/wealth-builder': {
    title: 'Wealth Builder',
    description: 'A structured space for defining the behaviors and routines behind intentional growth.',
  },
  '/features/manifestation-checks': {
    title: 'Manifestation Checks',
    description: 'Premium visualization tools that turn intention into repeatable review moments.',
  },
  '/features/the-ether': {
    title: 'The Ether™',
    description: 'The communication and reflection layer within ManifestBank™.',
  },
  '/features/inner-credit-system': {
    title: 'Inner Credit System',
    description: 'A symbolic system for tracking internal alignment, consistency, and self-trust.',
  },
  '/features/journaling-for-wealth': {
    title: 'Journaling for Wealth',
    description: 'A guided journaling practice for noticing identity, habits, and money patterns.',
  },
  '/compare/manifestbank-vs-manifestation-apps': {
    title: 'ManifestBank vs Manifestation Apps',
    description: 'See how ManifestBank™ differs from generic manifestation apps.',
  },
  '/compare/manifestbank-vs-affirmation-apps': {
    title: 'ManifestBank vs Affirmation Apps',
    description: 'Compare ManifestBank™ with simple affirmation-first tools.',
  },
  '/compare/manifestbank-vs-traditional-budgeting-apps': {
    title: 'ManifestBank vs Traditional Budgeting Apps',
    description: 'Understand where ManifestBank™ differs from budgeting software.',
  },
  '/compare/manifestbank-vs-goal-tracking-apps': {
    title: 'ManifestBank vs Goal Tracking Apps',
    description: 'Compare reflective wealth support with standard goal tracking.',
  },
  '/blog/how-manifestation-and-behavior-change-work-together': {
    title: 'How Manifestation and Behavior Change Work Together',
    description: 'A practical look at how identity, repetition, and reflection reinforce one another.',
  },
  '/blog/what-is-a-wealth-visualization-platform': {
    title: 'What Is a Wealth Visualization Platform',
    description: 'A category-defining article on wealth visualization platforms.',
  },
  '/blog/how-to-use-an-affirmation-app-for-money-focus': {
    title: 'How to Use an Affirmation App for Money Focus',
    description: 'A guide to using affirmations with stronger routines and reflection.',
  },
  '/blog/manifesting-app-vs-goal-tracker': {
    title: 'Manifesting App vs Goal Tracker',
    description: 'A balanced comparison between manifestation tools and goal trackers.',
  },
  '/blog/what-is-behavioral-fintech': {
    title: 'What Is Behavioral Fintech',
    description: 'An educational article on behavioral fintech and why the category matters.',
  },
  '/blog/identity-and-money-habits': {
    title: 'Identity and Money Habits',
    description: 'Why repeated money behavior often follows self-concept before strategy.',
  },
  '/blog/why-most-manifestation-apps-stop-too-early': {
    title: 'Why Most Manifestation Apps Stop Too Early',
    description: 'A critique of shallow manifestation experiences and what is usually missing.',
  },
}

function relatedLinks(hrefs: string[]): RelatedLink[] {
  return hrefs.map((href) => ({
    href,
    ...(linkCatalog[href] ?? {
      title: href,
      description: 'Related reading on ManifestBank™.',
    }),
  }))
}

function corePage(
  slug: string,
  title: string,
  description: string,
  keyword: string,
  intro: string,
  sections: SeoSection[],
  relatedHrefs: string[],
): SeoPageEntry {
  return {
    slug,
    path: `/${slug}`,
    kind: 'core',
    title,
    description,
    h1: title,
    keyword,
    intro,
    heroEyebrow: 'Category Page',
    complianceNote,
    sections,
    relatedHrefs,
    ctaTitle: 'Explore ManifestBank™',
    ctaCopy:
      'See how ManifestBank™ blends behavioral finance concepts, digital reflection, and guided tools into a premium wealth visualization experience.',
    ctaLabel: 'See how ManifestBank™ works',
  }
}

function featurePage(
  slug: string,
  title: string,
  description: string,
  keyword: string,
  intro: string,
  sections: SeoSection[],
  relatedHrefs: string[],
): SeoPageEntry {
  return {
    slug,
    path: `/features/${slug}`,
    kind: 'feature',
    title,
    description,
    h1: title,
    keyword,
    intro,
    heroEyebrow: 'Feature',
    complianceNote,
    sections,
    relatedHrefs,
    ctaTitle: 'Experience the platform',
    ctaCopy:
      'The feature set inside ManifestBank™ is designed to support awareness, repetition, and intentional financial growth without implying regulated banking services.',
    ctaLabel: 'Experience the platform',
  }
}

function comparePage(
  slug: string,
  title: string,
  description: string,
  keyword: string,
  intro: string,
  sections: SeoSection[],
  faq: FaqItem[],
  relatedHrefs: string[],
): SeoPageEntry {
  return {
    slug,
    path: `/compare/${slug}`,
    kind: 'compare',
    title,
    description,
    h1: title,
    keyword,
    intro,
    heroEyebrow: 'Comparison',
    complianceNote,
    sections,
    faq,
    relatedHrefs,
    ctaTitle: 'Start your next chapter',
    ctaCopy:
      'If you want more than reminders, checklists, or generic manifestation prompts, ManifestBank™ offers a more intentional environment for reflection and behavioral support.',
    ctaLabel: 'Explore ManifestBank™',
  }
}

function blogPage(
  slug: string,
  title: string,
  description: string,
  keyword: string,
  intro: string,
  sections: SeoSection[],
  faq: FaqItem[],
  relatedHrefs: string[],
): SeoPageEntry {
  return {
    slug,
    path: `/blog/${slug}`,
    kind: 'blog',
    title,
    description,
    h1: title,
    keyword,
    intro,
    heroEyebrow: 'Insight',
    complianceNote,
    sections,
    faq,
    relatedHrefs,
    ctaTitle: 'See how ManifestBank™ works',
    ctaCopy:
      'ManifestBank™ turns these ideas into a polished platform for reflection, guided support, and wealth visualization. It does not hold or move money.',
    ctaLabel: 'Explore ManifestBank™',
  }
}

export const corePages: SeoPageEntry[] = [
  corePage(
    'manifest-bank',
    'Manifest Bank',
    'Manifest Bank explained through the lens of ManifestBank™: a premium wealth visualization platform for reflection, identity alignment, and guided digital support.',
    'Manifest Bank',
    'If you are searching for Manifest Bank, this page clarifies what ManifestBank™ is: a wealth visualization platform blending behavioral finance concepts, digital reflection, mindset support, and guided tools for intentional financial growth.',
    [
      {
        title: 'What Manifest Bank means here',
        paragraphs: [
          'The phrase Manifest Bank often signals interest in a platform that combines money focus, manifestation, and structure. ManifestBank™ serves that intent without pretending to be a bank.',
          'Instead of offering accounts, deposits, or lending, the platform gives users a premium environment for journaling, awareness, behavioral support, and symbolic wealth visualization.',
        ],
      },
      {
        title: 'How ManifestBank™ supports intentional growth',
        paragraphs: [
          'ManifestBank™ uses guided prompts, AI-driven support, visualization rituals, and reflective tools to help users notice patterns around money, self-trust, and identity.',
          'This keeps the experience grounded in behavior and awareness rather than exaggerated claims or guaranteed outcomes.',
        ],
        bullets: [
          'Behavioral reflection instead of generic hype',
          'Luxury digital tools instead of financial accounts',
          'Guided routines that help users stay consistent',
        ],
      },
      {
        title: 'Why the distinction matters',
        paragraphs: [
          'Users searching Manifest Bank may expect financial services. ManifestBank™ is different by design.',
          'It is a digital platform for reflection and support, built for people who want a more intentional relationship with wealth themes, habits, and self-concept.',
        ],
      },
    ],
    ['/manifestbank', '/manifestbank-app', '/wealth-visualization-platform', '/behavioral-fintech'],
  ),
  corePage(
    'manifestbank',
    'ManifestBank',
    'ManifestBank™ is a premium digital wealth visualization platform blending behavioral finance concepts, guided tools, reflection, and mindset support.',
    'ManifestBank',
    'ManifestBank™ is a premium wealth visualization platform blending behavioral finance concepts, digital reflection, mindset support, and guided tools for intentional financial growth.',
    [
      {
        title: 'A new category, not a digital bank',
        paragraphs: [
          'ManifestBank™ is positioned as a wealth visualization platform rather than a financial institution. The language is intentional, but the service is symbolic, reflective, and behavioral.',
          'Users come to the platform to organize intention, strengthen awareness, and build supportive routines around wealth identity and money habits.',
        ],
      },
      {
        title: 'What users experience inside ManifestBank™',
        paragraphs: [
          'The platform brings together AI-driven support, journaling, manifestation checks, reflective prompts, and premium digital structures that keep long-term growth visible.',
          'Each layer is designed to reinforce clarity and repeated action rather than short-term excitement.',
        ],
      },
      {
        title: 'Who ManifestBank™ is for',
        paragraphs: [
          'ManifestBank™ fits users who want a more elegant alternative to scattered notes, generic affirmation apps, or shallow motivation loops.',
          'It is especially useful for people who care about identity alignment, behavioral consistency, and a more thoughtful approach to financial manifestation.',
        ],
      },
    ],
    ['/manifestbank-app', '/manifestation-app', '/wealth-visualization-platform', '/features/ai-teller'],
  ),
  corePage(
    'manifestbank-app',
    'ManifestBank App',
    'The ManifestBank app is a premium wealth visualization platform for digital reflection, behavioral support, AI-guided insight, and intentional financial growth.',
    'manifestbank app',
    'The ManifestBank app is designed for people who want more than simple tracking. It blends wealth visualization, guided reflection, behavioral support, and premium digital tools into one focused environment.',
    [
      {
        title: 'Why the ManifestBank app feels different',
        paragraphs: [
          'Many apps stop at reminders or dashboards. The ManifestBank app is structured around identity, repetition, and reflection so users can stay close to the behaviors behind meaningful change.',
          'That makes the experience feel deliberate, elegant, and psychologically aware rather than transactional.',
        ],
      },
      {
        title: 'How the app supports money awareness',
        paragraphs: [
          'Inside the app, users can work with journaling prompts, manifestation checks, guided AI support, and reflective wealth-building tools.',
          'These elements help turn abstract goals into routines that can actually be revisited and refined.',
        ],
      },
      {
        title: 'Not a financial institution',
        paragraphs: [
          'The ManifestBank app does not open accounts, transmit funds, or manage investments. It supports planning, awareness, and visualization only.',
          'That distinction keeps the platform compliant while preserving the symbolic language that makes the experience memorable.',
        ],
      },
    ],
    ['/wealth-visualization-platform', '/manifestation-app', '/behavioral-fintech', '/features/wealth-builder'],
  ),
  corePage(
    'manifestbank-app-review',
    'ManifestBank App Review',
    'A ManifestBank app review covering the platform’s positioning, feature set, compliance-safe use case, and premium experience.',
    'ManifestBank app review',
    'This ManifestBank app review explains what the platform is, what it is not, and why it stands apart from generic manifestation apps or traditional money tools.',
    [
      {
        title: 'A review of the platform position',
        paragraphs: [
          'ManifestBank™ occupies a narrow and intentional space between manifestation culture, behavioral finance ideas, and structured digital reflection.',
          'It presents itself as a wealth visualization platform, not a bank, lender, adviser, or budgeting engine.',
        ],
      },
      {
        title: 'A review of the experience',
        paragraphs: [
          'The platform uses polished design, guided prompts, AI teller support, journaling, and symbolic financial language to create a more immersive experience.',
          'That premium framing gives users a clearer emotional context for reflection without slipping into unrealistic promises.',
        ],
      },
      {
        title: 'A review of who it fits',
        paragraphs: [
          'ManifestBank™ fits users who want an elegant system for awareness, discipline, and money-related self-observation.',
          'It is less relevant for people who want bank accounts, net-worth aggregation, or automated financial management.',
        ],
      },
    ],
    ['/manifestbank-app', '/compare/manifestbank-vs-manifestation-apps', '/compare/manifestbank-vs-affirmation-apps', '/blog/what-is-a-wealth-visualization-platform'],
  ),
  corePage(
    'manifestation-bank-app',
    'Manifestation Bank App',
    'Searching for a manifestation bank app usually points to ManifestBank™: a premium platform for wealth visualization, guided reflection, and behavioral support.',
    'manifestation bank app',
    'A manifestation bank app should do more than repeat inspirational lines. ManifestBank™ approaches that search intent through structure, reflection, behavioral support, and a premium digital environment.',
    [
      {
        title: 'Beyond the phrase manifestation bank app',
        paragraphs: [
          'People searching for a manifestation bank app often want symbolic financial language, emotional resonance, and a stronger feeling of progress.',
          'ManifestBank™ answers that need through reflective systems rather than pretending to provide banking products.',
        ],
      },
      {
        title: 'What makes the experience credible',
        paragraphs: [
          'The platform grounds manifestation in behavior change, identity alignment, and repeatable digital rituals. That creates a more intelligent user experience than purely motivational content.',
          'Instead of promising money, it helps users stay connected to the patterns that shape financial choices over time.',
        ],
      },
      {
        title: 'Luxury tone with clear boundaries',
        paragraphs: [
          'ManifestBank™ keeps a premium aesthetic and confident voice while staying explicit about its boundaries.',
          'It is a reflective platform for intentional financial growth, not a regulated financial service.',
        ],
      },
    ],
    ['/manifestation-app', '/manifesting-app', '/financial-manifestation-app', '/features/manifestation-checks'],
  ),
  corePage(
    'manifestation-app',
    'Manifestation App',
    'ManifestBank™ is a premium manifestation app alternative built around wealth visualization, guided tools, and behavioral support.',
    'manifestation app',
    'If you are looking for a manifestation app with more depth, ManifestBank™ offers a premium environment where manifestation is supported by behavioral finance concepts, reflective tools, and clear routines.',
    [
      {
        title: 'A manifestation app with more structure',
        paragraphs: [
          'Traditional manifestation apps often focus on mood, repetition, and inspiration alone. ManifestBank™ adds identity review, journaling, AI-guided support, and wealth visualization.',
          'That makes the platform better suited for users who want consistency instead of occasional motivation.',
        ],
      },
      {
        title: 'How reflection changes the experience',
        paragraphs: [
          'Reflection creates feedback. When a manifestation app includes prompts, pattern recognition, and guided check-ins, users are more likely to notice how beliefs and behavior interact.',
          'ManifestBank™ is built around that loop.',
        ],
      },
      {
        title: 'Designed for intentional financial growth',
        paragraphs: [
          'This manifestation app speaks directly to wealth themes while remaining compliance-safe. It does not offer financial services or imply guaranteed financial outcomes.',
          'The value lies in awareness, clarity, and disciplined use over time.',
        ],
      },
    ],
    ['/manifesting-app', '/affirmation-app', '/wealth-visualization-platform', '/blog/how-manifestation-and-behavior-change-work-together'],
  ),
  corePage(
    'manifesting-app',
    'Manifesting App',
    'ManifestBank™ is a premium manifesting app alternative focused on wealth visualization, reflection, behavioral support, and guided digital tools.',
    'manifesting app',
    'A manifesting app can be inspiring, but long-term value usually comes from reflection, repetition, and self-observation. ManifestBank™ is built around that deeper model.',
    [
      {
        title: 'What people want from a manifesting app',
        paragraphs: [
          'Users often want a manifesting app that feels motivating, beautiful, and easy to revisit. Those needs matter, but they are not enough on their own.',
          'ManifestBank™ extends the category with reflective structure and premium guidance.',
        ],
      },
      {
        title: 'Where ManifestBank™ stands apart',
        paragraphs: [
          'Instead of stopping at affirmations or mood boards, ManifestBank™ supports journaling, symbolic wealth tools, and AI-guided exploration of habits and identity.',
          'This gives users a more complete system for intentional financial growth.',
        ],
      },
      {
        title: 'What the platform does not do',
        paragraphs: [
          'ManifestBank™ does not act as a bank, investment app, or budgeting platform.',
          'It is a guided digital environment for visualization, awareness, and mindset support.',
        ],
      },
    ],
    ['/manifestation-app', '/money-affirmation-app', '/mindset-finance', '/blog/manifesting-app-vs-goal-tracker'],
  ),
  corePage(
    'affirmation-app',
    'Affirmation App',
    'ManifestBank™ expands the affirmation app category with guided wealth reflection, AI-driven support, and premium behavioral tools.',
    'affirmation app',
    'An affirmation app can create focus, but real staying power usually comes from pairing affirmations with structure. ManifestBank™ brings that structure to the affirmation app category.',
    [
      {
        title: 'More than repeated phrases',
        paragraphs: [
          'A strong affirmation app should help users revisit beliefs in context rather than collecting disconnected statements.',
          'ManifestBank™ pairs affirmations with journaling, reviews, symbolic checks, and guided support so the practice remains grounded.',
        ],
      },
      {
        title: 'Why this matters for money focus',
        paragraphs: [
          'Money-related affirmations can feel powerful in the moment but fade quickly without reinforcement.',
          'When those affirmations sit inside a broader platform for reflection and identity alignment, users can connect language to actual behavioral patterns.',
        ],
      },
      {
        title: 'A premium alternative',
        paragraphs: [
          'ManifestBank™ is an affirmation app alternative for users who want elegance, nuance, and a more mature relationship with manifestation themes.',
          'It remains explicitly separate from any regulated financial function.',
        ],
      },
    ],
    ['/money-affirmation-app', '/manifestation-app', '/features/journaling-for-wealth', '/compare/manifestbank-vs-affirmation-apps'],
  ),
  corePage(
    'money-affirmation-app',
    'Money Affirmation App',
    'ManifestBank™ is a premium money affirmation app alternative built around wealth visualization, journaling, and guided behavioral support.',
    'money affirmation app',
    'A money affirmation app should help users sustain focus, not just repeat hopeful lines. ManifestBank™ turns that intent into a structured experience for reflection, awareness, and guided wealth visualization.',
    [
      {
        title: 'What money affirmations need to work well',
        paragraphs: [
          'Money affirmations are most useful when they are revisited inside a larger system of behavior, evidence, and self-observation.',
          'ManifestBank™ gives those affirmations context through journaling, pattern review, and symbolic wealth tools.',
        ],
      },
      {
        title: 'How ManifestBank™ supports money focus',
        paragraphs: [
          'Users can return to the platform for guided prompts, intentional check-ins, and AI-assisted reflection around money habits and self-concept.',
          'That makes the practice feel less random and more integrated.',
        ],
      },
      {
        title: 'Not a money management app',
        paragraphs: [
          'ManifestBank™ does not store funds, process payments, or manage investments.',
          'It is a premium digital support platform for mindset, reflection, and intentional financial growth.',
        ],
      },
    ],
    ['/affirmation-app', '/financial-manifestation-app', '/features/manifestation-checks', '/blog/how-to-use-an-affirmation-app-for-money-focus'],
  ),
  corePage(
    'wealth-visualization-platform',
    'Wealth Visualization Platform',
    'ManifestBank™ is a wealth visualization platform blending behavioral finance concepts, digital reflection, mindset support, and guided tools for intentional financial growth.',
    'wealth visualization platform',
    'ManifestBank™ is a wealth visualization platform blending behavioral finance concepts, digital reflection, mindset support, and guided tools for intentional financial growth.',
    [
      {
        title: 'Defining the wealth visualization platform category',
        paragraphs: [
          'A wealth visualization platform helps users organize attention around money-related identity, habits, and intention without functioning as a bank or investment manager.',
          'It sits between mindset work and practical self-observation.',
        ],
      },
      {
        title: 'How ManifestBank™ fills the category',
        paragraphs: [
          'ManifestBank™ combines guided journaling, AI teller support, symbolic financial tools, and premium design to make wealth reflection feel tangible and repeatable.',
          'The goal is intentional financial growth through awareness and behavior, not transactional finance.',
        ],
      },
      {
        title: 'Why users search for this kind of platform',
        paragraphs: [
          'Many people want something more elegant than budgeting software and more credible than generic manifestation content.',
          'A wealth visualization platform addresses that gap by helping users stay close to the patterns that shape financial choices and self-concept.',
        ],
      },
    ],
    ['/behavioral-fintech', '/mindset-finance', '/financial-manifestation-app', '/blog/what-is-a-wealth-visualization-platform'],
  ),
  corePage(
    'manifestation-driven-finance',
    'Manifestation Driven Finance',
    'Manifestation driven finance describes an approach that combines financial awareness, mindset support, and behavior change rather than regulated financial services.',
    'manifestation driven finance',
    'Manifestation driven finance is best understood as a reflective and behavioral approach to money focus. ManifestBank™ gives that idea a premium digital structure without claiming banking or advisory services.',
    [
      {
        title: 'What manifestation driven finance means',
        paragraphs: [
          'Manifestation driven finance is about the relationship between attention, identity, habits, and money decisions.',
          'It is not a licensed financial category. In this context it refers to reflective tools that help users align intention with repeated action.',
        ],
      },
      {
        title: 'How ManifestBank™ approaches the idea',
        paragraphs: [
          'ManifestBank™ translates manifestation driven finance into journaling, AI-guided support, symbolic wealth tools, and premium review experiences.',
          'That makes the concept usable without drifting into vague promises or ungrounded claims.',
        ],
      },
      {
        title: 'Where the boundaries stay clear',
        paragraphs: [
          'The platform does not recommend investments, hold assets, or facilitate transactions.',
          'It is an awareness and visualization platform designed to support intentional financial growth.',
        ],
      },
    ],
    ['/behavioral-fintech', '/mindset-finance', '/financial-manifestation-app', '/blog/how-manifestation-and-behavior-change-work-together'],
  ),
  corePage(
    'behavioral-fintech',
    'Behavioral Fintech',
    'ManifestBank™ approaches behavioral fintech as a premium digital platform shaped by reflection, identity awareness, and guided money-related routines.',
    'behavioral fintech',
    'Behavioral fintech usually refers to products that consider how people actually think and act around money. ManifestBank™ extends that idea into a premium wealth visualization platform centered on reflection and guided support.',
    [
      {
        title: 'A broader view of behavioral fintech',
        paragraphs: [
          'Behavioral fintech is not only about nudges or dashboards. It can also include the environments that help users recognize emotional patterns, defaults, and self-concept around money.',
          'That is the territory where ManifestBank™ operates.',
        ],
      },
      {
        title: 'What makes ManifestBank™ different',
        paragraphs: [
          'The platform uses luxury design, symbolic financial language, and guided digital rituals to make self-observation easier to revisit.',
          'This gives behavioral fintech a more reflective and identity-aware expression.',
        ],
      },
      {
        title: 'Why the category matters',
        paragraphs: [
          'People do not act on information alone. They act through habits, beliefs, and emotionally loaded patterns.',
          'A behavioral fintech experience acknowledges that reality while staying clear that it is not a regulated institution.',
        ],
      },
    ],
    ['/wealth-visualization-platform', '/mindset-finance', '/manifestation-driven-finance', '/blog/what-is-behavioral-fintech'],
  ),
  corePage(
    'mindset-finance',
    'Mindset Finance',
    'Mindset finance connects financial growth with awareness, identity, and repeated behavior. ManifestBank™ gives that idea a premium digital home.',
    'mindset finance',
    'Mindset finance is the meeting point between financial intention and personal behavior. ManifestBank™ treats mindset finance as something to practice through reflection, not just talk about.',
    [
      {
        title: 'What mindset finance includes',
        paragraphs: [
          'Mindset finance includes beliefs, identity, emotional responses, and the small choices that quietly shape financial behavior over time.',
          'It is a useful concept because strategy often fails when identity and behavior are ignored.',
        ],
      },
      {
        title: 'How ManifestBank™ supports mindset finance',
        paragraphs: [
          'ManifestBank™ gives users journaling tools, wealth visualization experiences, and guided AI support so they can examine the patterns underneath financial goals.',
          'That makes mindset finance more concrete and less abstract.',
        ],
      },
      {
        title: 'Elegant, not exaggerated',
        paragraphs: [
          'The platform keeps a confident tone without promising financial results.',
          'It is designed to support awareness and intentional financial growth, not to replace professional advice or financial products.',
        ],
      },
    ],
    ['/behavioral-fintech', '/financial-manifestation-app', '/features/journaling-for-wealth', '/blog/identity-and-money-habits'],
  ),
  corePage(
    'financial-manifestation-app',
    'Financial Manifestation App',
    'ManifestBank™ is a financial manifestation app alternative focused on wealth visualization, behavioral support, and guided reflection rather than financial services.',
    'financial manifestation app',
    'A financial manifestation app should help users hold attention on wealth themes with more discipline and clarity. ManifestBank™ does that through premium digital tools for reflection, awareness, and symbolic wealth visualization.',
    [
      {
        title: 'A more grounded financial manifestation app',
        paragraphs: [
          'ManifestBank™ uses the language of finance symbolically to create a memorable user experience around self-observation and intentional growth.',
          'That lets the platform serve financial manifestation app search intent without misleading users about what it offers.',
        ],
      },
      {
        title: 'What users can actually do',
        paragraphs: [
          'Users can journal, review patterns, work with guided prompts, and interact with features such as AI Teller, Wealth Builder, and Manifestation Checks.',
          'These tools support clarity and repetition around money-related identity and behavior.',
        ],
      },
      {
        title: 'Clear compliance boundaries',
        paragraphs: [
          'ManifestBank™ does not hold funds, originate loans, or provide investment advice.',
          'It is a digital support platform for intentional financial growth, not a financial institution.',
        ],
      },
    ],
    ['/manifestation-driven-finance', '/money-affirmation-app', '/wealth-visualization-platform', '/features/ai-teller'],
  ),
]

export const featurePages: SeoPageEntry[] = [
  featurePage(
    'ai-teller',
    'AI Teller',
    'AI Teller is ManifestBank™’s guided AI support layer for reflection, behavioral awareness, and intentional financial growth.',
    'AI Teller',
    'AI Teller is the guided support layer inside ManifestBank™. It helps users reflect on patterns, clarify intentions, and stay connected to the behaviors behind intentional financial growth.',
    [
      {
        title: 'Guided support, not financial advice',
        paragraphs: [
          'AI Teller is designed to ask better questions, surface reflection points, and help users stay aware of their own patterns.',
          'It does not provide regulated financial advice, investment recommendations, or banking services.',
        ],
      },
      {
        title: 'Why AI Teller matters',
        paragraphs: [
          'Many users know what they want but lose momentum in the space between intention and repetition. AI Teller helps close that gap by making reflection easier to revisit.',
          'It gives the platform a conversational layer without losing the premium tone.',
        ],
      },
      {
        title: 'How it fits the platform',
        paragraphs: [
          'AI Teller works best alongside journaling, manifestation checks, and the broader wealth visualization environment.',
          'Together, these tools turn insight into a repeatable practice.',
        ],
      },
    ],
    ['/manifestbank-app', '/wealth-visualization-platform', '/features/wealth-builder', '/features/journaling-for-wealth'],
  ),
  featurePage(
    'wealth-builder',
    'Wealth Builder',
    'Wealth Builder is a ManifestBank™ feature for structuring intentional routines, reflection, and long-horizon wealth visualization.',
    'Wealth Builder',
    'Wealth Builder gives ManifestBank™ users a more structured place to define routines, milestones, and identity-aligned behaviors connected to intentional financial growth.',
    [
      {
        title: 'Structure for long-horizon focus',
        paragraphs: [
          'Wealth Builder is less about quick wins and more about making important patterns visible over time.',
          'It helps users revisit the behaviors, choices, and language they want to embody around wealth.',
        ],
      },
      {
        title: 'Behavior before bravado',
        paragraphs: [
          'The feature is grounded in behavioral support rather than motivational noise. Users can return to it as a steady framework for review and recalibration.',
          'That makes the platform feel composed and durable.',
        ],
      },
      {
        title: 'Designed to complement other tools',
        paragraphs: [
          'Wealth Builder pairs naturally with AI Teller, journaling, and manifestation checks.',
          'The result is a cohesive environment for symbolic planning and premium self-observation.',
        ],
      },
    ],
    ['/mindset-finance', '/features/ai-teller', '/features/manifestation-checks', '/blog/identity-and-money-habits'],
  ),
  featurePage(
    'manifestation-checks',
    'Manifestation Checks',
    'Manifestation Checks are premium visualization tools inside ManifestBank™ that make intention feel reviewable, memorable, and repeatable.',
    'Manifestation Checks',
    'Manifestation Checks bring symbolic wealth visualization into a premium, structured format. They help users turn a feeling of intention into a ritual they can revisit.',
    [
      {
        title: 'Symbolic tools with a purpose',
        paragraphs: [
          'Manifestation Checks are not real financial instruments. They are premium digital tools for visualization, focus, and reflective reinforcement.',
          'That symbolic framing helps users hold attention on goals without confusing the experience with banking products.',
        ],
      },
      {
        title: 'Why symbolic design matters',
        paragraphs: [
          'Rituals become more memorable when they have form. Manifestation Checks give form to intention in a way that feels elegant rather than gimmicky.',
          'This supports consistent review and emotional resonance.',
        ],
      },
      {
        title: 'Best used with reflection',
        paragraphs: [
          'The feature becomes more effective when paired with journaling and AI-guided support.',
          'That combination helps users connect visualization to actual self-observation.',
        ],
      },
    ],
    ['/money-affirmation-app', '/financial-manifestation-app', '/features/journaling-for-wealth', '/blog/how-to-use-an-affirmation-app-for-money-focus'],
  ),
  featurePage(
    'the-ether',
    'The Ether™',
    'The Ether™ is the communication and reflection layer inside ManifestBank™, designed for intentional exchange rather than algorithmic distraction.',
    'The Ether',
    'The Ether™ is the communication and reflection layer within ManifestBank™. It supports intentional exchange, private reflection, and thoughtful interaction within the broader wealth visualization platform.',
    [
      {
        title: 'A quieter communication layer',
        paragraphs: [
          'The Ether™ is not built for virality, distraction, or engagement loops. It is designed for presence, reflection, and deliberate exchange.',
          'That gives ManifestBank™ a more composed internal environment.',
        ],
      },
      {
        title: 'How it supports the platform',
        paragraphs: [
          'Reflection is not always solitary. The Ether™ creates space for messages, prompts, or exchanges that support intention without turning the product into social media.',
          'It is part of the platform’s emotional architecture.',
        ],
      },
      {
        title: 'Boundaries remain clear',
        paragraphs: [
          'The Ether™ does not change the platform’s compliance position. ManifestBank™ remains a digital support and reflection platform.',
          'It does not hold or move money, and communication features do not create financial services.',
        ],
      },
    ],
    ['/manifestbank', '/features/ai-teller', '/features/journaling-for-wealth', '/about'],
  ),
  featurePage(
    'inner-credit-system',
    'Inner Credit System',
    'The Inner Credit System is a symbolic ManifestBank™ feature for tracking consistency, self-trust, and internal alignment.',
    'Inner Credit System',
    'The Inner Credit System gives users a symbolic way to think about self-trust, consistency, and internal alignment inside ManifestBank™.',
    [
      {
        title: 'A symbolic score for self-trust',
        paragraphs: [
          'The Inner Credit System is not a consumer credit bureau or lending product. It is a reflective metaphor used to help users think about internal consistency.',
          'That metaphor gives abstract growth a language users can revisit.',
        ],
      },
      {
        title: 'Why the feature resonates',
        paragraphs: [
          'Many people understand that confidence grows through evidence. The Inner Credit System turns that idea into a symbolic frame for repeated self-observation.',
          'It rewards awareness and integrity of action, not fantasy.',
        ],
      },
      {
        title: 'How it fits ManifestBank™',
        paragraphs: [
          'This feature works well alongside journaling, AI support, and wealth-building routines.',
          'Together, they create a more complete environment for intentional financial growth.',
        ],
      },
    ],
    ['/mindset-finance', '/features/wealth-builder', '/features/journaling-for-wealth', '/blog/identity-and-money-habits'],
  ),
  featurePage(
    'journaling-for-wealth',
    'Journaling for Wealth',
    'Journaling for Wealth is ManifestBank™’s guided journaling approach for noticing money patterns, identity shifts, and intentional growth.',
    'journaling for wealth',
    'Journaling for Wealth gives users a place to notice the patterns underneath their money goals. Inside ManifestBank™, journaling is not filler. It is part of the platform’s core behavioral support model.',
    [
      {
        title: 'Why journaling matters here',
        paragraphs: [
          'Wealth habits are often shaped by language, emotion, and identity before they are shaped by spreadsheets.',
          'Journaling for Wealth helps users surface those quieter layers in a structured and repeatable way.',
        ],
      },
      {
        title: 'A premium practice, not an afterthought',
        paragraphs: [
          'ManifestBank™ treats journaling as a premium tool for awareness. Prompts, reflection flows, and elegant framing make the practice easier to sustain.',
          'That shifts journaling from vague self-expression toward disciplined review.',
        ],
      },
      {
        title: 'Part of a larger platform',
        paragraphs: [
          'Journaling becomes more useful when paired with AI Teller, manifestation checks, and the Wealth Builder framework.',
          'The result is a platform where insight can compound over time.',
        ],
      },
    ],
    ['/affirmation-app', '/features/ai-teller', '/features/wealth-builder', '/blog/identity-and-money-habits'],
  ),
]

export const comparePages: SeoPageEntry[] = [
  comparePage(
    'manifestbank-vs-manifestation-apps',
    'ManifestBank™ vs Manifestation Apps',
    'Compare ManifestBank™ vs manifestation apps to see how a wealth visualization platform differs from generic motivational tools.',
    'ManifestBank vs manifestation apps',
    'ManifestBank™ vs manifestation apps is ultimately a question of depth. Generic manifestation apps often focus on inspiration alone, while ManifestBank™ combines reflection, behavioral support, and guided digital tools.',
    [
      {
        title: 'Manifestation apps often stop at inspiration',
        paragraphs: [
          'Many manifestation apps are built around quotes, reminders, or mood-based prompts. Those can be useful, but they rarely create a durable practice.',
          'ManifestBank™ adds structure through journaling, AI support, and symbolic wealth tools.',
        ],
      },
      {
        title: 'ManifestBank™ is a wealth visualization platform',
        paragraphs: [
          'The platform is positioned as a wealth visualization platform blending behavioral finance concepts, digital reflection, mindset support, and guided tools for intentional financial growth.',
          'That framing gives the user experience more substance and clearer boundaries.',
        ],
      },
      {
        title: 'A compliance-safe difference',
        paragraphs: [
          'ManifestBank™ still does not operate as a bank or financial institution. It does not hold or move money.',
          'Its advantage is structure and intentionality, not regulated financial functionality.',
        ],
      },
    ],
    [
      {
        question: 'Is ManifestBank™ just another manifestation app?',
        answer:
          'No. ManifestBank™ is positioned more narrowly as a wealth visualization platform with guided support, journaling, and behavioral reflection rather than a general manifestation app.',
      },
      {
        question: 'Does ManifestBank™ guarantee financial outcomes?',
        answer:
          'No. The platform does not guarantee results. It supports reflection, awareness, and intentional routines only.',
      },
      {
        question: 'Why choose ManifestBank™ over a generic manifestation app?',
        answer:
          'Choose ManifestBank™ if you want a more premium, structured, and behaviorally grounded experience tied to wealth themes and reflective tools.',
      },
    ],
    ['/blog/how-manifestation-and-behavior-change-work-together', '/blog/why-most-manifestation-apps-stop-too-early', '/manifestbank-app', '/wealth-visualization-platform'],
  ),
  comparePage(
    'manifestbank-vs-affirmation-apps',
    'ManifestBank™ vs Affirmation Apps',
    'Compare ManifestBank™ vs affirmation apps to understand the difference between repeated statements and a richer reflective platform.',
    'ManifestBank vs affirmation apps',
    'ManifestBank™ vs affirmation apps comes down to context. An affirmation app may help with repetition, but ManifestBank™ adds journaling, symbolic tools, and guided support so the practice has more depth.',
    [
      {
        title: 'Affirmation apps focus on language',
        paragraphs: [
          'Affirmation apps are useful for repetition and emotional priming. Their limit is that they often isolate phrases from the behaviors and situations shaping those beliefs.',
          'ManifestBank™ places affirmations inside a broader reflection environment.',
        ],
      },
      {
        title: 'ManifestBank™ adds behavioral support',
        paragraphs: [
          'With AI Teller, journaling, and wealth visualization tools, the platform helps users connect affirmations to observed patterns and choices.',
          'That makes the experience feel more mature and less performative.',
        ],
      },
      {
        title: 'Still not a financial app in the regulated sense',
        paragraphs: [
          'ManifestBank™ uses money-oriented language symbolically, not as a claim of banking, lending, or investing functionality.',
          'It remains a reflective digital platform for intentional financial growth.',
        ],
      },
    ],
    [
      {
        question: 'Can ManifestBank™ replace an affirmation app?',
        answer:
          'For many users, yes. ManifestBank™ includes affirmation-adjacent support while adding structure, reflection, and feature depth that simple affirmation apps usually lack.',
      },
      {
        question: 'Is ManifestBank™ only for money affirmations?',
        answer:
          'No. The platform is broader than money affirmations, though it is especially strong for users focused on wealth visualization and intentional financial growth.',
      },
      {
        question: 'Does ManifestBank™ offer banking services?',
        answer:
          'No. ManifestBank™ is not a bank or financial institution and does not hold, move, or manage money.',
      },
    ],
    ['/blog/how-to-use-an-affirmation-app-for-money-focus', '/blog/identity-and-money-habits', '/affirmation-app', '/money-affirmation-app'],
  ),
  comparePage(
    'manifestbank-vs-traditional-budgeting-apps',
    'ManifestBank™ vs Traditional Budgeting Apps',
    'Compare ManifestBank™ vs traditional budgeting apps to see how reflective wealth support differs from account-based finance tools.',
    'ManifestBank vs traditional budgeting apps',
    'ManifestBank™ vs traditional budgeting apps is not a fight over features. It is a difference in category. Budgeting apps manage numbers and accounts, while ManifestBank™ supports reflection, wealth visualization, and money-related behavior awareness.',
    [
      {
        title: 'Budgeting apps organize transactions',
        paragraphs: [
          'Traditional budgeting apps are built for account syncing, categorization, reports, and financial administration.',
          'ManifestBank™ does not do those jobs, and it does not claim to.',
        ],
      },
      {
        title: 'ManifestBank™ organizes attention',
        paragraphs: [
          'The platform focuses on identity, habits, affirmations, journaling, and guided support around financial themes.',
          'That makes it useful for users who want inner clarity alongside or instead of traditional money software.',
        ],
      },
      {
        title: 'Complementary, not interchangeable',
        paragraphs: [
          'Some users may use ManifestBank™ alongside a budgeting tool. The budgeting app handles logistics while ManifestBank™ supports awareness and intention.',
          'The distinction keeps expectations honest and the product position strong.',
        ],
      },
    ],
    [
      {
        question: 'Can ManifestBank™ replace Mint-style or YNAB-style tools?',
        answer:
          'No. ManifestBank™ is not a budgeting or account aggregation app. It is a reflective platform for awareness, mindset support, and wealth visualization.',
      },
      {
        question: 'Why would someone use ManifestBank™ with a budgeting app?',
        answer:
          'A budgeting app can handle operational tracking while ManifestBank™ helps the user examine patterns, intentions, and consistency around money behavior.',
      },
      {
        question: 'Does ManifestBank™ connect to bank accounts?',
        answer:
          'This platform positioning does not rely on bank connections. ManifestBank™ is not a financial institution and does not hold or move money.',
      },
    ],
    ['/blog/what-is-a-wealth-visualization-platform', '/blog/what-is-behavioral-fintech', '/wealth-visualization-platform', '/behavioral-fintech'],
  ),
  comparePage(
    'manifestbank-vs-goal-tracking-apps',
    'ManifestBank™ vs Goal Tracking Apps',
    'Compare ManifestBank™ vs goal tracking apps to understand the difference between checking progress and reshaping financial identity.',
    'ManifestBank vs goal tracking apps',
    'ManifestBank™ vs goal tracking apps highlights a useful distinction. Goal trackers are excellent for milestones, but ManifestBank™ goes deeper into wealth visualization, self-observation, and guided behavioral support.',
    [
      {
        title: 'Goal tracking apps measure completion',
        paragraphs: [
          'Most goal trackers are centered on streaks, deadlines, milestones, and task completion.',
          'That is valuable, but it does not always address the identity and emotional patterns that shape follow-through.',
        ],
      },
      {
        title: 'ManifestBank™ works on the layer beneath action',
        paragraphs: [
          'The platform adds journaling, manifestation tools, affirmations, and AI-guided support so users can work with the beliefs and behaviors attached to their goals.',
          'That makes it especially relevant for wealth and money-focused personal growth.',
        ],
      },
      {
        title: 'A richer experience for intentional growth',
        paragraphs: [
          'ManifestBank™ is not a generic productivity tracker. It is a premium digital platform built for intentional financial growth and reflective practice.',
          'It does not hold or move money, but it can help users stay close to the habits shaping financial outcomes.',
        ],
      },
    ],
    [
      {
        question: 'Is ManifestBank™ a goal tracking app?',
        answer:
          'Not primarily. It includes structure and guidance, but its position is broader and deeper than a standard goal tracking app.',
      },
      {
        question: 'Why choose it over a goal tracker?',
        answer:
          'Choose ManifestBank™ if you want reflection, identity work, and premium wealth visualization alongside progress-oriented structure.',
      },
      {
        question: 'Does ManifestBank™ manage money goals directly?',
        answer:
          'It supports money-related reflection and visualization, but it does not manage funds or provide regulated financial services.',
      },
    ],
    ['/blog/manifesting-app-vs-goal-tracker', '/blog/how-manifestation-and-behavior-change-work-together', '/manifesting-app', '/mindset-finance'],
  ),
]

export const blogPages: SeoPageEntry[] = [
  blogPage(
    'how-manifestation-and-behavior-change-work-together',
    'How Manifestation and Behavior Change Work Together',
    'How manifestation and behavior change work together through repetition, identity, reflection, and deliberate action.',
    'how manifestation and behavior change work together',
    'How manifestation and behavior change work together is less mystical than it sounds. Manifestation becomes more credible when it is tied to identity, repetition, feedback, and deliberate action.',
    [
      {
        title: 'Manifestation without behavior is fragile',
        paragraphs: [
          'Manifestation can create emotional focus, but focus alone fades quickly. Without repeated behavior, the practice becomes a temporary state instead of a durable pattern.',
          'Behavior change gives manifestation something to attach to.',
        ],
      },
      {
        title: 'Behavior without identity often stalls',
        paragraphs: [
          'Pure discipline can carry a person for a while, but people often relapse into old defaults when identity stays untouched.',
          'Manifestation language can be useful when it helps users rehearse a more intentional self-concept.',
        ],
      },
      {
        title: 'The best systems combine both',
        paragraphs: [
          'A strong platform combines reflective prompts, consistent review, and guided support. That is how ManifestBank™ approaches the relationship between manifestation and behavior change.',
          'The platform does not guarantee results. It creates a better environment for awareness and repetition.',
        ],
      },
    ],
    [
      {
        question: 'Is manifestation the same as behavior change?',
        answer:
          'No. Manifestation is often about intention and focus, while behavior change concerns repeated action. They work best when linked together.',
      },
      {
        question: 'Why does reflection matter in both?',
        answer:
          'Reflection helps users notice whether their language, choices, and routines actually match the future they say they want.',
      },
      {
        question: 'How does ManifestBank™ apply this idea?',
        answer:
          'ManifestBank™ combines guided tools, AI support, and journaling to help users connect wealth-focused intention with repeated behavior in a premium digital environment.',
      },
    ],
    ['/wealth-visualization-platform', '/manifestation-driven-finance', '/features/ai-teller', '/features/journaling-for-wealth'],
  ),
  blogPage(
    'what-is-a-wealth-visualization-platform',
    'What Is a Wealth Visualization Platform?',
    'What a wealth visualization platform is, how it differs from budgeting apps, and why the category matters.',
    'what is a wealth visualization platform',
    'A wealth visualization platform is a digital environment designed to help users focus on financial identity, intention, habits, and reflection without acting as a bank or investment manager.',
    [
      {
        title: 'A category between mindset and operations',
        paragraphs: [
          'A wealth visualization platform sits between generic manifestation content and traditional finance software.',
          'It does not handle accounts or transactions. Instead, it helps users organize attention around the beliefs and behaviors shaping financial choices.',
        ],
      },
      {
        title: 'Why the category is emerging',
        paragraphs: [
          'Many people want support that feels more elegant than budgeting and more grounded than vague inspiration.',
          'That opens room for products like ManifestBank™ that blend design, reflective tools, and behavioral support.',
        ],
      },
      {
        title: 'How ManifestBank™ defines the space',
        paragraphs: [
          'ManifestBank™ positions itself clearly in this category by using symbolic financial language, AI-guided support, journaling, and luxury digital rituals.',
          'It remains explicit that it is not a financial institution and does not hold or move money.',
        ],
      },
    ],
    [
      {
        question: 'Is a wealth visualization platform a budgeting app?',
        answer:
          'No. A wealth visualization platform focuses on intention, behavior, and reflective support rather than account-level money management.',
      },
      {
        question: 'Who benefits from a wealth visualization platform?',
        answer:
          'People who want a structured, premium environment for wealth-focused reflection and behavioral support can benefit from this category.',
      },
      {
        question: 'Does ManifestBank™ fit this definition?',
        answer:
          'Yes. ManifestBank™ is positioned as a wealth visualization platform blending behavioral finance concepts, digital reflection, mindset support, and guided tools for intentional financial growth.',
      },
    ],
    ['/wealth-visualization-platform', '/behavioral-fintech', '/features/wealth-builder', '/features/manifestation-checks'],
  ),
  blogPage(
    'how-to-use-an-affirmation-app-for-money-focus',
    'How to Use an Affirmation App for Money Focus',
    'How to use an affirmation app for money focus with better repetition, journaling, and reflective structure.',
    'how to use an affirmation app for money focus',
    'Knowing how to use an affirmation app for money focus matters more than collecting dozens of phrases. The practice works better when affirmations are tied to review, self-observation, and consistent routines.',
    [
      {
        title: 'Keep the language specific',
        paragraphs: [
          'Affirmations become more useful when they are clear, believable, and connected to the identity a user is trying to reinforce.',
          'For money focus, vague abundance language is often less effective than grounded statements tied to self-trust, stewardship, and discipline.',
        ],
      },
      {
        title: 'Pair affirmations with journaling',
        paragraphs: [
          'Journaling helps users notice resistance, emotional reactions, and behavior patterns that surface when an affirmation is repeated.',
          'That makes the practice more honest and useful over time.',
        ],
      },
      {
        title: 'Use a platform that supports context',
        paragraphs: [
          'An affirmation app for money focus becomes stronger when it sits inside a broader system for reflection and guided support.',
          'ManifestBank™ approaches the practice this way through affirmations, journaling, visualization, and premium digital structure.',
        ],
      },
    ],
    [
      {
        question: 'How often should I use a money affirmation app?',
        answer:
          'Consistency matters more than volume. A short daily practice with reflection is usually stronger than irregular bursts of repetition.',
      },
      {
        question: 'Why add journaling to affirmations?',
        answer:
          'Journaling exposes the beliefs and emotions surrounding the affirmation, which helps the user understand whether the practice is actually changing anything.',
      },
      {
        question: 'What makes ManifestBank™ relevant here?',
        answer:
          'ManifestBank™ supports money-focused affirmations inside a broader environment for journaling, guided AI support, and wealth visualization.',
      },
    ],
    ['/money-affirmation-app', '/financial-manifestation-app', '/features/journaling-for-wealth', '/features/manifestation-checks'],
  ),
  blogPage(
    'manifesting-app-vs-goal-tracker',
    'Manifesting App vs Goal Tracker',
    'Manifesting app vs goal tracker: how the two categories differ and where each one helps.',
    'manifesting app vs goal tracker',
    'Manifesting app vs goal tracker is not just a feature comparison. It is a comparison between two very different ways of supporting change: one through mindset and symbolism, the other through progress measurement.',
    [
      {
        title: 'A manifesting app shapes emotional focus',
        paragraphs: [
          'Manifesting apps usually help users reinforce desire, self-concept, or positive expectation.',
          'Their strength is emotional orientation, but they can become vague when there is no structure around follow-through.',
        ],
      },
      {
        title: 'A goal tracker shapes visible progress',
        paragraphs: [
          'Goal trackers are strong at milestones, streaks, and accountability. They provide more explicit measurement but may not help users understand the internal friction beneath a goal.',
          'That makes them effective but incomplete for some people.',
        ],
      },
      {
        title: 'Why ManifestBank™ sits between the two',
        paragraphs: [
          'ManifestBank™ blends elements of both categories while focusing especially on wealth visualization, reflective structure, and guided support.',
          'It is not a generic goal tracker, and it is more grounded than a purely inspirational manifesting app.',
        ],
      },
    ],
    [
      {
        question: 'Should I use a manifesting app or a goal tracker?',
        answer:
          'That depends on whether you need emotional orientation, measurement, or both. Many users benefit most from a system that combines reflection with structure.',
      },
      {
        question: 'Where does ManifestBank™ fit?',
        answer:
          'ManifestBank™ sits between those categories by offering symbolic wealth tools, journaling, and guided support in one premium platform.',
      },
      {
        question: 'Does ManifestBank™ function like a financial planner?',
        answer:
          'No. It does not provide financial planning, regulated advice, or money movement. It supports intentional financial growth through reflection and awareness.',
      },
    ],
    ['/manifesting-app', '/mindset-finance', '/features/wealth-builder', '/features/ai-teller'],
  ),
  blogPage(
    'what-is-behavioral-fintech',
    'What Is Behavioral Fintech?',
    'What behavioral fintech means and how products like ManifestBank™ interpret the category.',
    'what is behavioral fintech',
    'Behavioral fintech refers to financial or finance-adjacent digital products that account for how people actually behave, not just what numbers say they should do.',
    [
      {
        title: 'The category starts with human behavior',
        paragraphs: [
          'Behavioral fintech recognizes that people make decisions through habits, defaults, emotions, and mental shortcuts.',
          'Products in this space try to support better outcomes by designing with those realities in mind.',
        ],
      },
      {
        title: 'The category can be broader than budgeting',
        paragraphs: [
          'Some behavioral fintech products use nudges or automation. Others, like ManifestBank™, focus more on reflection, identity, and self-observation around wealth themes.',
          'That makes the category wider than many people assume.',
        ],
      },
      {
        title: 'Why ManifestBank™ belongs in the conversation',
        paragraphs: [
          'ManifestBank™ blends behavioral finance concepts with journaling, guided tools, and premium digital rituals. It is finance-adjacent in language and theme, while remaining clear that it is not a financial institution.',
          'Its role is support, not custody or advice.',
        ],
      },
    ],
    [
      {
        question: 'Does behavioral fintech always involve bank accounts?',
        answer:
          'No. Some products interact with accounts directly, while others are finance-adjacent tools focused on awareness, behavior, and reflection.',
      },
      {
        question: 'Is ManifestBank™ a fintech company in the regulated sense?',
        answer:
          'This platform positioning is behavioral and reflective, not regulated banking or advisory activity. ManifestBank™ does not hold or move money.',
      },
      {
        question: 'Why is the category useful?',
        answer:
          'It helps explain why better behavior often requires better environments, not just better information.',
      },
    ],
    ['/behavioral-fintech', '/manifestation-driven-finance', '/features/ai-teller', '/features/inner-credit-system'],
  ),
  blogPage(
    'identity-and-money-habits',
    'Identity and Money Habits',
    'Identity and money habits: why financial behavior often follows self-concept before strategy.',
    'identity and money habits',
    'Identity and money habits are closely linked. Many financial behaviors feel automatic because they are attached to self-concept, emotion, and long-rehearsed narratives rather than conscious strategy alone.',
    [
      {
        title: 'Identity often precedes behavior',
        paragraphs: [
          'People tend to act in ways that feel consistent with who they believe they are. That means money habits are often expressions of identity before they are failures of information.',
          'Changing the habit may require changing the self-story around it.',
        ],
      },
      {
        title: 'Money habits are emotional and symbolic',
        paragraphs: [
          'Money is rarely just math. It often carries status, safety, shame, ambition, and memory.',
          'That is why reflection and journaling can be more revealing than productivity advice alone.',
        ],
      },
      {
        title: 'ManifestBank™ is built for this layer',
        paragraphs: [
          'ManifestBank™ gives users a premium space to examine identity and money habits through guided support, wealth visualization, and structured reflection.',
          'The platform does not guarantee outcomes, but it supports a more honest practice of awareness.',
        ],
      },
    ],
    [
      {
        question: 'Can identity really change money habits?',
        answer:
          'Yes, identity can influence repeated behavior significantly. When self-concept changes, old habits often become easier to question or replace.',
      },
      {
        question: 'Why is journaling useful for money habits?',
        answer:
          'Journaling helps surface the beliefs, fears, and narratives attached to a financial pattern, which is often the first step toward changing it.',
      },
      {
        question: 'How does ManifestBank™ help with identity and money habits?',
        answer:
          'ManifestBank™ combines journaling, symbolic financial language, and guided support so users can examine money habits in a more intentional environment.',
      },
    ],
    ['/mindset-finance', '/wealth-visualization-platform', '/features/journaling-for-wealth', '/features/inner-credit-system'],
  ),
  blogPage(
    'why-most-manifestation-apps-stop-too-early',
    'Why Most Manifestation Apps Stop Too Early',
    'Why most manifestation apps stop too early and what more mature platforms do differently.',
    'why most manifestation apps stop too early',
    'Why most manifestation apps stop too early usually comes down to one issue: they end at inspiration instead of building a system for reflection, repetition, and evidence.',
    [
      {
        title: 'The early stop happens at motivation',
        paragraphs: [
          'Many manifestation apps deliver a strong first impression through affirmations, visuals, or soothing prompts.',
          'The problem is that motivation fades if there is no deeper loop of review and self-observation.',
        ],
      },
      {
        title: 'What mature platforms add',
        paragraphs: [
          'More mature products add journaling, pattern recognition, guided support, and some form of structure users can return to over time.',
          'That is how a manifestation experience becomes part of life rather than a short-lived mood.',
        ],
      },
      {
        title: 'How ManifestBank™ responds',
        paragraphs: [
          'ManifestBank™ is designed to continue where many manifestation apps stop. It keeps the aesthetic and emotional power of the category while adding richer behavioral support and wealth-focused reflection.',
          'The result is more disciplined and more credible.',
        ],
      },
    ],
    [
      {
        question: 'What does it mean for a manifestation app to stop too early?',
        answer:
          'It means the app provides inspiration but does not help users build a repeatable practice of reflection, awareness, and behavior change.',
      },
      {
        question: 'How is ManifestBank™ different?',
        answer:
          'ManifestBank™ adds journaling, AI support, symbolic wealth tools, and a more intentional platform architecture around long-term use.',
      },
      {
        question: 'Does that mean guaranteed outcomes?',
        answer:
          'No. The platform does not promise results. It offers better support for intentional practice.',
      },
    ],
    ['/manifestation-app', '/financial-manifestation-app', '/features/ai-teller', '/features/manifestation-checks'],
  ),
]

export const rootPageMap = new Map(corePages.map((entry) => [entry.slug, entry]))
export const featurePageMap = new Map(featurePages.map((entry) => [entry.slug, entry]))
export const comparePageMap = new Map(comparePages.map((entry) => [entry.slug, entry]))
export const blogPageMap = new Map(blogPages.map((entry) => [entry.slug, entry]))

export function getRelatedLinks(entry: SeoPageEntry): RelatedLink[] {
  return relatedLinks(entry.relatedHrefs)
}

export function getLinksByHref(hrefs: string[]): RelatedLink[] {
  return relatedLinks(hrefs)
}

export function getAllSeoPages() {
  return [...corePages, ...featurePages, ...comparePages, ...blogPages]
}

export function buildMetadata(entry: SeoPageEntry): Metadata {
  return {
    title: entry.title,
    description: entry.description,
    alternates: {
      canonical: entry.path,
    },
    openGraph: {
      title: `${entry.title} | ManifestBank™`,
      description: entry.description,
      url: `${SITE_URL}${entry.path}`,
      siteName: 'ManifestBank™',
      type: entry.kind === 'blog' ? 'article' : 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${entry.title} | ManifestBank™`,
      description: entry.description,
    },
  }
}
