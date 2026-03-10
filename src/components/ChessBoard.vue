<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Chess } from 'chess.js'
import '@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css'

interface BoardApi {
  position: (fen: string, useAnimation?: boolean) => void
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
let board: BoardApi | null = null
let boardResizeObserver: ResizeObserver | null = null
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
  game.reset()
  for (let i = 0; i < currentPly.value; i += 1) {
    const move = playedMoves.value[i]
    if (!move) break
    game.move(move)
  }

  board?.position(game.fen(), false)
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
    if (currentPly.value === 0) return
    event.preventDefault()
    currentPly.value -= 1
    syncBoardToCursor()
    emitPosition()
    emitPgn()
    return
  }

  if (event.key === 'ArrowRight') {
    if (currentPly.value >= playedMoves.value.length) return
    event.preventDefault()
    currentPly.value += 1
    syncBoardToCursor()
    emitPosition()
    emitPgn()
  }
}

const goToStart = () => {
  if (currentPly.value === 0) return
  currentPly.value = 0
  syncBoardToCursor()
  emitPosition()
  emitPgn()
}

const goBack = () => {
  if (currentPly.value === 0) return
  currentPly.value -= 1
  syncBoardToCursor()
  emitPosition()
  emitPgn()
}

const goForward = () => {
  if (currentPly.value >= playedMoves.value.length) return
  currentPly.value += 1
  syncBoardToCursor()
  emitPosition()
  emitPgn()
}

const goToEnd = () => {
  if (currentPly.value >= playedMoves.value.length) return
  currentPly.value = playedMoves.value.length
  syncBoardToCursor()
  emitPosition()
  emitPgn()
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
    return turn === pieceColor
  }

  const onDrop = (source: string, target: string) => {
    // Cancel if user drops outside the board or back on the origin square.
    if (target === 'offboard' || source === target) return 'snapback'

    const move = game.move({
      from: source,
      to: target,
      promotion: 'q',
    })

    if (!move) return 'snapback'

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

    return undefined
  }

  const activePieceTheme = getPieceTheme(globalWindow)
  const activeBoardTheme = getBoardTheme(globalWindow)
  applyBoardTheme(activeBoardTheme)

  const boardConfig: Record<string, unknown> = {
    draggable: true,
    onDragStart,
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
    const clampedPly = Math.max(0, Math.min(props.jumpToPly.ply, playedMoves.value.length))
    currentPly.value = clampedPly
    syncBoardToCursor()
    emitPosition()
    emitPgn()
  },
)

onBeforeUnmount(() => {
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
    <div ref="boardEl" class="board-root"></div>
    <div class="board-nav" aria-label="Move navigation">
      <button type="button" :disabled="currentPly === 0" @click="goToStart">&lt;&lt;</button>
      <button type="button" :disabled="currentPly === 0" @click="goBack">&lt;</button>
      <button type="button" :disabled="currentPly >= playedMoves.length" @click="goForward">
        &gt;
      </button>
      <button type="button" :disabled="currentPly >= playedMoves.length" @click="goToEnd">
        &gt;&gt;
      </button>
    </div>
  </section>
</template>

<style scoped lang="scss">
.chess-board {
  display: grid;
  place-items: center;
  width: 100%;
  min-width: 0;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 12px;
  background: #ffffff;
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

.board-nav {
  width: 100%;
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.board-nav button {
  min-width: 4.5rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #ffffff;
  color: #0f172a;
  font-weight: 700;
  cursor: pointer;
  font-size: 1.5rem;
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
    gap: 0.4rem;
  }

  .board-nav button {
    min-width: 2.6rem;
    padding: 0.25rem 0.35rem;
    font-size: 1rem;
  }
}
</style>
