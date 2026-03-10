import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStockfish } from '@/composables/useStockfish'

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
const flushMacroTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

class MockWorker {
  static instances: MockWorker[] = []

  posted: string[] = []
  terminated = false
  private messageListeners = new Set<(event: MessageEvent<string>) => void>()
  private errorListeners = new Set<(event: ErrorEvent) => void>()

  constructor(_url: string | URL) {
    MockWorker.instances.push(this)
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === 'message') {
      this.messageListeners.add(listener as (event: MessageEvent<string>) => void)
    }
    if (type === 'error') {
      this.errorListeners.add(listener as (event: ErrorEvent) => void)
    }
  }

  removeEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    if (type === 'message') {
      this.messageListeners.delete(listener as (event: MessageEvent<string>) => void)
    }
    if (type === 'error') {
      this.errorListeners.delete(listener as (event: ErrorEvent) => void)
    }
  }

  postMessage(message: string) {
    this.posted.push(message)
  }

  terminate() {
    this.terminated = true
  }

  emitMessage(data: string) {
    for (const listener of this.messageListeners) {
      listener({ data } as MessageEvent<string>)
    }
  }

  emitError(message = 'Worker crashed') {
    for (const listener of this.errorListeners) {
      listener({ message } as ErrorEvent)
    }
  }
}

describe('useStockfish', () => {
  beforeEach(() => {
    MockWorker.instances = []
    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('waits for both uciok and readyok before becoming ready', async () => {
    const stockfish = useStockfish()
    const startPromise = stockfish.start()

    const worker = MockWorker.instances[0]
    expect(worker).toBeDefined()
    expect(worker?.posted).toContain('uci')

    worker?.emitMessage('readyok')
    expect(stockfish.isReady.value).toBe(false)

    worker?.emitMessage('uciok')
    expect(worker?.posted).toContain('isready')
    worker?.emitMessage('readyok')

    await startPromise
    expect(stockfish.isReady.value).toBe(true)
  })

  it('parses analysis lines and resolves on bestmove', async () => {
    const stockfish = useStockfish()
    const analyzePromise = stockfish.analyzePosition(INITIAL_FEN, { depth: 14, multiPv: 2 })

    const worker = MockWorker.instances[0]
    expect(worker).toBeDefined()

    worker?.emitMessage('uciok')
    worker?.emitMessage('readyok')
    await flushMacroTask()

    expect(worker?.posted).toContain('setoption name MultiPV value 2')
    expect(worker?.posted).toContain('go depth 14')

    worker?.emitMessage('info depth 14 multipv 1 score cp 34 pv e2e4 e7e5 g1f3')
    worker?.emitMessage('info depth 14 multipv 2 score cp 12 pv d2d4 d7d5 c2c4')
    worker?.emitMessage('bestmove e2e4')

    const evaluation = await analyzePromise
    expect(evaluation.depth).toBe(14)
    expect(evaluation.centipawns).toBe(34)
    expect(evaluation.bestMoves).toHaveLength(2)
    expect(evaluation.bestMoves[0]?.line[0]).toBe('e4')
    expect(stockfish.isAnalyzing.value).toBe(false)
  })

  it('fails startup with a timeout instead of hanging forever', async () => {
    vi.useFakeTimers()
    const stockfish = useStockfish()

    const startPromise = stockfish.start()
    const startErrorPromise = startPromise.then(
      () => null,
      (error) => error as Error,
    )
    const worker = MockWorker.instances[0]
    expect(worker).toBeDefined()

    await vi.advanceTimersByTimeAsync(15000)
    const startError = await startErrorPromise
    expect(startError?.message).toBe('Stockfish startup timed out after 15s.')
    expect(stockfish.isReady.value).toBe(false)
    expect(stockfish.lastError.value).toBe('Stockfish startup timed out after 15s.')
    expect(worker?.terminated).toBe(true)
  })

  it('allows canceling an in-flight analysis', async () => {
    const stockfish = useStockfish()
    const analyzePromise = stockfish.analyzePosition(INITIAL_FEN, { depth: 18, multiPv: 1 })
    const analyzeErrorPromise = analyzePromise.then(
      () => null,
      (error) => error as Error,
    )

    const worker = MockWorker.instances[0]
    expect(worker).toBeDefined()
    worker?.emitMessage('uciok')
    worker?.emitMessage('readyok')
    await flushMacroTask()

    stockfish.cancelAnalysis()

    const analyzeError = await analyzeErrorPromise
    expect(analyzeError?.message).toBe('Analysis canceled by user.')
    expect(stockfish.isAnalyzing.value).toBe(false)
    expect(stockfish.lastError.value).toBeNull()
    expect(worker?.posted[worker.posted.length - 1]).toBe('stop')
  })

  it('times out stalled analysis requests', async () => {
    vi.useFakeTimers()
    const stockfish = useStockfish()
    const analyzePromise = stockfish.analyzePosition(INITIAL_FEN, { depth: 20, multiPv: 2 })
    const analyzeErrorPromise = analyzePromise.then(
      () => null,
      (error) => error as Error,
    )

    const worker = MockWorker.instances[0]
    expect(worker).toBeDefined()
    worker?.emitMessage('uciok')
    worker?.emitMessage('readyok')
    await Promise.resolve()

    await vi.advanceTimersByTimeAsync(45000)
    const analyzeError = await analyzeErrorPromise
    expect(analyzeError?.message).toBe('Analysis timed out after 45s.')
    expect(stockfish.isAnalyzing.value).toBe(false)
    expect(stockfish.lastError.value).toBe('Analysis timed out after 45s.')
  })

  it('keeps isAnalyzing true when replacing an in-flight analysis', async () => {
    const stockfish = useStockfish()
    const firstAnalysis = stockfish.analyzePosition(INITIAL_FEN, { depth: 12, multiPv: 1 })

    const worker = MockWorker.instances[0]
    expect(worker).toBeDefined()
    worker?.emitMessage('uciok')
    worker?.emitMessage('readyok')
    await flushMacroTask()
    expect(stockfish.isAnalyzing.value).toBe(true)

    const firstAnalysisError = firstAnalysis.then(
      () => null,
      (error) => error as Error,
    )
    const secondAnalysis = stockfish.analyzePosition(INITIAL_FEN, { depth: 13, multiPv: 1 })
    await flushMacroTask()

    expect((await firstAnalysisError)?.message).toBe('Analysis replaced by a newer request.')
    expect(stockfish.isAnalyzing.value).toBe(true)
    expect(worker?.posted).toContain('go depth 13')

    worker?.emitMessage('info depth 13 multipv 1 score cp 20 pv e2e4 e7e5')
    worker?.emitMessage('bestmove e2e4')
    await secondAnalysis

    expect(stockfish.isAnalyzing.value).toBe(false)
  })
})
