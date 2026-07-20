import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { LoaderCircle, MessageCircle, Play, Volume2, VolumeX } from 'lucide-react'
import {
  ASSESSMENT_WHATSAPP_LABEL,
  ASSESSMENT_WHATSAPP_URL,
} from '../config/assessmentWhatsApp'
import { useAssessmentMachine } from '../hooks/useAssessmentMachine'
import { useVideoPreloader } from '../hooks/useVideoPreloader'
import { getAssessmentConfig, getEnabledAssessmentScenes } from '../services/assessmentConfigRepository'
import { getAttribution } from '../services/attribution'
import { trackAssessmentEvent } from '../services/analytics'
import { fadeAudioParam, fadeAudioVolume } from '../services/audioVolume'
import {
  createAssessmentSession,
  persistAssessmentAnswer,
  submitAssessmentLead,
} from '../services/assessmentSessionRepository'
import { calculateAssessmentResult } from '../services/scoring'
import {
  prepareHiddenVideoForSwap,
  rewindToFirstFrame,
  waitForActualFrame,
  type FrameVideo,
} from '../services/videoPlayback'
import type { AssessmentLeadInput } from '../types/assessment'
import { AssessmentResult } from './AssessmentResult'
import { QuestionOverlay } from './QuestionOverlay'
import { SceneVideoBuffer } from './SceneVideoBuffer'
import { TransitionVideoLayer } from './TransitionVideoLayer'

const assessmentConfig = getAssessmentConfig()
const enabledAssessmentScenes = getEnabledAssessmentScenes()
const SOUNDTRACK_SCENE_VOLUME = 0.2
const SOUNDTRACK_PROMPT_VOLUME = 0.32
const SOUNDTRACK_FADE_DURATION_MS = 240

type WebkitAudioWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

function getAudioContextConstructor() {
  return window.AudioContext ?? (window as WebkitAudioWindow).webkitAudioContext
}

function waitForMediaEnd(video: HTMLVideoElement | null, timeoutMs = 6500, signal?: AbortSignal) {
  if (!video) return Promise.resolve()
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('ended', finish)
      video.removeEventListener('error', finish)
      signal?.removeEventListener('abort', finish)
      resolve()
    }
    const timeout = window.setTimeout(finish, timeoutMs)
    video.addEventListener('ended', finish, { once: true })
    video.addEventListener('error', finish, { once: true })
    signal?.addEventListener('abort', finish, { once: true })
    if (signal?.aborted) finish()
  })
}

type NextPreparation = {
  generation: number
  sceneIndex: number
  activeBuffer: 0 | 1
  nextSceneId: string
  video: FrameVideo
  controller: AbortController
}

