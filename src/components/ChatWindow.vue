<script setup lang="ts">
import { ref } from 'vue'

const messages = ref<{ role: 'user' | 'assistant'; text: string }[]>([])
const draft = ref('')

const sendMessage = () => {
  if (!draft.value.trim()) return
  messages.value.push({ role: 'user', text: draft.value.trim() })
  draft.value = ''
}
</script>

<template>
  <section class="chat-window">
    <header>Game Chat</header>
    <div class="transcript">
      <p v-if="!messages.length" class="empty">Ask about the current position.</p>
      <div v-else>
        <p v-for="(msg, index) in messages" :key="index" :class="msg.role">
          <strong>{{ msg.role === 'user' ? 'You' : 'Assistant' }}:</strong>
          <span>{{ msg.text }}</span>
        </p>
      </div>
    </div>
    <h1>Hi</h1>
    <form class="composer" @submit.prevent="sendMessage">
      <input v-model="draft" type="text" placeholder="Why is this move bad?" />
      <button type="submit">Send</button>
    </form>
  </section>
</template>

<style scoped lang="scss">
.chat-window {
  display: grid;
  grid-template-rows: auto 1fr auto;
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
</style>
