import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import AnalysisPanel from '@/components/AnalysisPanel.vue'
import type { EngineEvaluation } from '@/types/chess'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

describe('AnalysisPanel', () => {
  it('emits engine control updates with clamped numeric values', async () => {
    const wrapper = mount(AnalysisPanel, {
      props: {
        enabled: true,
        ready: true,
        loading: false,
        depth: 22,
        multiPv: 5,
        currentFen: START_FEN,
        evaluation: null,
      },
    })

    const checkbox = wrapper.find('input[type="checkbox"]')
    await checkbox.setValue(false)
    expect(wrapper.emitted('update:enabled')?.[0]).toEqual([false])

    const numberInputs = wrapper.findAll('input[type="number"]')
    await numberInputs[0]?.setValue('999')
    await numberInputs[1]?.setValue('0')

    expect(wrapper.emitted('update:depth')?.[0]).toEqual([30])
    expect(wrapper.emitted('update:multiPv')?.[0]).toEqual([1])
  })

  it('renders evaluation summary and principal variation lines', () => {
    const evaluation: EngineEvaluation = {
      centipawns: 34,
      mateIn: null,
      depth: 18,
      bestMoves: [
        {
          san: 'e4',
          score: 34,
          line: ['e4', 'e5', 'Nf3'],
          isMate: false,
        },
      ],
    }

    const wrapper = mount(AnalysisPanel, {
      props: {
        enabled: true,
        ready: true,
        loading: false,
        depth: 18,
        multiPv: 1,
        currentFen: START_FEN,
        evaluation,
      },
    })

    expect(wrapper.text()).toContain('Depth 18')
    expect(wrapper.text()).toContain('Eval +0.34')
    expect(wrapper.text()).toContain('#1')
    expect(wrapper.text()).toContain('1. e4 e5 2. Nf3')
  })

  it('shows a cancel control while analyzing and emits cancel-analysis', async () => {
    const wrapper = mount(AnalysisPanel, {
      props: {
        enabled: true,
        ready: true,
        loading: true,
        depth: 18,
        multiPv: 1,
        currentFen: START_FEN,
        evaluation: null,
      },
    })

    const cancelButton = wrapper.find('button.cancel-button')
    expect(cancelButton.exists()).toBe(true)
    await cancelButton.trigger('click')
    expect(wrapper.emitted('cancel-analysis')?.length).toBe(1)
  })
})
