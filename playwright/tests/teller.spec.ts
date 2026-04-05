import { expect, test, type APIRequestContext, type Locator, type Page } from '@playwright/test'
import {
  createAccount,
  dismissDashboardWelcome,
  loginApi,
  openTellerWidget,
  postLedgerEntry,
  primeBrowserSession,
  seedUser,
  waitForDashboardSession,
} from '../../e2e/helpers'

type SurfaceKind = 'page' | 'widget'

type TellerSurface = {
  kind: SurfaceKind
  input: Locator
  send: Locator
  assistantMessages: Locator
  userMessages: Locator
  responseRegion: Locator
  loadingIndicator: Locator
}

const forbiddenLoopPatterns = [
  /Let’s keep this grounded around/i,
  /Let's keep this grounded around/i,
  /can become a strong anchor/i,
  /You can soften into/i,
  /Do you want to continue that request, or switch tasks and cancel it\?/i,
  /aligned opportunity around now lets/i,
  /anchor this intention around give me affirmations/i,
  /that last part didn't make much sense a shape/i,
  /Welcome back\. Take one slow breath\. Say/i,
]

const coachingFallbackPatterns = [
  /Let your shoulders drop/i,
  /What would help you feel more steady/i,
  /Key Points/i,
  /Reflection/i,
]

function tellerSurface(page: Page, kind: SurfaceKind): TellerSurface {
  if (kind === 'widget') {
    return {
      kind,
      input: page.getByTestId('teller-widget-draft-input'),
      send: page.getByTestId('teller-widget-send-button'),
      assistantMessages: page.getByTestId('teller-widget-assistant-message'),
      userMessages: page.getByTestId('teller-widget-user-message'),
      responseRegion: page.getByTestId('teller-widget-response-region'),
      loadingIndicator: page.getByTestId('teller-widget-loading-indicator'),
    }
  }

  return {
    kind,
    input: page.getByTestId('teller-draft-input'),
    send: page.getByTestId('teller-send-button'),
    assistantMessages: page.getByTestId('teller-assistant-message'),
    userMessages: page.getByTestId('teller-user-message'),
    responseRegion: page.getByTestId('teller-response-region'),
    loadingIndicator: page.getByTestId('teller-loading-indicator'),
  }
}

function latestAssistant(surface: TellerSurface): Locator {
  return surface.assistantMessages.last()
}

async function openTellerPage(page: Page, request: APIRequestContext) {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await page.goto('/myteller')
  await expect(page.getByTestId('teller-page-title')).toBeVisible({ timeout: 20000 })
  return { user, surface: tellerSurface(page, 'page') }
}

async function openTellerWidgetSurface(page: Page, request: APIRequestContext) {
  const user = await seedUser(request)
  await primeBrowserSession(page, request, user)
  await page.goto('/dashboard')
  await waitForDashboardSession(page)
  await dismissDashboardWelcome(page)
  await openTellerWidget(page)
  await expect(page.getByTestId('teller-widget-panel')).toBeVisible()
  return { user, surface: tellerSurface(page, 'widget') }
}

async function sendMessage(surface: TellerSurface, message: string, options: { human?: boolean } = {}) {
  const assistantCount = await surface.assistantMessages.count()
  const userCount = await surface.userMessages.count()
  const priorAssistantText =
    assistantCount > 0 ? normalizeText(await latestAssistant(surface).innerText()) : ''
  await expect(surface.input).toBeVisible()

  if (options.human) {
    await surface.input.click()
    await surface.input.fill('')
    await surface.input.pressSequentially(message, { delay: 35 })
  } else {
    await surface.input.fill(message)
  }

  await surface.send.click()
  await waitForAssistantReply(surface, {
    previousAssistantCount: assistantCount,
    previousUserCount: userCount,
    previousAssistantText: priorAssistantText,
  })
  return latestAssistantText(surface)
}

async function waitForAssistantReply(
  surface: TellerSurface,
  previous: {
    previousAssistantCount: number
    previousUserCount: number
    previousAssistantText: string
  }
) {
  await expect
    .poll(async () => await surface.userMessages.count(), { timeout: 20_000 })
    .toBeGreaterThanOrEqual(previous.previousUserCount + 1)

  await expect
    .poll(async () => {
      const count = await surface.assistantMessages.count()
      const text = count > 0 ? normalizeText(await latestAssistant(surface).innerText()) : ''
      return count > previous.previousAssistantCount || text !== previous.previousAssistantText
    }, { timeout: 20_000 })
    .toBeTruthy()

  const latest = latestAssistant(surface)
  await expect(latest).toBeVisible()
  await expect
    .poll(async () => (await latest.innerText()).trim().length, { timeout: 20_000 })
    .toBeGreaterThan(0)

  await expect
    .poll(async () => (await surface.loadingIndicator.count()) === 0, { timeout: 20_000 })
    .toBeTruthy()
}

