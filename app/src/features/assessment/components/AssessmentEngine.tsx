import { useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { LoaderCircle, Play, RotateCcw, Volume2, VolumeX } from 'lucide-react'
import { useAssessmentMachine } from '../hooks/useAssessmentMachine'
import { useVideoPreloader } from '../hooks/useVideoPreloader'
import { getAssessmentConfig, getEnabledAssessmentScenes } from '../services/assessmentConfigRepository'
import { getAttribution } from '../services/attribution'
import { trackAssessmentEvent } from '../services/analytics'
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
  status: 'pending' | 'ready' | 'failed'
}

export function AssessmentEngine() {
  const { state, dispatch, clearCompletedSession } = useAssessmentMachine()
  const reducedMotion = useReducedMotion()
  const sceneARef = useRef<HTMLVideoElement>(null)
  const sceneBRef = useRef<HTMLVideoElement>(null)
  const transitionRef = useRef<HTMLVideoElement>(null)
  const generationRef = useRef(0)
  const stateRef = useRef(state)
  const preparationRef = useRef<NextPreparation | null>(null)
  const transitionControllerRef = useRef<AbortController | null>(null)
  const playbackMonitorCleanupRef = useRef<(() => void) | null>(null)
  const [, setPreparationRevision] = useState(0)
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
  const preparationMatchesCurrent = (preparation: NextPreparation | null) => Boolean(
    preparation
    && preparation.generation === generationRef.current
    && preparation.sceneIndex === state.currentSceneIndex
    && preparation.activeBuffer === state.activeBuffer
    && preparation.nextSceneId === nextScene?.id,
  )
  const directPreparation = preparationMatchesCurrent(preparationRef.current)
    ? preparationRef.current
    : null
  const isDirectPreparationPending = Boolean(
    nextScene
    && !currentScene.transitionVideoUrl
    && (!directPreparation || directPreparation.status === 'pending'),
  )

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
  }, [state.activeBuffer, state.muted])

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
      status: 'pending',
    }
    preparationRef.current = preparation
    setPreparationRevision((value) => value + 1)
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
    ).then((ready) => {
      if (!isCurrent() || preparationRef.current !== preparation) return
      preparation.status = ready ? 'ready' : 'failed'
      setPreparationRevision((value) => value + 1)
    })
  }, [currentScene.transitionVideoUrl, nextScene, state.activeBuffer, state.currentSceneIndex, state.status])

  useEffect(() => () => {
    generationRef.current += 1
    preparationRef.current?.controller.abort()
    transitionControllerRef.current?.abort()
    playbackMonitorCleanupRef.current?.()
  }, [])

  const reportPlaybackIssue = (message: string) => {
    dispatch({ type: 'SET_PLAYBACK_ISSUE', message })
    trackAssessmentEvent('video_playback_error', {
      session_id: state.sessionId,
      scene_id: currentScene.id,
      error: message,
    })
  }

  const fallBackToCurrentQuestion = (message: string) => {
    trackAssessmentEvent('video_playback_error', {
      session_id: state.sessionId,
      scene_id: currentScene.id,
      error: message,
    })
    dispatch({ type: 'SHOW_QUESTION' })
  }

  const start = () => {
    const video = activeVideo()
    if (!video) {
      dispatch({ type: 'FATAL_ERROR', message: '未能準備第一段影片。' })
      return
    }
    video.muted = state.muted
    void video.play().catch(() => fallBackToCurrentQuestion('play_rejected'))
    dispatch({ type: 'START' })
    void createAssessmentSession(state.sessionId, attribution)
    trackAssessmentEvent('assessment_start', {
      session_id: state.sessionId,
      recovered: state.recovered,
    })
  }

  const showQuestion = () => {
    if (state.status !== 'playing_scene') return
    dispatch({ type: 'SHOW_QUESTION' })
    trackAssessmentEvent('question_shown', {
      session_id: state.sessionId,
      scene_id: currentScene.id,
      question_id: currentScene.question.id,
    })
  }

  const handleTimeUpdate = () => {
    const video = activeVideo()
    if (video && video.currentTime >= currentScene.questionCueSeconds) showQuestion()
  }

  const monitorVisiblePlayback = (
    video: HTMLVideoElement,
    generation: number,
    sceneIndex: number,
    activeBuffer: 0 | 1,
    sceneId: string,
  ) => {
    const reportIssue = (error: string) => {
      const live = stateRef.current
      if (
        generationRef.current !== generation
        || live.currentSceneIndex !== sceneIndex
        || live.activeBuffer !== activeBuffer
      ) return
      dispatch({ type: 'SET_PLAYBACK_ISSUE', message: error })
      trackAssessmentEvent('video_playback_error', {
        session_id: live.sessionId,
        scene_id: sceneId,
        error,
      })
    }

    playbackMonitorCleanupRef.current?.()
    const onPolicyPause = () => reportIssue('next_scene_policy_paused')
    video.addEventListener('pause', onPolicyPause, { once: true })
    const monitorTimeout = window.setTimeout(() => {
      video.removeEventListener('pause', onPolicyPause)
      if (playbackMonitorCleanupRef.current === cleanupMonitor) {
        playbackMonitorCleanupRef.current = null
      }
    }, 1000)
    const cleanupMonitor = () => {
      window.clearTimeout(monitorTimeout)
      video.removeEventListener('pause', onPolicyPause)
    }
    playbackMonitorCleanupRef.current = cleanupMonitor
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
      const preparation = preparationRef.current
      if (!next || !preparationMatchesCurrent(preparation) || preparation?.status !== 'ready') {
        if (next) {
          next.muted = true
          next.pause()
        }
        trackAssessmentEvent('video_playback_error', {
          session_id: state.sessionId,
          scene_id: nextScene.id,
          error: 'next_scene_play_rejected',
        })
        dispatch({ type: 'NEXT_SCENE_FALLBACK' })
        return
      }

      current?.pause()
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
      void next.play().catch(() => reportVisiblePlaybackIssue('next_scene_play_rejected'))
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
      window.setTimeout(() => {
        dispatch({ type: 'FINISH' })
        trackAssessmentEvent('assessment_completed', {
          session_id: state.sessionId,
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

  const resumePlayback = () => {
    const video = activeVideo()
    if (!video) return
    void video.play()
      .then(() => dispatch({ type: 'SET_PLAYBACK_ISSUE' }))
      .catch(() => {
        video.muted = true
        dispatch({ type: 'SET_MUTED', muted: true })
        void video.play()
          .then(() => dispatch({ type: 'SET_PLAYBACK_ISSUE' }))
          .catch(() => reportPlaybackIssue('manual_play_rejected'))
      })
  }

  const restart = () => {
    generationRef.current += 1
    preparationRef.current?.controller.abort()
    preparationRef.current = null
    transitionControllerRef.current?.abort()
    transitionControllerRef.current = null
    playbackMonitorCleanupRef.current?.()
    playbackMonitorCleanupRef.current = null
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
          onTimeUpdate={handleTimeUpdate}
          onEnded={showQuestion}
          onError={() => fallBackToCurrentQuestion('scene_load_error')}
        />
        <SceneVideoBuffer
          ref={sceneBRef}
          src={sourceB}
          poster={posterB}
          active={state.activeBuffer === 1}
          muted={state.activeBuffer === 1 ? state.muted : true}
          onTimeUpdate={handleTimeUpdate}
          onEnded={showQuestion}
          onError={() => fallBackToCurrentQuestion('scene_load_error')}
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
              <button
                type="button"
                onClick={restart}
                aria-label="重新開始診斷"
                className="grid h-10 w-10 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-a2o-pink"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
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
            disabled={state.status === 'submitting_answer' || isDirectPreparationPending}
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
              <Play className="h-4 w-4 fill-current" /> 點擊繼續播放
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
            onRestart={restart}
          />
        )}
      </div>
    </main>
  )
}
