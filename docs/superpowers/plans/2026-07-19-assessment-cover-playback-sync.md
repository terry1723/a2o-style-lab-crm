# Assessment Cover and Playback Synchronisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every assessment visit start from question one on the dark sofa cover and guarantee that each later video's picture is visible before its audio is enabled.

**Architecture:** Keep the existing React state machine and two persistent video buffers. Remove progress recovery, define one canonical poster for the opening and all video fallbacks, and move video priming/rewind timing into a focused playback service so muted preparation can be tested independently from the React UI.

**Tech Stack:** Vite, React 18, TypeScript, Vitest, Testing Library, HTMLMediaElement, Vercel.

---

## File Structure

- Modify `app/src/features/assessment/types/assessment.ts` — define one opening poster and remove the resume CTA contract.
- Modify `app/src/features/assessment/config/assessmentConfig.ts` — set the canonical sofa poster for the opening and every scene.
- Modify `app/src/features/assessment/config/assessmentConfig.test.ts` — lock the four-video configuration and poster contract.
- Modify `app/src/features/assessment/hooks/useAssessmentMachine.ts` — always create a fresh session and stop persisting progress.
- Modify `app/src/features/assessment/hooks/useAssessmentMachine.test.tsx` — prove legacy saved progress is ignored and no new progress is stored.
- Create `app/src/features/assessment/services/videoPlayback.ts` — own hidden-buffer unlock, decoded-frame waiting, and silent rewind behaviour.
- Create `app/src/features/assessment/services/videoPlayback.test.ts` — verify media ordering without relying on browser network timing.
- Modify `app/src/features/assessment/components/AssessmentEngine.tsx` — render the canonical cover and use the playback service during start and scene changes.
- Modify `app/src/features/assessment/components/AssessmentEngine.test.tsx` — cover fixed opening visuals and visible-before-audible switching.

### Task 1: Remove assessment progress recovery

**Files:**
- Modify: `app/src/features/assessment/hooks/useAssessmentMachine.test.tsx`
- Modify: `app/src/features/assessment/hooks/useAssessmentMachine.ts`

- [ ] **Step 1: Replace the recovery tests with failing fresh-session tests**

Use this test body in `useAssessmentMachine.test.tsx`:

```tsx
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAssessmentMachine } from './useAssessmentMachine'

describe('useAssessmentMachine fresh sessions', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('ignores and clears an incomplete saved assessment on load', () => {
    localStorage.setItem('a2o_assessment_state_v1', JSON.stringify({
      sessionId: 'active-session',
      status: 'showing_question',
      currentSceneIndex: 2,
      answers: { q1: ['q1_6'], q2: ['q2_a'] },
    }))

    const { result } = renderHook(() => useAssessmentMachine())

    expect(result.current.state.status).toBe('boot')
    expect(result.current.state.currentSceneIndex).toBe(0)
    expect(result.current.state.answers).toEqual({})
    expect(result.current.state.recovered).toBe(false)
    expect(result.current.state.sessionId).not.toBe('active-session')
    expect(localStorage.getItem('a2o_assessment_state_v1')).toBeNull()
  })

  it('does not persist answers or scene progress', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const { result } = renderHook(() => useAssessmentMachine())

    act(() => result.current.dispatch({ type: 'BOOT_READY' }))
    act(() => result.current.dispatch({ type: 'START' }))
    act(() => result.current.dispatch({
      type: 'SUBMIT_ANSWER',
      questionId: 'q1',
      optionIds: ['q1_6'],
    }))

    expect(setItem).not.toHaveBeenCalledWith(
      'a2o_assessment_state_v1',
      expect.any(String),
    )
  })
})
```

- [ ] **Step 2: Run the hook test and verify RED**

Run:

```bash
cd app && npm test -- --run src/features/assessment/hooks/useAssessmentMachine.test.tsx
```

Expected: FAIL because the existing hook restores `active-session` and writes progress to local storage.

- [ ] **Step 3: Implement a fresh initial state and remove progress persistence**

Replace `createInitialState()` in `useAssessmentMachine.ts` with:

```ts
function createInitialState(): AssessmentMachineState {
  localStorage.removeItem(STORAGE_KEY)

  return {
    status: 'boot',
    sessionId: createSessionId(),
    currentSceneIndex: 0,
    activeBuffer: 0,
    answers: {},
    muted: sessionStorage.getItem(MUTE_KEY) === 'true',
    recovered: false,
  }
}
```

