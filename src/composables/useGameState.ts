import { ref } from 'vue'
import type { EngineEvaluation, MoveEvaluation } from '@/types/chess'

// Central place to track current FEN/PGN and evaluations before moving into Pinia.
export function useGameState() {
  const fen = ref('')
  const pgn = ref('')
  const moveList = ref<string[]>([])
  const evaluation = ref<EngineEvaluation | null>(null)
  const moveEvaluations = ref<MoveEvaluation[]>([])

  const setFen = (value: string) => {
    fen.value = value
  }

  const setPgn = (value: string) => {
    pgn.value = value
  }

  return { fen, pgn, moveList, evaluation, moveEvaluations, setFen, setPgn }
}
