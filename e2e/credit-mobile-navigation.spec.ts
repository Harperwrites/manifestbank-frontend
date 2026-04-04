import { expect, test, type Locator, type Page } from '@playwright/test'
import { primeBrowserSession, seedUser } from './helpers'

const mobileAndTabletViewports = [
  { name: 'Galaxy Z Fold5 cover', width: 344, height: 882 },
  { name: 'Galaxy S8 Plus', width: 360, height: 740 },
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12 Pro', width: 390, height: 844 },
  { name: 'Galaxy A71/A51', width: 412, height: 914 },
  { name: 'Galaxy S20 Ultra / Pixel 7', width: 412, height: 915 },
  { name: 'iPhone XR', width: 414, height: 896 },
  { name: 'iPhone 14 Pro Max', width: 430, height: 932 },
  { name: 'Surface Duo', width: 540, height: 720 },
  { name: 'Nest Hub', width: 1024, height: 600 },
  { name: 'Surface Pro 7', width: 912, height: 1368 },
  { name: 'iPad Pro', width: 1024, height: 1366 },
] as const

async function expectTopVisible(page: Page, locator: Locator, maxGapBelowSpacer: number) {
  await expect(locator).toBeVisible()
  const box = await locator.boundingBox()
  const spacerBox = await page.locator('.mb-navbar-spacer').first().boundingBox()
  expect(box).not.toBeNull()
  expect(spacerBox).not.toBeNull()
  if (!box || !spacerBox) return

  const viewport = page.viewportSize()
  const spacerBottom = spacerBox.y + spacerBox.height
  expect(box.y).toBeGreaterThanOrEqual(spacerBottom - 1)
  expect(box.y - spacerBottom).toBeLessThanOrEqual(maxGapBelowSpacer)
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport?.height ?? 0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport?.width ?? 0)
}

function bureauTestId(prefix: 'mobile' | 'desktop', bureau: 'iab' | 'emotional' | 'ctb') {
  if (bureau === 'iab') return `credit-${prefix}-iab-card`
  if (bureau === 'emotional') return `credit-${prefix}-emotional-card`
  return `credit-${prefix}-ctb-card`
}

for (const viewport of mobileAndTabletViewports) {
  test(`credit first-navigation top content stays visible on ${viewport.name}`, async ({ page, request }) => {
    const user = await seedUser(request)
    await primeBrowserSession(page, request, user)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    const prefix = viewport.width <= 740 ? 'mobile' : 'desktop'

    await page.goto('/mycredit')
    await expectTopVisible(page, page.getByTestId('credit-page-eyebrow'), 80)

    await page.getByTestId('credit-view-report-link').click()
    await page.waitForURL('**/mycreditreport')
    await expectTopVisible(page, page.getByTestId('credit-report-back-button'), 24)

    const bureauTargets = [
      { bureau: 'iab' as const, path: '**/mycredit/iab' },
      { bureau: 'emotional' as const, path: '**/mycredit/emotional-reserve' },
      { bureau: 'ctb' as const, path: '**/mycredit/ctb' },
    ]

    for (const target of bureauTargets) {
      await page.goto('/mycredit')
      await expectTopVisible(page, page.getByTestId('credit-page-eyebrow'), 80)
      await page.getByTestId(bureauTestId(prefix, target.bureau)).click()
      await page.waitForURL(target.path)
      await expectTopVisible(page, page.getByTestId('credit-bureau-back-button'), 24)
    }
  })
}
