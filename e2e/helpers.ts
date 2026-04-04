import fs from 'node:fs'
import path from 'node:path'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

const frontendRoot = '/Users/harpertheauthor/Billions/manifestBank/manifestbank-frontend'
const backendEnvPath = path.join(frontendRoot, '../backend/.env')
const apiBaseUrl = process.env.PW_API_BASE_URL ?? 'http://127.0.0.1:8001'
export const appBaseUrl = process.env.PW_APP_BASE_URL ?? 'http://127.0.0.1:3000'

type SeededUser = {
  email: string
  username: string
  password: string
  profileId: number
}

const tinyPngBase64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII='

function readBackendEnvValue(key: string): string {
  const source = fs.readFileSync(backendEnvPath, 'utf8')
  const match = source.match(new RegExp(`^${key}=(.*)$`, 'm'))
  if (!match?.[1]) {
    throw new Error(`Missing ${key} in ${backendEnvPath}`)
  }
  return match[1].trim().replace(/^['"]|['"]$/g, '')
}

const devSeedSecret = process.env.DEV_SEED_SECRET ?? readBackendEnvValue('DEV_SEED_SECRET')

export async function seedUser(
  request: APIRequestContext,
  overrides: { verified?: boolean; premium?: boolean } = {}
): Promise<SeededUser> {
  const response = await request.post(`${apiBaseUrl}/dev/seed-user`, {
    headers: {
      'x-dev-seed': devSeedSecret,
    },
    data: {
      verified: true,
      premium: true,
      ...overrides,
    },
  })
  expect(response.ok()).toBeTruthy()
  const user = await response.json()
  return {
    email: user.email,
    username: user.username,
    password: user.password,
    profileId: user.profile_id,
  }
}

export async function loginApi(request: APIRequestContext, user: SeededUser) {
  const response = await request.post(`${apiBaseUrl}/auth/login`, {
    data: {
      identifier: user.email,
      password: user.password,
    },
  })
  expect(response.ok()).toBeTruthy()
  const auth = await response.json()
  const accessToken = auth.access_token as string | undefined
  if (accessToken) {
    const legalResponse = await request.post(`${apiBaseUrl}/legal/accept`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    expect(legalResponse.ok()).toBeTruthy()
  }
  return auth
}

export async function loginViaUi(page: Page, user: SeededUser) {
  await page.goto(`${appBaseUrl}/auth`)
  await expect(page.getByTestId('auth-identifier-input')).toBeVisible()
  await page.getByTestId('auth-identifier-input').fill(user.email)
  await page.getByTestId('auth-password-input').fill(user.password)
  await page.getByTestId('auth-submit-button').click()
  await page.waitForURL('**/dashboard')
}

export async function waitForDashboardSession(page: Page) {
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible()
  await expect(page.getByText('Private Vault Dashboard')).toBeVisible()
}

export async function dismissDashboardWelcome(page: Page) {
  const accept = page.getByRole('button', { name: 'Accept' })
  if (await accept.isVisible().catch(() => false)) {
    await accept.click()
    await expect(accept).toHaveCount(0)
  }
}

export async function switchBrowserSession(page: Page, request: APIRequestContext, user: SeededUser) {
  const auth = await loginApi(request, user)
  await page.goto(`${appBaseUrl}/auth`)
  await page.evaluate(
    ({ accessToken, refreshToken }) => {
      window.localStorage.setItem('access_token', accessToken)
      window.localStorage.setItem('refresh_token', refreshToken)
      window.sessionStorage.removeItem('access_token')
      window.sessionStorage.removeItem('refresh_token')
    },
    {
      accessToken: auth.access_token as string,
      refreshToken: auth.refresh_token as string,
    }
  )
}

export function tinyImageUpload() {
  return {
    name: 'tiny.png',
    mimeType: 'image/png',
    buffer: Buffer.from(tinyPngBase64, 'base64'),
  }
}

export async function primeBrowserSession(page: Page, request: APIRequestContext, user: SeededUser) {
  const auth = await loginApi(request, user)
  await page.addInitScript(
    ({ accessToken, refreshToken }) => {
      window.localStorage.setItem('access_token', accessToken)
      window.localStorage.setItem('refresh_token', refreshToken)
    },
    {
      accessToken: auth.access_token as string,
      refreshToken: auth.refresh_token as string,
    }
  )
}

export async function createAccount(
  request: APIRequestContext,
  user: SeededUser,
  payload: { name: string; account_type: string; currency: string }
) {
  const auth = await loginApi(request, user)
  const response = await request.post(`${apiBaseUrl}/accounts`, {
    headers: {
      Authorization: `Bearer ${auth.access_token}`,
    },
    data: payload,
  })
  expect(response.ok()).toBeTruthy()
  return {
    auth,
    account: await response.json(),
  }
}

export async function postLedgerEntry(
  request: APIRequestContext,
  accessToken: string,
  payload: {
    account_id: number
    direction: 'credit' | 'debit'
    amount: string
    currency: string
    entry_type: string
    status: 'posted' | 'pending'
  }
) {
  const response = await request.post(`${apiBaseUrl}/ledger/entries`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    data: payload,
  })
  expect(response.ok()).toBeTruthy()
  return await response.json()
}

export async function openTellerWidget(page: Page) {
  await page.getByTestId('teller-widget-toggle').click()
  await expect(page.getByTestId('teller-widget-panel')).toBeVisible()
}

export async function mockTellerChat(
  page: Page,
  assistantContent: string,
  options: { delayMs?: number; threadId?: number | string; title?: string } = {}
) {
  const { delayMs = 0, threadId = 9991, title = 'Mock Teller Session' } = options
  let threadTitle = title
  let assistantMessageId = 4002
  let userMessageId = 4001
  let messages: Array<{
    id: number
    thread_id: number | string
    role: 'user' | 'assistant'
    content: string
    created_at: string
  }> = []

  await page.route('**/teller/threads', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        messages.length
          ? [
              {
                id: threadId,
                title: threadTitle,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ]
          : []
      ),
    })
  })

  await page.route('**/teller/threads/*/messages', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(messages),
    })
  })

  await page.route('**/teller/threads/*', async (route) => {
    if (route.request().url().includes('/messages')) {
      await route.fallback()
      return
    }
    const method = route.request().method()
    if (method === 'PUT') {
      const body = route.request().postDataJSON() as { title?: string } | undefined
      threadTitle = body?.title ?? threadTitle
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: threadId,
          title: threadTitle,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      })
      return
    }
    if (method === 'DELETE') {
      messages = []
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'deleted' }),
      })
      return
    }
    await route.fallback()
  })

  await page.route('**/teller/chat', async (route) => {
    const requestBody = route.request().postDataJSON() as { message?: string } | undefined
    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    const createdAt = new Date().toISOString()
    const userMessage = {
      id: userMessageId++,
      thread_id: threadId,
      role: 'user' as const,
      content: requestBody?.message ?? '',
      created_at: createdAt,
    }
    const assistantMessage = {
      id: assistantMessageId++,
      thread_id: threadId,
      role: 'assistant' as const,
      content: assistantContent,
      created_at: createdAt,
    }
    messages = [...messages, userMessage, assistantMessage]
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        thread: {
          id: threadId,
          title: threadTitle,
          created_at: createdAt,
          updated_at: createdAt,
        },
        user_message: userMessage,
        assistant_message: assistantMessage,
      }),
    })
  })

  await page.route('**/teller/chat-stream', async (route) => {
    const requestBody = route.request().postDataJSON() as { message?: string } | undefined
    if (delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
    const createdAt = new Date().toISOString()
    const userMessage = {
      id: userMessageId++,
      thread_id: threadId,
      role: 'user' as const,
      content: requestBody?.message ?? '',
      created_at: createdAt,
    }
    const assistantMessage = {
      id: assistantMessageId++,
      thread_id: threadId,
      role: 'assistant' as const,
      content: assistantContent,
      created_at: createdAt,
    }
    messages = [...messages, userMessage, assistantMessage]
    const body = [
      JSON.stringify({
        type: 'thread',
        thread: {
          id: threadId,
          title: threadTitle,
          created_at: createdAt,
          updated_at: createdAt,
        },
      }),
      JSON.stringify({ type: 'user_message', message: userMessage }),
      JSON.stringify({ type: 'delta', delta: assistantContent }),
      JSON.stringify({ type: 'assistant_message', message: assistantMessage }),
      JSON.stringify({ type: 'done' }),
    ].join('\n')
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body,
    })
  })
}

