# Safari Video Playback and Soundtrack Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all four replacement question videos play in order on Safari and Chrome, while adding the approved looping soundtrack with dialogue/overlay volume ducking and shared mute control.

**Architecture:** Keep the existing double-buffer assessment engine, but stop treating hidden preparation failure as permission to skip a video. A next-scene answer gesture always commits the next buffer visibly and attempts playback; rejection stays on that video with manual recovery. A dedicated audio element and small volume-fade service manage the soundtrack independently from CRM and lead submission.

**Tech Stack:** Vite, React 18, TypeScript, Vitest, Testing Library, HTMLMediaElement, macOS `avconvert`, Vercel.

---

## File Map

- Modify `app/src/features/assessment/components/AssessmentEngine.tsx`: next-video transition rules, media recovery, soundtrack element, mute/restart lifecycle.
- Modify `app/src/features/assessment/components/AssessmentEngine.test.tsx`: Safari playback and soundtrack behaviour regressions.
- Modify `app/src/features/assessment/services/videoPlayback.ts`: replace paused decoded-frame gating with current-data preload readiness.
- Modify `app/src/features/assessment/services/videoPlayback.test.ts`: Safari-like preparation coverage.
- Create `app/src/features/assessment/services/audioVolume.ts`: cancellable requestAnimationFrame volume fade.
- Create `app/src/features/assessment/services/audioVolume.test.ts`: deterministic fade tests.
- Replace `app/public/media/assessment/question-01.mp4` through `question-04.mp4`: converted supplied MOV assets.
- Create `app/public/media/assessment/soundtrack.mp3`: supplied background music.
- Modify `app/public/media/assessment/README.md`: asset order and soundtrack behaviour.
- Do not modify CRM pages, authentication, submission services, Supabase integration, or Google Sheet integration.

### Task 1: Lock Safari No-Skip Behaviour With Failing Tests

**Files:**
- Modify: `app/src/features/assessment/components/AssessmentEngine.test.tsx`
- Modify: `app/src/features/assessment/services/videoPlayback.test.ts`

- [ ] **Step 1: Add a failing Safari preparation test**

Add a service test whose video has `HAVE_CURRENT_DATA`, exposes
`requestVideoFrameCallback`, but never invokes it while paused:

```ts
it('prepares a Safari-like paused hidden buffer from current data without a frame callback', async () => {
  const video = createReadyVideo()
  video.requestVideoFrameCallback = vi.fn(() => 41)
  const play = vi.spyOn(video, 'play').mockResolvedValue()
  const pause = vi.spyOn(video, 'pause').mockImplementation(() => undefined)

  await expect(prepareHiddenVideoForSwap(video, 20, 20)).resolves.toBe(true)

  expect(play).not.toHaveBeenCalled()
  expect(pause).toHaveBeenCalled()
  expect(video.currentTime).toBe(0)
})
```

- [ ] **Step 2: Add a failing engine test that forbids question fallback**

Simulate failed preparation, answer question 1, and assert question 2 remains
hidden while its video becomes visible and manual recovery is offered:

```ts
it('never skips q2 when Safari cannot prepare the hidden buffer', async () => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function () {
    if (this.getAttribute('src')?.includes('question-02')) {
      return Promise.reject(new Error('Safari policy'))
    }
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  const user = userEvent.setup()
  const { container } = render(<AssessmentEngine />)
  const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
  const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement

  await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
  fireEvent.ended(firstVideo)
  await user.click(await screen.findByRole('radio', { name: '6' }))

  expect(secondVideo).toHaveClass('z-10')
  expect(screen.queryByRole('heading', { name: '你認為目前形象最影響到你邊一個場合？' })).not.toBeInTheDocument()
  expect(await screen.findByRole('button', { name: '點擊播放影片' })).toBeInTheDocument()
})
```

- [ ] **Step 3: Run the two targeted tests and verify RED**

Run:

```bash
cd app
npm test -- src/features/assessment/services/videoPlayback.test.ts src/features/assessment/components/AssessmentEngine.test.tsx
```

Expected: the new Safari preparation assertion and no-skip assertion fail for
the current fallback implementation.

