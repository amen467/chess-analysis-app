<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Chess } from 'chess.js'
import '@chrisoakman/chessboardjs/dist/chessboard-1.0.0.min.css'

interface BoardApi {
  position: (fen: string, useAnimation?: boolean) => void
  destroy?: () => void
}

type BoardColor = 'w' | 'b'

const boardEl = ref<HTMLElement | null>(null)
const game = new Chess()
let board: BoardApi | null = null

onMounted(async () => {
  if (!boardEl.value) return

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
    const move = game.move({
      from: source,
      to: target,
      promotion: 'q',
    })

    if (!move) return 'snapback'
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
})

onBeforeUnmount(() => {
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
