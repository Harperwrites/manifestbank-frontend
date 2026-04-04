import { expect, test } from '@playwright/test'
import { createAccount, primeBrowserSession, seedUser } from './helpers'

test('premium user can change check currency between accounts and post a check', async ({ page, request }) => {
  const user = await seedUser(request)
  const usd = await createAccount(request, user, {
    name: 'Treasury USD',
    account_type: 'personal',
    currency: 'USD',
  })
  const cad = await createAccount(request, user, {
    name: 'Treasury CAD',
    account_type: 'personal',
    currency: 'CAD',
  })

  await primeBrowserSession(page, request, user)
  await page.goto('/mychecks')

  await page.getByTestId('checks-account-select').selectOption(String(cad.account.id))
  await expect(page.getByTestId('checks-currency-select')).toHaveValue('CAD')

  await page.getByTestId('checks-currency-select').selectOption('USD')
  await expect(page.getByTestId('checks-currency-select')).toHaveValue('USD')

  await page.getByTestId('checks-direction-select').selectOption('incoming')
  await page.getByTestId('checks-account-select').selectOption(String(usd.account.id))
  await expect(page.getByTestId('checks-currency-select')).toHaveValue('USD')
  await page.getByTestId('checks-amount-input').fill('125.75')
  await page.getByTestId('checks-memo-input').fill('E2E multicurrency check')

  const postCheck = page.waitForResponse(
    (response) =>
      response.url().includes('/ledger/entries') &&
      response.request().method() === 'POST' &&
      response.ok()
  )
  await page.getByTestId('checks-create-button').click()
  await postCheck

  await expect(page.getByText('Check deposit posted.')).toBeVisible()
  await expect(page.getByTestId('checks-amount-input')).toHaveValue('')
})
