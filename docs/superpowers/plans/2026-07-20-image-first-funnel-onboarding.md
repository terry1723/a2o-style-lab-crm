# Image-First Funnel Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make visual-material selection the Skill's first intake question and support a single static image as the recommended fastest funnel experience.

**Architecture:** Keep one media-agnostic funnel workflow, then route to one of four visual strategies: persistent single image, one image per question, presenter video, or synthetic prototype. Image modes bypass video-only autoplay, soundtrack, `ended`, and Safari recovery rules while converging on the same qualification, capture, Sheet, WhatsApp, privacy, and deployment pipeline.

**Tech Stack:** Markdown, YAML, Codex skill metadata, Python skill validator, ZIP archive, GitHub Draft PR.

---

## Task 1: Record the Failing Image-First Test

**Files:**

- Create: `docs/skill-tests/consultation-funnel-builder/image-first-baseline.md`

- [ ] **Step 1: Run the current Skill against the new scenario**

Use a fresh test agent with the current committed Skill:

```text
我想幫一間顧問公司整篩選網站，暫時冇影片，但有一張已批准使用嘅顧問相。請用 $consultation-funnel-builder 開始。
```

Ask for the first response and visual architecture only.

- [ ] **Step 2: Verify RED**

Mark the current result `FAIL` unless all conditions are true:

```yaml
first_question_is_visual_material_choice: true
single_image_is_recommended_fastest_mode: true
one_image_can_persist_across_all_questions: true
image_mode_omits_video_completion_gate: true
asks_only_one_question: true
```

Expected current failure: the Skill asks which lead should qualify before asking
about visual material and describes a video-led default.

- [ ] **Step 3: Write and commit the RED record**

```bash
git add docs/skill-tests/consultation-funnel-builder/image-first-baseline.md
git commit -m "test: record image-first onboarding gap"
```

## Task 2: Update the Skill and Visual References

**Files:**

- Modify: `skills/consultation-funnel-builder/SKILL.md`
- Modify: `skills/consultation-funnel-builder/references/intake-and-discovery.md`
- Modify: `skills/consultation-funnel-builder/references/funnel-blueprint.md`
- Modify: `skills/consultation-funnel-builder/references/media-and-browser-playback.md`

- [ ] **Step 1: Broaden the trigger and replace the first question**

Keep the description trigger-only but include static images and visual-led
funnels. After repository inspection, orient the user to business, questions,
visual assets, capture/consent, Sheet, WhatsApp, and deployment inputs, then ask
exactly:

```text
你而家可以提供邊一種主要視覺素材？如果未有影片，一張代表公司、顧問或服務嘅相片已經可以開始。
```

Present stable choices `single-image`, `question-images`, `presenter-video`, and
`no-assets`. Ask qualification second.

- [ ] **Step 2: Add media-agnostic state routing**

Document:

```text
image: opening → question → preparing-next-question → question
video: opening → scene-playing/recovery → question → preparing-next-scene
both: → qualification → capture → Sheet → WhatsApp
```

- [ ] **Step 3: Define all four visual modes**

Single image persists through every question and may use subtle CSS fade/light/
scale with reduced-motion support. Question images use stable mappings,
preloading, and crossfade without blank fallback. Presenter video retains every
Safari safeguard. No-assets mode uses labelled synthetic placeholders and
blocks real data/integrations/production.

- [ ] **Step 4: Update quick reference and example**

The example's first question must be the visual-material question. The second
question, after a visual answer, asks which lead deserves human follow-up.

- [ ] **Step 5: Validate structure and commit**

```bash
python3 /Users/terrylee/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/consultation-funnel-builder
git diff --check
git add skills/consultation-funnel-builder
git commit -m "feat: make funnel onboarding image-first"
```

Expected: `Skill is valid!`.

## Task 3: Update Templates and Human Guidance

**Files:**

- Modify: `skills/consultation-funnel-builder/assets/new-funnel-brief.yaml`
- Modify: `skills/consultation-funnel-builder/assets/content-and-media-manifest.yaml`
- Modify: `docs/playbooks/interactive-consultation-funnel.md`

- [ ] **Step 1: Add the visual strategy to the brief**

Use:

```yaml
visual_strategy:
  mode: "single-image"
  available_assets: []
  asset_approval_status: "confirm"
  persistent_image: true
  one_asset_per_question: false
  prototype_only: false
```

