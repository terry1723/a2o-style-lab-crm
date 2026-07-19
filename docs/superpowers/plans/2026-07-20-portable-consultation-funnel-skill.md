# Portable Consultation Funnel Builder Skill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build, test, validate, and package a portable Codex skill for interactive consultation funnels with a website, private uploads, Google Sheets, and WhatsApp conversion.

**Architecture:** Store the authoritative editable skill at `skills/consultation-funnel-builder`, with a concise workflow in `SKILL.md` and focused bundled references. Preserve the A2O evidence in a human playbook, record baseline and forward tests, then package the validated, secret-free folder as a shareable `.skill` archive.

**Tech Stack:** Markdown, YAML, Codex skill metadata, Python validation scripts, Git, ZIP.

---

## File Map

- `skills/consultation-funnel-builder/SKILL.md` — triggers, workflow, guardrails,
  reference routing, quick reference, and example.
- `skills/consultation-funnel-builder/agents/openai.yaml` — UI metadata.
- `skills/consultation-funnel-builder/references/` — intake, architecture, media,
  data/privacy, failure patterns, launch, and A2O case study.
- `skills/consultation-funnel-builder/assets/` — reusable brief, media manifest,
  and handoff templates.
- `docs/playbooks/interactive-consultation-funnel.md` — human-readable use and
  sharing guide.
- `docs/skill-tests/consultation-funnel-builder/` — baseline and four forward
  test records.
- `dist/consultation-funnel-builder.skill` — shareable archive.
- `app/public/media/assessment/README.md` — correct stale music-volume values.

## Task 1: Record the Without-Skill Baseline

**Files:**

- Create: `docs/skill-tests/consultation-funnel-builder/baseline.md`

- [ ] **Step 1: Run a fresh subagent without the new skill**

Use this exact prompt and provide no A2O design documents:

```text
Terry AI Lab想由Facebook廣告帶人入一個AI顧問諮詢網站。網站會由顧問影片逐條問問題，收集答案、公司資料同WhatsApp，最後將資料放入Google Sheet，再叫合資格客人WhatsApp預約。請直接講你會點樣開始同需要我提供甚麼。
```

- [ ] **Step 2: Score the response**

Record `present`, `partial`, or `missing` for all of these keys:

```yaml
one_question_at_a_time_intake:
existing_repository_discovery:
business_qualification_goal:
media_manifest_and_transcripts:
question_end_event_gate:
safari_and_chrome_strategy:
private_upload_boundary:
google_sheet_idempotency:
whatsapp_conversion_definition:
crm_and_auth_isolation:
consent_and_privacy:
preview_and_exact_commit_promotion:
```

- [ ] **Step 3: Write and verify the baseline record**

Include the exact prompt, concise response summary, score table, and specific
behaviours the skill must improve. Run:

```bash
rg -n "one_question_at_a_time_intake|existing_repository_discovery|business_qualification_goal|media_manifest_and_transcripts|question_end_event_gate|safari_and_chrome_strategy|private_upload_boundary|google_sheet_idempotency|whatsapp_conversion_definition|crm_and_auth_isolation|consent_and_privacy|preview_and_exact_commit_promotion" docs/skill-tests/consultation-funnel-builder/baseline.md
```

Expected: all 12 keys appear.

- [ ] **Step 4: Commit**

```bash
git add docs/skill-tests/consultation-funnel-builder/baseline.md
git commit -m "test: record consultation funnel skill baseline"
```

## Task 2: Scaffold the Skill

**Files:**

- Create: `skills/consultation-funnel-builder/SKILL.md`
- Create: `skills/consultation-funnel-builder/agents/openai.yaml`
- Create: `skills/consultation-funnel-builder/references/`
- Create: `skills/consultation-funnel-builder/assets/`

- [ ] **Step 1: Initialize with the official scaffold**

```bash
python3 /Users/terrylee/.codex/skills/.system/skill-creator/scripts/init_skill.py consultation-funnel-builder --path skills --resources references,assets --interface display_name="Consultation Funnel Builder" --interface short_description="Build video consultation funnels with Sheets and WhatsApp" --interface default_prompt="Use $consultation-funnel-builder to plan and build a new interactive consultation funnel."
```

Expected: skill folder, `SKILL.md`, `agents/openai.yaml`, `references/`, and
`assets/` exist without example placeholders.

- [ ] **Step 2: Verify and commit the scaffold**

