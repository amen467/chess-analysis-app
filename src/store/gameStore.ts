import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useChat } from '@/composables/useChat'
import { useStockfish } from '@/composables/useStockfish'

interface PgnImportRequest {
  id: number
  text: string
}

interface JumpToPlyRequest {
  id: number
  ply: number
}

interface PgnImportStatus {
  ok: boolean
  message: string
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const useGameStore = defineStore('game', () => {
  const engineEnabled = ref(false)
  const moves = ref<string[]>([])
  const pgnInput = ref('')
  const pgnImportRequest = ref<PgnImportRequest>()
  const jumpToPlyRequest = ref<JumpToPlyRequest>()
  const pgnImportStatus = ref<PgnImportStatus>()
  const currentFen = ref(INITIAL_FEN)
  const currentPgn = ref('')
  const analysisDepth = ref(22)
  const analysisLines = ref(5)

  const {
    isReady,
    isAnalyzing,
    evaluation,
    lastError: analysisError,
    start,
    cancelAnalysis,
    destroy,
    analyzePosition,
  } = useStockfish()

  const {
    messages,
    sending,
    send,
    cancelSend,
    apiKey,
    loadApiKey,
    saveApiKey,
    clearApiKey,
    unlockApiKey,
    lockApiKey,
    hasStoredEncryptedKey,
    lastError: chatError,
  } = useChat()

  const setMoves = (nextMoves: string[]) => {
    moves.value = nextMoves
  }

  const setPgnImportStatus = (payload: PgnImportStatus) => {
    pgnImportStatus.value = payload
  }

  const setCurrentFen = (fen: string) => {
    currentFen.value = fen
    if (engineEnabled.value) {
      void runAnalysis()
    }
  }

  const setCurrentPgn = (pgn: string) => {
    currentPgn.value = pgn
  }

  const requestPgnImport = () => {
    pgnImportRequest.value = {
      id: Date.now(),
      text: pgnInput.value,
    }
  }

  const requestJumpToPly = (ply: number) => {
    jumpToPlyRequest.value = {
      id: Date.now(),
      ply,
    }
  }

  const runAnalysis = async () => {
    if (!engineEnabled.value) return
    try {
      await analyzePosition(currentFen.value, {
        depth: analysisDepth.value,
        multiPv: analysisLines.value,
      })
    } catch {
      // Error state is exposed by useStockfish.
    }
  }

  const initializeEngine = start
  const teardownEngine = destroy
  const cancelEngineAnalysis = cancelAnalysis

  const setEngineEnabled = async (enabled: boolean) => {
    if (enabled === engineEnabled.value) return

    if (!enabled) {
      engineEnabled.value = false
      destroy()
      return
    }

    engineEnabled.value = true
    try {
      await start()
      await runAnalysis()
    } catch {
      engineEnabled.value = false
      destroy()
    }
  }

  const loadChatState = loadApiKey
  const saveChatApiKey = saveApiKey
  const clearChatApiKey = clearApiKey
  const unlockChatApiKey = unlockApiKey
  const lockChatApiKey = lockApiKey

  const sendChatMessage = async (text: string, includeCurrentPosition: boolean) => {
    return send(text, {
      includeCurrentPosition,
      currentFen: currentFen.value,
      currentPgn: currentPgn.value,
    })
  }

  const cancelChatRequest = cancelSend

  return {
    engineEnabled,
    moves,
    pgnInput,
    pgnImportRequest,
    jumpToPlyRequest,
    pgnImportStatus,
    currentFen,
    currentPgn,
    analysisDepth,
    analysisLines,
    isReady,
    isAnalyzing,
    evaluation,
    analysisError,
    messages,
    sending,
    apiKey,
    hasStoredEncryptedKey,
    chatError,
    setMoves,
    setPgnImportStatus,
    setCurrentFen,
    setCurrentPgn,
    requestPgnImport,
    requestJumpToPly,
    setEngineEnabled,
    runAnalysis,
    cancelEngineAnalysis,
    initializeEngine,
    teardownEngine,
    loadChatState,
    saveChatApiKey,
    clearChatApiKey,
    unlockChatApiKey,
    lockChatApiKey,
    sendChatMessage,
    cancelChatRequest,
  }
})