Explain the four allowed mode IDs without A2O-specific values.

- [ ] **Step 2: Make the media manifest support images and video**

Add `asset_type`, optional `question_id`, image dimensions/format, video codecs,
load/preload checks, and stable mapping. Do not require audio/video fields for
static images.

- [ ] **Step 3: Update the Playbook**

Document one persistent image as the recommended fastest MVP, optional subtle
motion, the four visual modes, and upgrading to video without changing question
IDs or the data pipeline.

- [ ] **Step 4: Validate YAML and commit**

```bash
python3 -c 'import yaml; from pathlib import Path; [yaml.safe_load(p.read_text()) for p in Path("skills/consultation-funnel-builder/assets").glob("*.yaml")]; print("YAML valid")'
git diff --check
git add skills/consultation-funnel-builder/assets docs/playbooks/interactive-consultation-funnel.md
git commit -m "docs: add static-image funnel templates"
```

## Task 4: Forward-Test Every Visual Mode

**Files:**

- Create: `docs/skill-tests/consultation-funnel-builder/image-first-modes.md`
- Modify only if a gap appears: `skills/consultation-funnel-builder/`

- [ ] **Step 1: Test the first response**

Run the Task 1 scenario with the updated Skill. Pass only when the response
gives a short requirements orientation, asks the exact visual-material question,
shows four choices, recommends `single-image`, and asks nothing else.

- [ ] **Step 2: Test single-image architecture**

Pass when one approved image persists across any number of questions, subtle
motion respects reduced-motion, and no autoplay, `ended`, soundtrack, or Safari
playback recovery is required.

- [ ] **Step 3: Test question-images, video, and no-assets modes**

Pass when question images have stable mappings/crossfade/fallback; video retains
same-gesture visible playback, genuine `ended`, recovery, and Safari tests; and
no-assets allows only a labelled synthetic non-production prototype.

- [ ] **Step 4: Recheck CRM/data/conversion invariants**

Confirm every mode uses the same protected CRM boundary, private upload rules
when capture needs files, idempotent Sheet write, approved WhatsApp CTA, privacy,
preview, and deployment authority gates.

- [ ] **Step 5: Record results, minimally refine failures, and commit**

The test record contains scenario, expected, observed, per-mode `PASS`/`FAIL`,
and resulting edits.

```bash
git add docs/skill-tests/consultation-funnel-builder/image-first-modes.md skills/consultation-funnel-builder
git commit -m "test: verify image-first funnel modes"
```

## Task 5: Repackage, Verify, Push, and Update PR

**Files:**

- Modify: `dist/consultation-funnel-builder.skill`

- [ ] **Step 1: Run source validation and scans**

```bash
python3 /Users/terrylee/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/consultation-funnel-builder
python3 -c 'from pathlib import Path; import yaml; p=Path("skills/consultation-funnel-builder"); [yaml.safe_load(f.read_text()) for f in (p/"assets").glob("*.yaml")]; assert len(list((p/"references").glob("*.md")))==7'
```

Scan for scaffold text, credentials, customer data, A2O phone, and A2O Sheet ID;
expected result is no match.

- [ ] **Step 2: Rebuild and extract-test the archive**

```bash
python3 -c 'from pathlib import Path; import zipfile; src=Path("skills/consultation-funnel-builder"); out=Path("dist/consultation-funnel-builder.skill"); files=sorted(p for p in src.rglob("*") if p.is_file()); z=zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED); [z.write(p,p.relative_to(src.parent)) for p in files]; z.close()'
```

Extract to a new temporary directory and run `quick_validate.py`; expected:
`Skill is valid!` and 12 packaged files.

- [ ] **Step 3: Run repository verification**

```bash
cd app && npm test && npm run build && npm run lint
```

Expected: 140/140 tests, successful build, lint with zero errors and only the
known unrelated warnings.

- [ ] **Step 4: Commit and push**

```bash
git add dist/consultation-funnel-builder.skill
git commit -m "build: repackage image-first funnel skill"
git push origin codex/assessment-lead-pipeline
```

- [ ] **Step 5: Verify Draft PR #1**

Use GitHub CLI to confirm PR #1 remains open and draft, targets `main`, uses
`codex/assessment-lead-pipeline`, and contains the final image-first commit.