export async function mockBlankTellerStream(page: Page, fallbackAssistantContent = 'I’m here. Please try again.') {
  const threadId = 9991
  const threadTitle = 'Mock Teller Session'

  await page.route('**/teller/threads', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  await page.route('**/teller/chat-stream', async (route) => {
    const createdAt = new Date().toISOString()
    const requestBody = route.request().postDataJSON() as { message?: string } | undefined
    const userMessage = {
      id: 4001,
      thread_id: threadId,
      role: 'user' as const,
      content: requestBody?.message ?? '',
      created_at: createdAt,
    }
    const body = [
      JSON.stringify({
        type: 'thread',
        thread: {
          id: threadId,
          title: threadTitle,
          created_at: createdAt,
          updated_at: createdAt,
        },
      }),
      JSON.stringify({ type: 'user_message', message: userMessage }),
      JSON.stringify({ type: 'done' }),
    ].join('\n')
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body,
    })
  })

  await page.route('**/teller/chat', async (route) => {
    const createdAt = new Date().toISOString()
    const requestBody = route.request().postDataJSON() as { message?: string } | undefined
    const userMessage = {
      id: 4002,
      thread_id: threadId,
      role: 'user' as const,
      content: requestBody?.message ?? '',
      created_at: createdAt,
    }
    const assistantMessage = {
      id: 4003,
      thread_id: threadId,
      role: 'assistant' as const,
      content: fallbackAssistantContent,
      created_at: createdAt,
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        thread: {
          id: threadId,
          title: threadTitle,
          created_at: createdAt,
          updated_at: createdAt,
        },
        user_message: userMessage,
        assistant_message: assistantMessage,
      }),
    })
  })
}
