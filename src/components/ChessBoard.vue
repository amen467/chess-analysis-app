<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Chess } from 'chess.js'
import type { Move as ChessMove, Square } from 'chess.js'
import '@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css'

interface BoardApi {
  position: (fen: string, useAnimation?: boolean) => void
  orientation?: (orientation?: 'white' | 'black' | 'flip') => 'white' | 'black'
  destroy?: () => void
  resize?: () => void
}

type PieceTheme = string | ((piece: string) => string)
type ThemeWindow = Window & {
  [key: string]: unknown
  $?: unknown
  jQuery?: unknown
  Chessboard?: (elementOrId: string | HTMLElement, config: unknown) => BoardApi
}

type BoardColor = 'w' | 'b'
type PromotionPiece = 'q' | 'r' | 'b' | 'n'

interface PlayedMove {
  from: string
  to: string
  san: string
  promotion?: PromotionPiece
}

interface PgnImportPayload {
  id: number
  text: string
}

interface JumpToPlyPayload {
  id: number
  ply: number
}

interface PendingPromotion {
  source: Square
  target: Square
  options: PromotionPiece[]
}

const props = defineProps<{
  importPgn?: PgnImportPayload
  jumpToPly?: JumpToPlyPayload
}>()

const emit = defineEmits<{
  'moves-updated': [moves: string[]]
  'pgn-import-status': [payload: { ok: boolean; message: string }]
  'position-updated': [fen: string]
  'pgn-updated': [pgn: string]
}>()

const boardContainerEl = ref<HTMLElement | null>(null)
const boardEl = ref<HTMLElement | null>(null)
const game = new Chess()
const playedMoves = ref<PlayedMove[]>([])
const currentPly = ref(0)
const boardOrientation = ref<'white' | 'black'>('white')
const pendingPromotion = ref<PendingPromotion | null>(null)
let board: BoardApi | null = null
let boardResizeObserver: ResizeObserver | null = null
let selectedSourceSquare: Square | null = null
let highlightedTargetSquares: Square[] = []
let dragHoverSquare: Square | null = null
const onWindowResize = () => {
  board?.resize?.()
}

const THEME_SCRIPT_ID = 'chessboardjs-themes-script'
const THEME_SCRIPT_SRC = '/vendor/chessboardjs-themes.js'
const PIECE_THEME_GLOBALS = ['uscf_theme', 'uscf_piece_theme']
const BOARD_THEME_GLOBAL = 'uscf_board_theme'

const getPieceTheme = (globalWindow: ThemeWindow) => {
  for (const key of PIECE_THEME_GLOBALS) {
    const value = globalWindow[key]
    if (typeof value === 'string' || typeof value === 'function') {
      return value as PieceTheme
    }
  }
  return null
}

const getBoardTheme = (globalWindow: ThemeWindow) => {
  const value = globalWindow[BOARD_THEME_GLOBAL]
  return value ?? null
}

const applyBoardTheme = (theme: unknown) => {
  if (!boardEl.value) return

  const [light, dark] = Array.isArray(theme) ? theme : []
  const lightColor = typeof light === 'string' ? light : null
  const darkColor = typeof dark === 'string' ? dark : null

  if (!lightColor || !darkColor) {
    boardEl.value.style.removeProperty('--board-light-square')
    boardEl.value.style.removeProperty('--board-dark-square')
    boardEl.value.style.removeProperty('--board-light-notation')
    boardEl.value.style.removeProperty('--board-dark-notation')
    return
  }

  boardEl.value.style.setProperty('--board-light-square', lightColor)
  boardEl.value.style.setProperty('--board-dark-square', darkColor)
  boardEl.value.style.setProperty('--board-light-notation', darkColor)
  boardEl.value.style.setProperty('--board-dark-notation', lightColor)
}

