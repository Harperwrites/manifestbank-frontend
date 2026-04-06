import { expect, test } from '@playwright/test'
import {
  dismissDashboardWelcome,
  mockBlankTellerStream,
  mockTellerChat,
  openTellerWidget,
  primeBrowserSession,
  seedUser,
  waitForDashboardSession,
} from './helpers'

async function sendPageTellerMessage(page: Parameters<typeof test>[0]['page'], message: string) {
  await page.getByTestId('teller-draft-input').fill(message)
  await page.getByTestId('teller-send-button').click()
}

async function sendWidgetTellerMessage(page: Parameters<typeof test>[0]['page'], message: string) {
  await page.getByTestId('teller-widget-draft-input').fill(message)
  await page.getByTestId('teller-widget-send-button').click()
}

test('my teller page renders core controls and loading lifecycle', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(page, '## Insight\nA calm next step is enough for today.', { delayMs: 800 })

  await page.goto('/myteller')

  await expect(page.getByTestId('teller-page-title')).toBeVisible()
  await expect(page.getByTestId('teller-new-session-button')).toBeVisible()
  await expect(page.getByLabel('Message Fortune')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
  await expect(page.getByTestId('teller-response-region')).toBeVisible()

  const pageResponse = page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST')
  await sendPageTellerMessage(page, 'Help me steady my money decisions this week.')

  await expect(page.getByTestId('teller-loading-indicator')).toContainText('Fortune is thinking…')
  await pageResponse
  await expect(page.getByRole('heading', { name: 'Insight' })).toBeVisible()
  await expect(page.getByTestId('teller-response-region')).toContainText('A calm next step is enough for today.')
  await expect(page.getByTestId('teller-assistant-signature').last()).toContainText('Fortune')
  await expect(page.getByTestId('teller-loading-indicator')).toHaveCount(0)
})

test('my teller widget renders core controls and returns responses', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(page, '## Insight\nYou can move one account action at a time.', { delayMs: 800 })

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)

  await expect(page.getByTestId('teller-widget-panel')).toBeVisible()
  await expect(page.getByLabel('Message Fortune')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send message' })).toBeVisible()
  await expect(page.getByRole('log', { name: 'Teller widget conversation' })).toBeVisible()

  const widgetResponse = page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST')
  await sendWidgetTellerMessage(page, 'Help me plan one aligned money move.')

  await expect(page.getByTestId('teller-widget-loading-indicator')).toContainText('Fortune is thinking…')
  await widgetResponse
  await expect(page.getByTestId('teller-widget-response-region')).toContainText('You can move one account action at a time.')
  await expect(page.getByTestId('teller-widget-assistant-signature').last()).toContainText('Fortune')
  await expect(page.getByTestId('teller-widget-loading-indicator')).toHaveCount(0)
})

test('teller shows an error state instead of inventing a fallback assistant reply when the stream returns no visible content', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockBlankTellerStream(page)

  await page.goto('/myteller')
  await sendPageTellerMessage(page, 'Support me through a hard money week.')
  await expect(page.getByText('Unable to send message.')).toBeVisible()
  await expect(page.getByTestId('teller-response-region')).not.toContainText('I’m here. Please try again.')

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await sendWidgetTellerMessage(page, 'Support me through a hard money week.')
  await expect(page.getByTestId('teller-widget-error')).toContainText('Unable to send message.')
  await expect(page.getByTestId('teller-widget-response-region')).not.toContainText('I’m here. Please try again.')
})

test('greeting prompts render on the page and widget', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(page, '## Insight\nHello.\n\n## Reflection\nWhat feels most supportive right now?')

  await page.goto('/myteller')
  await sendPageTellerMessage(page, 'hi there')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('Hello.')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('What feels most supportive right now?')

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await sendWidgetTellerMessage(page, 'hi there')
  await expect(page.getByTestId('teller-widget-assistant-message').last()).toContainText('Hello.')
  await expect(page.getByTestId('teller-widget-assistant-message').last()).toContainText('What feels most supportive right now?')
})

test('starter-style prompts render structured responses on the page and widget', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(
    page,
    '## Insight\nHere is a short future-success story you can step into.\n\n## Future Success Story\nYou open the app and feel steadiness instead of urgency.\n\n## Reflection\nDo you want this turned into first-person scripting or short affirmations next?'
  )

  await page.goto('/myteller')
  await sendPageTellerMessage(page, 'Write a Future Success Story')
  await expect(page.getByTestId('teller-response-region').getByRole('heading', { name: 'Future Success Story' }).last()).toBeVisible()
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('steadiness instead of urgency')

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await sendWidgetTellerMessage(page, 'relaxing into wealth')
  await expect(page.getByTestId('teller-widget-response-region').getByRole('heading', { name: 'Future Success Story' }).last()).toBeVisible()
  await expect(page.getByTestId('teller-widget-assistant-message').last()).toContainText('steadiness instead of urgency')
})

test('coaching, scripting, and nervous-system reset prompts render clearly on the page and widget', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(
    page,
    '## Insight\nLet your nervous system settle before you decide.\n\n## Key Points\n- Unclench your jaw.\n- Name one safe next step.\n\n## Reflection\nWould you like this turned into a short script next?'
  )

  await page.goto('/myteller')
  await sendPageTellerMessage(page, 'Help me reset my nervous system around money today.')
  await expect(page.getByTestId('teller-response-region').getByRole('heading', { name: 'Insight' }).last()).toBeVisible()
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('Let your nervous system settle before you decide.')
  await expect(page.getByTestId('teller-response-region').locator('ul.teller-markdown-ul > li')).toHaveCount(2)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await sendWidgetTellerMessage(page, 'Write me a short abundance script for tomorrow morning.')
  await expect(page.getByTestId('teller-widget-response-region').getByRole('heading', { name: 'Insight' }).last()).toBeVisible()
  await expect(page.getByTestId('teller-widget-assistant-message').last()).toContainText('Would you like this turned into a short script next?')
})
