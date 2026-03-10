<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ moves?: string[] }>()
const emit = defineEmits<{
  'ply-selected': [ply: number]
}>()

const moves = computed(() => props.moves ?? [])
const fullMoves = computed(() => {
  const grouped: Array<{
    number: number
    white: string
    whitePly: number
    black?: string
    blackPly?: number
  }> = []
  for (let i = 0; i < moves.value.length; i += 2) {
    const white = moves.value[i]
    if (!white) continue
    grouped.push({
      number: i / 2 + 1,
      white,
      whitePly: i + 1,
      black: moves.value[i + 1],
      blackPly: moves.value[i + 1] ? i + 2 : undefined,
    })
  }
  return grouped
})

const jumpToPly = (ply: number) => {
  emit('ply-selected', ply)
}
</script>

<template>
  <section class="move-list">
    <header>Moves</header>
    <ol>
      <li v-for="move in fullMoves" :key="move.number">
        <span class="move-number">{{ move.number }}.</span>
        <button type="button" class="ply" @click="jumpToPly(move.whitePly)">
          {{ move.white }}
        </button>
        <button
          v-if="move.black && move.blackPly"
          type="button"
          class="ply"
          @click="jumpToPly(move.blackPly)"
        >
          {{ move.black }}
        </button>
      </li>
    </ol>
    <p v-if="!moves.length" class="empty">No moves yet.</p>
  </section>
</template>

<style scoped lang="scss">
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

li {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.move-number {
  color: #94a3b8;
}

.ply {
  border: 1px solid #334155;
  border-radius: 6px;
  background: transparent;
  color: #e2e8f0;
  padding: 0.15rem 0.45rem;
  font: inherit;
  cursor: pointer;
}

.ply:hover {
  border-color: #38bdf8;
  color: #bae6fd;
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
