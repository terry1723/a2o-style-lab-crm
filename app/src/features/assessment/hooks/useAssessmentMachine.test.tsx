import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAssessmentMachine } from './useAssessmentMachine'

describe('useAssessmentMachine recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('does not mark an empty restarted session as recoverable after reload', () => {
    localStorage.setItem('a2o_assessment_state_v1', JSON.stringify({
      sessionId: 'restarted-session',
      status: 'ready',
      currentSceneIndex: 0,
      answers: {},
    }))

    const { result } = renderHook(() => useAssessmentMachine())

    expect(result.current.state.status).toBe('boot')
    expect(result.current.state.recovered).toBe(false)
  })

  it('still recovers a visitor who has answered at least one question', () => {
    localStorage.setItem('a2o_assessment_state_v1', JSON.stringify({
      sessionId: 'active-session',
      status: 'showing_question',
      currentSceneIndex: 1,
      answers: { q1: ['q1_6'] },
    }))

    const { result } = renderHook(() => useAssessmentMachine())

    expect(result.current.state.status).toBe('ready')
    expect(result.current.state.recovered).toBe(true)
    expect(result.current.state.answers).toEqual({ q1: ['q1_6'] })

    act(() => result.current.clearCompletedSession())
  })
})