async function latestAssistantText(surface: TellerSurface) {
  return normalizeText(await latestAssistant(surface).innerText())
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim()
}

function assertNoBadFallbackPatterns(text: string) {
  for (const pattern of forbiddenLoopPatterns) {
    expect(text).not.toMatch(pattern)
  }
}

function assertActionModeOnly(text: string) {
  assertNoBadFallbackPatterns(text)
  for (const pattern of coachingFallbackPatterns) {
    expect(text).not.toMatch(pattern)
  }
}

async function expectListLikeReply(surface: TellerSurface, minimumItems: number) {
  await expect
    .poll(async () => await latestAssistant(surface).locator('li').count(), { timeout: 10_000 })
    .toBeGreaterThanOrEqual(minimumItems)
}

function expectMultipleAffirmationLines(text: string, minimumLines: number) {
  const lines = text
    .split(/(?:(?:\s|^)-\s+|\.\s+)/)
    .map((line) => line.trim())
    .filter((line) => line.length > 12)
  expect(lines.length).toBeGreaterThanOrEqual(minimumLines)
}

function expectContainsAny(text: string, expectedOptions: string[]) {
  expect(expectedOptions.some((expected) => text.includes(expected))).toBeTruthy()
}

function expectNoRawPhraseEcho(text: string, rawPhrase: string) {
  expect(text.toLowerCase()).not.toContain(rawPhrase.toLowerCase())
}

function assertNoMalformedReflectiveEnding(text: string) {
  expect(text).not.toMatch(/anchor this intention around give me affirmations/i)
  expect(text).not.toMatch(/give a short a shape|give a few affirmations a shape|give 2-minute reset a shape/i)
}