```bash
sed -n '1,120p' skills/consultation-funnel-builder/agents/openai.yaml
git add skills/consultation-funnel-builder
git commit -m "chore: scaffold consultation funnel builder skill"
```

Expected: metadata is quoted and the default prompt names
`$consultation-funnel-builder`.

## Task 3: Write the Skill Workflow

**Files:**

- Modify: `skills/consultation-funnel-builder/SKILL.md`

- [ ] **Step 1: Replace generated frontmatter**

```yaml
---
name: consultation-funnel-builder
description: Use when creating, adapting, diagnosing, or launching an interactive consultation, assessment, or lead-qualification website, especially when the journey uses presenter videos, sequential questions, private uploads, Google Sheets, WhatsApp conversion, or an existing CRM that must remain isolated.
---
```

- [ ] **Step 2: Add the discovery and approval workflow**

Require repository inspection; one material intake question at a time; business
and qualification confirmation before UI design; no secrets in chat or source;
and an approved brief and architecture before implementation.

- [ ] **Step 3: Add build, integration, and launch stages**

Cover state modelling, media manifest, genuine video completion gating,
accessible recovery, private signed upload, server validation, Sheet
idempotency, WhatsApp CTA, analytics, TDD, preview, cross-browser verification,
and promotion of the exact reviewed deployment.

- [ ] **Step 4: Add reference routing and stop conditions**

Require explicit authority before changing CRM/auth, personal-data storage,
live Sheets, production, or external message destinations. Route only to the
bundled references needed for the current stage.

- [ ] **Step 5: Add a quick reference and one complete example**

Begin the example with:

```text
User: 用 $consultation-funnel-builder 幫 Terry AI Lab 整一個AI顧問篩選網站。
Agent: 我會先檢查現有專案同需要保留嘅系統。第一條問題：呢個漏斗最終想篩選出邊一類公司或決策人？
```

Continue through approved brief, build, integration, verification, and handoff
without pretending accounts are connected.

- [ ] **Step 6: Scan and commit**

```bash
rg -n "TODO|Structuring This Skill|Example Script|Reference Documentation" skills/consultation-funnel-builder
git add skills/consultation-funnel-builder
git commit -m "feat: define consultation funnel skill workflow"
```

Expected: the scan returns no matches before commit.

## Task 4: Build the Reference Library

**Files:**

- Create: `skills/consultation-funnel-builder/references/intake-and-discovery.md`
- Create: `skills/consultation-funnel-builder/references/funnel-blueprint.md`
- Create: `skills/consultation-funnel-builder/references/media-and-browser-playback.md`
- Create: `skills/consultation-funnel-builder/references/data-privacy-and-integrations.md`
- Create: `skills/consultation-funnel-builder/references/failure-patterns.md`
- Create: `skills/consultation-funnel-builder/references/verification-and-launch.md`
- Create: `skills/consultation-funnel-builder/references/a2o-case-study.md`

- [ ] **Step 1: Write intake and blueprint references**

The intake must cover business, audience, qualification, campaign, presenter,
media, questions, capture fields, consent, storage, Sheet, WhatsApp, existing
systems, browsers, analytics, deployment, and ownership—one question at a time.
The blueprint must define:

```text
opening → scene-playing → playback-recovery → question → preparing-next-scene
→ upload-and-contact → submitting → success → WhatsApp handoff
```

- [ ] **Step 2: Write media and browser guidance**

Include stable IDs/URLs, H.264/AAC MP4, poster continuity, decoded visible-frame
readiness, same-gesture playback, no hidden audible playback, real `ended`
gating, manual recovery, soundtrack fade/mute/cleanup, and separate Safari and
Chrome tests.

- [ ] **Step 3: Write privacy and integration guidance**

Include short-lived signed uploads, private non-identifying paths, trusted
server endpoints, allowlisted answers, normalized contacts, consent,
idempotent Session IDs, durable paths plus expiring staff links, retry
preservation, partial-failure semantics, Sheet mapping, private logs, and
default CRM/auth isolation.

- [ ] **Step 4: Write the failure-pattern library**

Use `Symptom`, `Likely root cause`, `Evidence`, `Corrective pattern`,
`Regression test`, and `Prevention` for audio-before-picture, poster flash,
Safari video skip, MOV incompatibility, quiet soundtrack, stale playback,
wrong resume, duplicate Sheet rows, partial success, accidental CRM writes,
automation scroll false positives, and documentation/config drift.

