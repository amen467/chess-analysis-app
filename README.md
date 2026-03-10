# Chess Analysis App

Client-side chess analysis workspace built with Vue 3 + TypeScript.

The app lets you:

- Import a PGN and navigate through the game
- Analyze the current position with Stockfish (MultiPV)
- Ask chess questions in an in-app chat powered by OpenAI

## Core Features

### PGN + Board

- Paste and import PGN text
- Drag pieces on the board to explore lines
- Navigate by:
  - Move list click
  - Board controls (`<<`, `<`, `>`, `>>`)
  - Keyboard arrows (`Left` / `Right`)
- Current FEN and PGN are kept in app state and shared with analysis/chat

### Stockfish Analysis

- Browser worker-based Stockfish integration (`stockfish-18-lite-single`)
- Engine controls:
  - Enable/disable engine
  - Depth (1-30)
  - MultiPV lines (1-40)
- Analysis panel shows:
  - Best lines
  - Eval in pawns or mate score
  - SAN-formatted PV lines

### Chat (OpenAI Responses API)

- Uses `gpt-4.1-mini` through `https://api.openai.com/v1/responses`
- Supports multi-turn context with `previous_response_id`
- Optional toggle to include current FEN/PGN in the prompt
- Request controls:
  - Timeout after 45s
  - Cancel in-flight request from the UI

## API Key Policy (Required)

You must provide your own OpenAI API key.  
This app does not ship with a server-side key and does not proxy OpenAI calls through a backend.

### Key Storage Model

- Key can be saved encrypted in `localStorage`
- Encryption uses PBKDF2-SHA256 + AES-GCM
- Passphrase must be at least 8 characters
- Passphrase is cached only in `sessionStorage` for unlock convenience
- Key is decrypted only in-memory while unlocked

## Security Headers and CSP

The project now includes a centralized CSP + security header policy in:

- `src/config/securityHeaders.ts`

How it is applied:

- `npm run dev`: CSP is sent as `Content-Security-Policy-Report-Only` (diagnostic mode)
- `npm run preview`: CSP is sent as enforced `Content-Security-Policy` (production-like behavior)

Validation:

- Header/CSP policy is unit-tested in `src/__tests__/securityHeaders.spec.ts`

When you choose a deployment provider, mirror the same headers at the CDN/proxy layer.

## Stockfish Readiness Hardening

Engine startup now uses a proper UCI handshake:

- Wait for `uciok`
- Then wait for `readyok`

Startup has a 15s timeout and fails cleanly instead of hanging.

## Tech Stack

- Vue 3 (`<script setup>`)
- TypeScript
- Pinia
- `chess.js`
- `@chrisoakman/chessboardjs`
- Stockfish Web Worker + WASM
- Vite + Vitest + ESLint

## Requirements

- Node.js `^20.19.0 || >=22.12.0`
- Modern browser with support for:
  - Web Workers
  - WebAssembly
  - Web Crypto API

## Local Development

Install dependencies:

```sh
npm install
```

Run dev server:

```sh
npm run dev
```

Open the URL shown by Vite (usually `http://localhost:5173`).

## Available Scripts

- `npm run dev` - Start local development server
- `npm run build` - Type-check and create production build
- `npm run preview` - Preview production build locally
- `npm run test:unit` - Run Vitest unit tests
- `npm run lint` - Run oxlint + eslint with fixes
- `npm run format` - Run Prettier on `src/`

## Current Scope / Known Gaps

- Analysis is position-based (not full-game batch scoring yet)
- No ELO estimation or CPL/blunder summary yet

## Project Structure

- `src/App.vue` - Main layout and feature wiring
- `src/components/ChessBoard.vue` - Board, PGN import, and navigation
- `src/components/MoveList.vue` - Clickable move list
- `src/components/AnalysisPanel.vue` - Engine controls and output
- `src/components/ChatWindow.vue` - Chat UI and API key controls
- `src/composables/useStockfish.ts` - Worker lifecycle and UCI analysis
- `src/composables/useChat.ts` - OpenAI requests and encrypted key handling
- `src/store/gameStore.ts` - Shared app state/actions
