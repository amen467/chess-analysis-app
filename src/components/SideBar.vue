<script setup lang="ts">
// Sidebar shows evaluation, ELO, and best moves once wired to game state.
</script>

<template>
  <aside class="sidebar">
    <h2>Sidebar</h2>
    <p>Engine insights, ELO estimates, and move rankings will appear here.</p>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  padding: 1rem;
  background: #0f172a;
  color: #e2e8f0;
  border-radius: 10px;
}

.sidebar h2 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  letter-spacing: 0.02em;
}
</style>
