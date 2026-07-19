import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAssessmentMachine } from './useAssessmentMachine'

describe('useAssessmentMachine progress', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('ignores and clears saved progress when creating a fresh session', () => {
    localStorage.setItem('a2o_assessment_state_v1', JSON.stringify({
      sessionId: 'active-session',
      status: 'showing_question',
      currentSceneIndex: 2,
      answers: { q1: ['q1_6'] },
    }))
    sessionStorage.setItem('a2o_assessment_muted', 'true')

    const { result } = renderHook(() => useAssessmentMachine())

    expect(result.current.state.status).toBe('boot')
    expect(result.current.state.currentSceneIndex).toBe(0)
    expect(result.current.state.answers).toEqual({})
    expect(result.current.state.recovered).toBe(false)
    expect(result.current.state.sessionId).not.toBe('active-session')
    expect(result.current.state.muted).toBe(true)
    expect(localStorage.getItem('a2o_assessment_state_v1')).toBeNull()
  })

  it('does not persist progress after starting and answering', () => {
    const { result } = renderHook(() => useAssessmentMachine())

    act(() => result.current.dispatch({ type: 'BOOT_READY' }))
    expect(localStorage.getItem('a2o_assessment_state_v1')).toBeNull()

    act(() => result.current.dispatch({ type: 'START' }))
    expect(localStorage.getItem('a2o_assessment_state_v1')).toBeNull()

    act(() => result.current.dispatch({
      type: 'SUBMIT_ANSWER',
      questionId: 'q1',
      optionIds: ['q1_6'],
    }))
    expect(localStorage.getItem('a2o_assessment_state_v1')).toBeNull()
  })
})
