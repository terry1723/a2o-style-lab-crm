# Interactive assessment media

The homepage assessment uses four Martin question videos. There are no authored transition clips in this version; choosing an answer starts the next preloaded question video directly.

## Stable files

Place the final portrait MP4 files under `public/media/assessment/`:

```text
question-01.mp4
question-02.mp4
question-03.mp4
question-04.mp4
```

The current supplied files already occupy these four paths. Future replacements should keep the filenames and only replace the binary assets.

Preferred delivery: 9:16 portrait, H.264 video, AAC audio, with Martin's spoken question ending before the file's last frame. The answer overlay opens on the video's `ended` event.

Question copy, options, posters, and media paths live in `src/features/assessment/config/assessmentConfig.ts`. Scene IDs and question IDs are CRM and analytics identifiers; do not rename them for a media-only replacement.

The player retains two persistent scene buffers and preloads only the next question video. Missing media falls back to the configured poster and must not prevent the visitor from answering.