- [ ] **Step 4: Commit the red tests**

```bash
git add app/src/features/assessment/services/videoPlayback.test.ts app/src/features/assessment/components/AssessmentEngine.test.tsx
git commit -m "test: reproduce Safari assessment video skip"
```

### Task 2: Replace Fragile Hidden Preparation Gate

**Files:**
- Modify: `app/src/features/assessment/services/videoPlayback.ts`
- Modify: `app/src/features/assessment/services/videoPlayback.test.ts`

- [ ] **Step 1: Add a current-data readiness helper**

Implement a bounded helper that pauses and mutes the buffer, seeks to zero, and
resolves from `loadeddata`/existing `readyState` without calling `play()` or
requiring `requestVideoFrameCallback`:

```ts
function waitForCurrentDataAtStart(
  video: HTMLVideoElement,
  timeoutMs: number,
  signal?: AbortSignal,
) {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('loadeddata', onReady)
      video.removeEventListener('error', onError)
      signal?.removeEventListener('abort', onAbort)
      resolve(ready)
    }
    const onReady = () => finish(
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      && video.currentTime <= 0.05,
    )
    const onError = () => finish(false)
    const onAbort = () => finish(false)
    const timeout = window.setTimeout(() => finish(false), timeoutMs)
    video.addEventListener('loadeddata', onReady, { once: true })
    video.addEventListener('error', onError, { once: true })
    signal?.addEventListener('abort', onAbort, { once: true })
    if (signal?.aborted) onAbort()
    else if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) onReady()
    else video.load()
  })
}
```

- [ ] **Step 2: Make `prepareHiddenVideoForSwap` use current-data readiness**

The function must set `muted = true`, pause, seek to zero, call the bounded
helper, respect `signal` and `isCurrent`, and leave the video paused at zero. It
must not call hidden `play()`.

- [ ] **Step 3: Update obsolete two-frame expectations**

Keep tests for `waitForActualFrame` and `rewindToFirstFrame` where those helpers
remain used by authored transitions, but change direct-swap preparation tests to
expect no hidden `play()` and no paused frame callback.

- [ ] **Step 4: Run service tests and verify GREEN**

```bash
cd app
npm test -- src/features/assessment/services/videoPlayback.test.ts
```

Expected: all `videoPlayback` tests pass.

- [ ] **Step 5: Commit preparation fix**

```bash
git add app/src/features/assessment/services/videoPlayback.ts app/src/features/assessment/services/videoPlayback.test.ts
git commit -m "fix: prepare Safari video buffers without hidden playback"
```

### Task 3: Guarantee Every Next Video Scene Before Its Question

**Files:**
- Modify: `app/src/features/assessment/components/AssessmentEngine.tsx`
- Modify: `app/src/features/assessment/components/AssessmentEngine.test.tsx`

- [ ] **Step 1: Remove the direct skip-to-question branch**

In the no-authored-transition path, require only that `next` exists. If it does
not, dispatch `FATAL_ERROR`. Otherwise pause the current video, set the next
video to time zero and the current mute state, then use `flushSync` to dispatch
`BEGIN_TRANSITION` and `NEXT_SCENE_READY` before calling `next.play()` in the
answer gesture.

```ts
if (!hasAuthoredTransition) {
  if (!next) {
    dispatch({ type: 'FATAL_ERROR', message: '未能準備下一段影片。' })
    return
  }
  current?.pause()
  next.pause()
  next.currentTime = 0
  next.muted = state.muted
  flushSync(() => {
    dispatch({ type: 'BEGIN_TRANSITION' })
    dispatch({ type: 'NEXT_SCENE_READY' })
  })
  const reportIssue = monitorVisiblePlayback(
    next,
    runGeneration,
    runSceneIndex + 1,
    runActiveBuffer === 0 ? 1 : 0,
    nextScene.id,
  )
  void next.play().catch(() => reportIssue('next_scene_play_rejected'))
  return
}
```

- [ ] **Step 2: Stop active media errors from revealing a question**

Replace `fallBackToCurrentQuestion('scene_load_error')` on the two active scene
buffers with a handler that logs the error and dispatches
`SET_PLAYBACK_ISSUE`. Leave the scene index and playback status unchanged.