const ensureThemeLibrary = async () => {
  const existing = document.getElementById(THEME_SCRIPT_ID) as HTMLScriptElement | null
  if (existing) {
    if (existing.dataset.loaded === 'true') return true
    await new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Theme script failed to load.')), {
        once: true,
      })
    })
    return true
  }

  const script = document.createElement('script')
  script.id = THEME_SCRIPT_ID
  script.src = THEME_SCRIPT_SRC
  script.async = true
  script.dataset.loaded = 'false'

  const loaded = await new Promise<boolean>((resolve) => {
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve(true)
    }
    script.onerror = () => resolve(false)
    document.head.appendChild(script)
  })

  return loaded
}

const syncBoardToCursor = () => {
  pendingPromotion.value = null
  clearSelectedSquare()
  game.reset()
  for (let i = 0; i < currentPly.value; i += 1) {
    const move = playedMoves.value[i]
    if (!move) break
    game.move(move)
  }

  board?.position(game.fen(), false)
}

const isBoardSquare = (value: string): value is Square => /^[a-h][1-8]$/.test(value)

const getSquareElement = (square: Square) => {
  if (!boardEl.value) return null
  return boardEl.value.querySelector(`[data-square="${square}"]`) as HTMLElement | null
}

const clearLegalTargetSquares = () => {
  for (const square of highlightedTargetSquares) {
    getSquareElement(square)?.classList.remove('legal-target')
  }
  highlightedTargetSquares = []
}

const clearDragHoverSquare = () => {
  if (!dragHoverSquare) return
  getSquareElement(dragHoverSquare)?.classList.remove('drag-legal-target')
  dragHoverSquare = null
}

const isPromotionPiece = (value: string | undefined): value is PromotionPiece => {
  return value === 'q' || value === 'r' || value === 'b' || value === 'n'
}

const getLegalMovesFromSquare = (source: Square) => {
  return game.moves({ square: source, verbose: true }) as ChessMove[]
}

const setLegalTargetSquares = (source: Square) => {
  clearLegalTargetSquares()
  const targets = new Set<Square>()
  for (const move of getLegalMovesFromSquare(source)) {
    targets.add(move.to)
  }
  highlightedTargetSquares = [...targets]
  for (const square of highlightedTargetSquares) {
    getSquareElement(square)?.classList.add('legal-target')
  }
}

const getPromotionOptions = (source: Square, target: Square): PromotionPiece[] => {
  const promotionMoves = getLegalMovesFromSquare(source).filter(
    (move) => move.to === target && isPromotionPiece(move.promotion),
  )
  if (!promotionMoves.length) return []
  const promotionOrder: PromotionPiece[] = ['q', 'r', 'b', 'n']
  const available = new Set<PromotionPiece>(
    promotionMoves.map((move) => move.promotion as PromotionPiece),
  )
  return promotionOrder.filter((piece) => available.has(piece))
}

const clearSelectedSquare = () => {
  clearLegalTargetSquares()
  clearDragHoverSquare()
  if (!selectedSourceSquare) return
  getSquareElement(selectedSourceSquare)?.classList.remove('click-selected')
  selectedSourceSquare = null
}

const selectSquare = (square: Square) => {
  clearSelectedSquare()
  selectedSourceSquare = square
  getSquareElement(square)?.classList.add('click-selected')
  setLegalTargetSquares(square)
}

const squareFromEventTarget = (target: EventTarget | null): Square | null => {
  if (!(target instanceof Element)) return null
  const squareEl = target.closest('.square-55d63')
  if (!(squareEl instanceof HTMLElement)) return null
  if (!boardEl.value?.contains(squareEl)) return null
  const square = squareEl.dataset.square ?? null
  return square && isBoardSquare(square) ? square : null
}

const emitMoveList = () => {
  emit(
    'moves-updated',
    playedMoves.value.map((playedMove) => playedMove.san),
  )
}

const emitPosition = () => {
  emit('position-updated', game.fen())
}

