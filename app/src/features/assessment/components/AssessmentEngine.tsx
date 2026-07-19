import { useEffect, useMemo, useRef, useState } from 'react'
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
import type { AssessmentLeadInput } from '../types/assessment'
import { AssessmentResult } from './AssessmentResult'
import { QuestionOverlay } from './QuestionOverlay'
import { SceneVideoBuffer } from './SceneVideoBuffer'
import { TransitionVideoLayer } from './TransitionVideoLayer'

const assessmentConfig = getAssessmentConfig()
const enabledAssessmentScenes = getEnabledAssessmentScenes()

type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number
}

function waitForMediaEnd(video: HTMLVideoElement | null, timeoutMs = 6500) {
  if (!video) return Promise.resolve()
  return new Promise<void>((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('ended', finish)
      video.removeEventListener('error', finish)
      resolve()
    }
    const timeout = window.setTimeout(finish, timeoutMs)
    video.addEventListener('ended', finish, { once: true })
    video.addEventListener('error', finish, { once: true })
  })
}

function waitForActualFrame(video: FrameVideo | null, timeoutMs = 3000) {
  if (!video) return Promise.resolve(false)
  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('loadeddata', onLoadedData)
      resolve(ready)
    }
    const onLoadedData = () => {
      if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(() => finish(true))
      else finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
    }
    const timeout = window.setTimeout(() => finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA), timeoutMs)

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onLoadedData()
    else video.addEventListener('loadeddata', onLoadedData, { once: true })
  })
}

function rewindToFirstFrame(video: HTMLVideoElement, timeoutMs = 1500) {
  video.pause()

  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      resolve(ready)
    }
    const onSeeked = () => finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
    const onError = () => finish(false)
    const timeout = window.setTimeout(
      () => finish(video.currentTime <= 0.05 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA),
      timeoutMs,
    )

    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    const alreadyAtStart = video.currentTime <= 0.05
    video.currentTime = 0

    if (alreadyAtStart && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish(true)
  })
}

export function AssessmentEngine() {
  const { state, dispatch, clearCompletedSession } = useAssessmentMachine()
  const reducedMotion = useReducedMotion()
  const sceneARef = useRef<HTMLVideoElement>(null)
  const sceneBRef = useRef<HTMLVideoElement>(null)
  const transitionRef = useRef<HTMLVideoElement>(null)
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

  const runTransition = async () => {
    const current = activeVideo()
    const next = inactiveVideo() as FrameVideo | null
    const transition = transitionRef.current
    const hasAuthoredTransition = Boolean(currentScene.transitionVideoUrl)

    if (next) {
      // Direct scene changes start inside the answer click so mobile browsers
      // keep the user's audio permission. Authored transitions stay silent
      // while their hidden next buffer is being prepared.
      next.muted = hasAuthoredTransition ? true : state.muted
      next.currentTime = 0
    }
    if (transition) {
      transition.muted = state.muted
      transition.currentTime = 0
    }

    const nextPlayback = next
      ? next.play()
        .then(() => true)
        .catch(() => {
          trackAssessmentEvent('video_playback_error', {
            session_id: state.sessionId,
            scene_id: nextScene.id,
            error: 'next_scene_play_rejected',
          })
          return false
        })
      : Promise.resolve(false)
    const nextFrame = waitForActualFrame(next)

    if (!hasAuthoredTransition) {
      const [nextFrameReady, nextPlaybackReady] = await Promise.all([nextFrame, nextPlayback])
      if (!next || !nextFrameReady || !nextPlaybackReady) {
        dispatch({ type: 'NEXT_SCENE_FALLBACK' })
        return
      }

      current?.pause()
      dispatch({ type: 'BEGIN_TRANSITION' })
      dispatch({ type: 'NEXT_SCENE_READY' })
      return
    }

    const transitionDone = currentScene.transitionVideoUrl
      ? waitForMediaEnd(transition, reducedMotion ? 3500 : 6500)
      : new Promise<void>((resolve) => window.setTimeout(resolve, 260))
    if (transition && currentScene.transitionVideoUrl) {
      void transition.play().catch(() => trackAssessmentEvent('video_playback_error', {
        session_id: state.sessionId,
        scene_id: currentScene.id,
        error: 'transition_play_rejected',
      }))
    }

    const [, nextFrameReady, nextPlaybackReady] = await Promise.all([transitionDone, nextFrame, nextPlayback])
    if (!next || !nextFrameReady || !nextPlaybackReady) {
      dispatch({ type: 'NEXT_SCENE_FALLBACK' })
      return
    }

    // The priming play may have advanced the timeline while the video was
    // hidden. Rewind to a decoded first frame, then resume silently before the
    // buffer swap so the question starts from the beginning with no audio lead.
    const firstFrameReady = await rewindToFirstFrame(next)
    if (!firstFrameReady) {
      dispatch({ type: 'NEXT_SCENE_FALLBACK' })
      return
    }
    const resumedSilently = await next.play().then(() => true).catch(() => false)
    if (!resumedSilently) {
      dispatch({ type: 'NEXT_SCENE_FALLBACK' })
      return
    }

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
        className="absolute inset-[-3rem] scale-110 bg-cover bg-center opacity-25 blur-3xl"
        style={{ backgroundImage: `url(${currentScene.posterUrl})` }}
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
          <section className="absolute inset-0 z-40 flex items-end bg-gradient-to-b from-black/20 via-black/5 to-black/80 px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] text-white sm:items-center sm:pb-8">
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
                    {state.recovered ? assessmentConfig.opening.resumeCta : assessmentConfig.opening.cta}
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
