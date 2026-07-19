# A2O Assessment Cover and Playback Synchronisation Design

## Objective

Fix two production issues in the public A2O image assessment without changing
the CRM, CRM login, Google Sheet submission, or Supabase photo pipeline:

1. Every visit must open as a new assessment at question one, with the same
   dark consultation-room sofa cover before the visitor presses the start CTA.
2. Questions two to four must not become audible before their first visible
   video frame appears.

## Confirmed Product Behaviour

- A page load or reload always creates a new assessment session.
- Incomplete local progress is not restored.
- The CTA always reads `開始形象檢測`; the resume CTA is no longer used.
- The opening cover is always `/images/assessment-landing.png`, showing the
  empty sofa in the dark consultation room.
- The desktop side ambience also stays within the same dark consultation-room
  visual family.
- Old lifestyle posters must not appear while a question video is loading or
  between scenes.
- The four supplied Martin question videos remain unchanged.
- Selecting an answer continues directly to the next question video; no
  authored transition video is added.

## Root Causes

### Inconsistent opening cover

The assessment currently persists `currentSceneIndex` and answers in local
storage. On reload, the opening overlay is rendered above the restored scene's
poster. Scenes two to four still reference older lifestyle images, so a
returning visitor can see one of those images behind the opening copy.

### Audio leading the picture

The hidden next video is started with the visitor's audible mute setting before
the code waits for a decoded video frame. On a slower mobile connection, audio
playback can therefore begin while the previous buffer is still the visible
one. The buffer only becomes visible after the frame-ready promise resolves.

The MP4 files already place their `moov` metadata before `mdat`, so this is a
playback sequencing problem rather than a missing fast-start optimisation.

## Selected Design

### 1. Fresh session on every load

`useAssessmentMachine` will stop reading and writing incomplete assessment
progress in local storage. Every mount creates a new session ID and starts at
scene index zero. The existing session-scoped mute preference may remain in
session storage because it does not restore progress.

Remove the obsolete resume CTA from the assessment type and configuration so
the public experience has only one defined opening action.

### 2. One canonical dark poster

Add an explicit opening poster to the assessment opening configuration and set
it to `/images/assessment-landing.png`.

While the opening overlay is visible, it will render this poster as its own
full-stage background rather than relying on whichever video buffer happens to
be active. The desktop ambience will use the same image.

All four scene fallback posters will also use the canonical dark sofa image.
This prevents an older lifestyle image from flashing if a video is still
decoding or fails to load. Once a question video has a frame, the video covers
the poster normally.

### 3. Silent preparation, visual switch, then audio

Keep the existing two-buffer architecture, but change the direct scene switch
sequence:

1. The start-button gesture plays the current video and silently unlocks the
   inactive video element, then returns the inactive element to time zero.
   Permission is tied to the two stable video elements rather than individual
   source files.
2. After an answer, the hidden next buffer is always muted before `play()` is
   called.
3. Wait for real decoded frame data.
4. Rewind the still-muted, playing buffer to the first frame and confirm that
   frame is ready.
5. Pause the old visible buffer and swap the prepared buffer into view.
6. Only after the prepared buffer is the active visual layer, apply the
   visitor's mute preference. If sound is enabled, audio therefore begins with
   the visible video rather than while it is hidden.

This retains immediate mobile playback permission while preventing audio from
leading the picture. A delay in preparing the next video leaves the current
question overlay visible and disabled instead of exposing the opening cover.

## Failure Handling

- If the next video cannot play or produce a frame within the existing bounded
  timeout, show the next question using the canonical dark poster and no
  premature audio.
- Keep the existing manual playback recovery control for browser playback
  rejection.
- Do not loop retries or start audio while a video remains hidden.
- Existing lead submission errors continue to preserve the selected photo and
  contact details.

## Test Design

Automated regression coverage will prove:

1. A saved incomplete session is ignored and a fresh question-one session is
   created on reload.
2. The opening CTA never changes to the resume CTA.
3. The opening layer and every fallback poster use the canonical dark sofa
   image.
4. The inactive next video remains muted while frame preparation is pending.
5. The next buffer is rewound before it becomes visible.
6. The next buffer becomes audible only after it is the active visual buffer.
7. Playback failure falls back to the next question without revealing an old
   lifestyle poster.
8. Existing assessment, API, CRM-boundary, build, and lint checks still pass.

Manual production verification will cover mobile-width and desktop-width
flows from question one through question four, plus a reload check confirming
that the assessment restarts at the sofa cover. The CRM login route will receive
a read-only smoke test after deployment.

## Scope Boundaries

This change will not:

- change the four Martin MP4 files;
- add transition videos;
- modify CRM pages, authentication, or CRM data;
- modify Google Sheet fields or Apps Script;
- modify Supabase lead-photo storage or the assessment rate limiter;
- change the final photo/contact form.

## Rollout

Implement on `codex/assessment-lead-pipeline`, run the complete test/build/lint
suite, push the same commit to the assessment feature branch, wait for a Ready
Vercel preview, then promote that exact commit to production. Verify the public
homepage and CRM route before handoff.
