# Failure Patterns

## Audio Starts Before the New Picture

### Symptom

The next presenter can be heard while the previous frame remains visible.

### Likely root cause

The hidden next buffer was played audibly before its visible-frame readiness and
visual commit.

### Evidence to collect

Active buffer ID, `muted`, `currentTime`, readiness events, visual swap time,
play-promise result, and a throttled-network recording.

### Corrective pattern

Prepare silently, commit the intended buffer visibly, start/resume it from the
approved position, then apply the visitor's audible preference.

### Regression test

Hold next-frame readiness pending and assert the hidden buffer remains muted;
assert it cannot become audible before it is the active visual layer.

### Prevention

Keep media elements stable and make audible activation a post-visual-commit
state transition.

## Original Homepage or Wrong Poster Flashes

### Symptom

Answering briefly exposes an old homepage, unrelated photo, or blank stage.

### Likely root cause

The stage was unmounted or the fallback depended on stale scene/session state.

### Evidence to collect

DOM lifecycle, buffer visibility, poster URLs, saved progress, scroll position,
and a frame-by-frame transition recording.

### Corrective pattern

Keep the stage mounted, render transition status above it, and use one canonical
opening/fallback visual family.

### Regression test

Delay media preparation and assert the stage never renders the homepage or an
unapproved poster.

### Prevention

Treat poster and ambience URLs as configured assets with coverage tests.

## Safari Skips Later Videos

### Symptom

Chrome plays every video; Safari shows q2–q4 options without playing their media.

### Likely root cause

A missing paused-frame callback or playback rejection dispatched a fallback
that advanced directly to the question.

### Evidence to collect

Safari version/device, `play()` rejection, paused state, media events, watchdog
actions, and whether options appeared without `ended`.

### Corrective pattern

Commit the intended scene within the answer gesture, attempt visible playback,
and show manual recovery on rejection. Only the active video's real `ended`
event may reveal its question.

### Regression test

Simulate a paused callback that never fires and a rejected `play()`; assert the
question stays hidden and recovery appears.

### Prevention

Never implement a preparation-timeout-to-question transition. Test Safari and
Chrome independently.

## Source MOV Does Not Play Reliably

### Symptom

A replaced video works locally or in one browser but stalls or fails elsewhere.

### Likely root cause

Unsupported container/codec, missing progressive metadata, or public filename
changed without matching configuration.

### Evidence to collect

Probe container, video/audio codecs, dimensions, duration, metadata placement,
HTTP headers, byte ranges, and stable URL mapping.

### Corrective pattern

Convert to verified H.264/AAC MP4, retain the master, remove unnecessary source
metadata, keep stable IDs/URLs, and update the manifest checksum.

### Regression test

Inspect every production asset and complete the full funnel in target browsers.

### Prevention

Use a repeatable media intake and replacement checklist.

## Soundtrack Is Inaudible or Inconsistent

### Symptom

Music cannot be heard, jumps between states, or ignores mute on some devices.

### Likely root cause

Element-volume/browser differences, playback outside a gesture, duplicated
target constants, or stale fades.

### Evidence to collect

AudioContext state, element volume, gain target, mute state, promise rejection,
state transition, and phone-speaker listening result.

### Corrective pattern

Start inside the opening gesture, use one target configuration, fade with a
Web Audio gain path plus fallback, synchronize mute, and cancel stale work.

### Regression test

Assert configured speaking/question targets on Web Audio and fallback paths,
plus mute and unmount cleanup.

### Prevention

Document target values once and test perceived mix on a real phone.

## Old Progress Returns Unexpectedly

### Symptom

A reload shows a later scene or resume language when every visit should restart.

### Likely root cause

Legacy local persistence still restores scene/answers or cleanup runs too late.

### Evidence to collect

Storage keys, initialization order, CTA configuration, session IDs, and first
render state.

### Corrective pattern

Make fresh/resume explicit, ignore obsolete progress on initialization, remove
resume copy, and clear legacy data safely.

### Regression test

Seed old progress, reload, and assert opening/q1 with a new Session ID.

### Prevention

Version persistence schemas and test migrations whenever semantics change.

## Duplicate Sheet Rows or Partial Success

### Symptom

Retries append duplicates, or the website reports success when photo or Sheet
delivery failed.

### Likely root cause

No idempotency key, unverified upstream response, or coupled operations without
retry state.

### Evidence to collect

Session ID, storage path, attempt count, structured upstream responses, row
lookup, and frontend success transition.

### Corrective pattern

Use Session ID as unique key, recognize an existing verified row, reuse a
successful upload, and show success only after all required operations finish.

### Regression test

Repeat the same submission and simulate storage-success/Sheet-failure; assert
one row, reusable path, preserved fields, and no premature success.

### Prevention

Design idempotency and partial failure before wiring providers.

## Public Funnel Writes Into CRM

### Symptom

Assessment leads alter existing customer records or require CRM login changes.

### Likely root cause

Reusing a convenient CRM client-write service without an approved data model.

### Evidence to collect

Imports, network calls, tables, migrations, auth changes, and CRM row counts
before and after a synthetic test.

### Corrective pattern

Create a separate public submission boundary and add tests prohibiting CRM write
imports/calls.

### Regression test

Submit a synthetic lead and assert storage/Sheet success with no CRM record.

### Prevention

List protected files and data systems in the approved brief.

## Mobile Automation Reports a False Layout Defect

### Symptom

An automated click says the header is off-screen although a real tap looks fine.

### Likely root cause

The automation framework auto-scrolled the target into view before clicking.

### Evidence to collect

Scroll position before/after click, click method, viewport screenshot, bounding
boxes, and a coordinate-tap comparison.

### Corrective pattern

Reset scroll, reproduce with a real coordinate/touch gesture, and separate tool
behaviour from application layout.

### Regression test

Record both semantic-click and coordinate-tap traces at the same viewport.

### Prevention

Treat automation evidence as one observation, not automatic proof of UX cause.

## Documentation and Runtime Drift

### Symptom

Instructions show old volume, URLs, fields, or behaviour after production changed.

### Likely root cause

The same setting is duplicated across runtime, tests, and operator docs.

### Evidence to collect

Search every value, compare current config/tests/deployment, and identify the
authoritative source.

### Corrective pattern

Keep runtime configuration authoritative, test exact approved values, and update
linked operator documentation in the same change.

### Regression test

Assert config values and scan docs for superseded values where practical.

### Prevention

Prefer named configuration and a manifest over prose-only duplicated constants.
