import { ref } from 'vue'

export interface ChatMessage {
  role: 'user' | 'assistant'
  text: string
}

// Lightweight chat state hook; replace send with OpenAI streaming later.
export function useChat() {
  const messages = ref<ChatMessage[]>([])
  const sending = ref(false)

  const send = async (text: string) => {
    if (!text.trim()) return
    sending.value = true
    messages.value.push({ role: 'user', text: text.trim() })
    // Stub assistant echo
    messages.value.push({ role: 'assistant', text: "I'll analyze this move soon." })
    sending.value = false
  }

  return { messages, sending, send }
}
