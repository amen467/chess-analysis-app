<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Chess } from 'chess.js'
import '@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css'

interface BoardApi {
  position: (fen: string, useAnimation?: boolean) => void
  destroy?: () => void
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

const props = defineProps<{
  importPgn?: PgnImportPayload
}>()

const emit = defineEmits<{
  'moves-updated': [moves: string[]]
  'pgn-import-status': [payload: { ok: boolean; message: string }]
  'position-updated': [fen: string]
}>()

const boardEl = ref<HTMLElement | null>(null)
const game = new Chess()
const playedMoves = ref<PlayedMove[]>([])
const currentPly = ref(0)
let board: BoardApi | null = null

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

const applyImportedPgn = (pgnText: string) => {
  const trimmed = pgnText.trim()
  if (!trimmed) {
    emit('pgn-import-status', { ok: false, message: 'Paste a PGN before importing.' })
    return
  }

  const importer = new Chess()
  try {
    importer.loadPgn(trimmed)
  } catch (_error) {
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
    return
  }

  if (event.key === 'ArrowRight') {
    if (currentPly.value >= playedMoves.value.length) return
    event.preventDefault()
    currentPly.value += 1
    syncBoardToCursor()
    emitPosition()
  }
}

onMounted(async () => {
  if (!boardEl.value) return
  emit('moves-updated', [])

  // chessboard.js expects jQuery and exposes a global constructor.
  const jqueryModule = await import('jquery')
  const jquery = jqueryModule.default

  const globalWindow = window as Window & {
    $?: typeof jquery
    jQuery?: typeof jquery
    Chessboard?: (elementOrId: string | HTMLElement, config: unknown) => BoardApi
  }

  globalWindow.$ = jquery
  globalWindow.jQuery = jquery

  await import('@chrisoakman/chessboardjs/dist/chessboard-1.0.0.js')

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

    return undefined
  }

  board = globalWindow.Chessboard(boardEl.value, {
    draggable: true,
    onDragStart,
    onDrop,
    onSnapEnd: () => board?.position(game.fen(), false),
    position: 'start',
    showNotation: true,
    pieceTheme: '/chesspieces/wikipedia/{piece}.png',
  })

  if (props.importPgn?.text) {
    applyImportedPgn(props.importPgn.text)
  } else {
    emitPosition()
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

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  board?.destroy?.()
  board = null
})
</script>

<template>
  <section class="chess-board">
    <div ref="boardEl" class="board-root"></div>
  </section>
</template>

<style scoped lang="scss">
.chess-board {
  display: grid;
  place-items: center;
  width: 100%;
  padding: 1rem;
  // border: 1px solid #d0d0d0;
  border-radius: 12px;
  background: #ffffff;
}

.board-root {
  width: min(100%, 640px);
}
</style>