const emitPgn = () => {
  emit('pgn-updated', game.pgn())
}

const syncAndEmitPosition = () => {
  syncBoardToCursor()
  emitPosition()
  emitPgn()
}

const setPly = (nextPly: number) => {
  const clampedPly = Math.max(0, Math.min(nextPly, playedMoves.value.length))
  if (clampedPly === currentPly.value) return false
  currentPly.value = clampedPly
  syncAndEmitPosition()
  return true
}

const applyMove = (source: Square, target: Square, promotion?: PromotionPiece) => {
  let move: ChessMove
  try {
    move = game.move({
      from: source,
      to: target,
      promotion,
    }) as ChessMove
  } catch {
    return false
  }

  if (currentPly.value < playedMoves.value.length) {
    playedMoves.value = playedMoves.value.slice(0, currentPly.value)
  }

  playedMoves.value.push({
    from: source,
    to: target,
    san: move.san,
    promotion: move.promotion as PromotionPiece | undefined,
  })
  currentPly.value = playedMoves.value.length
  emitMoveList()
  emitPosition()
  emitPgn()
  return true
}

const openPromotionPicker = (source: Square, target: Square, options: PromotionPiece[]) => {
  pendingPromotion.value = { source, target, options }
}

const closePromotionPicker = () => {
  pendingPromotion.value = null
}

const resolveMoveAttempt = (source: Square, target: Square) => {
  const promotionOptions = getPromotionOptions(source, target)
  if (!promotionOptions.length) {
    const moved = applyMove(source, target)
    if (!moved) return false
    return true
  }
  openPromotionPicker(source, target, promotionOptions)
  return 'promotion'
}

const confirmPromotion = (piece: PromotionPiece) => {
  if (!pendingPromotion.value) return
  const { source, target, options } = pendingPromotion.value
  if (!options.includes(piece)) return
  const moved = applyMove(source, target, piece)
  closePromotionPicker()
  clearSelectedSquare()
  if (moved) {
    board?.position(game.fen(), false)
  }
}

const cancelPromotion = () => {
  closePromotionPicker()
  clearSelectedSquare()
}

const promotionLabel = (piece: PromotionPiece) => {
  if (piece === 'q') return 'Queen'
  if (piece === 'r') return 'Rook'
  if (piece === 'b') return 'Bishop'
  return 'Knight'
}

const applyImportedPgn = (pgnText: string) => {
  const trimmed = pgnText.trim()
  if (!trimmed) {
    emit('pgn-import-status', { ok: false, message: 'Paste a PGN before importing.' })
    return
  }

  const importer = new Chess()
  try {
    importer.loadPgn(trimmed)
  } catch {
    emit('pgn-import-status', { ok: false, message: 'Invalid PGN. Please check the format.' })
    return
  }

  const verboseMoves = importer.history({ verbose: true })
  playedMoves.value = verboseMoves.map((move) => ({
    from: move.from,
    to: move.to,
    san: move.san,
    promotion: move.promotion as PromotionPiece | undefined,
  }))
  currentPly.value = playedMoves.value.length
  syncBoardToCursor()
  emitMoveList()
  emitPosition()
  emitPgn()
  emit('pgn-import-status', {
    ok: true,
    message: `Imported ${playedMoves.value.length} move${playedMoves.value.length === 1 ? '' : 's'}.`,
  })
}

const isTypingElement = (target: EventTarget | null) => {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || el.isContentEditable
}

const onKeyDown = (event: KeyboardEvent) => {
  if (isTypingElement(event.target)) return

  if (event.key === 'ArrowLeft') {
    const moved = setPly(currentPly.value - 1)
    if (moved) {
      event.preventDefault()
    }
    return
  }

  if (event.key === 'ArrowRight') {
    const moved = setPly(currentPly.value + 1)
    if (moved) {
      event.preventDefault()
    }
  }
}

const goToStart = () => {
  setPly(0)
}

