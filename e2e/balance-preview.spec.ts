import { expect, test, type Page, type Route } from '@playwright/test'
import {
  createAccount,
  dismissDashboardWelcome,
  postLedgerEntry,
  primeBrowserSession,
  seedUser,
  waitForDashboardSession,
} from './helpers'

async function mockMembershipAndPreview(
  page: Page,
  {
    premium,
    previewExpiresAt,
    visibleToUser,
  }: {
    premium: boolean
    previewExpiresAt: string
    visibleToUser: boolean
  }
) {
  await page.route('**/auth/me', async (route: Route) => {
    const response = await route.fetch()
    const json = await response.json()
    await route.fulfill({
      response,
      json: {
        ...json,
        is_premium: premium,
      },
    })
  })

  await page.route('**/accounts/*/balance?currency=*', async (route: Route) => {
    const response = await route.fetch()
    const json = await response.json()
    await route.fulfill({
      response,
      json: {
        ...json,
        preview_expires_at: previewExpiresAt,
        is_preview_expired: !visibleToUser,
        visible_to_user: visibleToUser,
      },
    })
  })

  await page.route('**/accounts/*/ledger?limit=200&offset=0', async (route: Route) => {
    const response = await route.fetch()
    const json = await response.json()
    await route.fulfill({
      response,
      json: Array.isArray(json)
        ? json.map((entry: any) => ({
            ...entry,
            preview_expires_at: previewExpiresAt,
            is_preview_expired: !visibleToUser,
            visible_to_user: visibleToUser,
          }))
        : json,
    })
  })

  await page.route('**/accounts/*/ledger?limit=25&offset=0', async (route: Route) => {
    const response = await route.fetch()
    const json = await response.json()
    await route.fulfill({
      response,
      json: Array.isArray(json)
        ? json.map((entry: any) => ({
            ...entry,
            preview_expires_at: previewExpiresAt,
            is_preview_expired: !visibleToUser,
            visible_to_user: visibleToUser,
          }))
        : json,
    })
  })
}

test('free members see the balance preview notice and countdown before lock', async ({ page, request }) => {
  const user = await seedUser(request)
  const { auth, account } = await createAccount(request, user, {
    name: 'Preview Account',
    account_type: 'personal',
    currency: 'USD',
  })
  await postLedgerEntry(request, auth.access_token as string, {
    account_id: account.id,
    direction: 'credit',
    amount: '123.45',
    currency: 'USD',
    entry_type: 'deposit',
    status: 'posted',
  })

  const previewExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000 + 42 * 60 * 1000).toISOString()
  await mockMembershipAndPreview(page, {
    premium: false,
    previewExpiresAt,
    visibleToUser: true,
  })
  await primeBrowserSession(page, request, user)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)

  await expect(page.getByTestId('dashboard-balance-preview-notice')).toContainText(
    'Free members can view newly posted balances for 12 hours.'
  )
  await expect(page.getByTestId('dashboard-balance-preview-status')).toContainText(
    'Balance preview locks in'
  )

  await page.getByTestId(`account-toggle-${account.id}`).click()
  await expect(page.getByTestId('balance-preview-vault-notice')).toBeVisible()
  await expect(page.getByTestId('balance-preview-status')).toContainText('Balance preview locks in')
})

test('free members see locked balance vault states and a dismissible one-time alert after expiration', async ({
  page,
  request,
}) => {
  const user = await seedUser(request)
  const { auth, account } = await createAccount(request, user, {
    name: 'Locked Account',
    account_type: 'personal',
    currency: 'USD',
  })
  const entry = await postLedgerEntry(request, auth.access_token as string, {
    account_id: account.id,
    direction: 'credit',
    amount: '123.45',
    currency: 'USD',
    entry_type: 'deposit',
    status: 'posted',
  })

  const previewExpiresAt = new Date(Date.now() - 90 * 60 * 1000).toISOString()
  await mockMembershipAndPreview(page, {
    premium: false,
    previewExpiresAt,
    visibleToUser: false,
  })
  await primeBrowserSession(page, request, user)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)

  await expect(page.getByTestId('dashboard-balance-preview-alert')).toBeVisible()
  await expect(page.getByTestId('dashboard-total-balance')).toHaveText('Locked')
  await expect(page.getByTestId('dashboard-balance-preview-locked-card')).toBeVisible()
  await page.getByLabel('Dismiss dashboard balance preview alert').click()
  await page.reload()
  await waitForDashboardSession(page)
  await expect(page.getByTestId('dashboard-balance-preview-alert')).toHaveCount(0)

  await page.goto('/dashboard')
  await dismissDashboardWelcome(page)
  await page.locator('[data-testid^="account-toggle-"]').first().click()
  await expect(page.getByTestId('balance-preview-alert')).toBeVisible()
  await expect(page.getByTestId('ledger-balance-value')).toHaveText('Locked')
  await expect(page.getByTestId('balance-preview-locked-entries')).toBeVisible()
  await expect(page.getByText('$123.45')).toHaveCount(0)

  await page.goto(`/dashboard/activity/${account.id}`)
  await expect(page.getByTestId('balance-preview-history-notice')).toBeVisible()
  await page.getByTestId(`activity-entry-${entry.id}`).click()
  await expect(page.getByTestId('balance-preview-locked-history-card')).toBeVisible()
})

test('signature members keep full balance amounts and history visible', async ({ page, request }) => {
  const user = await seedUser(request)
  const { auth, account } = await createAccount(request, user, {
    name: 'Signature Balance',
    account_type: 'personal',
    currency: 'USD',
  })
  const entry = await postLedgerEntry(request, auth.access_token as string, {
    account_id: account.id,
    direction: 'credit',
    amount: '123.45',
    currency: 'USD',
    entry_type: 'deposit',
    status: 'posted',
  })

  await primeBrowserSession(page, request, user)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await expect(page.getByTestId('dashboard-balance-preview-notice')).toHaveCount(0)

  await page.locator('[data-testid^="account-toggle-"]').first().click()
  await expect(page.getByTestId('ledger-balance-value')).toContainText('$123.45')
  await expect(page.getByText('DEPOSIT $123.45')).toBeVisible()

  await page.goto(`/dashboard/activity/${account.id}`)
  await expect(page.getByTestId(`activity-entry-${entry.id}`)).toContainText('$123.45')
})
