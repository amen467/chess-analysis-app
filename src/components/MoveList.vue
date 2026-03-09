<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ moves?: string[] }>()
const moves = computed(() => props.moves ?? [])
const fullMoves = computed(() => {
  const grouped: Array<{ number: number; white: string; black?: string }> = []
  for (let i = 0; i < moves.value.length; i += 2) {
    const white = moves.value[i]
    if (!white) continue
    grouped.push({
      number: i / 2 + 1,
      white,
      black: moves.value[i + 1],
    })
  }
  return grouped
})
</script>

<template>
  <section class="move-list">
    <header>Moves</header>
    <ol>
      <li v-for="move in fullMoves" :key="move.number">
        {{ move.number }}. {{ move.white }}
        <span v-if="move.black"> {{ move.black }}</span>
      </li>
    </ol>
    <p v-if="!moves.length" class="empty">No moves yet.</p>
  </section>
</template>

<style scoped lang="scss">
// .move-list {
//   padding: 1rem;
//   background: #ffffff;
//   border: 1px solid #e5e7eb;
//   border-radius: 10px;
//   max-height: 300px;
//   overflow: auto;
// }

header {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

ol {
  display: flex;
  margin: 0;
  padding-left: 0;
  color: white;
  font-size: 20px;
  gap: 1.3rem;
  flex-wrap: wrap;
  list-style: none;
}

.empty {
  color: #9ca3af;
  margin-top: 0.25rem;
}

.move-list {
  padding: 1rem;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 10px;
  max-height: 300px;
  overflow: auto;
}

.move-list h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
}
</style>
