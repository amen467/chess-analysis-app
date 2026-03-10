import { ref } from 'vue'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

interface SendOptions {
  includeCurrentPosition?: boolean
  currentFen?: string
  currentPgn?: string
}

const OPENAI_API_URL = 'https://api.openai.com/v1/responses'
const OPENAI_MODEL = 'gpt-4.1-mini'
const API_KEY_STORAGE_KEY = 'chess-analysis.openai.api-key.enc'
const LEGACY_API_KEY_STORAGE_KEY = 'chess-analysis.openai.api-key'
const SESSION_PASSPHRASE_KEY = 'chess-analysis.openai.api-key.passphrase'
const PBKDF2_ITERATIONS = 250000

interface EncryptedApiKeyPayload {
  v: 1
  i: number
  s: string
  iv: string
  ct: string
}

interface ResponsesOutputContentItem {
  type?: string
  text?: string
}

interface ResponsesOutputItem {
  content?: ResponsesOutputContentItem[]
}

interface ResponsesApiPayload {
  output_text?: string
  output?: ResponsesOutputItem[]
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const toBase64 = (bytes: Uint8Array) => {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return window.btoa(binary)
}

const fromBase64 = (value: string) => {
  const binary = window.atob(value)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

const deriveAesKey = async (passphrase: string, salt: Uint8Array, iterations: number) => {
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

const encryptApiKey = async (plainKey: string, passphrase: string) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16))
  const iv = window.crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveAesKey(passphrase, salt, PBKDF2_ITERATIONS)
  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    encoder.encode(plainKey),
  )

  const payload: EncryptedApiKeyPayload = {
    v: 1,
    i: PBKDF2_ITERATIONS,
    s: toBase64(salt),
    iv: toBase64(iv),
    ct: toBase64(new Uint8Array(encrypted)),
  }
  return JSON.stringify(payload)
}

const decryptApiKey = async (encryptedPayload: string, passphrase: string) => {
  const parsed = JSON.parse(encryptedPayload) as EncryptedApiKeyPayload
  if (parsed.v !== 1) {
    throw new Error('Unsupported encrypted key format.')
  }
  const salt = fromBase64(parsed.s)
  const iv = fromBase64(parsed.iv)
  const ciphertext = fromBase64(parsed.ct)
  const key = await deriveAesKey(passphrase, salt, parsed.i || PBKDF2_ITERATIONS)
  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource,
  )
  return decoder.decode(decrypted)
}

const extractAssistantText = (payload: ResponsesApiPayload) => {
  const fromOutput =
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
      .map((item) => item.text?.trim() ?? '')
      .filter(Boolean)
      .join('\n') ?? ''

  if (fromOutput) return fromOutput
  return payload.output_text?.trim() || ''
}

