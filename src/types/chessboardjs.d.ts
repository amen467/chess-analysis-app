declare module '@chrisoakman/chessboardjs' {
  type BoardConfig = {
    draggable?: boolean
    pieceTheme?: string
    position?: string
    showNotation?: boolean
  }

  type BoardInstance = {
    position: (fen: string, useAnimation?: boolean) => void
    destroy?: () => void
  }

  export default function Chessboard(
    elementOrId: string | HTMLElement,
    config: BoardConfig | string,
  ): BoardInstance
}

declare module '@chrisoakman/chessboardjs/dist/chessboard-1.0.0.js'
