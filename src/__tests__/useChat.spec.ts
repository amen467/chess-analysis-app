import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useChat } from '@/composables/useChat'

const OPENAI_API_URL = 'https://api.openai.com/v1/responses'

const abortableFetchMock = () =>
  vi.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      signal?.addEventListener(
        'abort',
        () => {
          reject(new DOMException('Aborted', 'AbortError'))
        },
        { once: true },
      )
    })
  })

describe('useChat', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sends a chat request and appends assistant output', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'resp_1',
        output_text: 'Play e4 to claim the center.',
      }),
    } as Response)
    vi.stubGlobal('fetch', fetchMock)

    const chat = useChat()
    chat.apiKey.value = 'sk-test'

    await chat.send('What is a good first move?', {
      includeCurrentPosition: true,
      currentFen: 'startpos fen',
      currentPgn: '1. e4 e5',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(OPENAI_API_URL)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    const payload = JSON.parse(String(init.body)) as {
      input: Array<{ content: Array<{ text: string }> }>
    }
    expect(payload.input[1]?.content[0]?.text).toContain('Current position FEN: startpos fen')
    expect(payload.input[1]?.content[0]?.text).toContain('Current game PGN:')

    expect(chat.lastError.value).toBeNull()
    expect(chat.sending.value).toBe(false)
    expect(chat.messages.value).toHaveLength(2)
    expect(chat.messages.value[0]).toEqual({
      role: 'user',
      text: 'What is a good first move?',
    })
    expect(chat.messages.value[1]).toEqual({
      role: 'assistant',
      text: 'Play e4 to claim the center.',
    })
  })

  it('times out an in-flight request after 45 seconds', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', abortableFetchMock())

    const chat = useChat()
    chat.apiKey.value = 'sk-test'

    const sendPromise = chat.send('Analyze this move')
    await vi.advanceTimersByTimeAsync(45000)
    await sendPromise

    expect(chat.sending.value).toBe(false)
    expect(chat.lastError.value).toBe('Request timed out after 45s.')
    expect(chat.messages.value).toHaveLength(2)
    expect(chat.messages.value[1]?.text).toBe('Error: Request timed out after 45s.')
  })

  it('cancels an in-flight request without appending an assistant error message', async () => {
    vi.stubGlobal('fetch', abortableFetchMock())

    const chat = useChat()
    chat.apiKey.value = 'sk-test'

    const sendPromise = chat.send('Should I trade queens here?')
    chat.cancelSend()
    await sendPromise

    expect(chat.sending.value).toBe(false)
    expect(chat.lastError.value).toBe('Request canceled.')
    expect(chat.messages.value).toHaveLength(1)
    expect(chat.messages.value[0]?.role).toBe('user')
  })
})
