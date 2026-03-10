import { computed, ref } from 'vue'
import { Chess } from 'chess.js'
import type { EngineEvaluation, MoveEvaluation } from '@/types/chess'
import stockfishWorkerUrl from 'stockfish/bin/stockfish-18-lite-single.js?url'
import stockfishWasmUrl from 'stockfish/bin/stockfish-18-lite-single.wasm?url'

interface AnalyzeOptions {
  depth?: number
  multiPv?: number
}

interface PendingAnalysis {
  resolve: (value: EngineEvaluation) => void
  reject: (reason?: unknown) => void
}

const START_FEN = 'startpos'
const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const WORKER_STARTUP_TIMEOUT_MS = 15000
const ANALYSIS_TIMEOUT_MS = 30000

export function useStockfish() {
  const isReady = ref(false)
  const isAnalyzing = ref(false)
  const lastError = ref<string | null>(null)
  const bestLines = ref<MoveEvaluation[]>([])
  const evaluation = ref<EngineEvaluation | null>(null)

  let worker: Worker | null = null
  let readyPromise: Promise<void> | null = null
  let readyResolver: (() => void) | null = null
  let readyRejecter: ((reason?: unknown) => void) | null = null
  let workerStartupTimeout: ReturnType<typeof setTimeout> | null = null
  let analysisTimeout: ReturnType<typeof setTimeout> | null = null
  let sawUciOk = false
  let pending: PendingAnalysis | null = null
  let lastRequestedDepth = 12
  let currentAnalysisFen = INITIAL_FEN

  const post = (command: string) => {
    if (!worker) return
    worker.postMessage(command)
  }

  const resetAnalysis = () => {
    bestLines.value = []
    evaluation.value = null
  }

  const clearStartupTimeout = () => {
    if (workerStartupTimeout === null) return
    clearTimeout(workerStartupTimeout)
    workerStartupTimeout = null
  }

  const clearAnalysisTimeout = () => {
    if (analysisTimeout === null) return
    clearTimeout(analysisTimeout)
    analysisTimeout = null
  }

  const resolveReadyState = () => {
    clearStartupTimeout()
    readyResolver?.()
    readyResolver = null
    readyRejecter = null
    readyPromise = null
  }

  const rejectReadyState = (message: string) => {
    clearStartupTimeout()
    readyRejecter?.(new Error(message))
    readyResolver = null
    readyRejecter = null
    readyPromise = null
  }

  const abortPendingAnalysis = (message: string, persistError = false) => {
    clearAnalysisTimeout()
    isAnalyzing.value = false
    if (persistError) {
      lastError.value = message
    }
    if (!pending) return
    pending.reject(new Error(message))
    pending = null
  }

  const terminateWorker = (sendQuit: boolean) => {
    if (!worker) return
    if (sendQuit) {
      try {
        worker.postMessage('quit')
      } catch {
        // Ignore worker post failures during teardown.
      }
    }
    worker.removeEventListener('message', handleWorkerMessage as EventListener)
    worker.removeEventListener('error', handleWorkerError)
    worker.terminate()
    worker = null
  }

  const failWorkerSession = (message: string) => {
    isAnalyzing.value = false
    isReady.value = false
    sawUciOk = false
    lastError.value = message
    rejectReadyState(message)
    abortPendingAnalysis(message)
    terminateWorker(false)
  }

  const parseUciMove = (move: string) => {
    if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move)) return null
    return {
      from: move.slice(0, 2),
      to: move.slice(2, 4),
      promotion: move[4] as 'q' | 'r' | 'b' | 'n' | undefined,
    }
  }

  const uciLineToSan = (fen: string, line: string[]) => {
    const replay = new Chess(fen)
    const sanLine: string[] = []

    for (const uciMove of line) {
      const parsed = parseUciMove(uciMove)
      if (!parsed) break

      const played = replay.move(parsed)
      if (!played) break
      sanLine.push(played.san)
    }

    return sanLine
  }

  const parseInfoLine = (line: string) => {
    if (!line.startsWith('info ')) return

    const depthMatch = line.match(/\bdepth (\d+)/)
    const pvMatch = line.match(/\bpv (.+)$/)
    const multipvMatch = line.match(/\bmultipv (\d+)/)
    const cpMatch = line.match(/\bscore cp (-?\d+)/)
    const mateMatch = line.match(/\bscore mate (-?\d+)/)

    if (!pvMatch || (!cpMatch && !mateMatch)) return

    const depth = depthMatch ? Number(depthMatch[1]) : lastRequestedDepth
    const multipv = multipvMatch ? Number(multipvMatch[1]) : 1
    const pv = pvMatch[1]
    if (!pv) return
    const pvMoves = pv.trim().split(/\s+/)
    const sanLine = uciLineToSan(currentAnalysisFen, pvMoves)
    const leadingMove = sanLine[0] ?? pvMoves[0] ?? ''

    const lineEval: MoveEvaluation = {
      san: leadingMove,
      score: cpMatch ? Number(cpMatch[1]) : Number(mateMatch?.[1] ?? 0),
      line: sanLine.length ? sanLine : pvMoves,
      isMate: Boolean(mateMatch),
    }

    const nextLines = [...bestLines.value]
    const lineIndex = Math.max(multipv - 1, 0)
    nextLines[lineIndex] = lineEval
    bestLines.value = nextLines.filter((entry) => Boolean(entry))

    const principal = bestLines.value[0] ?? null
    evaluation.value = {
      centipawns: principal && !principal.isMate ? principal.score : null,
      mateIn: principal && principal.isMate ? principal.score : null,
      depth,
      bestMoves: bestLines.value,
    }
  }

  const handleWorkerMessage = (event: MessageEvent<string>) => {
    const line = String(event.data ?? '').trim()
    if (!line) return

    if (line === 'uciok') {
      sawUciOk = true
      post('isready')
      return
    }

    if (line === 'readyok') {
      if (!sawUciOk) return
      isReady.value = true
      lastError.value = null
      resolveReadyState()
      return
    }

    parseInfoLine(line)

    if (line.startsWith('bestmove')) {
      clearAnalysisTimeout()
      isAnalyzing.value = false
      if (pending && evaluation.value) {
        pending.resolve(evaluation.value)
      } else if (pending) {
        pending.reject(new Error('Stockfish returned no evaluation.'))
      }
      pending = null
    }
  }

  const handleWorkerError = (event: ErrorEvent) => {
    const detail = event.message?.trim()
    const message = detail ? `Stockfish worker crashed: ${detail}` : 'Stockfish worker crashed.'
    failWorkerSession(message)
  }

  const createWorker = () => {
    const workerSource = `${stockfishWorkerUrl}#${encodeURIComponent(stockfishWasmUrl)}`
    worker = new Worker(workerSource)
    worker.addEventListener('message', handleWorkerMessage as EventListener)
    worker.addEventListener('error', handleWorkerError)

    readyPromise = new Promise<void>((resolve, reject) => {
      readyResolver = resolve
      readyRejecter = reject
    })

    const timeoutSeconds = Math.round(WORKER_STARTUP_TIMEOUT_MS / 1000)
    workerStartupTimeout = setTimeout(() => {
      failWorkerSession(`Stockfish startup timed out after ${timeoutSeconds}s.`)
    }, WORKER_STARTUP_TIMEOUT_MS)

    sawUciOk = false
    isReady.value = false
    post('uci')
  }

  const ensureWorker = async () => {
    if (worker && isReady.value) return

    if (!worker || !readyPromise) {
      createWorker()
    }

    if (!readyPromise) {
      throw new Error('Stockfish failed to create a startup session.')
    }
    await readyPromise
  }

  const start = async () => {
    lastError.value = null
    await ensureWorker()
  }

  const analyzePosition = async (fen: string, options: AnalyzeOptions = {}) => {
    await start()
    resetAnalysis()
    lastError.value = null
    isAnalyzing.value = true

    lastRequestedDepth = options.depth ?? 12
    const multiPv = options.multiPv ?? 3

    if (pending) {
      abortPendingAnalysis('Analysis replaced by a newer request.')
    }

    const position = fen.trim() ? `fen ${fen}` : START_FEN
    currentAnalysisFen = fen.trim() || INITIAL_FEN
    post('stop')
    post('ucinewgame')
    post(`position ${position}`)
    post(`setoption name MultiPV value ${multiPv}`)
    post(`go depth ${lastRequestedDepth}`)
    const timeoutSeconds = Math.round(ANALYSIS_TIMEOUT_MS / 1000)
    analysisTimeout = setTimeout(() => {
      post('stop')
      abortPendingAnalysis(`Analysis timed out after ${timeoutSeconds}s.`, true)
    }, ANALYSIS_TIMEOUT_MS)

    return new Promise<EngineEvaluation>((resolve, reject) => {
      pending = { resolve, reject }
    })
  }

  const cancelAnalysis = () => {
    if (!pending && !isAnalyzing.value) return
    post('stop')
    abortPendingAnalysis('Analysis canceled by user.')
  }

  const stop = () => {
    if (!pending && !isAnalyzing.value) return
    post('stop')
    abortPendingAnalysis('Analysis stopped.')
  }

  const destroy = () => {
    const shutdownMessage = 'Stockfish engine stopped.'
    clearStartupTimeout()
    clearAnalysisTimeout()
    rejectReadyState(shutdownMessage)
    abortPendingAnalysis(shutdownMessage)
    sawUciOk = false
    isAnalyzing.value = false
    isReady.value = false
    if (!worker) return
    post('stop')
    terminateWorker(true)
  }

  const summary = computed(() => ({
    ready: isReady.value,
    analyzing: isAnalyzing.value,
    error: lastError.value,
    evaluation: evaluation.value,
  }))

  return {
    isReady,
    isAnalyzing,
    lastError,
    bestLines,
    evaluation,
    summary,
    start,
    stop,
    cancelAnalysis,
    destroy,
    analyzePosition,
  }
}
