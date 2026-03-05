import { ref } from 'vue'

// Minimal placeholder for Stockfish WASM integration; swap with real worker wiring later.
export function useStockfish() {
  const isReady = ref(false)
  const bestLines = ref<string[]>([])
  const evaluation = ref<number | null>(null) // centipawns

  const start = () => {
    isReady.value = true
  }

  const analyzePosition = async (_fen: string) => {
    if (!isReady.value) start()
    // Stub: populate with mock data until engine is connected.
    bestLines.value = ['e4 e5', 'd4 d5']
    evaluation.value = 20
  }

  return { isReady, bestLines, evaluation, start, analyzePosition }
}
