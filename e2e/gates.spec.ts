import { expect, test } from '@playwright/test'
import { dismissDashboardWelcome, primeBrowserSession, seedUser, waitForDashboardSession } from './helpers'

async function expectTierThenPaywall(page: Parameters<typeof test>[0]['page']) {
  await expect(page.getByText('Choose Your ManifestBank Path')).toBeVisible()
  await expect(page.getByTestId('tier-free-button').getByText('$0', { exact: true })).toBeVisible()
  await expect(page.getByTestId('tier-signature-button').getByText('*as low as $6/month', { exact: true })).toBeVisible()
  await expect(page.getByText('Saved affirmations — Not included')).toBeVisible()
  await expect(page.getByText('Daily credit points cap — 5 points')).toBeVisible()
  await expect(page.getByText('My Teller — Not included')).toBeVisible()
  await expect(page.getByText('My Teller — Included')).toBeVisible()
  await expect(page.getByText('Beta access — Not included')).toBeVisible()
  await expect(page.getByText('Beta access — First in line for Beta releases')).toBeVisible()
  await expect(page.getByText('Currency flexibility — Not included')).toBeVisible()
  await expect(page.getByText('Currency flexibility — Change your currency across supported features')).toBeVisible()
  await page.getByTestId('tier-signature-button').click()
  await expect(page.getByTestId('paywall-title')).toHaveText('ManifestBank™ Signature')
  await expect(page.getByTestId('paywall-annual-button')).toBeVisible()
  await expect(page.getByTestId('paywall-monthly-button')).toBeVisible()
}

async function closeUpgradeFlow(page: Parameters<typeof test>[0]['page']) {
  for (let i = 0; i < 4; i += 1) {
    const paywallClose = page.locator('.mb-paywall-modal').getByRole('button', { name: 'Close' })
    if (await paywallClose.isVisible().catch(() => false)) {
      await paywallClose.click()
      continue
    }
    const tierClose = page.locator('.mb-tier-comparison-modal').getByRole('button', { name: 'Close' })
    if (await tierClose.isVisible().catch(() => false)) {
      await tierClose.click()
      continue
    }
    break
  }
  await expect(page.getByTestId('paywall-title')).toHaveCount(0)
  await expect(page.getByText('Choose Your ManifestBank Path')).toHaveCount(0)
}

test('free tier currency and premium gates open tier comparison then paywall', async ({ page, request }) => {
  const user = await seedUser(request, { premium: false, verified: true })
  await primeBrowserSession(page, request, user)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await page.locator('button[aria-label="Choose dashboard currency"]').click()
  await expectTierThenPaywall(page)
  await closeUpgradeFlow(page)

  await page.reload()
  await page.goto('/mychecks')
  await page.locator('button[aria-label="Choose check currency"]').click()
  await expectTierThenPaywall(page)
  await closeUpgradeFlow(page)

  await page.reload()
  await page.goto('/dashboard')
  await dismissDashboardWelcome(page)
  await page.locator('[data-testid^="account-toggle-"]').first().click()
  await page.locator('[data-testid^="account-currency-"]').first().click()
  await expectTierThenPaywall(page)
  await closeUpgradeFlow(page)

  await page.reload()
  await page.goto('/myaffirmations')
  await page.getByTestId('affirmations-save-daily-button').click()
  await expectTierThenPaywall(page)
  await closeUpgradeFlow(page)

  await page.reload()
  await page.goto('/myteller')
  await page.getByRole('button', { name: /New Session/ }).click()
  await expectTierThenPaywall(page)
})
