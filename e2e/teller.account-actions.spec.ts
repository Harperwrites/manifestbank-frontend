import { expect, test } from '@playwright/test'
import { createAccount, dismissDashboardWelcome, loginApi, postLedgerEntry, primeBrowserSession, seedUser, waitForDashboardSession } from './helpers'

async function sendTellerMessage(page: Parameters<typeof test>[0]['page'], message: string) {
  await expect(page.getByTestId('teller-draft-input')).toBeVisible()
  await page.getByTestId('teller-draft-input').fill(message)
  await page.getByTestId('teller-send-button').click()
}

test('teller can create an account end to end and the new account persists in the dashboard', async ({ page, request }) => {
  const user = await seedUser(request)
  const auth = await loginApi(request, user)
  await primeBrowserSession(page, request, user)

  const accountName = `Teller Account ${Date.now()}`

  await page.goto('/myteller')
  await expect(page.getByTestId('teller-page-title')).toBeVisible()
  await sendTellerMessage(page, 'Create account')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('What should the account be named?')

  await sendTellerMessage(page, accountName)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('Which account type?')

  await sendTellerMessage(page, 'personal')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText("Starting balance? Reply with an amount or 'no'.")

  await sendTellerMessage(page, 'no')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Confirm create account “${accountName}” (personal, USD)?`)

  await sendTellerMessage(page, 'yes')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Account created: #`)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(accountName)

  const accountsResponse = await request.get('http://127.0.0.1:8001/accounts', {
    headers: {
      Authorization: `Bearer ${auth.access_token}`,
    },
  })
  expect(accountsResponse.ok()).toBeTruthy()
  const accounts = await accountsResponse.json()
  const createdAccount = accounts.find((account: { name: string; id: number }) => account.name === accountName)
  expect(createdAccount).toBeTruthy()

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await expect(page.getByTestId(`account-toggle-${createdAccount.id}`)).toContainText(accountName)
})

test('teller keeps GBP account creation sticky and accepts confirmed as approval', async ({ page, request }) => {
  const user = await seedUser(request)
  const auth = await loginApi(request, user)
  await primeBrowserSession(page, request, user)

  const accountName = 'UK Motion Prime'

  await page.goto('/myteller')
  await expect(page.getByTestId('teller-page-title')).toBeVisible()
  await sendTellerMessage(page, 'create new account with gbp currency')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('What should the account be named?')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('GBP')

  await sendTellerMessage(page, `${accountName} should be the name and operating`)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText("Starting balance? Reply with an amount or 'no'.")

  await sendTellerMessage(page, '150,000 pounds')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Confirm create account “${accountName}” (operating, GBP)`)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('£150,000.00')

  await sendTellerMessage(page, 'confirmed')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('Account created: #')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(accountName)

  const accountsResponse = await request.get('http://127.0.0.1:8001/accounts', {
    headers: {
      Authorization: `Bearer ${auth.access_token}`,
    },
  })
  expect(accountsResponse.ok()).toBeTruthy()
  const accounts = await accountsResponse.json()
  const createdAccount = accounts.find((account: { name: string; id: number; currency: string }) => account.name === accountName && account.currency === 'GBP')
  expect(createdAccount).toBeTruthy()

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await expect(page.getByTestId(`account-toggle-${createdAccount.id}`)).toContainText(accountName)
})

test('teller confirms transfers before execution and can cancel a pending withdrawal', async ({ page, request }) => {
  const user = await seedUser(request)
  const { auth, account: fromAccount } = await createAccount(request, user, {
    name: `Origin ${Date.now()}`,
    account_type: 'personal',
    currency: 'USD',
  })
  const { account: toAccount } = await createAccount(request, user, {
    name: `Target ${Date.now()}`,
    account_type: 'personal',
    currency: 'USD',
  })
  await postLedgerEntry(request, auth.access_token, {
    account_id: fromAccount.id,
    direction: 'credit',
    amount: '100.00',
    currency: 'USD',
    entry_type: 'deposit',
    status: 'posted',
  })

  await primeBrowserSession(page, request, user)
  await page.goto('/myteller')
  await expect(page.getByTestId('teller-page-title')).toBeVisible()

  await sendTellerMessage(page, `Transfer $25 from ${fromAccount.name} to ${toAccount.name}`)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Confirm transfer $25.00 from “${fromAccount.name}” to “${toAccount.name}”?`)

  await sendTellerMessage(page, 'yes')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('Done. I transferred $25.00.')

  await sendTellerMessage(page, `Withdraw $10 from ${fromAccount.name}`)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Confirm withdrawal $10.00 from “${fromAccount.name}”?`)

  await sendTellerMessage(page, 'cancel')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText('I stopped that withdrawal')
})

test('teller can rename, archive, restore, and change account currency', async ({ page, request }) => {
  const user = await seedUser(request)
  const { account } = await createAccount(request, user, {
    name: `Phase Two ${Date.now()}`,
    account_type: 'personal',
    currency: 'USD',
  })
  const auth = await loginApi(request, user)
  const renamedAccount = `${account.name} Renamed`

  await primeBrowserSession(page, request, user)
  await page.goto('/myteller')
  await expect(page.getByTestId('teller-page-title')).toBeVisible()

  await sendTellerMessage(page, `Rename account ${account.name} to ${renamedAccount}`)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Confirm rename “${account.name}” to “${renamedAccount}”?`)
  await sendTellerMessage(page, 'yes')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Done. I renamed “${account.name}” to “${renamedAccount}”.`)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await expect(page.getByText(renamedAccount)).toBeVisible()

  await page.goto('/myteller')
  await sendTellerMessage(page, `Change currency for ${renamedAccount} to EUR`)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Confirm change currency for “${renamedAccount}” to EUR?`)
  await sendTellerMessage(page, 'yes')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Done. I changed “${renamedAccount}” to EUR.`)

  await sendTellerMessage(page, `Archive account ${renamedAccount}`)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Confirm archive for “${renamedAccount}”?`)
  await sendTellerMessage(page, 'yes')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Done. I archived “${renamedAccount}”.`)

  await sendTellerMessage(page, `Unarchive ${renamedAccount}`)
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Confirm restore for “${renamedAccount}”?`)
  await sendTellerMessage(page, 'yes')
  await expect(page.getByTestId('teller-assistant-message').last()).toContainText(`Done. I restored “${renamedAccount}”.`)

  const accountResponse = await request.get(`http://127.0.0.1:8001/accounts/${account.id}`, {
    headers: {
      Authorization: `Bearer ${auth.access_token}`,
    },
  })
  expect(accountResponse.ok()).toBeTruthy()
  const updated = await accountResponse.json()
  expect(updated.name).toBe(renamedAccount)
  expect(updated.currency).toBe('EUR')
  expect(updated.is_active).toBe(true)
})
