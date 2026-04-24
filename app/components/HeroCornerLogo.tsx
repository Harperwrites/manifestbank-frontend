import Image from 'next/image'

export default function HeroCornerLogo() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: 18,
        right: 18,
        zIndex: 1,
        width: 'clamp(84px, 12vw, 136px)',
        height: 'clamp(84px, 12vw, 136px)',
        borderRadius: '28%',
        overflow: 'hidden',
        opacity: 0.96,
        pointerEvents: 'none',
        boxShadow: '0 18px 44px rgba(0, 0, 0, 0.26)',
      }}
    >
      <Image
        src="/manifestbank-glow-edge-logo.png"
        alt=""
        fill
        sizes="(max-width: 768px) 84px, 136px"
        style={{ objectFit: 'contain' }}
      />
    </div>
  )
}