- [ ] **Step 5: Write launch guidance and the A2O case study**

Cover unit/integration/media/responsive/accessibility/browser/privacy/synthetic
E2E/CRM read-only tests, preview, exact commit, production, rollback, monitoring,
and handoff. The case study must cite repository specs and history, record the
final 20%/32% music settings, omit secrets and real lead data, and distinguish
confirmed facts from reusable recommendations.

- [ ] **Step 6: Verify and commit**

```bash
for f in intake-and-discovery funnel-blueprint media-and-browser-playback data-privacy-and-integrations failure-patterns verification-and-launch a2o-case-study; do test -f "skills/consultation-funnel-builder/references/$f.md" || exit 1; done
git add skills/consultation-funnel-builder
git commit -m "docs: add consultation funnel reference library"
```

Expected: exit code 0 and seven references committed.

## Task 5: Add Templates and the Human Playbook

**Files:**

- Create: `skills/consultation-funnel-builder/assets/new-funnel-brief.yaml`
- Create: `skills/consultation-funnel-builder/assets/content-and-media-manifest.yaml`
- Create: `skills/consultation-funnel-builder/assets/handoff-checklist.md`
- Create: `docs/playbooks/interactive-consultation-funnel.md`
- Modify: `app/public/media/assessment/README.md`

- [ ] **Step 1: Create the new-funnel brief**

Include these top-level keys with explanatory safe defaults, never A2O contact
details or credentials:

```yaml
pattern_version: "1.0"
business:
audience:
qualification:
campaign:
experience:
questions:
lead_capture:
privacy_and_consent:
storage:
google_sheet:
whatsapp:
existing_system_boundaries:
analytics:
browser_support:
deployment:
ownership_and_handoff:
confirmed_decisions:
open_questions:
```

- [ ] **Step 2: Create the media manifest and handoff checklist**

The manifest must include stable scene/question IDs, source asset, public URL,
poster, transcript status, duration, container/codecs, dimensions, fast-start,
browser checks, and checksum. The handoff must record account owners, retention,
WhatsApp destination, analytics, preview/production URLs, rollback commit,
browser evidence, risks, and post-launch owner.

- [ ] **Step 3: Write the human playbook**

Explain the business model, suitable/unsuitable cases, package layout,
invocation, project-local copying, personal installation, authoritative updates,
and information that must never be shared. Link the approved design and bundled
A2O case study.

- [ ] **Step 4: Correct known documentation drift**

Change only `10%`/`18%` to `20%`/`32%` in
`app/public/media/assessment/README.md`; do not modify media or runtime code.

- [ ] **Step 5: Scan and commit**

```bash
rg -n "SUPABASE_SERVICE_ROLE_KEY|APPS_SCRIPT_SHARED_SECRET|54077240|1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY" skills/consultation-funnel-builder docs/playbooks/interactive-consultation-funnel.md
git add skills/consultation-funnel-builder/assets docs/playbooks/interactive-consultation-funnel.md app/public/media/assessment/README.md
git commit -m "docs: add portable funnel templates and playbook"
```

Expected: sensitive-string scan returns no matches.

## Task 6: Forward-Test and Refine

**Files:**

- Create: `docs/skill-tests/consultation-funnel-builder/terry-ai-lab.md`
- Create: `docs/skill-tests/consultation-funnel-builder/existing-crm-boundary.md`
- Create: `docs/skill-tests/consultation-funnel-builder/safari-playback-failure.md`
- Create: `docs/skill-tests/consultation-funnel-builder/incomplete-inputs.md`
- Modify if tests expose gaps: `skills/consultation-funnel-builder/SKILL.md`
- Modify if tests expose gaps: `skills/consultation-funnel-builder/references/*.md`

- [ ] **Step 1: Test the Terry AI Lab scenario with the skill**

Reuse Task 1's prompt. Pass when the response asks one material business or
qualification question, does not jump into code, and tracks every required
intake domain.

- [ ] **Step 2: Test CRM isolation**

```text
公司已有CRM、登入系統同多年客戶資料。我想首頁換成影片諮詢，完成後相片入私人Storage、資料入Google Sheet，但唔准改CRM資料或登入。請用呢個Skill開始。
```

Pass when it inspects boundaries, proposes a separate public submission path,
and requires authority before CRM/auth changes.

- [ ] **Step 3: Test Safari failure handling**