Delete the effect that writes `sessionId`, `status`, `currentSceneIndex`, and `answers` to `STORAGE_KEY`. Keep the mute preference effect and keep `clearCompletedSession()` removing the legacy key.

- [ ] **Step 4: Run the hook test and verify GREEN**

Run:

```bash
cd app && npm test -- --run src/features/assessment/hooks/useAssessmentMachine.test.tsx
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit the fresh-session change**

```bash
git add app/src/features/assessment/hooks/useAssessmentMachine.ts app/src/features/assessment/hooks/useAssessmentMachine.test.tsx
git commit -m "fix: restart assessment on every visit"
```

### Task 2: Make the sofa image the only opening and fallback poster

**Files:**
- Modify: `app/src/features/assessment/types/assessment.ts`
- Modify: `app/src/features/assessment/config/assessmentConfig.ts`
- Modify: `app/src/features/assessment/config/assessmentConfig.test.ts`
- Modify: `app/src/features/assessment/components/AssessmentEngine.test.tsx`
- Modify: `app/src/features/assessment/components/AssessmentEngine.tsx`

- [ ] **Step 1: Add failing configuration and opening-layer tests**

Add these assertions to `assessmentConfig.test.ts`:

```ts
expect(assessmentConfig.opening.posterUrl).toBe('/images/assessment-landing.png')
expect(assessmentConfig.scenes.map((scene) => scene.posterUrl)).toEqual([
  '/images/assessment-landing.png',
  '/images/assessment-landing.png',
  '/images/assessment-landing.png',
  '/images/assessment-landing.png',
])
expect(assessmentConfig.opening).not.toHaveProperty('resumeCta')
```

Add this test to `AssessmentEngine.test.tsx`:

```tsx
it('uses the dark sofa image for the opening layer and every fallback poster', () => {
  const { container } = render(<AssessmentEngine />)
  const opening = screen.getByTestId('assessment-opening')
  const videos = Array.from(container.querySelectorAll('video'))

  expect(opening.style.backgroundImage).toContain('/images/assessment-landing.png')
  expect(videos.every((video) => video.getAttribute('poster') === '/images/assessment-landing.png')).toBe(true)
  expect(screen.getByRole('button', { name: '開始形象檢測' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: '繼續形象檢測' })).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run both tests and verify RED**

Run:

```bash
cd app && npm test -- --run src/features/assessment/config/assessmentConfig.test.ts src/features/assessment/components/AssessmentEngine.test.tsx
```

Expected: FAIL because `opening.posterUrl` is undefined, later scenes use old lifestyle posters, and the opening has no dedicated background contract.

- [ ] **Step 3: Define the canonical poster in the type and configuration**

Change the `opening` type in `assessment.ts` to:

```ts
opening: {
  posterUrl: string
  headline: string
  supportingText: string
  cta: string
  note: string
}
```

Change the opening block in `assessmentConfig.ts` to:

```ts
opening: {
  posterUrl: '/images/assessment-landing.png',
  headline: '你而家嘅形象，同你想畀人嘅感覺一致嗎？',
  supportingText: '由 Martin 親自問你四條簡單問題，了解你目前最值得改善嘅位置。',
  cta: '開始形象檢測',
  note: '約2分鐘｜免費個人形象初步檢測',
},
```

Set every scene's `posterUrl` to:

```ts
posterUrl: '/images/assessment-landing.png',
```

- [ ] **Step 4: Render the opening as an explicit fixed visual layer**

In `AssessmentEngine.tsx`, change the desktop ambience to:

```tsx
style={{ backgroundImage: `url(${assessmentConfig.opening.posterUrl})` }}
```

Change the opening section to include this stable test ID, poster, and cover sizing:

```tsx
<section
  data-testid="assessment-opening"
  className="absolute inset-0 z-40 flex items-end bg-cover bg-center px-5 pb-[calc(env(safe-area-inset-bottom)+2rem)] text-white sm:items-center sm:pb-8"
  style={{
    backgroundImage: `linear-gradient(to bottom, rgb(0 0 0 / 0.2), rgb(0 0 0 / 0.05), rgb(0 0 0 / 0.8)), url(${assessmentConfig.opening.posterUrl})`,
  }}
>
```

Render the CTA with only:

```tsx
{assessmentConfig.opening.cta}
```

- [ ] **Step 5: Run both tests and verify GREEN**

Run:

```bash
cd app && npm test -- --run src/features/assessment/config/assessmentConfig.test.ts src/features/assessment/components/AssessmentEngine.test.tsx
```

Expected: configuration and engine tests pass.

- [ ] **Step 6: Commit the canonical-cover change**

```bash
git add app/src/features/assessment/types/assessment.ts app/src/features/assessment/config/assessmentConfig.ts app/src/features/assessment/config/assessmentConfig.test.ts app/src/features/assessment/components/AssessmentEngine.tsx app/src/features/assessment/components/AssessmentEngine.test.tsx
git commit -m "fix: keep assessment cover on dark sofa scene"
```

### Task 3: Prepare hidden videos silently before the visual switch

**Files:**
- Create: `app/src/features/assessment/services/videoPlayback.ts`
- Create: `app/src/features/assessment/services/videoPlayback.test.ts`
- Modify: `app/src/features/assessment/components/AssessmentEngine.tsx`
- Modify: `app/src/features/assessment/components/AssessmentEngine.test.tsx`

- [ ] **Step 1: Write failing playback-service tests**

Create `videoPlayback.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { prepareHiddenVideo, unlockHiddenVideo } from './videoPlayback'

type TestVideo = HTMLVideoElement & {
  requestVideoFrameCallback: (callback: () => void) => number
}

function createVideo() {
  const video = document.createElement('video') as TestVideo
  Object.defineProperty(video, 'readyState', {
    configurable: true,
    get: () => HTMLMediaElement.HAVE_CURRENT_DATA,
  })
  video.requestVideoFrameCallback = (callback) => {
    callback()
    return 1
  }
  video.play = vi.fn().mockResolvedValue(undefined)
  video.pause = vi.fn()
  return video
}

describe('assessment video playback preparation', () => {
  it('unlocks an inactive element silently and returns it to the start', async () => {
    const video = createVideo()
    video.muted = false
    video.currentTime = 1

    await expect(unlockHiddenVideo(video)).resolves.toBe(true)

    expect(video.play).toHaveBeenCalledTimes(1)
    expect(video.pause).toHaveBeenCalledTimes(1)
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(true)
  })

  it('keeps the hidden video muted while decoding and rewinding', async () => {
    const video = createVideo()
    const muteStatesAtPlay: boolean[] = []
    let playCount = 0
    video.play = vi.fn().mockImplementation(() => {
      muteStatesAtPlay.push(video.muted)
      playCount += 1
      if (playCount === 1) video.currentTime = 0.7
      return Promise.resolve()
    })

    await expect(prepareHiddenVideo(video, 20)).resolves.toBe(true)

    expect(muteStatesAtPlay).toEqual([true, true])
    expect(video.currentTime).toBe(0)
    expect(video.muted).toBe(true)
    expect(video.pause).toHaveBeenCalledTimes(1)
    expect(video.play).toHaveBeenCalledTimes(2)
  })

  it('fails without unmuting when hidden playback is rejected', async () => {
    const video = createVideo()
    video.play = vi.fn().mockRejectedValue(new Error('rejected'))

    await expect(prepareHiddenVideo(video)).resolves.toBe(false)
    expect(video.muted).toBe(true)
    expect(video.pause).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the new test and verify RED**

Run:

```bash
cd app && npm test -- --run src/features/assessment/services/videoPlayback.test.ts
```

Expected: FAIL because `videoPlayback.ts` does not exist.

- [ ] **Step 3: Implement the focused playback service**

Create `videoPlayback.ts`:

```ts
export type FrameVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (callback: () => void) => number
}

export function waitForDecodedFrame(video: FrameVideo, timeoutMs = 3000) {
  return new Promise<boolean>((resolve) => {
    let settled = false
    const finish = (ready: boolean) => {
      if (settled) return
      settled = true
      window.clearTimeout(timeout)
      video.removeEventListener('loadeddata', onLoadedData)
      resolve(ready)
    }
    const confirmFrame = () => {
      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(() => finish(true))
        return
      }
      finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
    }
    const onLoadedData = () => confirmFrame()
    const timeout = window.setTimeout(
      () => finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA),
      timeoutMs,
    )

    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) confirmFrame()
    else video.addEventListener('loadeddata', onLoadedData, { once: true })
  })
}

