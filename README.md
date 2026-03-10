# Chess Analysis App

Status updated: March 10, 2026

Client-side chess analysis workspace built with Vue 3 + TypeScript.

## Current App State

The app currently supports:

- PGN import and interactive board navigation
- On-demand Stockfish analysis for the current position (MultiPV)
- In-app chess chat powered by OpenAI Responses API
- Client-side encrypted API key storage

## Core Features

### PGN + Board

- Paste/import PGN text with validation feedback
- Interactive board using `@chrisoakman/chessboardjs` + `chess.js`
- Move pieces by drag/drop or click-to-move
- Promotion piece picker for promotion moves
- Flip board orientation
- Navigate with:
  - Move list clicks
  - Board controls (`<<`, `<`, `>`, `>>`)
  - Keyboard arrows (`Left` / `Right`)
- Current FEN + PGN are synced into shared app state for analysis/chat

### Stockfish Analysis

- Browser worker integration with `stockfish-18-lite-single` + WASM
- UCI startup handshake (`uciok` then `readyok`)
- 15s worker startup timeout and 45s analysis timeout
- Analysis controls:
  - Engine on/off toggle
  - Depth (1-30)
  - MultiPV lines (1-40)
  - Cancel in-flight analysis
- Output includes:
  - Principal eval (cp or mate)
  - Ranked best lines
  - SAN-formatted principal variations

### Chat (OpenAI Responses API)

- Uses `gpt-4.1-mini` via `https://api.openai.com/v1/responses`
- Supports multi-turn context with `previous_response_id`
- Optional inclusion of current FEN/PGN in prompts
- 45s request timeout and user cancel support

## API Key Policy

You must provide your own OpenAI API key.
This project does not include a backend key proxy.

### Key Storage Model

- API key can be stored encrypted in `localStorage`
- Encryption: PBKDF2-SHA256 + AES-GCM
- Passphrase must be at least 8 characters
- Passphrase is cached only in `sessionStorage`
- Key is decrypted only in-memory while unlocked

## Security Headers + CSP

Header policy is centralized in `src/config/securityHeaders.ts`.

- `npm run dev` serves CSP as `Content-Security-Policy-Report-Only`
- `npm run preview` serves enforced `Content-Security-Policy`
- Policy validation is covered by `src/__tests__/securityHeaders.spec.ts`

Mirror equivalent headers at your deployment edge (CDN/proxy) for production.

## Testing Status

Latest local run (`npm run test:unit -- --run`) on March 10, 2026:

- 6 test files passing
- 18 tests passing

## Tech Stack

- Vue 3 (`<script setup>`)
- TypeScript
- Pinia
- `chess.js`
- `@chrisoakman/chessboardjs`
- Stockfish Web Worker + WASM
- Vite + Vitest + ESLint + Oxlint

## Requirements

- Node.js `^20.19.0 || >=22.12.0`
- Modern browser with:
  - Web Workers
  - WebAssembly
  - Web Crypto API

## Local Development

```sh
npm install
npm run dev
```

Open the URL shown by Vite (typically `http://localhost:5173`).

## Available Scripts

- `npm run dev` - Start dev server
- `npm run build` - Type-check + production build
- `npm run preview` - Preview production build locally
- `npm run test:unit` - Run Vitest unit tests
- `npm run lint` - Run Oxlint + ESLint with fixes
- `npm run format` - Run Prettier on `src/`

## Known Gaps (Out of Scope for Current Build)

- No full-game batch scoring pipeline yet (analysis is per current position)
- No CPL/blunder/inaccuracy classification yet
- No ELO/strength estimation layer yet

## Project Structure

- `src/App.vue` - Main layout + store wiring
- `src/store/gameStore.ts` - Central app orchestration state/actions
- `src/components/ChessBoard.vue` - PGN import, board interaction, navigation
- `src/components/MoveList.vue` - Clickable jump-to-ply move list
- `src/components/AnalysisPanel.vue` - Engine controls + evaluation display
- `src/components/ChatWindow.vue` - Chat UI + key management controls
- `src/composables/useStockfish.ts` - Worker lifecycle + UCI analysis
- `src/composables/useChat.ts` - OpenAI request flow + key encryption lifecycle
- `src/config/securityHeaders.ts` - CSP and security header policy