```text
Chrome四條問題片正常，但Safari答完第一題後第二至第四條片被跳過，直接顯示問題；有時亦會先有聲後有畫。
```

Pass when it rejects timeout-to-question fallback and requires genuine `ended`
gating, same-gesture visible playback, manual recovery, and Safari regression
verification.

- [ ] **Step 4: Test incomplete inputs**

```text
幫我即刻整一個同A2O一樣嘅網站，我未有影片、問題、私隱字句、Google Sheet、WhatsApp文字或部署帳戶。
```

Pass when it does not copy/fabricate A2O assets, separates mock from production
data, lists missing inputs, and asks only the first material question.

- [ ] **Step 5: Record, refine minimally, rerun failures, and commit**

Each test record must include scenario, expected behaviours, observed
behaviours, final `PASS`/`FAIL`, and resulting edits.

```bash
git add docs/skill-tests/consultation-funnel-builder skills/consultation-funnel-builder
git commit -m "test: forward-test consultation funnel builder skill"
```

## Task 7: Validate and Package

**Files:**

- Create: `dist/consultation-funnel-builder.skill`

- [ ] **Step 1: Run official and metadata validation**

```bash
python3 /Users/terrylee/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/consultation-funnel-builder
python3 -c 'import pathlib,yaml; p=pathlib.Path("skills/consultation-funnel-builder"); y=yaml.safe_load((p/"agents/openai.yaml").read_text()); assert "$consultation-funnel-builder" in y["interface"]["default_prompt"]; text=(p/"SKILL.md").read_text(); refs=list((p/"references").glob("*.md")); assert len(refs)==7; assert all(r.name in text for r in refs)'
```

Expected: `Skill is valid!` and exit code 0.

- [ ] **Step 2: Scan for placeholders and secrets**

```bash
rg -n "TODO|TBD|SUPABASE_SERVICE_ROLE_KEY|APPS_SCRIPT_SHARED_SECRET|BEGIN PRIVATE KEY|54077240|1Xi_u4DYkkMtpl7ClpaxwOyGjU7VAud6d8_uQGmQRHcY" skills/consultation-funnel-builder
```

Expected: no matches.

- [ ] **Step 3: Create and inspect the archive**

```bash
mkdir -p dist
python3 -c 'from pathlib import Path; import zipfile; src=Path("skills/consultation-funnel-builder"); out=Path("dist/consultation-funnel-builder.skill"); files=sorted(p for p in src.rglob("*") if p.is_file()); z=zipfile.ZipFile(out,"w",zipfile.ZIP_DEFLATED); [z.write(p,p.relative_to(src.parent)) for p in files]; z.close()'
unzip -l dist/consultation-funnel-builder.skill
```

Expected: one top-level skill folder containing `SKILL.md`, metadata, seven
references, and three assets; no media, `.env`, customer data, or Git metadata.

- [ ] **Step 4: Test extraction and commit**

```bash
tmp_dir=$(mktemp -d) && unzip -q dist/consultation-funnel-builder.skill -d "$tmp_dir" && python3 /Users/terrylee/.codex/skills/.system/skill-creator/scripts/quick_validate.py "$tmp_dir/consultation-funnel-builder"
git add dist/consultation-funnel-builder.skill
git commit -m "build: package consultation funnel builder skill"
```

Expected: extracted skill returns `Skill is valid!`.

## Task 8: Final Verification and Handoff

**Files:** Verify every file created or changed above.

- [ ] **Step 1: Run final checks**

```bash
git diff --check HEAD~6..HEAD
git status --short
python3 /Users/terrylee/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/consultation-funnel-builder
```

Expected: no whitespace errors, valid skill, and only the pre-existing
`app/tsconfig.tsbuildinfo` modification outside committed work.

- [ ] **Step 2: Compare against the approved design**

Map every acceptance criterion to a workflow, reference, template, test, or
package check. Report limitations honestly: the skill cannot grant account
access, invent approved content, or deploy without authority.

- [ ] **Step 3: Hand off source, playbook, and archive**

Provide clickable absolute links to:

```text
skills/consultation-funnel-builder/SKILL.md
docs/playbooks/interactive-consultation-funnel.md
dist/consultation-funnel-builder.skill
```

Explain that the folder is editable source and `.skill` is the shareable
package. State the baseline, forward tests, validator, archive extraction, and
secret scans that actually passed.
