<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ moves?: string[] }>()
const moves = computed(() => props.moves ?? [])
</script>

<template>
  <section class="move-list">
    <header>Moves</header>
    <ol>
      <li v-for="(move, index) in moves" :key="index">{{ index + 1 }}. {{ move }}</li>
    </ol>
    <p v-if="!moves.length" class="empty">No moves yet.</p>
  </section>
</template>

<style scoped lang="scss">
.move-list {
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

header {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

ol {
  margin: 0;
  padding-left: 1.5rem;
  color: #111827;
}

.empty {
  color: #9ca3af;
  margin-top: 0.25rem;
}
</style>