- [ ] **Step 3: Use the approved recovery label**

Change the recovery button accessible name and visible text to
`點擊播放影片`. The button calls the existing `resumePlayback`, and options stay
hidden until the active video's `ended` event.

- [ ] **Step 4: Extend tests through questions 3 and 4**

Add one table-driven regression that answers each visible question, rejects the
next video's first play, confirms recovery without options, resumes it, emits
`ended`, and only then sees the corresponding question overlay.

- [ ] **Step 5: Run engine tests and verify GREEN**

```bash
cd app
npm test -- src/features/assessment/components/AssessmentEngine.test.tsx
```

Expected: all engine tests pass and the earlier no-skip test is green.

- [ ] **Step 6: Commit transition fix**

```bash
git add app/src/features/assessment/components/AssessmentEngine.tsx app/src/features/assessment/components/AssessmentEngine.test.tsx
git commit -m "fix: never skip assessment videos on Safari"
```

### Task 4: Add Tested Soundtrack Volume Control

**Files:**
- Create: `app/src/features/assessment/services/audioVolume.ts`
- Create: `app/src/features/assessment/services/audioVolume.test.ts`

- [ ] **Step 1: Write failing fade tests**

Test that a 0.10-to-0.18 fade reaches the target, clamps targets to 0..1, and
that cleanup cancels the pending frame without later volume changes.

```ts
it('fades to the requested soundtrack volume', () => {
  const audio = document.createElement('audio')
  audio.volume = 0.10
  const cancel = fadeAudioVolume(audio, 0.18, 240)
  runAnimationFrameAt(0)
  runAnimationFrameAt(120)
  runAnimationFrameAt(240)
  expect(audio.volume).toBeCloseTo(0.18)
  cancel()
})
```

- [ ] **Step 2: Run the test and verify RED**

```bash
cd app
npm test -- src/features/assessment/services/audioVolume.test.ts
```

Expected: FAIL because `fadeAudioVolume` does not exist.

- [ ] **Step 3: Implement cancellable volume fading**

Export `fadeAudioVolume(audio, target, durationMs)` returning a cleanup
function. Use `requestAnimationFrame`, linear interpolation from the starting
volume, clamp the target to `0..1`, and cancel the frame on cleanup.

- [ ] **Step 4: Run tests and verify GREEN**

```bash
cd app
npm test -- src/features/assessment/services/audioVolume.test.ts
```

Expected: all audio volume tests pass.

- [ ] **Step 5: Commit the audio service**

```bash
git add app/src/features/assessment/services/audioVolume.ts app/src/features/assessment/services/audioVolume.test.ts
git commit -m "feat: add soundtrack volume fading"
```

### Task 5: Integrate Soundtrack Into the Assessment

**Files:**
- Modify: `app/src/features/assessment/components/AssessmentEngine.tsx`
- Modify: `app/src/features/assessment/components/AssessmentEngine.test.tsx`

- [ ] **Step 1: Write failing soundtrack lifecycle tests**

Assert that starting the assessment calls soundtrack `play()`, the audio is
looping, question overlays target 0.18, video scenes target 0.10, mute affects
both media layers, restart pauses and rewinds the soundtrack, and a rejected
soundtrack play does not block question 1.

- [ ] **Step 2: Run engine tests and verify RED**

```bash
cd app
npm test -- src/features/assessment/components/AssessmentEngine.test.tsx
```

Expected: soundtrack element/lifecycle assertions fail.

- [ ] **Step 3: Add the soundtrack element and refs**

Render this non-visual media element inside the assessment stage:

```tsx
<audio
  ref={soundtrackRef}
  src="/media/assessment/soundtrack.mp3"
  preload="auto"
  loop
  aria-hidden="true"
/>
```

On `start`, set volume `0.10`, apply `state.muted`, rewind, and call `play()` in
the same gesture. Catch rejection without changing assessment status.

- [ ] **Step 4: Add approved volume and lifecycle effects**

