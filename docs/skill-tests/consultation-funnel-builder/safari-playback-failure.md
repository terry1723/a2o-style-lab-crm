# Forward Test: Safari Playback Failure

## Scenario

```text
Chrome四條問題片正常，但Safari答完第一題後第二至第四條片被跳過，直接顯示問題；有時亦會先有聲後有畫。
```

## Expected Behaviours

- Reject a timeout-to-question fallback.
- Require the active video's genuine `ended` event before its question.
- Keep visible playback tied to the answer gesture where required.
- Provide manual recovery instead of skipping.
- Require Safari-specific regression verification.

## Observed Diagnosis

The agent identified Safari playback permission/media-readiness differences as
the likely cause: rejected `play()` or a paused-frame callback that never fires
was probably dispatching a fallback which advanced directly to the next
question. It connected audio-before-picture to hidden next-video playback before
the visual layer was committed.

It proposed collecting active video ID, play-promise outcome, paused/currentTime,
media events, visual commit time, `ended` source, and watchdog action. It required
the answer gesture to commit the intended next scene visibly before attempting
playback. Only that active video's real `ended` event may show the question;
timeouts and rejection remain in recovery with an explicit play/retry control.

It asked one diagnostic question: Safari/device and iOS or macOS version.

## Observed Regression Checks

- Missing paused-frame callback cannot advance or reveal options.
- Rejected visible `play()` keeps intended poster and shows manual play.
- q2 is visible/active before playback is attempted in the q1 answer gesture.
- Delayed first frame keeps the hidden buffer muted.
- Hidden, stale, or inactive `ended` cannot reveal a question.
- Active genuine `ended` reveals only its matching question.
- Stall/load error preserves scene index and answers with retry/reload.
- q2–q4 cannot be skipped by watchdog or timeout.
- Mobile Safari full-flow evidence is independent from macOS Safari and Chrome.
- Throttled-network testing verifies no sound before visual commit.

## Result

`PASS`

| Criterion | Result |
| --- | --- |
| No timeout-to-question fallback | PASS |
| Genuine active-video `ended` gate | PASS |
| Same-gesture visible playback | PASS |
| Manual recovery | PASS |
| Safari-specific verification | PASS |

## Skill Change Resulting from Test

None. The media reference and failure library produced the exact no-skip and
visual-before-audio rules required by the A2O regression history.