const goBack = () => {
  setPly(currentPly.value - 1)
}

const goForward = () => {
  setPly(currentPly.value + 1)
}

const goToEnd = () => {
  setPly(playedMoves.value.length)
}

const toggleBoardOrientation = () => {
  const next = board?.orientation?.('flip')
  if (!next) return
  boardOrientation.value = next
  clearSelectedSquare()
}

const onBoardPointerUp = (event: PointerEvent) => {
  if (!boardEl.value || !board) return
  if (pendingPromotion.value) return
  const clickedSquare = squareFromEventTarget(event.target)
  if (!clickedSquare) {
    clearSelectedSquare()
    return
  }

  if (game.isGameOver()) {
    clearSelectedSquare()
    return
  }

  const clickedPiece = game.get(clickedSquare)
  const isOwnPiece = Boolean(clickedPiece && clickedPiece.color === game.turn())

  if (!selectedSourceSquare) {
    if (isOwnPiece) {
      selectSquare(clickedSquare)
    } else {
      clearSelectedSquare()
    }
    return
  }

  if (clickedSquare === selectedSourceSquare) {
    clearSelectedSquare()
    return
  }

  if (isOwnPiece) {
    selectSquare(clickedSquare)
    return
  }

  const moveResult = resolveMoveAttempt(selectedSourceSquare, clickedSquare)
  if (moveResult === true) {
    clearSelectedSquare()
    board.position(game.fen(), false)
    return
  }
  if (moveResult === false) {
    clearSelectedSquare()
  }
}

const onGlobalPointerDown = (event: PointerEvent) => {
  if (!selectedSourceSquare) return
  const target = event.target
  if (!(target instanceof Node)) {
    clearSelectedSquare()
    return
  }
  if (!boardEl.value?.contains(target)) {
    clearSelectedSquare()
  }
}

const isLegalTargetForSource = (source: Square, target: Square) => {
  return getLegalMovesFromSquare(source).some((move) => move.to === target)
}

