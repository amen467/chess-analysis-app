<script setup lang="ts">
import type { EngineEvaluation } from '@/types/chess'

const props = defineProps<{
  enabled: boolean
  ready: boolean
  loading: boolean
  depth: number
  multiPv: number
  currentFen: string
  error?: string | null
  evaluation?: EngineEvaluation | null
}>()

const emit = defineEmits<{
  'update:enabled': [value: boolean]
  'update:depth': [value: number]
  'update:multiPv': [value: number]
  'cancel-analysis': []
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

const onEnabledChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:enabled', target.checked)
}

const cancelAnalysis = () => {
  emit('cancel-analysis')
}

const MAX_PV_PLIES_DISPLAY = 13

const formatPvLine = (line: string[], fen: string) => {
  if (!line.length) return ''
  const truncated = line.length > MAX_PV_PLIES_DISPLAY
  const visibleLine = truncated ? line.slice(0, MAX_PV_PLIES_DISPLAY) : line
  const parts = fen.trim().split(/\s+/)
  const turn = parts[1] === 'b' ? 'b' : 'w'
  const fullmove = Number.parseInt(parts[5] || '1', 10)
  let moveNumber = Number.isFinite(fullmove) && fullmove > 0 ? fullmove : 1
  let sideToMove: 'w' | 'b' = turn
  const formatted: string[] = []

  for (const san of visibleLine) {
    if (sideToMove === 'w') {
      formatted.push(`${moveNumber}. ${san}`)
      sideToMove = 'b'
      continue
    }

    if (formatted.length === 0) {
      formatted.push(`${moveNumber}... ${san}`)
    } else {
      formatted.push(san)
    }
    moveNumber += 1
    sideToMove = 'w'
  }

  return truncated ? `${formatted.join(' ')}...` : formatted.join(' ')
}
</script>

<template>
  <section class="analysis-panel">
    <div class="analysis-header">
      <div class="header-row">
        <h2>Analysis</h2>
        <label class="toggle">
          <input type="checkbox" :checked="enabled" @change="onEnabledChange" />
          <span>Engine {{ enabled ? 'On' : 'Off' }}</span>
        </label>
      </div>
      <div class="controls-row">
        <label class="control">
          Depth
          <input type="number" min="1" max="30" :value="depth" @input="onDepthInput" />
        </label>
        <label class="control">
          Lines
          <input type="number" min="1" max="40" :value="multiPv" @input="onMultiPvInput" />
        </label>
        <button v-if="loading" type="button" class="cancel-button" @click="cancelAnalysis">Cancel</button>
      </div>
    </div>
    <div class="analysis-body">
      <p v-if="!enabled" class="hint">Engine is off.</p>
      <p v-else-if="!ready" class="hint">Starting engine...</p>
      <p v-else-if="loading" class="hint">Analyzing current position...</p>
      <p v-else-if="error" class="error">{{ error }}</p>
      <p v-else-if="!evaluation" class="hint">Waiting for position analysis...</p>
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
            <div>
              <strong>#{{ index + 1 }}</strong
              >&nbsp;&nbsp;
              <span v-if="line.isMate">Mate {{ line.score }}</span>
              <span v-else>{{ formatPawns(line.score) }}</span>
            </div>
            <code>{{ formatPvLine(line.line, currentFen) }}</code>
          </li>
        </ol>
      </template>
    </div>
  </section>
</template>

<style scoped lang="scss">
.analysis-panel {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.analysis-header {
  display: grid;
  gap: 0.6rem;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.controls-row {
  display: flex;
  align-items: end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.analysis-header h2 {
  margin: 0;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #f8fafc;
}

.toggle input {
  accent-color: #22d3ee;
}

.analysis-body {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  min-height: 0;
  overflow: auto;
}

.control {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  color: #f8fafc;
}

.control input {
  width: 4.2rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 0.25rem 0.4rem;
}

.cancel-button {
  border: 1px solid #334155;
  border-radius: 8px;
  padding: 0.45rem 0.75rem;
  background: transparent;
  color: #f8fafc;
  cursor: pointer;
  font-weight: 700;
}

.cancel-button:focus-visible {
  outline: 3px solid #38bdf8;
  outline-offset: 2px;
}

.hint {
  color: #f8fafc;
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
  gap: 1.5rem;
  font-size: 18px;
}

.pv-list li {
  display: grid;
  gap: 0.2rem;
}

.pv-list code {
  font-size: 0.85rem;
  color: #f8fafc;
}
</style>
