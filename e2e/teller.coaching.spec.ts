import { expect, test } from '@playwright/test'
import { dismissDashboardWelcome, mockTellerChat, openTellerWidget, primeBrowserSession, seedUser, waitForDashboardSession } from './helpers'

async function sendPageTellerMessage(page: Parameters<typeof test>[0]['page'], message: string) {
  await expect(page.getByTestId('teller-draft-input')).toBeVisible()
  await page.getByTestId('teller-draft-input').fill(message)
  await page.getByTestId('teller-send-button').click()
}

async function sendWidgetTellerMessage(page: Parameters<typeof test>[0]['page'], message: string) {
  await expect(page.getByTestId('teller-widget-draft-input')).toBeVisible()
  await page.getByTestId('teller-widget-draft-input').fill(message)
  await page.getByTestId('teller-widget-send-button').click()
}

test('teller handles a coaching prompt with structured grounding on the page', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(
    page,
    '## Insight\nYou do not need to force clarity tonight.\n\n## Key Points\n- Relax your jaw.\n- Let one grounded next step be enough.\n\n## Reflection\nWhat feels safest to do first?'
  )

  await page.goto('/myteller')
  await expect(page.getByTestId('teller-page-title')).toBeVisible()
  await sendPageTellerMessage(page, 'Help me calm my money anxiety tonight.')

  await expect(page.getByTestId('teller-response-region').getByRole('heading', { name: 'Insight' }).last()).toBeVisible()
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('You do not need to force clarity tonight.')
  await expect(page.getByTestId('teller-response-region').locator('ul.teller-markdown-ul > li')).toHaveCount(2)
})

test('teller handles a scripting prompt with clear structure in the widget', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(
    page,
    '## Insight\nHere is a short script you can use tomorrow morning.\n\n## Script\nI welcome aligned growth. I speak clearly. The right members recognize the value of what I built.\n\n## Reflection\nDo you want a longer version for voice notes next?'
  )

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await sendWidgetTellerMessage(page, 'Write me a short abundance script for tomorrow morning.')

  await expect(page.getByTestId('teller-widget-response-region').getByRole('heading', { name: 'Script' }).last()).toBeVisible()
  await expect(page.getByTestId('teller-widget-assistant-message').last()).toContainText('The right members recognize the value of what I built.')
})

test('teller handles a nervous-system reset prompt without clipping or raw markdown', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(
    page,
    '## Insight\nLet your nervous system settle before you make the next move.\n\n## Reset\n1. Unclench your jaw.\n2. Drop your shoulders.\n3. Name one safe next step.\n\n## Reflection\nWould you like a 30-second version too?'
  )

  await page.goto('/myteller')
  await expect(page.getByTestId('teller-page-title')).toBeVisible()
  await sendPageTellerMessage(page, 'Give me a quick nervous system reset before I make a money decision.')

  const region = page.getByTestId('teller-response-region')
  await expect(region.getByRole('heading', { name: 'Reset' }).last()).toBeVisible()
  await expect(region.locator('ol.teller-markdown-ol > li')).toHaveCount(3)
  await expect(region).not.toContainText('## Reset')

  const hasOverflow = await region.evaluate((node) => node.scrollWidth > node.clientWidth + 1)
  expect(hasOverflow).toBeFalsy()
})
