import { useCallback, useEffect, useReducer } from 'react'
import type { AssessmentMachineState } from '../types/assessment'

const STORAGE_KEY = 'a2o_assessment_state_v1'
const MUTE_KEY = 'a2o_assessment_muted'

type Action =
  | { type: 'BOOT_READY' }
  | { type: 'START' }
  | { type: 'SHOW_QUESTION' }
  | { type: 'SUBMIT_ANSWER'; questionId: string; optionIds: string[] }
  | { type: 'BEGIN_TRANSITION' }
  | { type: 'NEXT_SCENE_READY' }
  | { type: 'SCENE_STABLE' }
  | { type: 'FINISH' }
  | { type: 'SET_MUTED'; muted: boolean }
  | { type: 'SET_PLAYBACK_ISSUE'; message?: string }
  | { type: 'RESTART' }
  | { type: 'FATAL_ERROR'; message: string }

function createSessionId() {
  return crypto.randomUUID?.() ?? `assessment_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function createInitialState(): AssessmentMachineState {
  const muted = sessionStorage.getItem(MUTE_KEY) === 'true'

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as Partial<AssessmentMachineState> | null
    if (saved?.sessionId && saved.answers && typeof saved.currentSceneIndex === 'number') {
      return {
        status: saved.status === 'completed' ? 'completed' : 'ready',
        sessionId: saved.sessionId,
        currentSceneIndex: saved.currentSceneIndex,
        activeBuffer: 0,
        answers: saved.answers,
        muted,
        recovered: true,
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    status: 'boot',
    sessionId: createSessionId(),
    currentSceneIndex: 0,
    activeBuffer: 0,
    answers: {},
    muted,
    recovered: false,
  }
}

function reducer(state: AssessmentMachineState, action: Action): AssessmentMachineState {
  switch (action.type) {
    case 'BOOT_READY':
      return state.status === 'boot' ? { ...state, status: 'ready' } : state
    case 'START':
      return { ...state, status: 'playing_scene', playbackIssue: undefined }
    case 'SHOW_QUESTION':
      return ['playing_scene', 'recoverable_error'].includes(state.status)
        ? { ...state, status: 'showing_question', playbackIssue: undefined }
        : state
    case 'SUBMIT_ANSWER':
      return {
        ...state,
        status: 'submitting_answer',
        answers: { ...state.answers, [action.questionId]: action.optionIds },
      }
    case 'BEGIN_TRANSITION':
      return { ...state, status: 'transitioning', playbackIssue: undefined }
    case 'NEXT_SCENE_READY':
      return {
        ...state,
        status: 'playing_next_scene',
        currentSceneIndex: state.currentSceneIndex + 1,
        activeBuffer: state.activeBuffer === 0 ? 1 : 0,
      }
    case 'SCENE_STABLE':
      return { ...state, status: 'playing_scene', playbackIssue: undefined }
    case 'FINISH':
      return { ...state, status: 'completed', playbackIssue: undefined }
    case 'SET_MUTED':
      return { ...state, muted: action.muted }
    case 'SET_PLAYBACK_ISSUE':
      return { ...state, playbackIssue: action.message }
    case 'RESTART':
      return {
        status: 'ready',
        sessionId: createSessionId(),
        currentSceneIndex: 0,
        activeBuffer: 0,
        answers: {},
        muted: state.muted,
        recovered: false,
      }
    case 'FATAL_ERROR':
      return { ...state, status: 'fatal_error', playbackIssue: action.message }
    default:
      return state
  }
}

export function useAssessmentMachine() {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialState)

  useEffect(() => {
    if (state.status === 'boot') return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      sessionId: state.sessionId,
      status: state.status,
      currentSceneIndex: state.currentSceneIndex,
      answers: state.answers,
    }))
  }, [state.answers, state.currentSceneIndex, state.sessionId, state.status])

  useEffect(() => {
    sessionStorage.setItem(MUTE_KEY, String(state.muted))
  }, [state.muted])

  const clearCompletedSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return { state, dispatch, clearCompletedSession }
}
