import { expect, test } from '@playwright/test'
import { createAccount, postLedgerEntry, primeBrowserSession, seedUser, waitForDashboardSession } from './helpers'

test('dashboard currency change and transfer preview render', async ({ page, request }) => {
  const user = await seedUser(request)
  const primary = await createAccount(request, user, {
    name: 'Primary USD',
    account_type: 'personal',
    currency: 'USD',
  })
  const secondary = await createAccount(request, user, {
    name: 'Secondary CAD',
    account_type: 'personal',
    currency: 'CAD',
  })

  await postLedgerEntry(request, primary.auth.access_token as string, {
    account_id: primary.account.id,
    direction: 'credit',
    amount: '250.00',
    currency: 'USD',
    entry_type: 'deposit',
    status: 'posted',
  })

  await primeBrowserSession(page, request, user)
  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await expect
    .poll(async () => await page.getByTestId('transfer-from-select').locator('option').count())
    .toBeGreaterThan(2)

  await page.getByTestId('dashboard-currency-select').selectOption('GBP')
  await expect(page.getByTestId('dashboard-currency-select')).toHaveValue('GBP')

  await page.getByTestId('transfer-from-select').selectOption(String(primary.account.id))
  await page.getByTestId('transfer-to-select').selectOption(String(secondary.account.id))
  await page.getByTestId('transfer-amount-input').fill('100')

  await expect(page.getByTestId('transfer-preview')).toContainText('USD')
  await expect(page.getByTestId('transfer-preview')).toContainText('CAD')
})
