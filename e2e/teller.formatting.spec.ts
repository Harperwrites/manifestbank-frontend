import { expect, test } from '@playwright/test'
import { dismissDashboardWelcome, mockTellerChat, openTellerWidget, primeBrowserSession, seedUser, waitForDashboardSession } from './helpers'

const structuredReply = [
  '## Insight',
  '### Reset',
  'Take one slow breath and let your shoulders drop.',
  '',
  'Next steps:',
  '1. Name what feels loud.',
  '2. Choose the next grounded action.',
  '',
  '- Ground your body',
  '  - Release your jaw',
  '- Review [your dashboard](https://example.com/dashboard)',
  '',
  '**Important:** keep the next step small.',
  '',
  '*Let this stay simple.*',
].join('\n')

const affirmationsReply = [
  '## Grounded Affirmations',
  '',
  'Here are 10 short, grounded affirmations.',
  'Here are 10 short, grounded affirmations.',
  '',
  '1. I can choose one calm next step.',
  '2. My money can move with clarity, not panic.',
  '3. I am allowed to slow down before I decide.',
  '4. I can build trust with myself one action at a time.',
  '5. My worth is not measured by one hard moment.',
  '6. I can stay grounded while I grow.',
  '7. I know how to return to center.',
  '8. I can hold vision and reality at the same time.',
  '9. I let steadiness lead this choice.',
  '10. I can begin again without shame.',
].join('\n')

test('my teller page preserves headings, lists, links, and paragraph spacing', async ({ page, request }) => {
  test.setTimeout(90000)
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(page, structuredReply)

  await page.goto('/myteller')
  await page.getByTestId('teller-draft-input').fill('Format this clearly for me.')
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST'),
    page.getByTestId('teller-send-button').click(),
  ])

  const responseRegion = page.getByTestId('teller-response-region')
  await expect(responseRegion).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Insight' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Reset' })).toBeVisible()
  await expect(responseRegion.locator('ol.teller-markdown-ol li')).toHaveCount(2)
  await expect(responseRegion.locator('ul.teller-markdown-ul li')).toHaveCount(3)
  await expect(responseRegion.locator('ul.teller-markdown-ul ul.teller-markdown-ul')).toHaveCount(1)
  await expect(responseRegion.locator('a.teller-markdown-link')).toHaveAttribute('href', 'https://example.com/dashboard')
  await expect(responseRegion.locator('strong.teller-markdown-strong')).toContainText('Important:')
  await expect(responseRegion.locator('strong.teller-markdown-strong')).toContainText('Next steps:')
  await expect(responseRegion.locator('em.teller-markdown-em')).toContainText('Let this stay simple.')
  await expect(responseRegion.locator('.teller-markdown-paragraph').first()).toHaveCSS('margin-top', '6px')
  await expect(responseRegion).not.toContainText('## Insight')
  await expect(responseRegion).not.toContainText('[your dashboard]')

  const hasOverflow = await responseRegion.evaluate((node) => node.scrollWidth > node.clientWidth + 1)
  expect(hasOverflow).toBeFalsy()

  const parentBullet = responseRegion.locator('ul.teller-markdown-ul > li').first()
  const nestedBullet = responseRegion.locator('ul.teller-markdown-ul ul.teller-markdown-ul > li').first()
  const parentBox = await parentBullet.boundingBox()
  const nestedBox = await nestedBullet.boundingBox()
  expect(parentBox).not.toBeNull()
  expect(nestedBox).not.toBeNull()
  expect((nestedBox?.x ?? 0) - (parentBox?.x ?? 0)).toBeGreaterThanOrEqual(8)
})

test('my teller widget preserves structured formatting on a mobile-width viewport', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(page, structuredReply)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)

  await page.getByTestId('teller-widget-draft-input').fill('Format this for the widget too.')
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST'),
    page.getByTestId('teller-widget-send-button').click(),
  ])

  const widgetRegion = page.getByTestId('teller-widget-response-region')
  await expect(widgetRegion).toBeVisible()
  await expect(widgetRegion.getByRole('heading', { name: 'Insight' })).toBeVisible()
  await expect(widgetRegion.locator('ol.teller-markdown-ol li')).toHaveCount(2)
  await expect(widgetRegion.locator('a.teller-markdown-link')).toHaveAttribute('href', 'https://example.com/dashboard')

  const hasOverflow = await widgetRegion.evaluate((node) => node.scrollWidth > node.clientWidth + 1)
  expect(hasOverflow).toBeFalsy()
})

test('teller keeps full counted lists, avoids repeated lines, and preserves punctuation on the page and widget', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(page, affirmationsReply)

  await page.goto('/myteller')
  await page.getByTestId('teller-draft-input').fill('Give me ten grounded affirmations.')
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST'),
    page.getByTestId('teller-send-button').click(),
  ])

  const pageRegion = page.getByTestId('teller-response-region')
  await expect(pageRegion.getByRole('heading', { name: 'Grounded Affirmations' })).toBeVisible()
  await expect(pageRegion.locator('ol.teller-markdown-ol > li')).toHaveCount(10)
  await expect(pageRegion.getByText('Here are 10 short, grounded affirmations.')).toHaveCount(1)
  await expect(pageRegion.locator('ol.teller-markdown-ol > li').last()).toContainText('I can begin again without shame.')

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await page.getByTestId('teller-widget-new-session-button').click()

  await page.getByTestId('teller-widget-draft-input').fill('Give me ten grounded affirmations in the widget.')
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST'),
    page.getByTestId('teller-widget-send-button').click(),
  ])

  const widgetRegion = page.getByTestId('teller-widget-response-region')
  await expect(widgetRegion.getByRole('heading', { name: 'Grounded Affirmations' }).last()).toBeVisible()
  await expect(widgetRegion.locator('ol.teller-markdown-ol > li')).toHaveCount(10)
  await expect(widgetRegion.getByText('Here are 10 short, grounded affirmations.')).toHaveCount(1)
  await expect(widgetRegion.locator('ol.teller-markdown-ol > li').last()).toContainText('I can begin again without shame.')

  const widgetOverflow = await widgetRegion.evaluate((node) => node.scrollWidth > node.clientWidth + 1)
  expect(widgetOverflow).toBeFalsy()
})
