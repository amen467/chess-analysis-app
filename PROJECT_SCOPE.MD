# ♟️ Chess Analysis App

---

## 1. Project Overview

The Chess Analysis App is a web-based chess analysis tool that allows users to:

- Paste a FEN or PGN
- Run Stockfish analysis
- View estimated player ELO
- Navigate interactively through moves
- See ranked best moves for any position
- Chat with an LLM about the game and current position

The goal is to combine:

- A strong chess engine (Stockfish)
- A clean, interactive chess UI
- AI-powered explanations via ChatGPT
- A modern Vue + TypeScript architecture

---

## 2. Core Features (MVP)

### 2.1 Chess Board

- Large, centered interactive board
- Move navigation (forward/back)
- Clickable move list
- Position updates in real time
- Highlight last move
- Show legal moves when piece selected

### 2.2 Game Input

- Text area for FEN or PGN
- “Run Analysis” button
- Validation of input
- Clear/reset option

### 2.3 Engine Analysis (Stockfish)

- WebAssembly Stockfish integration
- Depth-based evaluation
- MultiPV (multiple best lines)
- Ranked move suggestions
- Evaluation score (centipawns / mate)

Estimated player ELO calculation based on:

- Move accuracy
- Centipawn loss
- Blunder frequency

### 2.4 Sidebar (Right Panel)

Displays:

- Player ELO (White / Black)
- Current position evaluation
- Best move ranking list
- Engine principal variations

### 2.5 AI Chat (Bottom Panel)

- Chat interface UI
- User-provided OpenAI API key

Context includes:

- Full PGN
- Current FEN
- Engine evaluation
- Best moves

Questions supported examples:

- “Why is this move bad?”
- “What was the critical moment?”
- “How should Black attack here?”
- “What is the long-term plan?”

---

## 3. Technical Architecture

### 3.1 Frontend

- **Framework:** Vue 3 (Composition API)
- **Language:** TypeScript
- **Styling:** SCSS
- **State Management:** Pinia
- **Routing:** Vue Router (optional future expansion)

### 3.2 Chess Libraries

- `chess.js` → Move validation + PGN parsing
- `chessboard.js` or `vue3-chessboard` → Board UI
- `stockfish.wasm` → Engine analysis

### 3.3 LLM Integration

- OpenAI API (user provides API key)
- Streaming responses (optional enhancement)
- Context-aware prompt construction

### 3.4 Project Structure

src/
├── components/
│ ├── ChessBoard.vue
│ ├── Sidebar.vue
│ ├── AnalysisPanel.vue
│ ├── ChatWindow.vue
│ └── MoveList.vue
│
├── composables/
│ ├── useStockfish.ts
│ ├── useGameState.ts
│ └── useChat.ts
│
├── store/
│ └── gameStore.ts
│
├── types/
│ └── chess.ts
│
├── styles/
│ └── main.scss
│
└── App.vue

---

## 4. ELO Estimation Strategy

We estimate ELO based on:

- Average centipawn loss
- Blunder rate
- Accuracy percentage
- Comparison with known ELO-performance datasets

### Basic heuristic model (MVP):

- 0–20 avg CPL → 2400+
- 20–40 → 2000–2400
- 40–70 → 1600–2000
- 70–120 → 1200–1600
- 120+ → <1200

### Later enhancement:

- Logistic regression model
- Dataset-trained estimator

---

## 5. Development Plan

### Phase 1 — Project Setup

**Goal:** Get base app running

- Initialize Vue 3 + Vite + TypeScript project
- Configure SCSS
- Setup ESLint + Prettier
- Setup Git + GitHub repo
- Basic layout scaffolding

**Deliverable:**  
Empty UI layout with placeholders

---

### Phase 2 — Chess Board Integration

**Goal:** Fully working interactive board

- Install chess.js
- Install board component
- Implement move handling
- Load FEN
- Load PGN
- Move navigation

**Deliverable:**  
User can paste PGN and step through moves

---

### Phase 3 — Stockfish Integration

**Goal:** Engine analysis working

- Add Stockfish WASM
- Web Worker integration
- Parse engine output
- Extract:
  - Evaluation
  - Best moves
  - MultiPV lines
- Show ranked move list

**Deliverable:**  
Best moves displayed per position

---

### Phase 4 — Game Strength Estimation

**Goal:** Compute player performance metrics

- Analyze each move
- Compute centipawn loss
- Detect:
  - Blunders
  - Mistakes
  - Inaccuracies
- Compute accuracy %
- Estimate ELO

**Deliverable:**  
Sidebar shows White and Black ELO

---

### Phase 5 — Chat Integration

**Goal:** LLM-powered explanation

- Chat UI component
- API key input
- Secure local storage of key
- Context builder
- Send board + engine state to LLM
- Render responses

**Deliverable:**  
User can ask position-specific questions

---

### Phase 6 — UX Improvements

- Loading indicators
- Engine depth slider
- Move classification coloring
- Responsive layout
- Dark mode
- Performance optimization

---

## 6. Stretch Features (Future)

- Cloud save games
- User accounts
- Game comparison mode
- Opening explorer
- Blunder timeline graph
- Accuracy graph per move
- Export annotated PGN
- Puzzle generation from blunders
- Multiplayer analysis sharing

---

## 7. Security Considerations

- Never store OpenAI API key server-side
- Keep all processing client-side initially
- Sandboxed Web Worker for Stockfish
- Input validation for PGN/FEN

---

## 8. Risks & Technical Challenges

| Risk                             | Mitigation                   |
| -------------------------------- | ---------------------------- |
| Stockfish performance in browser | Limit depth, use Web Worker  |
| Large PGN freezing UI            | Progressive analysis         |
| API key misuse                   | Local-only storage           |
| Engine-LLM sync issues           | Centralized game state store |

---

## 9. Definition of Done (MVP)

The app is complete when:

- User pastes PGN
- Engine analyzes entire game
- Estimated ELO is shown
- User can navigate moves
- Best moves are shown per position
- Chat explains positions intelligently

---

## 10. Repository Setup

Recommended Git workflow:

- `main` → Production-ready
- `develop` → Integration branch

Feature branches:

- `feature/chessboard`
- `feature/stockfish`
- `feature/chat`
- `feature/elo-estimator`
