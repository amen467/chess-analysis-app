<script setup lang="ts">
import type { EngineEvaluation } from '@/types/chess'

const props = defineProps<{
  ready: boolean
  loading: boolean
  depth: number
  multiPv: number
  error?: string | null
  evaluation?: EngineEvaluation | null
}>()

const emit = defineEmits<{
  'update:depth': [value: number]
  'update:multiPv': [value: number]
}>()

const formatPawns = (centipawns: number) => {
  const pawns = centipawns / 100
  const sign = pawns > 0 ? '+' : ''
  return `${sign}${pawns.toFixed(2)}`
}

const toSafeInt = (value: string, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, parsed))
}

const onDepthInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:depth', toSafeInt(target.value, props.depth, 1, 30))
}

const onMultiPvInput = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:multiPv', toSafeInt(target.value, props.multiPv, 1, 40))
}
</script>

<template>
  <section class="analysis-panel">
    <div class="analysis-header">
      <h2>Analysis</h2>
      <label class="control">
        Depth
        <input type="number" min="1" max="30" :value="depth" @input="onDepthInput" />
      </label>
      <label class="control">
        Lines
        <input type="number" min="1" max="40" :value="multiPv" @input="onMultiPvInput" />
      </label>
    </div>
    <p v-if="!ready" class="hint">Engine is not ready yet.</p>
    <p v-else-if="loading" class="hint">Analyzing current position...</p>
    <p v-else-if="error" class="error">{{ error }}</p>
    <p v-else-if="!evaluation" class="hint">Run analysis to see principal variations.</p>
    <template v-else>
      <p class="summary">
        Depth {{ evaluation.depth }} |
        <span v-if="evaluation.mateIn !== null">Mate {{ evaluation.mateIn }}</span>
        <span v-else-if="evaluation.centipawns !== null">
          Eval {{ formatPawns(evaluation.centipawns) }}
        </span>
        <span v-else>Eval --</span>
      </p>
      <ol class="pv-list">
        <li v-for="(line, index) in evaluation.bestMoves" :key="index">
          <strong>#{{ index + 1 }}</strong>
          <span v-if="line.isMate">Mate {{ line.score }}</span>
          <span v-else>{{ formatPawns(line.score) }}</span>
          <code>{{ line.line.join(' ') }}</code>
        </li>
      </ol>
    </template>
  </section>
</template>

<style scoped lang="scss">
.analysis-panel {
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.analysis-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.analysis-header h2 {
  margin: 0;
}

.control {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #334155;
}

.control input {
  width: 4.2rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.25rem 0.4rem;
}

.hint {
  color: #64748b;
  margin: 0.5rem 0 0;
}

.error {
  color: #b91c1c;
  margin: 0.5rem 0 0;
}

.summary {
  margin: 0.5rem 0;
  font-weight: 600;
}

.pv-list {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.5rem;
}

.pv-list li {
  display: grid;
  gap: 0.2rem;
}

.pv-list code {
  font-size: 0.85rem;
  color: #0f172a;
}
</style>
