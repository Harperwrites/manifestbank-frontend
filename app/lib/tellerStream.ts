type TellerStreamPayload = {
  thread_id: string | number | null
  message: string
  short_mode?: boolean
}

type TellerChatResponse = {
  thread: any
  user_message: any
  assistant_message: any
}

const TELLER_STREAM_TOTAL_TIMEOUT_MS = 30000
const TELLER_STREAM_IDLE_TIMEOUT_MS = 12000

type TellerStreamEvent =
  | { type: 'thread'; thread: any }
  | { type: 'user_message'; message: any }
  | { type: 'delta'; delta: string }
  | { type: 'assistant_message'; message: any }
  | { type: 'done' }
  | { type: 'error'; detail: string }

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://127.0.0.1:8001'
}

function getAccessToken() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('access_token') ?? sessionStorage.getItem('access_token') ?? ''
}

export async function sendTellerChat(payload: TellerStreamPayload): Promise<TellerChatResponse> {
  const token = getAccessToken()
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const controller = new AbortController()
  let timeoutHandle: number | null = null

  if (typeof window !== 'undefined') {
    timeoutHandle = window.setTimeout(() => controller.abort(new Error('Teller request timed out.')), TELLER_STREAM_TOTAL_TIMEOUT_MS)
  }

  try {
    const response = await fetch(`${getBaseUrl()}/teller/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      let detail = 'Unable to send message.'
      try {
        const data = await response.json()
        detail = data?.detail ?? detail
      } catch {}
      const error: any = new Error(detail)
      error.response = { status: response.status, data: { detail } }
      throw error
    }

    return (await response.json()) as TellerChatResponse
  } catch (error: any) {
    const detail = error?.name === 'AbortError' ? 'Teller request timed out.' : error?.message || 'Unable to send message.'
    const wrapped: any = new Error(detail)
    wrapped.response = error?.response ?? { status: 599, data: { detail } }
    throw wrapped
  } finally {
    if (timeoutHandle !== null && typeof window !== 'undefined') window.clearTimeout(timeoutHandle)
  }
}

export async function streamTellerChat(
  payload: TellerStreamPayload,
  onEvent: (event: TellerStreamEvent) => void | Promise<void>
) {
  const token = getAccessToken()
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  let sawAssistantContent = false
  let lastThread: any = null
  const controller = new AbortController()
  let timeoutHandle: number | null = null

  const clearTimer = () => {
    if (timeoutHandle !== null && typeof window !== 'undefined') {
      window.clearTimeout(timeoutHandle)
      timeoutHandle = null
    }
  }

  const armTimer = (ms: number, detail: string) => {
    clearTimer()
    if (typeof window === 'undefined') return
    timeoutHandle = window.setTimeout(() => controller.abort(new Error(detail)), ms)
  }

  armTimer(TELLER_STREAM_TOTAL_TIMEOUT_MS, 'Teller request timed out.')

  let response: Response
  try {
    response = await fetch(`${getBaseUrl()}/teller/chat-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (error: any) {
    clearTimer()
    const detail = error?.name === 'AbortError' ? 'Teller request timed out.' : error?.message || 'Unable to send message.'
    const wrapped: any = new Error(detail)
    wrapped.response = { status: 599, data: { detail } }
    throw wrapped
  }

  if (!response.ok) {
    clearTimer()
    let detail = 'Unable to send message.'
    try {
      const data = await response.json()
      detail = data?.detail ?? detail
    } catch {}
    const error: any = new Error(detail)
    error.response = { status: response.status, data: { detail } }
    throw error
  }

  if (!response.body) {
    clearTimer()
    throw new Error('Unable to stream message.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      armTimer(TELLER_STREAM_IDLE_TIMEOUT_MS, 'Teller stream stalled.')
      const { done, value } = await reader.read()
      clearTimer()
    if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        const event = JSON.parse(trimmed) as TellerStreamEvent
        if (event.type === 'thread') {
          lastThread = event.thread
        }
        if (event.type === 'delta' && event.delta.trim()) {
          sawAssistantContent = true
        }
        if (event.type === 'assistant_message') {
          if (event.message?.content?.trim()) {
            sawAssistantContent = true
          }
        }
        await onEvent(event)
      }
    }

    const finalChunk = buffer.trim()
    if (finalChunk) {
      const event = JSON.parse(finalChunk) as TellerStreamEvent
      if (event.type === 'thread') {
        lastThread = event.thread
      }
      if (event.type === 'delta' && event.delta.trim()) {
        sawAssistantContent = true
      }
      if (event.type === 'assistant_message') {
        if (event.message?.content?.trim()) {
          sawAssistantContent = true
        }
      }
      await onEvent(event)
    }
  } catch (error: any) {
    clearTimer()
    const detail =
      error?.name === 'AbortError' || /timed out|stalled/i.test(error?.message || '')
        ? error?.message || 'Teller request timed out.'
        : error?.message || 'Unable to stream message.'
    const wrapped: any = new Error(detail)
    wrapped.response = { status: 599, data: { detail } }
    throw wrapped
  } finally {
    clearTimer()
    controller.abort()
  }

  if (!sawAssistantContent) {
    await onEvent({
      type: 'error',
      detail: 'Unable to complete the Teller reply.',
    })
    await onEvent({ type: 'done' })
  }
}