test.describe('ManifestBank Teller chat experience', () => {
  test('money coaching continues forward on the teller page without falling into repeated templates', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    const first = await sendMessage(surface, 'Manifest more money', { human: true })
    assertNoBadFallbackPatterns(first)
    expect(first.toLowerCase()).not.toContain('manifest more money can become')

    const affirmations = await sendMessage(surface, 'a few affirmations', { human: true })
    assertNoBadFallbackPatterns(affirmations)
    expect(affirmations).not.toEqual(first)
    expectMultipleAffirmationLines(affirmations, 3)

    const dailySet = await sendMessage(surface, 'daily set')
    assertNoBadFallbackPatterns(dailySet)
    expect(dailySet).not.toEqual(affirmations)
    expectMultipleAffirmationLines(dailySet, 3)

    const wealthIdentity = await sendMessage(surface, 'expand my wealth identity')
    assertNoBadFallbackPatterns(wealthIdentity)
    expect(wealthIdentity).not.toEqual(dailySet)
    expect(wealthIdentity.toLowerCase()).not.toContain('daily set')
  })

  test('career, future-self, and calming coaching prompts stay natural on the teller page', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    const dreamJob = await sendMessage(surface, 'How do I get my dream job?')
    assertNoBadFallbackPatterns(dreamJob)
    expect(dreamJob.toLowerCase()).toContain('dream')

    const dreamLife = await sendMessage(surface, 'I want my dream life. Where do I start?')
    assertNoBadFallbackPatterns(dreamLife)
    expect(dreamLife).not.toEqual(dreamJob)

    const futureStory = await sendMessage(surface, 'write a future success story', { human: true })
    assertNoBadFallbackPatterns(futureStory)
    expectContainsAny(futureStory, ['Story', 'Months later', 'wanted more from life', 'wanted a different life', 'first hour of his morning'])

    const calming = await sendMessage(surface, 'relaxing into wealth')
    assertNoBadFallbackPatterns(calming)
    expect(calming).not.toEqual(futureStory)
  })

  test('script prompts and typo-like follow-ups are interpreted naturally instead of echoed back awkwardly', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    const scriptReply = await sendMessage(surface, 'script new opportunities', { human: true })
    assertNoBadFallbackPatterns(scriptReply)
    expect(scriptReply.toLowerCase()).not.toContain('aligned opportunity around now lets')

    const expandedScript = await sendMessage(surface, 'now lets script')
    assertNoBadFallbackPatterns(expandedScript)
    expect(expandedScript.toLowerCase()).not.toContain('now lets')
    expect(expandedScript).not.toEqual(scriptReply)
  })

  test('deposit flow stays in action mode and accepts close account-name matches', async ({ page, request }) => {
    const user = await seedUser(request)
    const { account: miracles } = await createAccount(request, user, {
      name: 'Miracles',
      account_type: 'personal',
      currency: 'USD',
    })
    await createAccount(request, user, {
      name: 'Wealth Builder',
      account_type: 'wealth_builder',
      currency: 'USD',
    })
    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    const amountPrompt = await sendMessage(surface, 'deposit')
    expect(amountPrompt).toContain('What amount')

    const accountPrompt = await sendMessage(surface, '300000', { human: true })
    expect(accountPrompt).toContain('Which account')
    assertActionModeOnly(accountPrompt)

    const nearMatch = await sendMessage(surface, 'Miracle')
    if (/Did you mean/i.test(nearMatch)) {
      expect(nearMatch).toContain('Miracles')
      const confirmedSelection = await sendMessage(surface, 'yes')
      expect(confirmedSelection).toContain('Confirm deposit $300,000.00')
      expect(confirmedSelection).toContain('Miracles')
      assertActionModeOnly(confirmedSelection)
    } else {
      expect(nearMatch).toContain('Confirm deposit $300,000.00')
      expect(nearMatch).toContain(miracles.name)
      assertActionModeOnly(nearMatch)
    }

    const done = await sendMessage(surface, 'confirm')
    expect(done).toContain('Done. I deposited $300,000.00')
    expect(done).toContain('Miracles')
    assertActionModeOnly(done)
  })

  test('transfer flow on the teller page collects amount, source, destination, confirmation, and completion smoothly', async ({ page, request }) => {
    const user = await seedUser(request)
    const auth = await loginApi(request, user)
    const { account: wealthBuilder } = await createAccount(request, user, {
      name: 'Wealth Builder',
      account_type: 'wealth_builder',
      currency: 'USD',
    })
    const { account: miracles } = await createAccount(request, user, {
      name: 'Miracles',
      account_type: 'personal',
      currency: 'USD',
    })
    await postLedgerEntry(request, auth.access_token, {
      account_id: wealthBuilder.id,
      direction: 'credit',
      amount: '5000.00',
      currency: 'USD',
      entry_type: 'deposit',
      status: 'posted',
    })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    const amountPrompt = await sendMessage(surface, 'transfer', { human: true })
    expect(amountPrompt).toContain('What amount')

    const fromPrompt = await sendMessage(surface, '3000', { human: true })
    expect(fromPrompt).toContain('Which account should I transfer from?')
    assertActionModeOnly(fromPrompt)

    const toPrompt = await sendMessage(surface, 'wealth buidler')
    expect(toPrompt).toContain('Which account should I transfer to?')
    expect(toPrompt).not.toMatch(/continue that request|switch tasks and cancel it/i)
    assertActionModeOnly(toPrompt)

    const confirmPrompt = await sendMessage(surface, 'Miracle')
    expect(confirmPrompt).toContain('Confirm transfer $3,000.00')
    expect(confirmPrompt).toContain('Wealth Builder')
    expect(confirmPrompt).toContain('Miracles')
    assertActionModeOnly(confirmPrompt)

    const done = await sendMessage(surface, 'yes')
    expect(done).toContain('Done. I transferred $3,000.00 from “Wealth Builder” to “Miracles”.')
    assertActionModeOnly(done)
  })

  test('the widget keeps coaching follow-ups contextual instead of restarting the same framework', async ({ page, request }) => {
    const { surface } = await openTellerWidgetSurface(page, request)

    const first = await sendMessage(surface, 'help me manifest money', { human: true })
    assertNoBadFallbackPatterns(first)

    const second = await sendMessage(surface, 'a few affirmations')
    assertNoBadFallbackPatterns(second)
    expect(second).not.toEqual(first)
    expectMultipleAffirmationLines(second, 3)

    const third = await sendMessage(surface, 'daily set')
    assertNoBadFallbackPatterns(third)
    expect(third).not.toEqual(second)

    const fourth = await sendMessage(surface, 'relaxing into wealth')
    assertNoBadFallbackPatterns(fourth)
    expect(fourth).not.toEqual(third)
  })

  test('the widget handles transfer shorthand and stays in action mode throughout the flow', async ({ page, request }) => {
    const user = await seedUser(request)
    const auth = await loginApi(request, user)
    const { account: wealthBuilder } = await createAccount(request, user, {
      name: 'Wealth Builder',
      account_type: 'wealth_builder',
      currency: 'USD',
    })
    const { account: miracles } = await createAccount(request, user, {
      name: 'Miracles',
      account_type: 'personal',
      currency: 'USD',
    })
    await postLedgerEntry(request, auth.access_token, {
      account_id: wealthBuilder.id,
      direction: 'credit',
      amount: '8000.00',
      currency: 'USD',
      entry_type: 'deposit',
      status: 'posted',
    })

    await primeBrowserSession(page, request, user)
    await page.goto('/dashboard')
    await waitForDashboardSession(page)
    await dismissDashboardWelcome(page)
    await openTellerWidget(page)
    const surface = tellerSurface(page, 'widget')

    const firstTransferReply = await sendMessage(surface, 'tranfer 5000')
    expect(firstTransferReply).toContain('Which account should I transfer from?')
    assertActionModeOnly(firstTransferReply)

    const confirmPrompt = await sendMessage(surface, `${wealthBuilder.id} to ${miracles.id}`)
    expect(confirmPrompt).toContain('Confirm transfer $5,000.00')
    expect(confirmPrompt).toContain('Wealth Builder')
    expect(confirmPrompt).toContain('Miracles')
    assertActionModeOnly(confirmPrompt)

    const done = await sendMessage(surface, 'confirm', { human: true })
    expect(done).toContain('Done. I transferred $5,000.00 from “Wealth Builder” to “Miracles”.')
    assertActionModeOnly(done)
  })
})

