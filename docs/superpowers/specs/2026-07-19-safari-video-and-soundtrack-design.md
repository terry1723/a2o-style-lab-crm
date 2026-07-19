# Safari Video Playback and Soundtrack Design

## Goal

Update the public A2O image assessment so all four replacement question videos
play in order on Safari as well as Chrome, and add the supplied soundtrack as a
continuous low-volume ambience layer. The CRM, authentication, lead submission,
Google Sheet sync, Supabase storage, and existing customer data are out of scope.

## Source Assets

- `/Users/terrylee/Downloads/1.mov` becomes question 1.
- `/Users/terrylee/Downloads/2.mov` becomes question 2.
- `/Users/terrylee/Downloads/3.mov` becomes question 3.
- `/Users/terrylee/Downloads/4.mov` becomes question 4.
- `/Users/terrylee/Downloads/soundtrack.mp3` becomes the looping background
  soundtrack.

The four MOV files will be converted to browser-compatible MP4 assets while
preserving their spoken audio and portrait composition. The public filenames and
configuration URLs remain stable (`question-01.mp4` through
`question-04.mp4`) so no CRM or content schema change is required.

## Safari Playback Behaviour

The current hidden-buffer preparation treats a missing decoded-frame callback
while a video is paused as a preparation failure. Safari may not deliver that
callback, so the machine follows `NEXT_SCENE_FALLBACK` and exposes the next
question without playing its video.

The revised direct-transition flow will use these rules:

1. Preload the next video without requiring hidden playback or a paused
   `requestVideoFrameCallback` confirmation.
2. When an answer is selected, swap the next buffer into the visible layer in
   the same user gesture and attempt to play it from the start.
3. A preparation timeout or playback-policy rejection must never dispatch the
   action that exposes the next question.
4. If Safari cannot begin playback immediately, keep the next video/poster
   visible and show a clear `點擊播放影片` recovery button.
5. Only the active video's genuine `ended` event may expose its question.
6. A permanent media load error may show a recoverable message, but it must not
   silently skip directly to the question.

The two-buffer architecture remains in place. Chrome retains its current
one-tap transition, while Safari gets a deterministic recovery path instead of
the question fallback.

## Soundtrack Behaviour

Add one dedicated looping audio element using `soundtrack.mp3`.

- Playback starts from the existing `開始形象檢測` user gesture.
- During a Martin question video, soundtrack volume is approximately `0.10`.
- While an answer overlay is visible, soundtrack volume rises to approximately
  `0.18`.
- Volume changes use a short, subtle fade rather than an abrupt jump.
- The existing top-right mute button controls both the active video and the
  soundtrack.
- Muting persists using the existing session mute preference.
- Restart resets the soundtrack to the beginning; a page reload still starts a
  completely fresh assessment.
- The soundtrack may continue through the result/contact step at the quiet
  overlay level, and stops when the assessment component unmounts.
- If the browser rejects soundtrack playback, the assessment and Martin's voice
  continue normally; soundtrack failure is non-blocking.

## State and Component Boundaries

- Keep the assessment reducer's question, answer, and completion semantics.
- Replace the skip-to-question direct fallback with a playback recovery state.
- Keep soundtrack control inside `AssessmentEngine`; do not add it to CRM state
  or persistence.
- Keep lead submission services, private photo upload, Google Sheet integration,
  Supabase client code, and CRM routes unchanged.

## Error Handling

- Next video not ready: show its canonical poster and playback recovery control.
- Audible `play()` rejected: stay on the video scene and request a tap.
- Video stalls after starting: show the same recovery control and preserve the
  current scene index.
- Video file load failure: report a recoverable video error without exposing the
  question automatically.
- Soundtrack rejected or unavailable: continue the assessment without music and
  do not block answer controls.

## Testing

Add regression coverage before production changes:

- A Safari-like paused frame callback that never fires does not skip question 2.
- A failed hidden preparation still swaps to question 2's video scene and shows
  playback recovery rather than question 2 options.
- Question 2 options remain hidden until question 2 emits `ended`.
- The same rule applies through questions 3 and 4.
- Soundtrack starts on assessment start, loops, and uses dialogue/overlay target
  volumes.
- The mute button affects active video and soundtrack together.
- Restart stops and rewinds soundtrack and returns to the opening screen.
- Existing submission, CRM route, and assessment configuration tests remain
  green.

Run targeted tests first, then the complete test suite, TypeScript build, lint,
and production bundle. Perform mobile Safari-oriented and desktop Chrome smoke
checks on the Vercel preview before promoting the same commit to production.

## Acceptance Criteria

- Videos 1, 2, 3, and 4 play in the supplied order.
- Safari never shows a question merely because next-video preparation failed.
- A question appears only after its own video completes.
- Safari offers a manual play recovery control whenever playback needs another
  user gesture.
- The soundtrack follows the approved 10%/18% volume behaviour and global mute.
- The public homepage still starts fresh on every load.
- CRM, authentication, lead data, Google Sheet sync, and Supabase storage remain
  unchanged.
