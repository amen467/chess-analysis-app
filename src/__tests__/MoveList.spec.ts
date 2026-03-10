import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import MoveList from '@/components/MoveList.vue'

describe('MoveList', () => {
  it('renders grouped full moves and emits selected ply', async () => {
    const wrapper = mount(MoveList, {
      props: {
        moves: ['e4', 'e5', 'Nf3'],
      },
    })

    expect(wrapper.text()).toContain('1.')
    expect(wrapper.text()).toContain('e4')
    expect(wrapper.text()).toContain('e5')
    expect(wrapper.text()).toContain('2.')
    expect(wrapper.text()).toContain('Nf3')

    const plyButtons = wrapper.findAll('button.ply')
    await plyButtons[1]?.trigger('click')

    expect(wrapper.emitted('ply-selected')).toBeTruthy()
    expect(wrapper.emitted('ply-selected')?.[0]).toEqual([2])
  })

  it('shows the empty state when there are no moves', () => {
    const wrapper = mount(MoveList, {
      props: {
        moves: [],
      },
    })

    expect(wrapper.text()).toContain('No moves yet.')
  })
})
