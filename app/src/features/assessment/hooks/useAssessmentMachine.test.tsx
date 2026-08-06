import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssessmentMachine } from './useAssessmentMachine'

describe('useAssessmentMachine progress', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
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

  it('initializes a fresh session when legacy progress cleanup is blocked', () => {
    localStorage.setItem('a2o_assessment_state_v1', JSON.stringify({
      sessionId: 'active-session',
      status: 'showing_question',
      currentSceneIndex: 2,
      answers: { q1: ['q1_6'] },
    }))
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError')
    })

    let state: ReturnType<typeof useAssessmentMachine>['state'] | undefined
    expect(() => {
      const { result } = renderHook(() => useAssessmentMachine())
      state = result.current.state
    }).not.toThrow()

    expect(state?.status).toBe('boot')
    expect(state?.currentSceneIndex).toBe(0)
    expect(state?.answers).toEqual({})
    expect(state?.recovered).toBe(false)
    expect(state?.sessionId).not.toBe('active-session')
  })

  it('keeps a next-scene playback issue when the visual swap becomes stable', () => {
    const { result } = renderHook(() => useAssessmentMachine())

    act(() => {
      result.current.dispatch({ type: 'BOOT_READY' })
      result.current.dispatch({ type: 'START' })
      result.current.dispatch({ type: 'SHOW_QUESTION' })
      result.current.dispatch({ type: 'SUBMIT_ANSWER', questionId: 'q1', optionIds: ['q1_6'] })
      result.current.dispatch({ type: 'BEGIN_TRANSITION' })
      result.current.dispatch({ type: 'NEXT_SCENE_READY' })
      result.current.dispatch({ type: 'SET_PLAYBACK_ISSUE', message: 'next_scene_play_rejected' })
      result.current.dispatch({ type: 'SCENE_STABLE' })
    })

    expect(result.current.state.status).toBe('playing_scene')
    expect(result.current.state.playbackIssue).toBe('next_scene_play_rejected')
  })
})
