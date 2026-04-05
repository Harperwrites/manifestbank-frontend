import { expect, test } from '@playwright/test'
import {
  appBaseUrl,
  dismissDashboardWelcome,
  loginViaUi,
  primeBrowserSession,
  seedUser,
  waitForDashboardSession,
} from './helpers'

test('new-user legal modal opens inline previews before acceptance', async ({ page, request }) => {
  const user = await seedUser(request)

  await page.route('**/legal/consent', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        termsAccepted: false,
        privacyAccepted: false,
        termsVersion: 'stale',
        privacyVersion: 'stale',
        termsCurrentVersion: 'current',
        privacyCurrentVersion: 'current',
        needsReaccept: true,
      }),
    })
  })

  await page.route('**/legal/content', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        termsText:
          'ManifestBank™ Terms & Conditions\nEffective Date: April 4, 2026\n\n11. Artificial Intelligence Features (Fortune – ManifestBank™ Teller)',
        privacyText:
          'ManifestBank™ Privacy Policy\nEffective Date: April 4, 2026\n\n6. Artificial Intelligence Processing (Fortune – Teller)',
        termsHash: 'mock-terms',
        privacyHash: 'mock-privacy',
      }),
    })
  })

  await page.route('**/legal/accept', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'accepted',
        termsAccepted: true,
        privacyAccepted: true,
        termsVersion: 'current',
        privacyVersion: 'current',
      }),
    })
  })

  await page.goto(`${appBaseUrl}/auth`)
  await loginViaUi(page, user)

  await expect(page.getByText('Accept Terms to Continue')).toBeVisible()

  await page.getByRole('button', { name: 'Terms & Conditions' }).click()
  await expect(page.getByText('Review before accepting.')).toBeVisible()
  await expect(page.getByText('ManifestBank™ Terms & Conditions', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective Date: April 4, 2026')).toBeVisible()
  await page.getByLabel('Close legal document preview').click()

  await page.getByRole('button', { name: 'Privacy Policy' }).click()
  await expect(page.getByText('ManifestBank™ Privacy Policy', { exact: true })).toBeVisible()
  await expect(page.getByText('Effective Date: April 4, 2026')).toBeVisible()
  await page.getByLabel('Close legal document preview').click()

  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Accept and Continue' }).click()

  await expect(page.getByText('Accept Terms to Continue')).toHaveCount(0)
  await expect(page.getByText('Private Vault Dashboard')).toBeVisible()
})

test('myteller requires one-time AI consent for free members before access', async ({ page, request }) => {
  const user = await seedUser(request, { premium: false })

  await primeBrowserSession(page, request, user, { acceptTellerAiConsent: false })
  await page.goto(`${appBaseUrl}/myteller`)

  await expect(page.getByText('AI Experience Notice')).toBeVisible()
  await expect(page.getByText('By continuing, you acknowledge and agree to this processing.')).toBeVisible()

  await page.getByRole('checkbox', { name: 'I understand and agree.' }).check()
  await page.getByLabel('Type Accept to continue').fill('aCcEpT')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByText('AI Experience Notice')).toHaveCount(0)
  await expect(page.getByText('Conversation')).toBeVisible()
})

test('dashboard teller widget requires AI consent before opening', async ({ page, request }) => {
  const user = await seedUser(request)

  await primeBrowserSession(page, request, user, { acceptTellerAiConsent: false })
  await page.goto(`${appBaseUrl}/dashboard`)
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)

  await page.getByTestId('teller-widget-toggle').evaluate((element) => {
    ;(element as HTMLButtonElement).click()
  })
  await expect(page.getByText('AI Experience Notice')).toBeVisible()

  await page.getByRole('checkbox', { name: 'I understand and agree.' }).check()
  await page.getByLabel('Type Accept to continue').fill('ACCEPT')
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByTestId('teller-widget-panel')).toBeVisible()
  await expect(page.getByText('AI Experience Notice')).toHaveCount(0)
})
