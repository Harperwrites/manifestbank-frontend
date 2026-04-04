import { expect, test, type Page } from '@playwright/test'
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

const creditRoutes = [
  { path: '/mycredit/iab', backTestId: 'credit-bureau-back-button' },
  { path: '/mycredit/emotional-reserve', backTestId: 'credit-bureau-back-button' },
  { path: '/mycredit/ctb', backTestId: 'credit-bureau-back-button' },
  { path: '/mycreditreport', backTestId: 'credit-report-back-button' },
] as const

async function expectBackButtonVisibleBelowNavbar(page: Page, backTestId: string) {
  const backButton = page.getByTestId(backTestId)

  await expect(backButton).toBeVisible()

  const buttonBox = await backButton.boundingBox()
  expect(buttonBox).not.toBeNull()

  if (!buttonBox) return

  const buttonTop = buttonBox.y
  const buttonBottom = buttonBox.y + buttonBox.height
  const buttonLeft = buttonBox.x
  const buttonRight = buttonBox.x + buttonBox.width
  const viewportHeight = page.viewportSize()?.height ?? 0
  const viewportWidth = page.viewportSize()?.width ?? 0

  expect(buttonTop).toBeGreaterThanOrEqual(0)
  expect(buttonBottom).toBeLessThanOrEqual(viewportHeight)
  expect(buttonLeft).toBeGreaterThanOrEqual(0)
  expect(buttonRight).toBeLessThanOrEqual(viewportWidth)
  expect(buttonTop).toBeLessThanOrEqual(140)
}

for (const viewport of mobileAndTabletViewports) {
  test(`credit back buttons stay fully visible on ${viewport.name}`, async ({ page, request }) => {
    const user = await seedUser(request)
    await primeBrowserSession(page, request, user)
    await page.setViewportSize({ width: viewport.width, height: viewport.height })

    for (const route of creditRoutes) {
      await page.goto(route.path)
      await expectBackButtonVisibleBelowNavbar(page, route.backTestId)
    }
  })
}
