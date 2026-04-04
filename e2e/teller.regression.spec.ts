import { expect, test } from '@playwright/test'
import {
  dismissDashboardWelcome,
  mockTellerChat,
  openTellerWidget,
  primeBrowserSession,
  seedUser,
  waitForDashboardSession,
} from './helpers'

async function sendTellerMessage(page: Parameters<typeof test>[0]['page'], message: string) {
  await page.getByTestId('teller-draft-input').fill(message)
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST'),
    page.getByTestId('teller-send-button').click(),
  ])
}

test('new session thread can be renamed and deleted from chat history', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(page, '## Insight\nA renamed thread should stay tidy.')

  await page.goto('/myteller')
  await sendTellerMessage(page, 'Create a clean session title test.')
  await expect(page.getByTestId('teller-thread-history')).toContainText('Mock Teller Session')
  await page.getByTestId('teller-thread-history-toggle').click()

  await page.getByTestId('teller-thread-rename-9991').click()
  await expect(page.getByTestId('teller-rename-modal')).toBeVisible()
  await page.getByTestId('teller-rename-input').fill('Renamed Teller Session')
  await page.getByTestId('teller-rename-save-button').click()
  await expect(page.getByTestId('teller-thread-history')).toContainText('Renamed Teller Session')

  await page.getByTestId('teller-thread-delete-9991').click()
  await expect(page.getByTestId('teller-delete-modal')).toBeVisible()
  await page.getByTestId('teller-delete-confirm-button').click()
  await expect(page.getByTestId('teller-thread-history')).not.toContainText('Renamed Teller Session')
})

test('free users can see teller surfaces but paid actions still open the upgrade path', async ({ page, request }) => {
  const user = await seedUser(request, { premium: false, verified: true })
  await primeBrowserSession(page, request, user)

  await page.goto('/myteller')
  await expect(page.getByTestId('teller-page-title')).toBeVisible()
  await expect(page.getByText('Manifest Signature unlocks Teller sessions and message sending.')).toBeVisible()
  await page.getByTestId('teller-send-button').click()
  await expect(page.getByText('Choose Your ManifestBank Path')).toBeVisible()

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await expect(page.getByText('Manifest Signature unlocks Teller sessions and message sending.')).toBeVisible()
  await page.getByTestId('teller-widget-send-button').click()
  await expect(page.getByText('Choose Your ManifestBank Path')).toBeVisible()
})

test('long teller responses stay readable on mobile without horizontal clipping', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await mockTellerChat(
    page,
    '## Insight\n' +
      'This is a deliberately long teller reply that should wrap cleanly across the page and stay readable even when the viewport is narrow. '.repeat(6)
  )

  await page.goto('/myteller')
  await sendTellerMessage(page, 'Show me a long answer.')

  const region = page.getByTestId('teller-response-region')
  await expect(region).toBeVisible()
  const hasOverflow = await region.evaluate((node) => node.scrollWidth > node.clientWidth + 1)
  expect(hasOverflow).toBeFalsy()

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await page.getByTestId('teller-widget-draft-input').fill('Show me a long answer in the widget.')
  await Promise.all([
    page.waitForResponse((response) => response.url().includes('/teller/chat') && response.request().method() === 'POST'),
    page.getByTestId('teller-widget-send-button').click(),
  ])

  const widgetRegion = page.getByTestId('teller-widget-response-region')
  await expect(widgetRegion).toBeVisible()
  const widgetOverflow = await widgetRegion.evaluate((node) => node.scrollWidth > node.clientWidth + 1)
  expect(widgetOverflow).toBeFalsy()
})
