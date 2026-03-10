<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import ChessBoard from '@/components/ChessBoard.vue'
import AnalysisPanel from '@/components/AnalysisPanel.vue'
import ChatWindow from '@/components/ChatWindow.vue'
import MoveList from '@/components/MoveList.vue'
import { useStockfish } from '@/composables/useStockfish'

const moves = ref<string[]>([])
const pgnInput = ref('')
const pgnImportRequest = ref<{ id: number; text: string }>()
const pgnImportStatus = ref<{ ok: boolean; message: string }>()
const currentFen = ref('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
const currentPgn = ref('')
const analysisDepth = ref(14)
const analysisLines = ref(3)

const { isReady, isAnalyzing, evaluation, lastError, start, destroy, analyzePosition } =
  useStockfish()

const handleMovesUpdated = (nextMoves: string[]) => {
  moves.value = nextMoves
}

const requestPgnImport = () => {
  pgnImportRequest.value = {
    id: Date.now(),
    text: pgnInput.value,
  }
}

const handlePgnImportStatus = (payload: { ok: boolean; message: string }) => {
  pgnImportStatus.value = payload
}

const handlePositionUpdated = (fen: string) => {
  currentFen.value = fen
}

const handlePgnUpdated = (pgn: string) => {
  currentPgn.value = pgn
}

const runAnalysis = async () => {
  try {
    await analyzePosition(currentFen.value, {
      depth: analysisDepth.value,
      multiPv: analysisLines.value,
    })
  } catch {
    // Error state is already surfaced by the composable.
  }
}

onMounted(() => {
  start().catch(() => {
    // Error state is already surfaced by the composable.
  })
})

onBeforeUnmount(() => {
  destroy()
})
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Chess Analysis App</p>
        <h1>Analyze games with Stockfish + Chat</h1>
      </div>
    </header>

    <section class="importer">
      <label for="pgn-input">PGN Input</label>
      <textarea
        id="pgn-input"
        v-model="pgnInput"
        placeholder="Paste PGN here (example: 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6)"
      />
      <div class="header-actions">
        <button type="button" class="ghost" @click="requestPgnImport">Import PGN</button>
      </div>
    </section>

    <main class="layout">
      <section class="board-area">
        <ChessBoard
          :import-pgn="pgnImportRequest"
          @moves-updated="handleMovesUpdated"
          @pgn-import-status="handlePgnImportStatus"
          @position-updated="handlePositionUpdated"
          @pgn-updated="handlePgnUpdated"
        />
      </section>
      <section class="moves-area">
        <MoveList :moves="moves" />
      </section>

      <section class="sidebar-area">
        <section class="analysis-area">
          <AnalysisPanel
            v-model:depth="analysisDepth"
            v-model:multi-pv="analysisLines"
            :ready="isReady"
            :loading="isAnalyzing"
            :error="lastError"
            :evaluation="evaluation"
            @run-analysis="runAnalysis"
          />
        </section>
        <section class="chat-area">
          <ChatWindow :current-fen="currentFen" :current-pgn="currentPgn" />
        </section>
      </section>
    </main>
  </div>
</template>

<style lang="scss">
.app-shell {
  min-height: 100vh;
  max-width: 1440px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
  display: grid;
  gap: 1.5rem;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 700;
}

h1 {
  margin: 0.35rem 0 0;
  font-size: 1.6rem;
  color: #0f172a;
}

.header-actions {
  display: flex;
  gap: 0.6rem;
}

.header-actions button {
  border-radius: 10px;
  padding: 0.65rem 1rem;
  font-weight: 700;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
}

.header-actions .primary {
  background: linear-gradient(135deg, #22d3ee, #3b82f6);
  color: #0b1021;
  border: none;
}

.header-actions .ghost {
  background: transparent;
}

.header-actions button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto;
  gap: 1rem;
}

.importer {
  display: grid;
  gap: 0.6rem;
  padding: 1rem;
  border: 1px solid #dbe2ea;
  border-radius: 12px;
  background: #ffffff;
}

.importer label {
  font-weight: 700;
  font-size: 0.9rem;
  color: #0f172a;
}

.importer textarea {
  min-height: 120px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 0.7rem;
  font: inherit;
}

.importer-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.import-status {
  margin: 0;
  font-size: 0.9rem;
}

.import-status.success {
  color: #166534;
}

.import-status.error {
  color: #b91c1c;
}

.board-area {
  grid-column: 1;
}

.sidebar-area {
  grid-column: 1;
  grid-row: auto;
  display: grid;
  gap: 1rem;
}

.moves-area,
.chat-area,
.analysis-area {
  padding: 0 1rem;
}

.analysis-area {
  grid-column: 1;
  min-height: 0;
  // overflow: auto;
}

.moves-area {
  grid-column: 1;
  // padding: 0 1rem;
}

.chat-area {
  grid-column: 1;
  max-height: 400px;
  overflow: auto;
}

.analysis-area .analysis-panel {
  height: 100%;
  background: #0b1021;
  color: #f8fafc;
}

.chat-area .chat-window {
  height: 100%;
}

@media (min-width: 961px) {
  .layout {
    grid-template-columns: 2fr 1fr;
  }

  .board-area {
    grid-column: 1;
    grid-row: 1;
  }

  .sidebar-area {
    grid-column: 2;
    grid-row: 1;
    grid-template-rows: minmax(0, 1fr) minmax(0, 1fr);
    align-self: stretch;
    min-height: 0;
  }

  .analysis-area {
    // max-height: 450px;
  }

  .analysis-area .analysis-panel {
    max-height: none;
  }

  .chat-area {
    max-height: 408px;
    min-height: 0;
  }

  .moves-area {
    grid-column: 1 / span 2;
    padding-right: 0rem;
  }

  .moves-area,
  .chat-area,
  .analysis-area {
    padding: 0rem;
  }
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar-area,
  .analysis-area,
  .moves-area,
  .chat-area,
  .board-area {
    grid-column: 1;
    grid-row: auto;
  }

  .header-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}
</style>