onMounted(async () => {
  if (!boardEl.value) return
  emit('moves-updated', [])

  // chessboard.js expects jQuery and exposes a global constructor.
  const jqueryModule = await import('jquery')
  const jquery = jqueryModule.default

  const globalWindow = window as unknown as ThemeWindow

  globalWindow.$ = jquery
  globalWindow.jQuery = jquery

  await import('@chrisoakman/chessboardjs/dist/chessboard-1.0.0.js')
  const themeLibraryLoaded = await ensureThemeLibrary()

  if (!globalWindow.Chessboard) return

  const onDragStart = (_source: string, piece: string) => {
    if (game.isGameOver()) return false

    const turn = game.turn() as BoardColor
    const pieceColor = piece[0] as BoardColor
    const canDrag = turn === pieceColor
    if (canDrag) {
      clearSelectedSquare()
    }
    return canDrag
  }

  const onDrop = (source: string, target: string) => {
    clearDragHoverSquare()
    // Cancel if user drops outside the board or back on the origin square.
    if (!isBoardSquare(source)) return 'snapback'
    if (target === 'offboard') {
      clearSelectedSquare()
      return 'snapback'
    }

    if (source === target) {
      const clickedPiece = game.get(source)
      if (clickedPiece && clickedPiece.color === game.turn()) {
        selectSquare(source)
      } else {
        clearSelectedSquare()
      }
      return 'snapback'
    }

    if (!isBoardSquare(source) || !isBoardSquare(target)) return 'snapback'
    const moveResult = resolveMoveAttempt(source, target)
    if (moveResult === 'promotion') return 'snapback'
    if (moveResult !== true) return 'snapback'
    clearSelectedSquare()

    return undefined
  }

  const onDragMove = (location: string, _prev: string, source: string) => {
    clearDragHoverSquare()
    if (!isBoardSquare(location) || !isBoardSquare(source)) return
    if (!isLegalTargetForSource(source, location)) return
    dragHoverSquare = location
    getSquareElement(location)?.classList.add('drag-legal-target')
  }

  const activePieceTheme = getPieceTheme(globalWindow)
  const activeBoardTheme = getBoardTheme(globalWindow)
  applyBoardTheme(activeBoardTheme)

  const boardConfig: Record<string, unknown> = {
    draggable: true,
    onDragStart,
    onDragMove,
    onDrop,
    onSnapEnd: () => board?.position(game.fen(), false),
    position: 'start',
    showNotation: true,
    pieceTheme: activePieceTheme || '/chesspieces/wikipedia/{piece}.png',
  }

  if (activeBoardTheme != null) {
    boardConfig.boardTheme = activeBoardTheme
  }

  if (!themeLibraryLoaded) {
    console.warn(`Theme library not found at ${THEME_SCRIPT_SRC}; using default board assets.`)
  } else if (!activePieceTheme) {
    console.warn(`Theme globals not found (${PIECE_THEME_GLOBALS.join(', ')}); using defaults.`)
  }

  board = globalWindow.Chessboard(boardEl.value, boardConfig)
  const initialOrientation = board.orientation?.()
  if (initialOrientation) {
    boardOrientation.value = initialOrientation
  }
  requestAnimationFrame(() => {
    board?.resize?.()
  })

  window.addEventListener('resize', onWindowResize)

  if (typeof ResizeObserver !== 'undefined' && boardContainerEl.value) {
    boardResizeObserver = new ResizeObserver(() => {
      board?.resize?.()
    })
    boardResizeObserver.observe(boardContainerEl.value)
  }

  if (props.importPgn?.text) {
    applyImportedPgn(props.importPgn.text)
  } else {
    emitPosition()
    emitPgn()
  }

  boardEl.value.addEventListener('pointerup', onBoardPointerUp)
  window.addEventListener('pointerdown', onGlobalPointerDown)
  window.addEventListener('keydown', onKeyDown)
})

watch(
  () => props.importPgn?.id,
  () => {
    if (!props.importPgn || !board) return
    applyImportedPgn(props.importPgn.text)
  },
)

watch(
  () => props.jumpToPly?.id,
  () => {
    if (!props.jumpToPly || !board) return
    setPly(props.jumpToPly.ply)
  },
)

onBeforeUnmount(() => {
  clearSelectedSquare()
  boardEl.value?.removeEventListener('pointerup', onBoardPointerUp)
  window.removeEventListener('pointerdown', onGlobalPointerDown)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onWindowResize)
  boardResizeObserver?.disconnect()
  boardResizeObserver = null
  board?.destroy?.()
  board = null
})
</script>

<template>
  <section ref="boardContainerEl" class="chess-board">
    <div class="board-stage">
      <div ref="boardEl" class="board-root"></div>
      <div v-if="pendingPromotion" class="promotion-overlay">
        <div class="promotion-picker" role="dialog" aria-label="Choose promotion piece">
          <p class="promotion-title">Promote to:</p>
          <div class="promotion-options">
            <button
              v-for="piece in pendingPromotion.options"
              :key="piece"
              type="button"
              @click="confirmPromotion(piece)"
            >
              {{ promotionLabel(piece) }}
            </button>
          </div>
          <button type="button" class="promotion-cancel" @click="cancelPromotion">Cancel</button>
        </div>
      </div>
    </div>
    <nav class="board-nav" aria-label="Move navigation">
      <button
        type="button"
        class="flip-button"
        :title="boardOrientation === 'white' ? 'View from Black side' : 'View from White side'"
        @click="toggleBoardOrientation"
      >
        Flip
      </button>
      <div class="nav-arrows">
      <button
        type="button"
        :disabled="currentPly === 0"
        aria-label="Go to first move"
        title="Go to first move"
        @click="goToStart"
      >
        <span aria-hidden="true">&lt;&lt;</span>
      </button>
      <button
        type="button"
        :disabled="currentPly === 0"
        aria-label="Go to previous move"
        title="Go to previous move (Left Arrow)"
        @click="goBack"
      >
        <span aria-hidden="true">&lt;</span>
      </button>
      <button
        type="button"
        :disabled="currentPly >= playedMoves.length"
        aria-label="Go to next move"
        title="Go to next move (Right Arrow)"
        @click="goForward"
      >
        <span aria-hidden="true">&gt;</span>
      </button>
      <button
        type="button"
        :disabled="currentPly >= playedMoves.length"
        aria-label="Go to last move"
        title="Go to last move"
        @click="goToEnd"
      >
        <span aria-hidden="true">&gt;&gt;</span>
      </button>
      </div>
    </nav>
  </section>
