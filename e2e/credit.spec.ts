import { expect, test } from '@playwright/test'
import { primeBrowserSession, seedUser, waitForDashboardSession } from './helpers'

test('My Credit page and credit report load', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)

  await page.goto('/mycredit')
  await expect(page.getByRole('heading', { name: 'My Credit' })).toBeVisible()

  await page.getByRole('link', { name: 'View Report' }).click()
  await page.waitForURL('**/mycreditreport')
  await expect(page.getByRole('heading', { name: 'My Credit Report' })).toBeVisible()
})

test('bureau detail loads and pinned todo flow works', async ({ page, request }) => {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)

  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await page.goto('/mycredit/iab')
  await expect(page.getByText('Identity Assurance Bureau')).toBeVisible()

  await page.goto('/mycredit')
  await page.getByTestId('credit-action-card').first().click({ force: true })
  const createTodo = page.waitForResponse(
    (response) =>
      response.url().includes('/credit/todos') && response.request().method() === 'POST'
  )
  await page.getByTestId('credit-pin-button').first().click({ force: true })
  const createTodoResponse = await createTodo
  expect(createTodoResponse.ok()).toBeTruthy()
  await expect(page.getByTestId('credit-remove-button').first()).toBeVisible()

  await page.getByTestId('credit-remove-button').first().click()
  await expect(page.getByText('No pinned actions yet.')).toBeVisible()
})