test.describe('ManifestBank Teller latest transfer and follow-up behavior', () => {
  test('basic successful transfer flow stays smooth on the teller page', async ({ page, request }) => {
    const user = await seedUser(request)
    const auth = await loginApi(request, user)
    const { account: miracles } = await createAccount(request, user, {
      name: 'Miracles',
      account_type: 'personal',
      currency: 'USD',
    })
    const { account: wealthBuilder } = await createAccount(request, user, {
      name: 'Wealth Builder',
      account_type: 'wealth_builder',
      currency: 'USD',
    })
    await postLedgerEntry(request, auth.access_token, {
      account_id: miracles.id,
      direction: 'credit',
      amount: '6000.00',
      currency: 'USD',
      entry_type: 'deposit',
      status: 'posted',
    })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    expect(await sendMessage(surface, 'transfer', { human: true })).toContain('What amount should I transfer?')

    const fromPrompt = await sendMessage(surface, '3900', { human: true })
    expect(fromPrompt).toContain('Which account should I transfer from?')
    expect(fromPrompt).not.toMatch(/continue that request|switch tasks and cancel it/i)
    assertActionModeOnly(fromPrompt)

    const toPrompt = await sendMessage(surface, 'Miracles')
    expect(toPrompt).toContain('Which account should I transfer to?')
    expect(toPrompt).not.toMatch(/continue that request|switch tasks and cancel it/i)
    assertActionModeOnly(toPrompt)

    const confirmPrompt = await sendMessage(surface, 'Wealth Builder')
    expect(confirmPrompt).toContain('Confirm transfer $3,900.00 from “Miracles” to “Wealth Builder”?')
    assertActionModeOnly(confirmPrompt)

    const done = await sendMessage(surface, 'confirmed')
    expect(done).toContain('Done. I transferred $3,900.00 from “Miracles” to “Wealth Builder”.')
    assertActionModeOnly(done)
  })

  test('partial transfer continuation preserves progress instead of interrupting the flow', async ({ page, request }) => {
    const user = await seedUser(request)
    const auth = await loginApi(request, user)
    const { account: wealthBuilder } = await createAccount(request, user, {
      name: 'Wealth Builder',
      account_type: 'wealth_builder',
      currency: 'USD',
    })
    await createAccount(request, user, {
      name: 'Miracles',
      account_type: 'personal',
      currency: 'USD',
    })
    await postLedgerEntry(request, auth.access_token, {
      account_id: wealthBuilder.id,
      direction: 'credit',
      amount: '9000.00',
      currency: 'USD',
      entry_type: 'deposit',
      status: 'posted',
    })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    await sendMessage(surface, 'transfer')
    await sendMessage(surface, '5000')

    const destinationPrompt = await sendMessage(surface, 'Wealth Builder', { human: true })
    expect(destinationPrompt).toContain('Which account should I transfer to?')
    expect(destinationPrompt).not.toMatch(/continue that request|switch tasks and cancel it/i)
    assertActionModeOnly(destinationPrompt)
  })

  test('confirmation variants complete transfers once confirmation is active', async ({ page, request }) => {
    for (const variant of ['yes', 'confirm', 'confirmed']) {
      const user = await seedUser(request)
      const auth = await loginApi(request, user)
      const { account: miracles } = await createAccount(request, user, {
        name: 'Miracles',
        account_type: 'personal',
        currency: 'USD',
      })
      await postLedgerEntry(request, auth.access_token, {
        account_id: miracles.id,
        direction: 'credit',
        amount: '4500.00',
        currency: 'USD',
        entry_type: 'deposit',
        status: 'posted',
      })
      await createAccount(request, user, {
        name: 'Wealth Builder',
        account_type: 'wealth_builder',
        currency: 'USD',
      })

      await primeBrowserSession(page, request, user)
      await page.goto('/myteller')
      await expect(page.getByTestId('teller-page-title')).toBeVisible()
      const surface = tellerSurface(page, 'page')

      await sendMessage(surface, 'transfer')
      await sendMessage(surface, '2000')
      await sendMessage(surface, 'Miracles')
      const confirmPrompt = await sendMessage(surface, 'Wealth Builder')
      expect(confirmPrompt).toContain('Confirm transfer $2,000.00')

      const done = await sendMessage(surface, variant, { human: variant !== 'yes' })
      expect(done).toContain('Done. I transferred $2,000.00 from “Miracles” to “Wealth Builder”.')
      assertActionModeOnly(done)
    }
  })

  test('completed transfer can flow naturally into coaching without getting stuck in action mode', async ({ page, request }) => {
    const user = await seedUser(request)
    const auth = await loginApi(request, user)
    const { account: miracles } = await createAccount(request, user, {
      name: 'Miracles',
      account_type: 'personal',
      currency: 'USD',
    })
    await postLedgerEntry(request, auth.access_token, {
      account_id: miracles.id,
      direction: 'credit',
      amount: '5000.00',
      currency: 'USD',
      entry_type: 'deposit',
      status: 'posted',
    })
    await createAccount(request, user, {
      name: 'Wealth Builder',
      account_type: 'wealth_builder',
      currency: 'USD',
    })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    await sendMessage(surface, 'transfer')
    await sendMessage(surface, '1800')
    await sendMessage(surface, 'Miracles')
    await sendMessage(surface, 'Wealth Builder')
    await sendMessage(surface, 'confirmed')

    const coaching = await sendMessage(surface, 'Thank you. Now scripting to bring in immediate flow of money', { human: true })
    assertNoBadFallbackPatterns(coaching)
    expect(coaching.toLowerCase()).toContain('script')
    expect(coaching).not.toMatch(/continue that request|switch tasks and cancel it|Which account should I/i)
    expectNoRawPhraseEcho(coaching, 'now scripting to bring in immediate flow of money')
  })

  test('follow-up fulfillment provides a short script directly', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    await sendMessage(surface, 'Manifest more money')
    const scriptReply = await sendMessage(surface, 'a short script', { human: true })

    assertNoBadFallbackPatterns(scriptReply)
    expectContainsAny(scriptReply, ['Script', 'short script you can use', 'Here is a simple script', 'Here’s a short script you can use'])
    expect(scriptReply).not.toMatch(/give a short a shape|a short script a shape/i)
    expect(scriptReply).not.toContain('a short script, a few affirmations, or a 2-minute reset')
  })

  test('follow-up fulfillment provides affirmations and a daily set directly', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    await sendMessage(surface, 'help me manifest money', { human: true })
    const affirmations = await sendMessage(surface, 'a few affirmations')
    assertNoBadFallbackPatterns(affirmations)
    expectMultipleAffirmationLines(affirmations, 4)
    expect(affirmations).not.toMatch(/give a few affirmations a shape/i)

    const dailySet = await sendMessage(surface, 'daily set')
    assertNoBadFallbackPatterns(dailySet)
    expectContainsAny(dailySet, ['daily set', 'short daily set'])
    expectMultipleAffirmationLines(dailySet, 4)
    expect(dailySet).not.toContain('More money usually responds better to clarity than pressure')
  })

  test('follow-up fulfillment provides an actual 2-minute reset practice', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    await sendMessage(surface, 'Manifest more money')
    const resetReply = await sendMessage(surface, '2-minute reset', { human: true })

    assertNoBadFallbackPatterns(resetReply)
    expectContainsAny(resetReply, ['2-Minute Reset', 'Take one slow inhale', 'Breathe in for four'])
    expect(resetReply).not.toMatch(/give 2-minute reset a shape/i)
    expect(resetReply).not.toContain('a short script, a few affirmations, or a 2-minute reset')
  })

  test('follow-up chain transforms previous content instead of reopening menus', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    await sendMessage(surface, 'Manifest more money')
    const scriptReply = await sendMessage(surface, 'a short script', { human: true })
    assertNoBadFallbackPatterns(scriptReply)
    expectContainsAny(scriptReply, ['Script', 'short script', 'Try this'])

    const shorter = await sendMessage(surface, 'shorter', { human: true })
    assertNoBadFallbackPatterns(shorter)
    expectContainsAny(shorter, ['Shorter Script', 'Script'])
    expect(shorter).not.toContain('a short script, a few affirmations, or a 2-minute reset')
    expect(shorter).not.toMatch(/I welcome aligned shorter|I welcome short/i)

    const firstPerson = await sendMessage(surface, 'in first person', { human: true })
    assertNoBadFallbackPatterns(firstPerson)
    expect(firstPerson).toContain('I ')
    expect(firstPerson).not.toMatch(/I welcome in first person/i)

    const repaired = await sendMessage(surface, "that didn't hit", { human: true })
    assertNoBadFallbackPatterns(repaired)
    expectContainsAny(repaired, ['Let me make it cleaner', 'Let me restate', 'Script'])
    expect(repaired).not.toContain('a short script, a few affirmations, or a 2-minute reset')
  })

  test('coaching typo tolerance handles affirmations misspelling without awkward raw-phrase echo', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    const reply = await sendMessage(surface, 'afirmations', { human: true })
    assertNoBadFallbackPatterns(reply)
    expectContainsAny(reply, ['affirmations', 'grounded affirmations'])
    expect(reply).not.toMatch(/afirmations/i)
  })

  test('explicit transfer direction is preserved after a deposit flow', async ({ page, request }) => {
    const user = await seedUser(request)
    await createAccount(request, user, { name: 'Miracles', account_type: 'personal', currency: 'USD' })
    await createAccount(request, user, { name: 'Wealth Builder', account_type: 'wealth_builder', currency: 'USD' })
    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    await sendMessage(surface, 'Hi deposit 1400', { human: true })
    await sendMessage(surface, 'Miracles')
    await sendMessage(surface, 'yes')

    const transferConfirm = await sendMessage(surface, 'Thank you. now lets transfer 1200 from miracles into wealth builder', {
      human: true,
    })
    expect(transferConfirm).toContain('Confirm transfer $1,200.00 from “Miracles” to “Wealth Builder”?')
    expect(transferConfirm).not.toContain('from “Wealth Builder” to “Miracles”')
    assertActionModeOnly(transferConfirm)
  })

  test('explicit reverse transfer direction is preserved when the user says from wealth builder to miracles', async ({ page, request }) => {
    const user = await seedUser(request)
    const auth = await loginApi(request, user)
    await createAccount(request, user, { name: 'Miracles', account_type: 'personal', currency: 'USD' })
    const { account: wealthBuilder } = await createAccount(request, user, {
      name: 'Wealth Builder',
      account_type: 'wealth_builder',
      currency: 'USD',
    })
    await postLedgerEntry(request, auth.access_token, {
      account_id: wealthBuilder.id,
      direction: 'credit',
      amount: '3000.00',
      currency: 'USD',
      entry_type: 'deposit',
      status: 'posted',
    })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    const transferConfirm = await sendMessage(surface, 'transfer 1200 from wealth builder to miracles', {
      human: true,
    })
    expect(transferConfirm).toContain('Confirm transfer $1,200.00 from “Wealth Builder” to “Miracles”?')
    expect(transferConfirm).not.toContain('from “Miracles” to “Wealth Builder”')
    assertActionModeOnly(transferConfirm)
  })

  test('confirmation synonyms complete transfers without coaching drift', async ({ page, request }) => {
    for (const variant of ['correct', 'yep', 'yeah', "that's right"]) {
      const user = await seedUser(request)
      const auth = await loginApi(request, user)
      const { account: ukMotion } = await createAccount(request, user, {
        name: 'Uk Motion',
        account_type: 'operating',
        currency: 'GBP',
      })
      await createAccount(request, user, {
        name: 'Miracles',
        account_type: 'personal',
        currency: 'USD',
      })
      await postLedgerEntry(request, auth.access_token, {
        account_id: ukMotion.id,
        direction: 'credit',
        amount: '3000.00',
        currency: 'GBP',
        entry_type: 'deposit',
        status: 'posted',
      })

      await primeBrowserSession(page, request, user)
      await page.goto('/myteller')
      await expect(page.getByTestId('teller-page-title')).toBeVisible()
      const surface = tellerSurface(page, 'page')

      await sendMessage(surface, 'transfer')
      await sendMessage(surface, '1200')
      await sendMessage(surface, 'Uk Motion')
      const confirmPrompt = await sendMessage(surface, 'Miracles')
      expect(confirmPrompt).toContain('Confirm transfer £1,200.00 from “Uk Motion” to “Miracles”?')

      const done = await sendMessage(surface, variant, { human: true })
      expect(done).toContain('Done. I transferred £1,200.00 from “Uk Motion” to “Miracles”.')
      assertActionModeOnly(done)
    }
  })

  test('natural account aliases continue an active transfer flow', async ({ page, request }) => {
    const user = await seedUser(request)
    const auth = await loginApi(request, user)
    const { account: ukMotion } = await createAccount(request, user, {
      name: 'Uk Motion',
      account_type: 'operating',
      currency: 'GBP',
    })
    await createAccount(request, user, {
      name: 'Miracles',
      account_type: 'personal',
      currency: 'USD',
    })
    await postLedgerEntry(request, auth.access_token, {
      account_id: ukMotion.id,
      direction: 'credit',
      amount: '2500.00',
      currency: 'GBP',
      entry_type: 'deposit',
      status: 'posted',
    })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    await sendMessage(surface, 'another transfer')
    await sendMessage(surface, '1300 pounds', { human: true })
    const nextPrompt = await sendMessage(surface, 'uk account')

    expectContainsAny(nextPrompt, ['Which account should I transfer to?', 'Did you mean'])
    expect(nextPrompt).not.toMatch(/Which account should I transfer from\?.*Which account should I transfer from\?/i)
    expect(nextPrompt).not.toMatch(/continue that request|switch tasks and cancel it/i)
    assertActionModeOnly(nextPrompt)
  })

  test('affirmations do not end with malformed reflective stitching', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    const reply = await sendMessage(surface, 'Can you give me affirmations for new paying signature member sign ups in my app?', {
      human: true,
    })
    assertNoBadFallbackPatterns(reply)
    expectContainsAny(reply, ['affirmations', 'sign'])
    assertNoMalformedReflectiveEnding(reply)
  })

  test('calling out unclear wording triggers a clean repair response', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    await sendMessage(surface, 'Can you give me affirmations for new paying signature member sign ups in my app?')
    const repair = await sendMessage(surface, "that last part didn't make much sense", { human: true })

    expectContainsAny(repair, [
      "You're right, that part came out unclear",
      'Let me restate it more simply',
      "You're right. Let me",
      "You’re right. Here’s a stronger version.",
      'Let me make those land more cleanly',
      'Let me make it cleaner',
    ])
    expectNoRawPhraseEcho(repair, "that last part didn't make much sense a shape")
    expect(repair).not.toMatch(/anchor this intention around give me affirmations/i)
    assertNoBadFallbackPatterns(repair)
  })

  test('typo approval confirms an active transfer instead of falling into a menu', async ({ page, request }) => {
    const user = await seedUser(request)
    const auth = await loginApi(request, user)
    const { account: miracles } = await createAccount(request, user, {
      name: 'Miracles',
      account_type: 'personal',
      currency: 'USD',
    })
    await createAccount(request, user, {
      name: 'Wealth Builder',
      account_type: 'wealth_builder',
      currency: 'USD',
    })
    await postLedgerEntry(request, auth.access_token, {
      account_id: miracles.id,
      direction: 'credit',
      amount: '6000.00',
      currency: 'USD',
      entry_type: 'deposit',
      status: 'posted',
    })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    const confirmPrompt = await sendMessage(surface, 'transfer 3000 from miracles to wealth builder')
    expect(confirmPrompt).toContain('Confirm transfer $3,000.00 from “Miracles” to “Wealth Builder”?')

    const done = await sendMessage(surface, 'yese', { human: true })
    expect(done).toContain('Done. I transferred $3,000.00 from “Miracles” to “Wealth Builder”.')
    expect(done).not.toMatch(/short script|affirmations|2-minute reset/i)
  })

  test('mid-flow transfer correction updates the draft instead of cancelling it', async ({ page, request }) => {
    const user = await seedUser(request)
    await loginApi(request, user)
    await createAccount(request, user, { name: 'Miracles', account_type: 'personal', currency: 'USD' })
    await createAccount(request, user, { name: 'Wealth Builder', account_type: 'wealth_builder', currency: 'USD' })
    await createAccount(request, user, { name: 'Uk Motion', account_type: 'operating', currency: 'GBP' })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    await sendMessage(surface, 'transfer 2000')
    await sendMessage(surface, 'miracles')
    const corrected = await sendMessage(surface, 'no wait not that one wealth builder to uk motion', { human: true })

    expect(corrected).toContain('Confirm transfer $2,000.00 from “Wealth Builder” to “Uk Motion”?')
    expect(corrected).not.toMatch(/canceled|cancelled/i)
  })

  test('transfer with pounds preserves amount and currency exactly through confirmation', async ({ page, request }) => {
    const user = await seedUser(request)
    await loginApi(request, user)
    await createAccount(request, user, { name: 'Uk Motion', account_type: 'operating', currency: 'GBP' })
    await createAccount(request, user, { name: 'Wealth Builder', account_type: 'wealth_builder', currency: 'USD' })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    const firstReply = await sendMessage(surface, 'transfer 2000 pounds to wealth builder')
    const confirmPrompt = firstReply.includes('Confirm transfer £2,000.00 from “Uk Motion” to “Wealth Builder”?')
      ? firstReply
      : await sendMessage(surface, 'uk account', { human: true })

    expect(confirmPrompt).toContain('Confirm transfer £2,000.00 from “Uk Motion” to “Wealth Builder”?')
    expect(confirmPrompt).not.toMatch(/\$1,000\.00/i)
  })

  test('neutral assist mode handles hi and u on the teller page without coaching drift', async ({ page, request }) => {
    const { surface } = await openTellerPage(page, request)

    const greeting = await sendMessage(surface, 'hi', { human: true })
    expect(greeting).toContain('Hi. What would you like to do?')
    expect(greeting).not.toMatch(/let your shoulders drop|reflection|key points|insight/i)

    const unclear = await sendMessage(surface, 'u', { human: true })
    expectContainsAny(unclear, [
      "Can you clarify what you'd like to do?",
      'Do you want to make a transfer, deposit, or something else?',
    ])
    expect(unclear).not.toMatch(/let your shoulders drop|grounded around|can become a strong anchor/i)
  })

  test('neutral assist mode handles hi and u in the widget without coaching drift', async ({ page, request }) => {
    const { surface } = await openTellerWidgetSurface(page, request)

    const greeting = await sendMessage(surface, 'hi')
    expect(greeting).toContain('Hi. What would you like to do?')
    expect(greeting).not.toMatch(/let your shoulders drop|reflection|key points|insight/i)

    const unclear = await sendMessage(surface, 'u')
    expectContainsAny(unclear, [
      "Can you clarify what you'd like to do?",
      'Do you want to make a transfer, deposit, or something else?',
    ])
    expect(unclear).not.toMatch(/let your shoulders drop|grounded around|can become a strong anchor/i)
  })

  test('malformed confirmation-like input only executes when confirmation is actually pending', async ({ page, request }) => {
    const user = await seedUser(request)
    const auth = await loginApi(request, user)
    const { account: miracles } = await createAccount(request, user, {
      name: 'Miracles',
      account_type: 'personal',
      currency: 'USD',
    })
    await createAccount(request, user, {
      name: 'Wealth Builder',
      account_type: 'wealth_builder',
      currency: 'USD',
    })
    await postLedgerEntry(request, auth.access_token, {
      account_id: miracles.id,
      direction: 'credit',
      amount: '6000.00',
      currency: 'USD',
      entry_type: 'deposit',
      status: 'posted',
    })

    await primeBrowserSession(page, request, user)
    await page.goto('/myteller')
    await expect(page.getByTestId('teller-page-title')).toBeVisible()
    const surface = tellerSurface(page, 'page')

    await sendMessage(surface, 'transfer')
    const stillAmount = await sendMessage(surface, 'ci=onfirmed', { human: true })
    expect(stillAmount).toContain('What amount should I transfer?')
    assertActionModeOnly(stillAmount)

    await sendMessage(surface, '2500')
    await sendMessage(surface, 'Miracles')
    const confirmPrompt = await sendMessage(surface, 'Wealth Builder')
    expect(confirmPrompt).toContain('Confirm transfer $2,500.00 from “Miracles” to “Wealth Builder”?')

    const done = await sendMessage(surface, 'ci=onfirmed', { human: true })
    expect(done).toContain('Done. I transferred $2,500.00 from “Miracles” to “Wealth Builder”.')
    assertActionModeOnly(done)
  })
})
