# Chess Analysis App

Status updated: March 10, 2026

## 1. Project Overview

The app is a functional client-side chess analysis workspace built with Vue 3 + TypeScript.
The current product is centered on three workflows:

- PGN import + interactive board navigation
- On-demand Stockfish position analysis (MultiPV)
- In-app chess chat using OpenAI Responses API

The original vision items around full-game scoring, quality metrics, and ELO-style estimation are still pending.

## 2. Current Feature Status

### 2.1 Implemented

- PGN input/import with validation and success/error status messaging
- Interactive chessboard using `@chrisoakman/chessboardjs` + `chess.js`
- Move interaction via drag/drop and click-to-move
- Promotion picker flow for promotion moves
- Board orientation flip control
- Move navigation via:
  - board controls (`<<`, `<`, `>`, `>>`)
  - keyboard arrows (`Left` / `Right`)
  - clickable move list jump-to-ply
- Current position and PGN are emitted from board and shared app-wide
- Pinia-backed central app state in `src/store/gameStore.ts`
- Stockfish Web Worker integration (`stockfish-18-lite-single` + WASM)
- UCI readiness handshake (`uciok` then `readyok`) with startup timeout
- Analysis controls:
  - engine on/off toggle
  - depth input (1-30)
  - MultiPV input (1-40)
  - in-flight analysis cancel button
- Analysis output:
  - eval in centipawns or mate
  - ranked best lines
  - SAN-formatted PV output with display truncation
- Chat integration via OpenAI Responses API (`gpt-4.1-mini`)
- Multi-turn continuation via `previous_response_id`
- Optional prompt enrichment with current FEN/PGN
- Chat request cancellation + 45s timeout behavior
- API key lifecycle in UI:
  - save encrypted
  - unlock/lock
  - clear
- Client-side key encryption:
  - PBKDF2-SHA256 key derivation
  - AES-GCM encryption
  - encrypted payload in `localStorage`
  - passphrase cached in `sessionStorage`
  - migration warning path for legacy unencrypted stored key

### 2.2 Security / Delivery Hardening

- Centralized CSP and security headers in `src/config/securityHeaders.ts`
- `npm run dev`: CSP served as report-only
- `npm run preview`: CSP served as enforced header
- Header policy validation helper and unit tests in place

### 2.3 Testing Snapshot (Current)

Unit tests exist for core UI/composables and security policy.

- Test files: `App`, `MoveList`, `AnalysisPanel`, `useChat`, `useStockfish`, `securityHeaders`
- Latest local run on March 10, 2026: 17 passing / 18 total

## 3. Actual Architecture (Current)

### 3.1 Frontend Stack

- Vue 3 (`<script setup>`, Composition API)
- TypeScript
- Pinia
- SCSS
- Vite + Vitest + ESLint/Oxlint

### 3.2 State and App Flow

- `App.vue` is wired to Pinia store refs/actions
- `gameStore` coordinates:
  - PGN import requests
  - board move/jump state
  - current FEN/PGN
  - engine lifecycle + analysis requests
  - chat composable wiring and key actions

### 3.3 Board Flow

- `ChessBoard.vue` owns local board/game cursor state
- Emits move list, current FEN, and current PGN upward
- Supports import, navigation, promotion handling, and board flip

### 3.4 Engine Flow

- `useStockfish.ts` manages worker lifecycle and UCI commands
- Handles startup/analysis timeouts and cancellation reasons
- Parses `info` lines and resolves on `bestmove`
- Converts PV UCI moves to SAN via `chess.js` replay

### 3.5 Chat Flow

- `useChat.ts` manages request lifecycle and secure key handling
- Sends requests to `https://api.openai.com/v1/responses`
- Extracts assistant text from `output`/`output_text`
- Maintains in-memory transcript with surfaced error states

## 4. Current Repository Shape

Active files in the main product flow:

- `src/App.vue`
- `src/store/gameStore.ts`
- `src/components/ChessBoard.vue`
- `src/components/MoveList.vue`
- `src/components/AnalysisPanel.vue`
- `src/components/ChatWindow.vue`
- `src/composables/useStockfish.ts`
- `src/composables/useChat.ts`
- `src/utils/requestLifecycle.ts`
- `src/config/securityHeaders.ts`
- `src/types/chess.ts`

Supporting scaffolding still present:

- `src/router/index.ts` (router initialized but no routes)

Optional runtime assets:

- `public/vendor/chessboardjs-themes.js` (theme globals if present)

## 5. Metrics and Scope Gaps

Not implemented yet (scope-critical metrics work):

- Full-game batch analysis across every played move
- CPL (centipawn loss) tracking per move
- Move quality classification (inaccuracy / mistake / blunder)
- Aggregate player summaries derived from engine deltas
- ELO/strength estimation layer

Additional gaps:

- No backend; all API usage is direct from browser
- Router exists but app is currently single-view

## 6. Updated Roadmap

### Phase A - Test and Stability Cleanup

- Fix the timeout assertion mismatch in `useStockfish.spec.ts`
- Add coverage for `gameStore` orchestration behavior

### Phase B - Game-Wide Analysis Metrics

- Run engine analysis for each move in imported PGN
- Compute/store per-ply best move delta + CPL
- Classify moves into inaccuracy/mistake/blunder tags

### Phase C - Player Summary Layer

- Add white/black summary panels from computed metrics
- Introduce accuracy and strength heuristics from game metrics
- Feed engine context into chat by default when analysis exists

### Phase D - Product Hardening

- Improve long-run analysis UX (progress + abort + partial results)
- Expand import/export and error recovery paths
- Prepare deployment-level header parity with hosting layer

## 7. Definition of Done for Next Milestone

Next milestone is complete when:

- Imported PGN can be analyzed move-by-move without manual stepping
- Each ply has stored engine delta/CPL + classification tag
- White/black summary cards render from computed metrics