export function rewindToFirstFrame(video: FrameVideo, timeoutMs = 1500) {
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
    const confirmFrame = () => {
      if (video.requestVideoFrameCallback) {
        video.requestVideoFrameCallback(() => finish(true))
        return
      }
      finish(video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA)
    }
    const onSeeked = () => confirmFrame()
    const onError = () => finish(false)
    const timeout = window.setTimeout(
      () => finish(video.currentTime <= 0.05 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA),
      timeoutMs,
    )

    video.addEventListener('seeked', onSeeked, { once: true })
    video.addEventListener('error', onError, { once: true })
    const alreadyAtStart = video.currentTime <= 0.05
    video.currentTime = 0
    if (alreadyAtStart && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) confirmFrame()
  })
}

export async function unlockHiddenVideo(video: FrameVideo) {
  video.muted = true
  try {
    await video.play()
    video.pause()
    video.currentTime = 0
    return true
  } catch {
    return false
  }
}

export async function prepareHiddenVideo(video: FrameVideo, timeoutMs = 3000) {
  video.muted = true
  video.currentTime = 0
  try {
    await video.play()
  } catch {
    video.pause()
    return false
  }
  if (!await waitForDecodedFrame(video, timeoutMs)) {
    video.pause()
    return false
  }
  if (!await rewindToFirstFrame(video, Math.min(timeoutMs, 1500))) {
    video.pause()
    return false
  }
  video.muted = true
  try {
    await video.play()
    return true
  } catch {
    video.pause()
    return false
  }
}
```

- [ ] **Step 4: Run the playback-service tests and verify GREEN**

Run:

```bash
cd app && npm test -- --run src/features/assessment/services/videoPlayback.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Replace the old direct-transition timing in the engine**