export function AssessmentEngine() {
  const { state, dispatch, clearCompletedSession } = useAssessmentMachine()
  const reducedMotion = useReducedMotion()
  const sceneARef = useRef<HTMLVideoElement>(null)
  const sceneBRef = useRef<HTMLVideoElement>(null)
  const transitionRef = useRef<HTMLVideoElement>(null)
  const soundtrackRef = useRef<HTMLAudioElement>(null)
  const soundtrackFadeCleanupRef = useRef<(() => void) | null>(null)
  const soundtrackAudioContextRef = useRef<AudioContext | null>(null)
  const soundtrackSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null)
  const soundtrackGainNodeRef = useRef<GainNode | null>(null)
  const soundtrackWebAudioFailedRef = useRef(false)
  const soundtrackStartAttemptRef = useRef(0)
  const generationRef = useRef(0)
  const stateRef = useRef(state)
  const preparationRef = useRef<NextPreparation | null>(null)
  const transitionControllerRef = useRef<AbortController | null>(null)
  const playbackMonitorCleanupRef = useRef<(() => void) | null>(null)
  const completionTimerRef = useRef<number | null>(null)
  const [submittingLead, setSubmittingLead] = useState(false)
  const [leadSubmitted, setLeadSubmitted] = useState(false)
  const attribution = useMemo(() => getAttribution(), [])
  const scenes = enabledAssessmentScenes
  const currentScene = scenes[state.currentSceneIndex] ?? scenes[0]
  const nextScene = scenes[state.currentSceneIndex + 1]
  const result = useMemo(
    () => calculateAssessmentResult(assessmentConfig, state.answers),
    [state.answers],
  )
  stateRef.current = state

  useVideoPreloader(state.currentSceneIndex, scenes)

  const activeVideo = () => state.activeBuffer === 0 ? sceneARef.current : sceneBRef.current
  const inactiveVideo = () => state.activeBuffer === 0 ? sceneBRef.current : sceneARef.current
  const sourceA = state.activeBuffer === 0 ? currentScene?.sceneVideoUrl : nextScene?.sceneVideoUrl
  const sourceB = state.activeBuffer === 1 ? currentScene?.sceneVideoUrl : nextScene?.sceneVideoUrl
  const posterA = state.activeBuffer === 0 ? currentScene?.posterUrl : nextScene?.posterUrl
  const posterB = state.activeBuffer === 1 ? currentScene?.posterUrl : nextScene?.posterUrl
  const isQuestionVisible = state.status === 'showing_question' || state.status === 'submitting_answer'
  const isTransitioning = state.status === 'transitioning'
  const isReady = state.status === 'ready' || state.status === 'boot'
  const renderGeneration = generationRef.current
  const renderSceneIndex = state.currentSceneIndex

  useEffect(() => {
    dispatch({ type: 'BOOT_READY' })
    trackAssessmentEvent('assessment_view', { session_id: state.sessionId })
  }, [dispatch, state.sessionId])

  useEffect(() => {
    const active = state.activeBuffer === 0 ? sceneARef.current : sceneBRef.current
    const inactive = state.activeBuffer === 0 ? sceneBRef.current : sceneARef.current
    if (active) active.muted = state.muted
    if (inactive) inactive.muted = true
    if (transitionRef.current) transitionRef.current.muted = state.muted
    if (soundtrackRef.current) soundtrackRef.current.muted = state.muted
  }, [state.activeBuffer, state.muted])

  useEffect(() => {
    soundtrackFadeCleanupRef.current?.()
    soundtrackFadeCleanupRef.current = null
    const soundtrack = soundtrackRef.current
    if (!soundtrack) return
    if (soundtrackWebAudioFailedRef.current) return

    const sceneStatuses = ['playing_scene', 'playing_next_scene', 'transitioning']
    const promptStatuses = ['showing_question', 'submitting_answer', 'completed']
    const target = sceneStatuses.includes(state.status)
      ? SOUNDTRACK_SCENE_VOLUME
      : promptStatuses.includes(state.status)
        ? SOUNDTRACK_PROMPT_VOLUME
        : null
    if (target === null) return

    const duration = reducedMotion ? 0 : SOUNDTRACK_FADE_DURATION_MS
    const gain = soundtrackGainNodeRef.current?.gain
    const cleanup = gain
      ? fadeAudioParam(gain, target, duration)
      : getAudioContextConstructor()
        ? null
        : fadeAudioVolume(soundtrack, target, duration)
    if (!cleanup) return
    soundtrackFadeCleanupRef.current = cleanup
    return () => {
      cleanup()
      if (soundtrackFadeCleanupRef.current === cleanup) soundtrackFadeCleanupRef.current = null
    }
  }, [reducedMotion, state.status])

  useEffect(() => {
    if (state.status !== 'playing_next_scene') return
    const frame = window.requestAnimationFrame(() => dispatch({ type: 'SCENE_STABLE' }))
    return () => window.cancelAnimationFrame(frame)
  }, [dispatch, state.status])

  useEffect(() => {
    if (state.status !== 'playing_scene') return
    trackAssessmentEvent('scene_view', {
      session_id: state.sessionId,
      scene_id: currentScene.id,
      scene_order: currentScene.order,
    })
  }, [currentScene.id, currentScene.order, state.currentSceneIndex, state.sessionId, state.status])

  useEffect(() => {
    if (!nextScene || currentScene.transitionVideoUrl) return
    if (!['playing_scene', 'showing_question'].includes(state.status)) return
    const existing = preparationRef.current
    if (
      existing
      && existing.generation === generationRef.current
      && existing.sceneIndex === state.currentSceneIndex
      && existing.activeBuffer === state.activeBuffer
      && existing.nextSceneId === nextScene.id
    ) return

    preparationRef.current?.controller.abort()
    const video = (state.activeBuffer === 0 ? sceneBRef.current : sceneARef.current) as FrameVideo | null
    if (!video) return
    const preparation: NextPreparation = {
      generation: generationRef.current,
      sceneIndex: state.currentSceneIndex,
      activeBuffer: state.activeBuffer,
      nextSceneId: nextScene.id,
      video,
      controller: new AbortController(),
    }
    preparationRef.current = preparation
    const isCurrent = () => {
      const live = stateRef.current
      const liveInactive = live.activeBuffer === 0 ? sceneBRef.current : sceneARef.current
      return generationRef.current === preparation.generation
        && live.currentSceneIndex === preparation.sceneIndex
        && live.activeBuffer === preparation.activeBuffer
        && liveInactive === preparation.video
        && preparation.video.getAttribute('src') === nextScene.sceneVideoUrl
    }

    void prepareHiddenVideoForSwap(
      video,
      3000,
      1500,
      preparation.controller.signal,
      isCurrent,
    )
  }, [currentScene.transitionVideoUrl, nextScene, state.activeBuffer, state.currentSceneIndex, state.status])

  useEffect(() => {
    const soundtrack = soundtrackRef.current
    return () => {
      generationRef.current += 1
      preparationRef.current?.controller.abort()
      transitionControllerRef.current?.abort()
      playbackMonitorCleanupRef.current?.()
      if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current)
      soundtrackFadeCleanupRef.current?.()
      soundtrackFadeCleanupRef.current = null
      soundtrack?.pause()
      if (soundtrack) {
        try {
          soundtrack.currentTime = 0
        } catch {
          // Some browsers reject seeking before soundtrack metadata is ready.
        }
      }
      soundtrackSourceNodeRef.current?.disconnect()
      soundtrackGainNodeRef.current?.disconnect()
      soundtrackSourceNodeRef.current = null
      soundtrackGainNodeRef.current = null
      const audioContext = soundtrackAudioContextRef.current
      soundtrackAudioContextRef.current = null
      if (audioContext) {
        try {
          void audioContext.close().catch(() => undefined)
        } catch {
          // The graph is already disconnected, so context cleanup is best-effort.
        }
      }
    }
  }, [])

  const reportActiveSceneLoadError = (
    activeBuffer: 0 | 1,
    expectedGeneration: number,
    expectedSceneIndex: number,
  ) => {
    const live = stateRef.current
    if (
      generationRef.current !== expectedGeneration
      || live.currentSceneIndex !== expectedSceneIndex
      || live.activeBuffer !== activeBuffer
      || !['playing_scene', 'playing_next_scene'].includes(live.status)
    ) return
    const activeScene = scenes[live.currentSceneIndex]
    if (!activeScene) return
    playbackMonitorCleanupRef.current?.()
    playbackMonitorCleanupRef.current = null
    trackAssessmentEvent('video_playback_error', {
      session_id: live.sessionId,
      scene_id: activeScene.id,
      error: 'scene_load_error',
    })
    dispatch({ type: 'SET_PLAYBACK_ISSUE', message: 'scene_load_error' })
  }

  const start = () => {
    const video = activeVideo()
    if (!video) {
      dispatch({ type: 'FATAL_ERROR', message: '未能準備第一段影片。' })
      return
    }
    const soundtrack = soundtrackRef.current
    if (soundtrack) {
      const soundtrackStartAttempt = soundtrackStartAttemptRef.current + 1
      soundtrackStartAttemptRef.current = soundtrackStartAttempt
      const soundtrackGeneration = generationRef.current
      const AudioContextConstructor = getAudioContextConstructor()
      let soundtrackReady = !soundtrackWebAudioFailedRef.current
      if (soundtrackReady && AudioContextConstructor) {
        try {
          let audioContext = soundtrackAudioContextRef.current
          let gainNode = soundtrackGainNodeRef.current
          if (!audioContext || !gainNode) {
            audioContext = new AudioContextConstructor()
            soundtrackAudioContextRef.current = audioContext
            const sourceNode = audioContext.createMediaElementSource(soundtrack)
            soundtrackSourceNodeRef.current = sourceNode
            gainNode = audioContext.createGain()
            soundtrackGainNodeRef.current = gainNode
            sourceNode.connect(gainNode)
            gainNode.connect(audioContext.destination)
          }
          gainNode.gain.value = SOUNDTRACK_SCENE_VOLUME
          soundtrack.volume = 1
          const sourceNode = soundtrackSourceNodeRef.current
          void audioContext.resume().catch(() => {
            if (
              generationRef.current !== soundtrackGeneration
              || soundtrackStartAttemptRef.current !== soundtrackStartAttempt
              || soundtrackRef.current !== soundtrack
              || soundtrackAudioContextRef.current !== audioContext
              || soundtrackSourceNodeRef.current !== sourceNode
              || soundtrackGainNodeRef.current !== gainNode
            ) return
            soundtrackWebAudioFailedRef.current = true
            soundtrackFadeCleanupRef.current?.()
            soundtrackFadeCleanupRef.current = null
            soundtrack.pause()
          })
        } catch {
          soundtrackReady = false
          soundtrackWebAudioFailedRef.current = true
          soundtrackSourceNodeRef.current?.disconnect()
          soundtrackGainNodeRef.current?.disconnect()
          soundtrackSourceNodeRef.current = null
          soundtrackGainNodeRef.current = null
          const audioContext = soundtrackAudioContextRef.current
          soundtrackAudioContextRef.current = null
          if (audioContext) {
            try {
              void audioContext.close().catch(() => undefined)
            } catch {
              // Soundtrack setup is optional and must not block the assessment.
            }
          }
        }
      } else if (soundtrackReady) {
        soundtrack.volume = SOUNDTRACK_SCENE_VOLUME
      }

      if (soundtrackReady) {
        soundtrack.muted = state.muted
        try {
          soundtrack.currentTime = 0
        } catch {
          // Playback can still begin from the browser's current media position.
        }
        try {
          void soundtrack.play().catch(() => undefined)
        } catch {
          // Soundtrack playback is optional and must not block the assessment.
        }
      }
    }
    video.muted = state.muted
    const reportVisiblePlaybackIssue = monitorVisiblePlayback(
      video,
      generationRef.current,
      state.currentSceneIndex,
      state.activeBuffer,
      currentScene.id,
    )
    void video.play().catch(() => {
      reportVisiblePlaybackIssue('play_rejected')
    })
    dispatch({ type: 'START' })
    void createAssessmentSession(state.sessionId, attribution)
    trackAssessmentEvent('assessment_start', {
      session_id: state.sessionId,
      recovered: state.recovered,
    })
  }

  const showQuestion = () => {
    if (!['playing_scene', 'playing_next_scene'].includes(state.status)) return
    playbackMonitorCleanupRef.current?.()
    playbackMonitorCleanupRef.current = null
    if (state.status === 'playing_next_scene') dispatch({ type: 'SCENE_STABLE' })
    dispatch({ type: 'SHOW_QUESTION' })
    trackAssessmentEvent('question_shown', {
      session_id: state.sessionId,
      scene_id: currentScene.id,
      question_id: currentScene.question.id,
    })
  }

  function monitorVisiblePlayback(
    video: HTMLVideoElement,
    generation: number,
    sceneIndex: number,
    activeBuffer: 0 | 1,
    sceneId: string,
  ) {
    let monitorTimeout: number | null = null
    let lastCurrentTime = video.currentTime

    const cleanupMonitor = () => {
      if (monitorTimeout !== null) window.clearTimeout(monitorTimeout)
      monitorTimeout = null
      video.removeEventListener('pause', onPause)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('stalled', onStalled)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('timeupdate', onTimeUpdate)
      video.removeEventListener('ended', cleanupMonitor)
      if (playbackMonitorCleanupRef.current === cleanupMonitor) {
        playbackMonitorCleanupRef.current = null
      }
    }

    const reportIssue = (error: string) => {
      const live = stateRef.current
      if (
        generationRef.current !== generation
        || live.currentSceneIndex !== sceneIndex
        || live.activeBuffer !== activeBuffer
        || !['playing_scene', 'playing_next_scene'].includes(live.status)
      ) return
      cleanupMonitor()
      dispatch({ type: 'SET_PLAYBACK_ISSUE', message: error })
      trackAssessmentEvent('video_playback_error', {
        session_id: live.sessionId,
        scene_id: sceneId,
        error,
      })
    }

    const ensureDeadline = () => {
      if (monitorTimeout !== null) return
      monitorTimeout = window.setTimeout(
        () => reportIssue('visible_scene_no_progress'),
        4000,
      )
    }
    const resetDeadline = () => {
      if (monitorTimeout !== null) window.clearTimeout(monitorTimeout)
      monitorTimeout = null
      ensureDeadline()
    }
    const onPause = () => {
      if (video.ended) {
        cleanupMonitor()
        return
      }
      reportIssue('visible_scene_paused')
    }
    const onWaiting = () => ensureDeadline()
    const onStalled = () => ensureDeadline()
    const onPlaying = () => ensureDeadline()
    const onTimeUpdate = () => {
      if (video.currentTime <= lastCurrentTime + 0.01) return
      lastCurrentTime = video.currentTime
      resetDeadline()
    }

    playbackMonitorCleanupRef.current?.()
    video.addEventListener('pause', onPause)
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('stalled', onStalled)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('timeupdate', onTimeUpdate)
    video.addEventListener('ended', cleanupMonitor)
    playbackMonitorCleanupRef.current = cleanupMonitor
    ensureDeadline()
    return reportIssue
  }

  const runTransition = async () => {
    const current = activeVideo()
    const next = inactiveVideo() as FrameVideo | null
    const transition = transitionRef.current
    const hasAuthoredTransition = Boolean(currentScene.transitionVideoUrl)
    const runGeneration = generationRef.current
    const runSceneIndex = state.currentSceneIndex
    const runActiveBuffer = state.activeBuffer
    const isRunCurrent = () => {
      const live = stateRef.current
      return generationRef.current === runGeneration
        && live.currentSceneIndex === runSceneIndex
        && live.activeBuffer === runActiveBuffer
    }

    if (next && hasAuthoredTransition) {
      next.muted = true
      next.currentTime = 0
    }
    if (transition && hasAuthoredTransition) {
      transition.muted = state.muted
      transition.currentTime = 0
    }

    if (!hasAuthoredTransition) {
      if (!next) {
        dispatch({ type: 'FATAL_ERROR', message: '未能準備下一段影片。' })
        return
      }

      const preparation = preparationRef.current
      preparationRef.current = null
      preparation?.controller.abort()
      current?.pause()
      next.pause()
      try {
        next.currentTime = 0
      } catch {
        // Safari may reject a seek before metadata is available. The visible
        // buffer still gets the original click's play attempt and recovery UI.
      }
      next.muted = state.muted
      flushSync(() => {
        dispatch({ type: 'BEGIN_TRANSITION' })
        dispatch({ type: 'NEXT_SCENE_READY' })
      })
      const nextIndex = runSceneIndex + 1
      const nextBuffer = runActiveBuffer === 0 ? 1 : 0
      const reportVisiblePlaybackIssue = monitorVisiblePlayback(
        next,
        runGeneration,
        nextIndex,
        nextBuffer,
        nextScene.id,
      )
      try {
        void next.play().catch(() => reportVisiblePlaybackIssue('next_scene_play_rejected'))
      } catch {
        reportVisiblePlaybackIssue('next_scene_play_rejected')
      }
      return
    }

    transitionControllerRef.current?.abort()
    const transitionController = new AbortController()
    transitionControllerRef.current = transitionController

    const nextPlayback = next
      ? (() => {
          next.muted = true
          return next.play()
            .then(() => true)
            .catch(() => {
              if (isRunCurrent()) {
                trackAssessmentEvent('video_playback_error', {
                  session_id: state.sessionId,
                  scene_id: nextScene.id,
                  error: 'next_scene_play_rejected',
                })
              }
              return false
            })
        })()
      : Promise.resolve(false)
    const nextFrame = waitForActualFrame(next, 3000, transitionController.signal)

    const transitionDone = currentScene.transitionVideoUrl
      ? waitForMediaEnd(transition, reducedMotion ? 3500 : 6500, transitionController.signal)
      : new Promise<void>((resolve) => window.setTimeout(resolve, 260))
    if (transition && currentScene.transitionVideoUrl) {
      void transition.play().catch(() => trackAssessmentEvent('video_playback_error', {
        session_id: state.sessionId,
        scene_id: currentScene.id,
        error: 'transition_play_rejected',
      }))
    }

    const [, nextFrameReady, nextPlaybackReady] = await Promise.all([transitionDone, nextFrame, nextPlayback])
    if (!isRunCurrent()) return
    if (!next || !nextFrameReady || !nextPlaybackReady) {
      if (next) {
        next.muted = true
        next.pause()
      }
      dispatch({ type: 'NEXT_SCENE_FALLBACK' })
      return
    }

    // The priming play may have advanced the timeline while the video was
    // hidden. Rewind to a decoded first frame, then resume silently before the
    // buffer swap so the question starts from the beginning with no audio lead.
    const firstFrameReady = await rewindToFirstFrame(next, 1500, transitionController.signal)
    if (!isRunCurrent()) return
    if (!firstFrameReady) {
      next.muted = true
      next.pause()
      dispatch({ type: 'NEXT_SCENE_FALLBACK' })
      return
    }
    next.muted = true
    const resumedSilently = await next.play().then(() => true).catch(() => false)
    if (!isRunCurrent()) return
    if (!resumedSilently) {
      next.muted = true
      next.pause()
      dispatch({ type: 'NEXT_SCENE_FALLBACK' })
      return
    }

    monitorVisiblePlayback(
      next,
      runGeneration,
      runSceneIndex + 1,
      runActiveBuffer === 0 ? 1 : 0,
      nextScene.id,
    )
    current?.pause()
    dispatch({ type: 'BEGIN_TRANSITION' })
    trackAssessmentEvent('transition_started', {
      session_id: state.sessionId,
      scene_id: currentScene.id,
    })
    dispatch({ type: 'NEXT_SCENE_READY' })
    trackAssessmentEvent('transition_completed', {
      session_id: state.sessionId,
      scene_id: currentScene.id,
    })
  }

  const confirmAnswer = (optionIds: string[]) => {
    if (state.status !== 'showing_question') return
    dispatch({ type: 'SUBMIT_ANSWER', questionId: currentScene.question.id, optionIds })
    trackAssessmentEvent('answer_selected', {
      session_id: state.sessionId,
      scene_id: currentScene.id,
      question_id: currentScene.question.id,
      option_ids: optionIds,
    })
    void persistAssessmentAnswer(state.sessionId, currentScene.question.id, optionIds)

    if (!nextScene) {
      if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current)
      const completionGeneration = generationRef.current
      const completionSessionId = state.sessionId
      const completionSceneIndex = state.currentSceneIndex
      completionTimerRef.current = window.setTimeout(() => {
        completionTimerRef.current = null
        const live = stateRef.current
        if (
          generationRef.current !== completionGeneration
          || live.sessionId !== completionSessionId
          || live.currentSceneIndex !== completionSceneIndex
          || live.status !== 'submitting_answer'
        ) return
        dispatch({ type: 'FINISH' })
        trackAssessmentEvent('assessment_completed', {
          session_id: completionSessionId,
          result_type: calculateAssessmentResult(
            assessmentConfig,
            { ...state.answers, [currentScene.question.id]: optionIds },
          ).id,
        })
      }, reducedMotion ? 100 : 320)
      return
    }

    void runTransition()
  }

  const toggleMuted = () => dispatch({ type: 'SET_MUTED', muted: !state.muted })

  const trackWhatsAppClick = (source: 'header' | 'result') => {
    trackAssessmentEvent('whatsapp_clicked', {
      session_id: state.sessionId,
      source,
    })
  }

  const resumePlayback = () => {
    const video = activeVideo()
    if (!video) return
    const recoveryGeneration = generationRef.current
    const recoverySceneIndex = state.currentSceneIndex
    const recoveryBuffer = state.activeBuffer
    const isRecoveryCurrent = () => {
      const live = stateRef.current
      return generationRef.current === recoveryGeneration
        && live.currentSceneIndex === recoverySceneIndex
        && live.activeBuffer === recoveryBuffer
        && ['playing_scene', 'playing_next_scene'].includes(live.status)
        && activeVideo() === video
    }

    playbackMonitorCleanupRef.current?.()
    playbackMonitorCleanupRef.current = null
    video.pause()
    try {
      video.load()
    } catch {
      // A play attempt in the recovery gesture can still succeed even when a
      // browser throws while explicitly reloading the failed resource.
    }
    try {
      video.currentTime = 0
    } catch {
      // Metadata may not be available until after the synchronous play call.
    }
    video.muted = state.muted
    const reportVisiblePlaybackIssue = monitorVisiblePlayback(
      video,
      recoveryGeneration,
      recoverySceneIndex,
      recoveryBuffer,
      currentScene.id,
    )

    const clearPlaybackIssue = () => {
      if (isRecoveryCurrent()) dispatch({ type: 'SET_PLAYBACK_ISSUE' })
    }
    const retryMuted = () => {
      if (!isRecoveryCurrent()) return
      video.muted = true
      dispatch({ type: 'SET_MUTED', muted: true })
      try {
        void video.play()
          .then(clearPlaybackIssue)
          .catch(() => reportVisiblePlaybackIssue('manual_play_rejected'))
      } catch {
        reportVisiblePlaybackIssue('manual_play_rejected')
      }
    }

    try {
      void video.play()
        .then(clearPlaybackIssue)
        .catch(() => {
          retryMuted()
        })
    } catch {
      retryMuted()
    }
  }

  const restart = () => {
    if (completionTimerRef.current !== null) window.clearTimeout(completionTimerRef.current)
    completionTimerRef.current = null
    generationRef.current += 1
    preparationRef.current?.controller.abort()
    preparationRef.current = null
    transitionControllerRef.current?.abort()
    transitionControllerRef.current = null
    playbackMonitorCleanupRef.current?.()
    playbackMonitorCleanupRef.current = null
    soundtrackFadeCleanupRef.current?.()
    soundtrackFadeCleanupRef.current = null
    const soundtrack = soundtrackRef.current
    soundtrack?.pause()
    if (soundtrack) {
      try {
        soundtrack.currentTime = 0
      } catch {
        // Some browsers reject seeking before soundtrack metadata is ready.
      }
    }
    for (const video of [sceneARef.current, sceneBRef.current, transitionRef.current]) {
      video?.pause()
      if (video) video.currentTime = 0
    }
    setLeadSubmitted(false)
    clearCompletedSession()
    dispatch({ type: 'RESTART' })
    trackAssessmentEvent('assessment_restarted', { session_id: state.sessionId })
  }

  const submitLead = async (input: AssessmentLeadInput) => {
    setSubmittingLead(true)
    try {
      await submitAssessmentLead(input, state.sessionId, state.answers, attribution)
      setLeadSubmitted(true)
      clearCompletedSession()
      trackAssessmentEvent('lead_submitted', {
        session_id: state.sessionId,
        result_type: result.id,
      })
    } finally {
      setSubmittingLead(false)
    }
  }

  if (state.status === 'fatal_error') {
    return (
      <main className="grid min-h-[100dvh] place-items-center bg-a2o-beige p-6 text-center">
        <div className="max-w-sm">
          <img src="/images/a2o-logo.png" alt="A₂O Style Lab" className="mx-auto h-10 w-auto" />
          <h1 className="mt-6 text-2xl font-semibold">暫時未能載入診斷</h1>
          <p className="mt-2 text-sm text-a2o-black/60">{state.playbackIssue}</p>
          <button type="button" onClick={restart} className="btn-primary mt-6">重新嘗試</button>
        </div>
      </main>
    )
  }

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#171310]">
      <audio
        ref={soundtrackRef}
        src="/media/assessment/soundtrack.mp3"
        preload="auto"
        loop
        aria-hidden="true"
      />
      <div
        data-testid="assessment-ambience"
        className="absolute inset-[-3rem] scale-110 bg-cover bg-center opacity-25 blur-3xl"
        style={{ backgroundImage: `url(${assessmentConfig.opening.posterUrl})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/45" aria-hidden="true" />

      <div className="assessment-stage relative mx-auto overflow-hidden bg-[#191512] shadow-2xl">
        <SceneVideoBuffer
          ref={sceneARef}
          src={sourceA}
          poster={posterA}
          active={state.activeBuffer === 0}
          muted={state.activeBuffer === 0 ? state.muted : true}
          onEnded={showQuestion}
          onError={() => reportActiveSceneLoadError(0, renderGeneration, renderSceneIndex)}
        />
        <SceneVideoBuffer
          ref={sceneBRef}
          src={sourceB}
          poster={posterB}
          active={state.activeBuffer === 1}
          muted={state.activeBuffer === 1 ? state.muted : true}
          onEnded={showQuestion}
          onError={() => reportActiveSceneLoadError(1, renderGeneration, renderSceneIndex)}
        />
        <TransitionVideoLayer
          ref={transitionRef}
          src={currentScene.transitionVideoUrl}
          visible={isTransitioning}
          muted={state.muted}
          onError={() => trackAssessmentEvent('video_playback_error', {
            session_id: state.sessionId,
            scene_id: currentScene.id,
            error: 'transition_load_error',
          })}
        />

        <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-b from-black/45 via-transparent to-black/65" aria-hidden="true" />

        <header className="absolute inset-x-0 top-0 z-50 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
          <div className="rounded-full bg-white/85 px-3 py-2 shadow-sm backdrop-blur">
            <img src="/images/a2o-logo.png" alt="A₂O Style Lab" className="h-5 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            {!isReady && state.status !== 'completed' && (
              <span className="rounded-full bg-black/45 px-3 py-2 text-xs font-semibold tabular-nums text-white backdrop-blur">
                {Math.min(state.currentSceneIndex + 1, scenes.length)} / {scenes.length}
              </span>
            )}
            <button
              type="button"
              onClick={toggleMuted}
              aria-label={state.muted ? '開啟聲音' : '靜音'}
              className="grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a2o-pink"
            >
              {state.muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {!isReady && state.status !== 'completed' && (
              <a
                href={ASSESSMENT_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackWhatsAppClick('header')}
                aria-label={ASSESSMENT_WHATSAPP_LABEL}
                className="grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a2o-pink"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
          </div>
        </header>

        {isReady && (
          <section
            data-testid="assessment-opening"
            className="absolute inset-0 z-40 flex items-end px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] text-white sm:items-center sm:pb-8"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0, 0, 0, 0.32), rgba(0, 0, 0, 0.08) 40%, rgba(0, 0, 0, 0.86)), url(${assessmentConfig.opening.posterUrl})`,
              backgroundPosition: 'center',
              backgroundSize: 'cover',
            }}
          >
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto w-full max-w-md text-center"
            >
              {state.status === 'boot' ? (
                <LoaderCircle className="mx-auto h-7 w-7 animate-spin" aria-label="載入診斷" />
              ) : (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/65">A₂O Style Lab</p>
                  <h1 className="mt-4 font-serif text-3xl font-medium leading-tight sm:text-4xl">{assessmentConfig.opening.headline}</h1>
                  <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/75 sm:text-base">{assessmentConfig.opening.supportingText}</p>
                  <button
                    type="button"
                    onClick={start}
                    className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-a2o-pink px-6 py-4 text-base font-semibold text-white shadow-xl transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.98]"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    {assessmentConfig.opening.cta}
                  </button>
                  <p className="mt-3 text-xs text-white/50">{assessmentConfig.opening.note}</p>
                </>
              )}
            </motion.div>
          </section>
        )}

        {!isReady && !isQuestionVisible && state.status !== 'completed' && currentScene.caption && (
          <p className="absolute inset-x-5 bottom-[calc(env(safe-area-inset-bottom)+2rem)] z-20 mx-auto max-w-sm rounded-2xl bg-black/45 px-4 py-3 text-center text-sm leading-relaxed text-white/90 backdrop-blur" aria-live="polite">
            {currentScene.caption}
          </p>
        )}

        {isQuestionVisible && (
          <QuestionOverlay
            question={currentScene.question}
            progress={`${state.currentSceneIndex + 1} / ${scenes.length}`}
            disabled={state.status === 'submitting_answer'}
            onConfirm={confirmAnswer}
          />
        )}

        {state.playbackIssue && state.status !== 'completed' && (
          <div className="absolute inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-3xl border border-white/15 bg-black/75 p-5 text-center text-white shadow-2xl backdrop-blur-xl">
            <p className="text-sm">影片暫停了，你仍然可以繼續診斷。</p>
            <button
              type="button"
              onClick={resumePlayback}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-a2o-black"
            >
              <Play className="h-4 w-4 fill-current" /> 點擊播放影片
            </button>
          </div>
        )}

        <div className="sr-only" aria-live="polite">
          {isQuestionVisible ? `第 ${state.currentSceneIndex + 1} 題：${currentScene.question.title}` : ''}
        </div>

        {state.status === 'completed' && (
          <AssessmentResult
            submitted={leadSubmitted}
            submitting={submittingLead}
            onSubmit={submitLead}
            onWhatsAppClick={() => trackWhatsAppClick('result')}
          />
        )}
      </div>
    </main>
  )
}