</template>

<style scoped lang="scss">
.chess-board {
  display: grid;
  place-items: center;
  width: 100%;
  min-width: 0;
  gap: 0.75rem;
}

.board-stage {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  position: relative;
}

.board-root {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  --board-light-square: #f0d9b5;
  --board-dark-square: #b58863;
  --board-light-notation: #b58863;
  --board-dark-notation: #f0d9b5;
}

.board-root :deep(.white-1e1d7) {
  background-color: var(--board-light-square) !important;
  color: var(--board-light-notation) !important;
}

.board-root :deep(.black-3c85d) {
  background-color: var(--board-dark-square) !important;
  color: var(--board-dark-notation) !important;
}

.board-root :deep(.square-55d63.click-selected) {
  box-shadow: inset 0 0 0 3px var(--color-focus);
}

.board-root :deep(.square-55d63.legal-target) {
  box-shadow: inset 0 0 0 3px rgba(56, 189, 248, 0.6);
}

.board-root :deep(.highlight1-32417),
.board-root :deep(.highlight2-9c5d2) {
  box-shadow: none !important;
}

.board-root :deep(.highlight1-32417),
.board-root :deep(.square-55d63.drag-legal-target) {
  box-shadow: inset 0 0 0 3px var(--color-focus) !important;
}

.promotion-picker {
  width: min(88%, 420px);
  padding: 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--color-border-muted);
  background: var(--color-surface-dark);
  color: var(--color-text-inverse);
  display: grid;
  gap: 0.6rem;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.45);
}

.promotion-overlay {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgba(15, 23, 42, 0.45);
  border-radius: 8px;
  z-index: 2;
}

.promotion-title {
  margin: 0;
  font-weight: 700;
}

.promotion-options {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.promotion-options button,
.promotion-cancel {
  border: 1px solid var(--color-border-muted);
  border-radius: 8px;
  padding: 0.45rem 0.65rem;
  background: var(--color-surface-light);
  color: var(--color-text-primary);
  font-weight: 700;
  cursor: pointer;
  width: 100%;
}

.promotion-cancel {
  background: transparent;
  color: var(--color-text-inverse);
}

.board-nav {
  width: 100%;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.75rem;
}

.nav-arrows {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.flip-button {
  min-width: 5.5rem;
  font-size: 1rem;
}

.board-nav button {
  min-width: 4.5rem;
  min-height: 2.75rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--color-border-muted);
  border-radius: 8px;
  background: var(--color-surface-light);
  color: var(--color-text-primary);
  font-weight: 700;
  cursor: pointer;
  font-size: 1.5rem;
}

.board-nav button:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
}

.board-nav button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 560px) {
  .chess-board {
    padding: 0.5rem;
    gap: 0.5rem;
  }

  .board-nav {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .flip-button {
    justify-self: start;
  }

  .nav-arrows {
    justify-content: flex-start;
    gap: 0.4rem;
  }

  .board-nav button {
    min-width: 2.75rem;
    min-height: 2.75rem;
    padding: 0.25rem 0.35rem;
    font-size: 1rem;
  }
}
</style>
