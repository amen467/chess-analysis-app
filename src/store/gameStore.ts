import { defineStore } from 'pinia'
import type { EngineEvaluation, MoveEvaluation } from '@/types/chess'

export const useGameStore = defineStore('game', {
  state: () => ({
    fen: '' as string,
    pgn: '' as string,
    moveList: [] as string[],
    evaluation: null as EngineEvaluation | null,
    moveEvaluations: [] as MoveEvaluation[],
  }),
  actions: {
    setFen(fen: string) {
      this.fen = fen
    },
    setPgn(pgn: string) {
      this.pgn = pgn
    },
    setMoveList(moves: string[]) {
      this.moveList = moves
    },
    setEvaluation(payload: EngineEvaluation | null) {
      this.evaluation = payload
    },
    setMoveEvaluations(payload: MoveEvaluation[]) {
      this.moveEvaluations = payload
    },
  },
})
