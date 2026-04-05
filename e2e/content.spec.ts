import { expect, test } from '@playwright/test'
import { dismissDashboardWelcome, primeBrowserSession, seedUser, tinyImageUpload, waitForDashboardSession } from './helpers'

test('journal, affirmations, and teller flows work for premium users', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)

  await page.goto('/myjournal')
  await page.getByTestId('journal-new-entry-button').click()
  await page.getByTestId('journal-title-input').fill('E2E Journal Entry')
  await page.getByTestId('journal-date-input').fill('2026-03-28')
  await page.getByTestId('journal-content-input').fill('Documenting a stable premium journal flow.')
  await page.getByTestId('journal-image-input').setInputFiles(tinyImageUpload())
  const createJournal = page.waitForResponse(
    (response) =>
      response.url().endsWith('/journal') &&
      response.request().method() === 'POST' &&
      response.ok()
  )
  await page.getByTestId('journal-save-button').click()
  await createJournal
  await expect(page.getByText('E2E Journal Entry')).toBeVisible()

  await page.goto('/myaffirmations')
  await expect(page.getByRole('button', { name: 'ManifestBank™ Signature Member' })).toBeVisible()
  const dailySaveButton = page.getByTestId('affirmations-save-daily-button')
  await expect(dailySaveButton).toBeVisible()
  if (!(await dailySaveButton.textContent())?.includes('Saved')) {
    const saveDaily = page.waitForResponse(
      (response) =>
        response.url().includes('/affirmations') &&
        response.request().method() === 'POST' &&
        response.ok()
    )
    await dailySaveButton.click()
    await saveDaily
  }
  await expect(dailySaveButton).toContainText('Saved')

  await page.getByTestId('affirmations-new-entry-button').click()
  await page.getByTestId('affirmations-title-input').fill('E2E Affirmation Entry')
  await page.getByTestId('affirmations-date-input').fill('2026-03-28')
  await page.getByTestId('affirmations-content-input').fill('My premium affirmation flow is stable and verified.')
  const createAffirmation = page.waitForResponse(
    (response) =>
      response.url().endsWith('/affirmations') &&
      response.request().method() === 'POST' &&
      response.ok()
  )
  await page.getByTestId('affirmations-save-button').click()
  await createAffirmation
  await expect(page.getByText('E2E Affirmation Entry')).toBeVisible()

  await page.goto('/myteller')
  await page.getByTestId('teller-draft-input').fill('Help me outline a concise abundance practice for today.')
  const tellerChat = page.waitForResponse(
    (response) =>
      response.url().includes('/teller/chat') &&
      response.request().method() === 'POST' &&
      response.ok()
  )
  await page.getByTestId('teller-send-button').click()
  await tellerChat
  await expect(page.getByText('Fortune - Teller at ManifestBank™')).toBeVisible()
  await expect(page.getByTestId('teller-response-region')).toBeVisible()
  await expect(page.getByTestId('teller-response-region')).not.toContainText('Try asking Fortune:')
})

test('treasure chest menus show My Teller beta and My Credit new labels', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)

  const treasureButtons = page.getByRole('button', { name: /My Treasure Chest/ })

  await treasureButtons.first().click()
  const navbarMenu = page.locator('.treasure-menu')
  await expect(navbarMenu.getByRole('menuitem', { name: /My Credit/ })).toBeVisible()
  await expect(navbarMenu.getByText('New')).toBeVisible()
  await expect(navbarMenu.getByRole('menuitem', { name: /My Teller Beta/ })).toBeVisible()
  await expect(navbarMenu.getByText('Beta')).toBeVisible()

  await page.goto('/myaffirmations')
  const floatingTreasureButton = page.getByRole('button', { name: /My Treasure Chest/ })
  await floatingTreasureButton.click()
  const floatingMenu = page.getByRole('menu').last()
  await expect(floatingMenu).toBeVisible()
  await expect(floatingMenu.getByRole('menuitem', { name: /My Credit/ })).toBeVisible()
  await expect(floatingMenu.getByText('New')).toBeVisible()
  await expect(floatingMenu.getByRole('menuitem', { name: /My Teller Beta/ })).toBeVisible()
  await expect(floatingMenu.getByText('Beta')).toBeVisible()
})
