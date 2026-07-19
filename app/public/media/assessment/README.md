# A2O assessment media

The live assessment media uses this fixed source-to-question mapping:

- `1.mov` -> `/media/assessment/question-01.mp4`
- `2.mov` -> `/media/assessment/question-02.mp4`
- `3.mov` -> `/media/assessment/question-03.mp4`
- `4.mov` -> `/media/assessment/question-04.mp4`

The question videos are web conversions made with macOS `avconvert` and the
`PresetAppleM4V1080pHD` preset. They use an Apple M4V/ISO media container with
H.264 video and AAC audio, installed under stable `.mp4` URL names for Safari
and Chrome. Spoken audio is retained. The default metadata filter remains
enabled so personal source metadata is not preserved.

The assessment soundtrack is `/media/assessment/soundtrack.mp3`. Keep this
file at its source level: the app handles looping and applies Web Audio gain at
10% for scenes and 18% for prompts. Do not normalize the soundtrack asset.

This version does not use transition videos. Replace only these four stable
question files when new edits arrive; keep scene and question IDs unchanged.