export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)
  const apiKey = ref('')
  const lastError = ref<string | null>(null)
  const hasStoredEncryptedKey = ref(false)

  const loadApiKey = async () => {
    if (typeof window === 'undefined') return
    hasStoredEncryptedKey.value = Boolean(window.localStorage.getItem(API_KEY_STORAGE_KEY))
    apiKey.value = ''

    const legacyKey = window.localStorage.getItem(LEGACY_API_KEY_STORAGE_KEY)
    if (legacyKey) {
      apiKey.value = legacyKey
      hasStoredEncryptedKey.value = true
      window.localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY)
      lastError.value =
        'A legacy unencrypted key was loaded into memory. Save it with a passphrase to encrypt it.'
      return
    }

    const sessionPassphrase = window.sessionStorage.getItem(SESSION_PASSPHRASE_KEY)
    if (hasStoredEncryptedKey.value && sessionPassphrase) {
      await unlockApiKey(sessionPassphrase)
    }
  }

  const saveApiKey = async (nextKey: string, passphrase: string) => {
    if (typeof window === 'undefined') return
    if (!window.crypto?.subtle) {
      lastError.value = 'Web Crypto is not available in this browser.'
      return
    }
    const trimmed = nextKey.trim()
    const passphraseTrimmed = passphrase.trim()
    if (!passphraseTrimmed || passphraseTrimmed.length < 8) {
      lastError.value = 'Passphrase must be at least 8 characters.'
      return
    }

    lastError.value = null

    if (!trimmed) {
      window.localStorage.removeItem(API_KEY_STORAGE_KEY)
      window.localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY)
      hasStoredEncryptedKey.value = false
      apiKey.value = ''
      return
    }

    const encryptedPayload = await encryptApiKey(trimmed, passphraseTrimmed)
    window.localStorage.setItem(API_KEY_STORAGE_KEY, encryptedPayload)
    window.localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY)
    window.sessionStorage.setItem(SESSION_PASSPHRASE_KEY, passphraseTrimmed)
    hasStoredEncryptedKey.value = true
    apiKey.value = trimmed
  }

  const clearApiKey = () => {
    if (typeof window === 'undefined') return
    lastError.value = null
    apiKey.value = ''
    window.localStorage.removeItem(API_KEY_STORAGE_KEY)
    window.localStorage.removeItem(LEGACY_API_KEY_STORAGE_KEY)
    window.sessionStorage.removeItem(SESSION_PASSPHRASE_KEY)
    hasStoredEncryptedKey.value = false
  }

  const lockApiKey = () => {
    apiKey.value = ''
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(SESSION_PASSPHRASE_KEY)
    }
  }

  const unlockApiKey = async (passphrase: string) => {
    if (typeof window === 'undefined') return
    if (!window.crypto?.subtle) {
      lastError.value = 'Web Crypto is not available in this browser.'
      return
    }
    const passphraseTrimmed = passphrase.trim()
    if (!passphraseTrimmed) {
      lastError.value = 'Enter a passphrase to unlock the API key.'
      return
    }

    const encryptedPayload = window.localStorage.getItem(API_KEY_STORAGE_KEY)
    if (!encryptedPayload) {
      lastError.value = 'No encrypted API key is stored yet.'
      return
    }

    try {
      apiKey.value = await decryptApiKey(encryptedPayload, passphraseTrimmed)
      window.sessionStorage.setItem(SESSION_PASSPHRASE_KEY, passphraseTrimmed)
      lastError.value = null
    } catch {
      lastError.value = 'Unable to decrypt key. Check passphrase.'
      apiKey.value = ''
    }
  }

  const send = async (text: string, options: SendOptions = {}) => {
    if (!text.trim()) return
    if (!apiKey.value.trim()) {
      lastError.value = 'Add your API key before sending messages.'
      return
    }

    const userText = text.trim()
    lastError.value = null
    sending.value = true
    messages.value.push({ role: 'user', text: userText })

    const requestMessages = messages.value.map((message) => ({
      role: message.role,
      content: [{ type: 'input_text', text: message.text }],
    }))

    if (
      options.includeCurrentPosition &&
      (options.currentFen || options.currentPgn) &&
      requestMessages.length > 0
    ) {
      const lastIndex = requestMessages.length - 1
      const lastMessage = requestMessages[lastIndex]
      if (lastMessage?.role === 'user') {
        const contextLines: string[] = []
        if (options.currentFen) {
          contextLines.push(`Current position FEN: ${options.currentFen}`)
        }
        if (options.currentPgn?.trim()) {
          contextLines.push(`Current game PGN:\n${options.currentPgn}`)
        }

        lastMessage.content = [
          {
            type: 'input_text',
            text: `${lastMessage.content[0]?.text ?? ''}\n\n${contextLines.join('\n\n')}`,
          },
        ]
      }
    }

    try {
      const requestPayload = {
        model: OPENAI_MODEL,
        input: [
          {
            role: 'system',
            content: [
              {
                type: 'input_text',
                text: 'You are a concise chess assistant inside a chess analysis app. Only answer questions related to the included chess game or chess more generally, such as rules, strategies, openings, tactics, etc. If a user asks about anything unrelated to chess, politely say that this assistant only answers chess-related questions. If the question is about the current position and the PGN is not included, remind the user to check the "include current position" box in the app which originated the request.',
              },
            ],
          },
          ...requestMessages,
        ],
      }
      console.log('OpenAI request payload:', requestPayload)

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.value}`,
        },
        body: JSON.stringify(requestPayload),
      })

      if (!response.ok) {
        let message = `OpenAI request failed (${response.status}).`
        try {
          const payload = (await response.json()) as { error?: { message?: string } }
          if (payload.error?.message) message = payload.error.message
        } catch {
          // Ignore JSON parse errors and use generic message.
        }
        throw new Error(message)
      }

      const payload = (await response.json()) as ResponsesApiPayload
      const assistantText = extractAssistantText(payload) || 'No response text returned.'
      messages.value.push({ role: 'assistant', text: assistantText })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to reach OpenAI.'
      lastError.value = message
      messages.value.push({ role: 'assistant', text: `Error: ${message}` })
    } finally {
      sending.value = false
    }
  }

  return {
    messages,
    sending,
    send,
    apiKey,
    loadApiKey,
    saveApiKey,
    clearApiKey,
    unlockApiKey,
    lockApiKey,
    hasStoredEncryptedKey,
    lastError,
  }
}
