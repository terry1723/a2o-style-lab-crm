# Media and Browser Playback

## Asset Contract

Keep masters outside the public bundle and map them to stable public URLs in the
media manifest. Record source, checksum, scene ID, poster, transcript, duration,
dimensions, container, codecs, fast-start result, and browser checks.

Recommended delivery for talking-head video:

- MP4/ISO container;
- H.264 video;
- AAC audio;
- metadata arranged for progressive playback;
- portrait dimensions appropriate to the product stage;
- no unnecessary personal metadata from the source file.

Do not assume a `.mov` or renamed extension is browser-compatible. Inspect the
actual codecs and test the converted output.

## Correct Scene Transition

The safe sequence is:

1. Begin from a real user gesture when audible playback permission is needed.
2. Keep stable media elements mounted rather than replacing the whole stage.
3. Prepare the next source without hidden audible playback.
4. Commit the next video/poster as the visible layer.
5. Start or resume the visible video from the intended time.
6. Apply the visitor's mute preference only to the active audible layer.
7. Reveal the associated question only after the active video's genuine
   `ended` event.

Preloaded metadata is not proof of a decoded visible frame. Audio must not begin
while the previous scene remains visible.

## Safari Rules

Safari and iOS may require playback to remain causally attached to a user
gesture. They may also differ from Chrome in paused-frame callbacks and media
readiness timing.

- Do not require a hidden paused video to produce a frame callback as the only
  path forward.
- Do not pre-play the hidden next video audibly to unlock it.
- Swap the intended next video into the visible state within the answer gesture
  where practical, then attempt playback.
- A rejected `play()` or preparation timeout must not reveal answer choices.
- Show a clear `點擊播放影片`-style recovery control on the intended scene.
- Recover load errors with an explicit retry/reload action.
- Keep the scene index unchanged during stalls or recovery.

Chrome success is not Safari evidence. Test both.

## Visual Continuity

- Use one approved opening poster and compatible fallback visual family.
- Do not render an old homepage, unrelated lifestyle image, or blank component
  between buffers.
- Keep overlay and loading states above the current stage rather than unmounting
  it.
- For desktop ambience, match the central portrait scene without duplicating
  distracting content.

## Soundtrack

- Start from the opening user gesture.
- Store dialogue and question/result target volumes in one configuration source.
- Fade between states rather than jumping volume.
- A global mute control must affect active video and soundtrack together.
- Treat soundtrack failure as non-blocking; spoken consultation remains primary.
- Cancel stale fades/resume promises and stop audio when the experience unmounts.
- Verify actual perceived balance on a phone speaker, not only numeric volume.

Web Audio gain can provide reliable control where element-volume behaviour
varies, but include a safe fallback and do not let audio setup block the funnel.

## Recovery Contract

| Failure | Keep visible | User action | Question visible? |
| --- | --- | --- | --- |
| Autoplay rejection | Intended scene/poster | Play video | No |
| Video stall | Current frame/poster | Retry play | No |
| Media load error | Intended fallback | Reload video | No |
| Soundtrack failure | Normal scene | None required | Normal video rule |
| Next scene preparing | Current stable stage | Wait | Current question disabled |

## Regression Checks

- questions remain hidden until their own video emits `ended`;
- q2–q4 cannot be skipped by a timeout or missing paused callback;
- next audio cannot precede its visible scene;
- recovery retains the correct scene and answer state;
- opening/reload shows the canonical poster and intended fresh/resume behaviour;
- source replacement keeps stable public URLs and IDs;
- mute and soundtrack targets survive every state transition;
- Safari mobile and Chrome desktop/mobile complete the full sequence.
