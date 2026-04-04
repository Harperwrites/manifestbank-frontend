import { expect, test } from '@playwright/test'
import { appBaseUrl, loginApi, switchBrowserSession, seedUser, tinyImageUpload } from './helpers'

test('ether supports sync, post images, comments, aligns, delete, and unsync flows', async ({
  browser,
  request,
}) => {
  const userA = await seedUser(request)
  const userB = await seedUser(request)

  const ctxA = await browser.newContext()
  const ctxB = await browser.newContext()
  const pageA = await ctxA.newPage()
  const pageB = await ctxB.newPage()

  await switchBrowserSession(pageA, request, userA)
  await switchBrowserSession(pageB, request, userB)

  await pageA.goto(`${appBaseUrl}/sync?tab=search`)
  await pageA.getByTestId('sync-search-input').fill(userB.username)
  await expect(pageA.getByTestId(`sync-request-${userB.profileId}`)).toBeVisible()
  const requestSync = pageA.waitForResponse(
    (response) =>
      response.url().includes(`/ether/sync/requests/${userB.profileId}`) &&
      response.request().method() === 'POST' &&
      response.ok()
  )
  await pageA.getByTestId(`sync-request-${userB.profileId}`).click()
  await requestSync

  await pageB.goto(`${appBaseUrl}/sync?tab=requests`)
  await expect(pageB.getByText(userA.username)).toBeVisible()
  const approveSync = pageB.waitForResponse(
    (response) =>
      response.url().includes('/approve') &&
      response.request().method() === 'POST' &&
      response.ok()
  )
  await pageB.getByRole('button', { name: 'Approve' }).first().click()
  await approveSync

  await pageA.goto(`${appBaseUrl}/ether`)
  const uniquePost = `E2E Ether ${Date.now()}`
  await pageA.getByTestId('ether-content-input').fill(uniquePost)
  await pageA.getByTestId('ether-post-image-input').setInputFiles(tinyImageUpload())
  const postResponsePromise = pageA.waitForResponse(
    (response) =>
      response.url().endsWith('/ether/posts') &&
      response.request().method() === 'POST' &&
      response.ok()
  )
  await pageA.getByTestId('ether-post-button').click()
  const postResponse = await postResponsePromise
  const postBody = await postResponse.json()
  const postId = Number(postBody.id)
  expect(postId).toBeTruthy()
  await expect(pageA.locator(`#ether-post-${postId}`)).toContainText(uniquePost)

  await pageB.goto(`${appBaseUrl}/ether`)
  await expect(pageB.locator(`#ether-post-${postId}`)).toContainText(uniquePost)
  await pageB.getByTestId(`ether-align-post-${postId}`).click()
  await expect(pageB.getByTestId(`ether-align-post-${postId}`)).toContainText('Aligned')
  await pageB.getByTestId(`ether-comments-toggle-${postId}`).click()
  await pageB.getByTestId(`ether-comment-input-${postId}`).fill('E2E comment from synced profile.')
  const commentResponsePromise = pageB.waitForResponse(
    (response) =>
      response.url().includes(`/ether/posts/${postId}/comments`) &&
      response.request().method() === 'POST' &&
      response.ok()
  )
  await pageB.getByTestId(`ether-comment-submit-${postId}`).click()
  const commentResponse = await commentResponsePromise
  const commentBody = await commentResponse.json()
  const commentId = Number(commentBody.id)
  expect(commentId).toBeTruthy()
  await expect(pageB.getByText('E2E comment from synced profile.')).toBeVisible()

  await pageA.goto(`${appBaseUrl}/ether`)
  await pageA.getByTestId(`ether-comments-toggle-${postId}`).click()
  await expect(pageA.getByText('E2E comment from synced profile.')).toBeVisible()
  await pageA.getByTestId(`ether-align-comment-${commentId}`).click()
  await expect(pageA.getByTestId(`ether-align-comment-${commentId}`)).toContainText('Aligned')

  const deletePost = pageA.waitForResponse(
    (response) =>
      response.url().includes(`/ether/posts/${postId}`) &&
      response.request().method() === 'DELETE' &&
      response.ok()
  )
  await pageA.getByTestId(`ether-post-options-${postId}`).click()
  await pageA.getByTestId(`ether-delete-post-${postId}`).click()
  await pageA.getByTestId('ether-confirm-delete-button').click()
  await deletePost
  await expect(pageA.locator(`#ether-post-${postId}`)).toHaveCount(0)

  await pageA.goto(`${appBaseUrl}/ether/profile/${userB.profileId}`)
  await expect(pageA.getByTestId('ether-profile-sync-status')).toContainText('In sync')
  const unsyncResponse = pageA.waitForResponse(
    (response) =>
      response.url().includes(`/ether/syncs/${userB.profileId}`) &&
      response.request().method() === 'DELETE' &&
      response.ok()
  )
  await pageA.getByTestId('ether-profile-sync-status').click()
  await pageA.getByTestId('ether-profile-confirm-submit').click()
  await unsyncResponse
  await expect(pageA.getByTestId('ether-profile-sync-button')).toBeVisible()

  await ctxA.close()
  await ctxB.close()
})
