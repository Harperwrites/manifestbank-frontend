import { expect, test } from '@playwright/test'
import {
  dismissDashboardWelcome,
  mockTellerChat,
  openTellerWidget,
  primeBrowserSession,
  seedUser,
  waitForDashboardSession,
} from './helpers'

test('teller page and widget expose accessible input, send, and response regions', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)

  await page.goto('/myteller')
  await expect(page.getByTestId('teller-page-title')).toBeVisible()
  await expect(page.getByTestId('teller-draft-input')).toHaveAttribute('aria-label', 'Message Fortune')
  await expect(page.getByTestId('teller-send-button')).toHaveAttribute('aria-label', 'Send message')
  await expect(page.getByTestId('teller-response-region')).toBeVisible()

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)

  await expect(page.getByTestId('teller-widget-draft-input')).toHaveAttribute('aria-label', 'Message Fortune')
  await expect(page.getByTestId('teller-widget-send-button')).toHaveAttribute('aria-label', 'Send message')
  await expect(page.getByTestId('teller-widget-response-region')).toBeVisible()
})

test('keyboard-only send works from the teller page and widget', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(page, '## Insight\nKeyboard-first works cleanly here.')

  await page.goto('/myteller')
  await page.getByTestId('teller-draft-input').focus()
  await page.getByTestId('teller-draft-input').fill('Send this with the keyboard.')
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST'),
    page.keyboard.press('Enter'),
  ])
  await expect(page.getByTestId('teller-response-region')).toContainText('Keyboard-first works cleanly here.')

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await page.getByTestId('teller-widget-draft-input').focus()
  await page.getByTestId('teller-widget-draft-input').fill('Keyboard send in the widget too.')
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST'),
    page.keyboard.press('Enter'),
  ])
  await expect(page.getByTestId('teller-widget-response-region')).toContainText('Keyboard-first works cleanly here.')
})
