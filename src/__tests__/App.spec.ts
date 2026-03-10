import { describe, it, expect } from 'vitest'
import { createPinia } from 'pinia'

import { mount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('mounts and renders app heading', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia()],
        stubs: {
          ChessBoard: true,
          AnalysisPanel: true,
          ChatWindow: true,
          MoveList: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Analyze games with Stockfish + Chat')
  })
})
