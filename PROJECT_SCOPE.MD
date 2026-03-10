# Chess Analysis App

Status updated: March 10, 2026

## 1. Project Overview

The app is now a working client-side chess analysis workspace built with Vue 3 + TypeScript.
Current focus is:

- PGN import and interactive board navigation
- On-demand Stockfish position analysis (MultiPV)
- In-app chess chat using OpenAI Responses API
- Secure local encryption for the user API key

The original vision still includes full-game analysis and player strength estimation, but those parts are not implemented yet.

## 2. Current Feature Status

### 2.1 Implemented

- PGN input and import flow with validation (invalid PGN is rejected)
- Interactive draggable board using `@chrisoakman/chessboardjs` + `chess.js`
- Move navigation via:
- board controls (`<<`, `<`, `>`, `>>`)
- keyboard arrows (`Left`/`Right`)
- clickable move list (jump to any ply)
- Current position and current PGN are emitted upward from the board
- Stockfish Web Worker integration using `stockfish-18-lite-single` + WASM
- Analysis controls:
- depth input (1-30)
- MultiPV line count input (1-40)
- manual `Run Analysis` action
- Analysis output panel:
- principal evaluation (cp or mate)
- ranked best lines
- SAN formatting for PV lines (truncated display for long lines)
- Chat panel with OpenAI Responses API (`gpt-4.1-mini`)
- Multi-turn continuation using `previous_response_id`
- Optional inclusion of current FEN and PGN in chat prompt
- API key storage hardened with client-side encryption:
- PBKDF2-SHA256 key derivation
- AES-GCM encryption
- encrypted key in `localStorage`
- passphrase cached only in `sessionStorage`

### 2.2 Partially Implemented or Legacy

- Pinia and Vue Router are initialized in `main.ts`, but app behavior is currently component/composable driven
- `src/store/gameStore.ts` and `src/composables/useGameState.ts` exist, but are not wired into the active flow

### 2.3 Not Implemented Yet

- ELO estimation, CPL tracking, and blunder/mistake/inaccuracy classification
- Whole-game batch analysis (analysis currently runs for the current position only)
- Engine evaluation context in chat payload (chat currently receives user text + optional FEN/PGN only)
- FEN input UI (current importer is PGN text area only)
- Production-grade test coverage (existing unit test scaffold is stale)

## 3. Actual Architecture (Current)

### 3.1 Frontend Stack

- Vue 3 (`<script setup>`, Composition API)
- TypeScript
- SCSS
- Vite build tooling

### 3.2 Board and Game Flow

- `ChessBoard.vue` owns local game state with `chess.js`
- Imports PGN into an internal move history (`playedMoves`)
- Supports cursor/ply navigation and emits:
- move list
- FEN at current ply
- PGN at current ply

### 3.3 Engine Flow

- `useStockfish.ts` owns worker lifecycle (`start`, `stop`, `destroy`)
- Sends UCI commands:
- `position fen ...`
- `setoption name MultiPV value ...`
- `go depth ...`
- Parses `info` lines and builds ranked move evaluations
- Converts UCI PVs to SAN using replay on `chess.js`

### 3.4 Chat Flow

- `useChat.ts` handles API key lifecycle, encryption/decryption, and request/response handling
- Sends system + user inputs to `https://api.openai.com/v1/responses`
- Extracts assistant text from `output_text`/`output` fields
- Maintains in-memory transcript and displays errors in UI

## 4. Current Repository Shape

Implemented core files in active flow:

- `src/App.vue`
- `src/components/ChessBoard.vue`
- `src/components/MoveList.vue`
- `src/components/AnalysisPanel.vue`
- `src/components/ChatWindow.vue`
- `src/composables/useStockfish.ts`
- `src/composables/useChat.ts`
- `src/types/chess.ts`

Supporting or legacy scaffold currently present:

- `src/composables/useGameState.ts` (not wired)
- `src/store/gameStore.ts` (not wired)
- `src/router/index.ts` (no routes yet)

Assets:

- `public/vendor/chessboardjs-themes.js` (optional board/piece theme globals loaded at runtime)

## 5. Security and Privacy Model (Current)

- No backend key storage; OpenAI key stays client-side
- Key is encrypted before persisting with passphrase-derived key
- Decrypted key only held in memory
- Stockfish runs in a browser worker to isolate compute from UI thread
- PGN input is validated before import

## 6. Risks and Gaps

| Risk / Gap                     | Current impact                   | Mitigation path                                           |
| ------------------------------ | -------------------------------- | --------------------------------------------------------- |
| Per-position analysis only     | Cannot score entire games yet    | Add move-by-move batch analysis pipeline                  |
| No ELO/accuracy metrics        | Original product promise not met | Implement CPL + classification + estimator                |
| State split across components  | Harder future scaling            | Consolidate active state into Pinia store                 |
| Stale tests                    | Regression risk                  | Replace template tests and add composable/component tests |
| Browser CPU load at high depth | Slower UX on weaker devices      | Add limits, cancel, and optional background queue         |

## 7. Updated Roadmap

### Phase A - Consolidate Core State

- Remove or repurpose legacy scaffolding (template store/test files)
- Keep current UX unchanged while reducing state duplication

### Phase B - Game-Wide Analysis

- Analyze each played move against engine best line
- Compute CPL and classification tags (inaccuracy/mistake/blunder)
- Persist per-ply analysis results for timeline and summaries

### Phase C - Strength and Insight Layer

- Implement heuristic accuracy/ELO estimate from computed metrics
- Expose white/black summary cards and trend views
- Include engine context in chat prompts by default

### Phase D - Product Hardening

- Replace stale tests with meaningful unit/integration coverage
- Add loading/abort controls for long analysis runs
- Improve import/export workflows and error reporting

## 8. Definition of Done for Next Milestone

The next milestone is complete when:

- Whole-game analysis runs from imported PGN without manual per-position reruns
- Each move has stored engine delta/CPL and classification
- A visible white/black performance summary is shown
- Chat can reference engine output for the selected position
- Test suite covers core composables and key UI flows