Import the service in `AssessmentEngine.tsx`:

```ts
import {
  prepareHiddenVideo,
  rewindToFirstFrame,
  unlockHiddenVideo,
  waitForDecodedFrame,
  type FrameVideo,
} from '../services/videoPlayback'
```

Delete the local `FrameVideo`, `waitForActualFrame`, and `rewindToFirstFrame` definitions. In `start()`, silently unlock the inactive element during the start-button gesture:

```ts
const standby = inactiveVideo() as FrameVideo | null
if (standby) void unlockHiddenVideo(standby)
```

Inside `runTransition()`, set `next.muted = true` for every hidden buffer. Handle the direct scene branch before creating the authored-transition playback promises:

```ts
if (!hasAuthoredTransition) {
  if (!next || !await prepareHiddenVideo(next)) {
    dispatch({ type: 'NEXT_SCENE_FALLBACK' })
    return
  }

  current?.pause()
  dispatch({ type: 'BEGIN_TRANSITION' })
  dispatch({ type: 'NEXT_SCENE_READY' })
  return
}
```

In the existing authored-transition branch, replace `waitForActualFrame(next)` with `waitForDecodedFrame(next)` and use the imported `rewindToFirstFrame(next)`. Its transition timing and analytics remain unchanged.

- [ ] **Step 6: Replace the old engine timing test with visible-before-audible assertions**

Replace the test named `starts the next direct scene once inside the answer gesture without pausing and replaying it` with:

```tsx
it('keeps the next scene silent until its prepared buffer is visible', async () => {
  const playStates: Array<{ src: string | null; muted: boolean }> = []
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    playStates.push({ src: this.getAttribute('src'), muted: this.muted })
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
    .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
  Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {
    configurable: true,
    value(callback: () => void) {
      callback()
      return 1
    },
  })
  const user = userEvent.setup()
  const { container } = render(<AssessmentEngine />)
  const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
  const secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement

  await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
  fireEvent.ended(firstVideo)
  await user.click(await screen.findByRole('radio', { name: '6' }))

  await waitFor(() => expect(secondVideo).toHaveClass('z-10'))
  expect(playStates.filter((state) => state.src?.includes('question-02')))
    .not.toHaveLength(0)
  expect(playStates.filter((state) => state.src?.includes('question-02'))
    .every((state) => state.muted)).toBe(true)
  expect(secondVideo.currentTime).toBeLessThanOrEqual(0.05)
  expect(secondVideo.muted).toBe(false)
})
```

Replace the existing playback-rejection fallback test with this exact
next-buffer failure case. It proves the rejected video is stopped before its
poster becomes the active fallback:

