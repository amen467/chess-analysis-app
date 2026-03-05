<script setup lang="ts">
import ChessBoard from '@/components/ChessBoard.vue'
import SideBar from '@/components/SideBar.vue'
import AnalysisPanel from '@/components/AnalysisPanel.vue'
import ChatWindow from '@/components/ChatWindow.vue'
import MoveList from '@/components/MoveList.vue'
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div>
        <p class="eyebrow">Chess Analysis App</p>
        <h1>Analyze games with Stockfish + Chat</h1>
      </div>
      <div class="header-actions">
        <button type="button" class="ghost">Import PGN</button>
        <button type="button" class="primary">Run Analysis</button>
      </div>
    </header>

    <main class="layout">
      <section class="board-area">
        <ChessBoard />
      </section>
      <section class="sidebar-area">
        <SideBar />
      </section>

      <section class="analysis-area">
        <AnalysisPanel />
      </section>
      <section class="moves-area">
        <MoveList />
      </section>
      <section class="chat-area">
        <ChatWindow />
      </section>
    </main>
  </div>
</template>

<style lang="scss">
.app-shell {
  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 3rem;
  display: grid;
  gap: 1.5rem;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.eyebrow {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 700;
}

h1 {
  margin: 0.35rem 0 0;
  font-size: 1.6rem;
  color: #0f172a;
}

.header-actions {
  display: flex;
  gap: 0.6rem;
}

.header-actions button {
  border-radius: 10px;
  padding: 0.65rem 1rem;
  font-weight: 700;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #0f172a;
  cursor: pointer;
}

.header-actions .primary {
  background: linear-gradient(135deg, #22d3ee, #3b82f6);
  color: #0b1021;
  border: none;
}

.header-actions .ghost {
  background: transparent;
}

.layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto;
  gap: 1rem;
}

.board-area {
  grid-column: 1;
}

.sidebar-area {
  grid-column: 2;
  grid-row: 1 / span 2;
}

.analysis-area {
  grid-column: 1;
}

.moves-area {
  grid-column: 1;
}

.chat-area {
  grid-column: 2;
}

@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }

  .sidebar-area,
  .analysis-area,
  .moves-area,
  .chat-area,
  .board-area {
    grid-column: 1;
    grid-row: auto;
  }

  .header-actions {
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}
</style>
