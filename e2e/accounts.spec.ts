import { expect, test } from '@playwright/test'
import { dismissDashboardWelcome, primeBrowserSession, seedUser, waitForDashboardSession } from './helpers'

async function expectTierThenPaywall(page: Parameters<typeof test>[0]['page']) {
  await expect(page.getByText('Choose Your ManifestBank Path')).toBeVisible()
  await expect(page.getByText('Additional accounts — Unlimited')).toBeVisible()
  await page.getByTestId('tier-signature-button').click()
  await expect(page.getByTestId('paywall-title')).toHaveText('ManifestBank™ Signature')
  await expect(page.getByTestId('paywall-annual-button')).toBeVisible()
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

test('premium user can create, rename, and delete an account', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)

  const createdName = `E2E Account ${Date.now()}`
  const renamedName = `${createdName} Renamed`

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)

  await page.getByTestId('accounts-create-open').click()
  await page.getByTestId('accounts-create-name-input').fill(createdName)
  await page.getByTestId('accounts-create-type-select').selectOption('personal')
  await page.getByTestId('accounts-create-currency-select').selectOption('USD')

  const createAccount = page.waitForResponse(
    (response) =>
      response.url().endsWith('/accounts') &&
      response.request().method() === 'POST' &&
      response.ok()
  )
  await page.getByTestId('accounts-create-submit').click()
  const createResponse = await createAccount
  const account = await createResponse.json()
  const accountId = Number(account.id)
  expect(accountId).toBeTruthy()

  await expect(page.getByTestId(`account-toggle-${accountId}`)).toContainText(createdName)
  await page.getByTestId(`account-toggle-${accountId}`).click()

  await page.getByTestId(`account-rename-${accountId}`).click()
  await page.getByTestId('accounts-rename-input').fill(renamedName)
  const renameAccount = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/accounts/${accountId}`) &&
      response.request().method() === 'PATCH' &&
      response.ok()
  )
  await page.getByTestId('accounts-rename-submit').click()
  await renameAccount

  await expect(page.getByTestId(`account-toggle-${accountId}`)).toContainText(renamedName)
  const deleteButton = page.getByTestId(`account-delete-${accountId}`)
  if (!(await deleteButton.isVisible().catch(() => false))) {
    await page.getByTestId(`account-toggle-${accountId}`).click()
  }
  await page.getByTestId(`account-delete-${accountId}`).click()
  await page.getByTestId('accounts-delete-input').fill('DELETE')
  const deleteAccount = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/accounts/${accountId}`) &&
      response.request().method() === 'DELETE' &&
      response.ok()
  )
  await page.getByTestId('accounts-delete-submit').click()
  await deleteAccount

  await expect(page.getByTestId(`account-toggle-${accountId}`)).toHaveCount(0)
})

test('free tier create-account and statements gates open tier comparison then paywall', async ({
  page,
  request,
}) => {
  const user = await seedUser(request, { premium: false, verified: true })
  await primeBrowserSession(page, request, user)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await page.getByTestId('accounts-create-open').click()
  await page.getByTestId('accounts-create-name-input').fill('Free Tier Extra Account')
  await page.getByTestId('accounts-create-submit').click()
  await expectTierThenPaywall(page)
  await closeUpgradeFlow(page)

  await page.goto('/mystatments')
  await expect(page.getByText('Statements Locked')).toBeVisible()
  await page.getByTestId('statements-upgrade-button').click({ force: true })
  await expectTierThenPaywall(page)
})