```tsx
it('stops a rejected next buffer before showing its fallback question', async () => {
  const pausedVideos: HTMLMediaElement[] = []
  let secondVideo: HTMLVideoElement
  let secondVideoPlayCount = 0
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    if (this === secondVideo) {
      secondVideoPlayCount += 1
      if (secondVideoPlayCount > 1) return Promise.reject(new Error('playback rejected'))
    }
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    pausedVideos.push(this)
  })
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get')
    .mockReturnValue(HTMLMediaElement.HAVE_CURRENT_DATA)
  Object.defineProperty(HTMLVideoElement.prototype, 'requestVideoFrameCallback', {
    configurable: true,
    value(callback: () => void) {
      callback()
      return 1
    },
  })
  const user = userEvent.setup()
  const { container } = render(<AssessmentEngine />)
  const firstVideo = container.querySelector('video[src*="question-01"]') as HTMLVideoElement
  secondVideo = container.querySelector('video[src*="question-02"]') as HTMLVideoElement

  await user.click(screen.getByRole('button', { name: '開始形象檢測' }))
  await waitFor(() => expect(secondVideoPlayCount).toBe(1))
  fireEvent.ended(firstVideo)
  await user.click(await screen.findByRole('radio', { name: '6' }))

  expect(await screen.findByRole('heading', {
    name: '你認為目前形象最影響到你邊一個場合？',
  })).toBeInTheDocument()
  expect(secondVideo).toHaveClass('z-10')
  expect(pausedVideos.filter((video) => video === secondVideo).length).toBeGreaterThanOrEqual(2)
})
```

- [ ] **Step 7: Run engine and playback tests together**

Run:

```bash
cd app && npm test -- --run src/features/assessment/services/videoPlayback.test.ts src/features/assessment/components/AssessmentEngine.test.tsx
```

Expected: playback-service and engine tests pass, including the existing playback-rejection fallback.

- [ ] **Step 8: Commit the synchronisation fix**

```bash
git add app/src/features/assessment/services/videoPlayback.ts app/src/features/assessment/services/videoPlayback.test.ts app/src/features/assessment/components/AssessmentEngine.tsx app/src/features/assessment/components/AssessmentEngine.test.tsx
git commit -m "fix: show next assessment frame before audio"
```

### Task 4: Full regression verification and production rollout

**Files:**
- Verify only: all changed assessment files
- Preserve unstaged: `app/tsconfig.tsbuildinfo`

- [ ] **Step 1: Run whitespace and privacy-boundary checks**

```bash
git diff --check
cd app && npm test -- --run src/features/assessment/assessmentCrmBoundary.test.ts api/esmImports.test.ts
```

Expected: no whitespace errors; CRM-boundary and ESM tests pass.

- [ ] **Step 2: Run the complete automated suite**

```bash
cd app && npm test
```

Expected: every test file passes with zero failed tests.

- [ ] **Step 3: Run production build and lint**

```bash
cd app && npm run build && npm run lint
```

Expected: build exits zero; lint has zero errors. Record the five existing unrelated warnings if they remain.

- [ ] **Step 4: Confirm the generated TypeScript build metadata is not staged**

```bash
git status --short
git diff --cached --name-only
```

Expected: `app/tsconfig.tsbuildinfo` may remain modified locally but is not listed in the cached diff.

- [ ] **Step 5: Push both assessment branches**

```bash
git push origin codex/assessment-lead-pipeline
git push origin codex/assessment-lead-pipeline:feature/interactive-video-assessment
```

Expected: both remote branches point to the final playback-fix commit.

- [ ] **Step 6: Verify the Vercel preview before production promotion**

In the Vercel deployment page, confirm the preview is `Ready` and its source is the final commit. At mobile width and desktop width, verify:

- a fresh load shows the dark empty-sofa cover;
- reload still shows `開始形象檢測` at question one;
- answering questions one through three never produces audible audio while the old frame is visible;
- loading never reveals the old lifestyle posters;
- the final lead form still appears after question four.

- [ ] **Step 7: Promote the exact Ready preview to production**

Use Vercel `Promote to Production`, confirm the production deployment is `Ready`, and verify the assigned domain is `https://a2o-style-lab.vercel.app`.

- [ ] **Step 8: Run production smoke tests**

Verify the production homepage cover and CTA, complete the four-question visual playback path without submitting synthetic customer data, reload to prove the experience restarts, and open `https://a2o-style-lab.vercel.app/#/crm/login` read-only to confirm CRM login remains available.