Use `fadeAudioVolume` with a 240 ms fade. Target `0.10` during
`playing_scene`, `playing_next_scene`, and `transitioning`; target `0.18` during
`showing_question`, `submitting_answer`, and `completed`. Synchronize
`soundtrack.muted` with `state.muted`. Restart and unmount pause and rewind it.

- [ ] **Step 5: Run engine tests and verify GREEN**

```bash
cd app
npm test -- src/features/assessment/components/AssessmentEngine.test.tsx
```

Expected: all playback and soundtrack tests pass.

- [ ] **Step 6: Commit soundtrack integration**

```bash
git add app/src/features/assessment/components/AssessmentEngine.tsx app/src/features/assessment/components/AssessmentEngine.test.tsx
git commit -m "feat: add assessment background soundtrack"
```

### Task 6: Convert and Install the Supplied Media

**Files:**
- Replace: `app/public/media/assessment/question-01.mp4`
- Replace: `app/public/media/assessment/question-02.mp4`
- Replace: `app/public/media/assessment/question-03.mp4`
- Replace: `app/public/media/assessment/question-04.mp4`
- Create: `app/public/media/assessment/soundtrack.mp3`
- Modify: `app/public/media/assessment/README.md`

- [ ] **Step 1: Convert each MOV to H.264/AAC M4V in an isolated temp directory**

Create a task-specific directory with `mktemp -d`, then run
`/usr/bin/avconvert --preset PresetAppleM4V1080pHD --source <N.mov> --output
<temp>/question-0N.m4v --replace --progress` for N=1..4.

- [ ] **Step 2: Install the converted files under stable MP4 names**

Copy each validated ISO media file to
`app/public/media/assessment/question-0N.mp4`, and copy
`/Users/terrylee/Downloads/soundtrack.mp3` to
`app/public/media/assessment/soundtrack.mp3`.

- [ ] **Step 3: Validate all assets**

Use `file` and `ls -lh` to confirm four non-empty ISO media files and one MPEG
Layer III soundtrack. Load each public URL in the local Vite app and confirm the
duration is greater than zero, portrait dimensions are present, and each video
has an audio track by audible playback.

- [ ] **Step 4: Document the source order**

Update the media README to list question 1..4 mapping and the looping soundtrack
path without including personal metadata.

- [ ] **Step 5: Commit media assets**

```bash
git add app/public/media/assessment/question-01.mp4 app/public/media/assessment/question-02.mp4 app/public/media/assessment/question-03.mp4 app/public/media/assessment/question-04.mp4 app/public/media/assessment/soundtrack.mp3 app/public/media/assessment/README.md
git commit -m "assets: replace assessment videos and add soundtrack"
```

### Task 7: Full Verification and Deployment

**Files:**
- Verify all changed files; do not stage `app/tsconfig.tsbuildinfo`.

- [ ] **Step 1: Run repository checks**

```bash
git diff --check
cd app
npm test
npm run build
npm run lint
```

Expected: all tests and build pass; lint has no new errors. Record any existing
warnings separately.

- [ ] **Step 2: Confirm CRM boundary**

Use `git diff --name-only` and confirm there are no changes under CRM pages,
authentication, assessment submission services, Supabase services, or API
submission handlers.

- [ ] **Step 3: Push both deployment branches to the same reviewed commit**

Push `codex/assessment-lead-pipeline`, then fast-forward
`feature/interactive-video-assessment` to the same commit and push it so Vercel
builds the intended source.

- [ ] **Step 4: Test the Vercel preview**

On mobile and desktop: verify fresh opening, videos 1..4 in order, questions
only after `ended`, manual recovery when playback is rejected, soundtrack ducking,
mute, restart, and no browser console errors. Visit `#/crm/login` read-only and
do not submit customer data.

- [ ] **Step 5: Promote and verify production**

Promote the exact Ready preview commit to `https://a2o-style-lab.vercel.app/`.
Repeat the public homepage smoke test and read-only CRM login route check. Do not
submit a lead or modify CRM data.

- [ ] **Step 6: Report deployment evidence**

Provide the production URL, deployed commit, automated verification counts,
Safari-specific recovery result, media order, soundtrack behaviour, and CRM
boundary confirmation.
