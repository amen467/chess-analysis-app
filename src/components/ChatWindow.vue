<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useChat } from '@/composables/useChat'

const props = defineProps<{
  currentFen: string
}>()

const draft = ref('')
const keyDraft = ref('')
const passphraseDraft = ref('')
const includeCurrentPosition = ref(false)
const {
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
} = useChat()

onMounted(() => {
  loadApiKey().then(() => {
    keyDraft.value = apiKey.value
  })
})

const saveKey = async () => {
  await saveApiKey(keyDraft.value, passphraseDraft.value)
}

const removeKey = () => {
  clearApiKey()
  keyDraft.value = ''
  passphraseDraft.value = ''
}

const unlockKey = async () => {
  await unlockApiKey(passphraseDraft.value)
  if (apiKey.value) {
    keyDraft.value = apiKey.value
  }
}

const lockKey = () => {
  lockApiKey()
  keyDraft.value = ''
}

const sendMessage = async () => {
  if (!draft.value.trim() || sending.value) return
  await send(draft.value, {
    includeCurrentPosition: includeCurrentPosition.value,
    currentFen: props.currentFen,
  })
  draft.value = ''
}
</script>

<template>
  <section class="chat-window">
    <header>Game Chat</header>
    <div class="api-key">
      <label for="openai-key">ChatGPT API key</label>
      <div class="api-key-controls">
        <input
          id="openai-key"
          v-model="keyDraft"
          type="password"
          placeholder="sk-..."
          autocomplete="off"
        />
        <button type="button" @click="saveKey">Save Encrypted</button>
        <button
          v-if="hasStoredEncryptedKey && !apiKey"
          type="button"
          class="ghost"
          @click="unlockKey"
        >
          Unlock
        </button>
        <button v-else-if="apiKey" type="button" class="ghost" @click="lockKey">Lock</button>
        <button type="button" class="ghost" @click="removeKey">Clear</button>
      </div>
      <label for="openai-passphrase" class="passphrase-label">Encryption passphrase</label>
      <input
        id="openai-passphrase"
        v-model="passphraseDraft"
        type="password"
        class="passphrase-input"
        placeholder="At least 8 characters"
        autocomplete="off"
      />
      <p class="api-key-note">Key is encrypted in local storage and decrypted only in-memory.</p>
    </div>
    <div class="transcript">
      <p v-if="!messages.length" class="empty">Ask about the current position.</p>
      <div v-else>
        <p v-for="(msg, index) in messages" :key="index" :class="msg.role">
          <strong>{{ msg.role === 'user' ? 'You' : 'Assistant' }}:</strong>&nbsp;
          <span>{{ msg.text }}</span>
        </p>
      </div>
    </div>
    <p v-if="lastError" class="error">{{ lastError }}</p>
    <label class="include-position">
      <input v-model="includeCurrentPosition" type="checkbox" />
      Include current position?
    </label>
    <form class="composer" @submit.prevent="sendMessage">
      <input v-model="draft" type="text" placeholder="Why is this move bad?" :disabled="sending" />
      <button type="submit" :disabled="sending || !apiKey">
        {{ sending ? 'Sending...' : 'Send' }}
      </button>
    </form>
  </section>
</template>

<style scoped lang="scss">
.chat-window {
  display: grid;
  grid-template-rows: auto auto 1fr auto auto;
  gap: 0.75rem;
  padding: 1rem;
  background: #0b1021;
  color: #f8fafc;
  border-radius: 10px;
}

header {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.api-key {
  display: grid;
  gap: 0.4rem;
}

.api-key label {
  font-size: 0.85rem;
  font-weight: 600;
}

.api-key-controls {
  display: grid;
  grid-template-columns: 1fr auto auto auto;
  gap: 0.5rem;
}

.api-key-controls input {
  min-width: 0;
  padding: 0.55rem 0.7rem;
  border: 1px solid #1f2937;
  border-radius: 8px;
  background: #111827;
  color: #f8fafc;
}

.api-key-controls button {
  padding: 0.55rem 0.8rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #22d3ee);
  color: #0b1021;
  font-weight: 700;
  cursor: pointer;
}

.api-key-controls button.ghost {
  background: transparent;
  color: #f8fafc;
  border: 1px solid #334155;
}

.api-key-note {
  margin: 0;
  font-size: 0.8rem;
  color: #94a3b8;
}

.passphrase-label {
  font-size: 0.85rem;
  font-weight: 600;
}

.passphrase-input {
  min-width: 0;
  padding: 0.55rem 0.7rem;
  border: 1px solid #1f2937;
  border-radius: 8px;
  background: #111827;
  color: #f8fafc;
}

.transcript {
  overflow-y: auto;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 0.75rem;
}

.transcript p {
  margin: 0 0 0.5rem;
}

.transcript p.user {
  color: #93c5fd;
}

.transcript p.assistant {
  color: #fbbf24;
}

.empty {
  opacity: 0.6;
}

.error {
  margin: 0;
  color: #fca5a5;
  font-size: 0.85rem;
}

.include-position {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #cbd5e1;
}

.composer {
  display: flex;
  gap: 0.5rem;
}

.composer input {
  flex: 1;
  padding: 0.6rem 0.8rem;
  border: 1px solid #1f2937;
  border-radius: 8px;
  background: #111827;
  color: #f8fafc;
}

.composer button {
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #22d3ee);
  color: #0b1021;
  font-weight: 700;
  cursor: pointer;
}

.composer button:disabled,
.api-key-controls button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
