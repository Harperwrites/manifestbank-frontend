import { expect, test } from '@playwright/test'
import { loginViaUi, seedUser, waitForDashboardSession } from './helpers'

test('auth page loads and signs in through the UI', async ({ page, request }) => {
  const user = await seedUser(request)

  await page.goto('/auth')
  await expect(page.getByRole('button', { name: 'Login' }).first()).toBeVisible()

  await loginViaUi(page, user)

  await waitForDashboardSession(page)
})
