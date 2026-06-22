# Project Memory

Last updated: 2026-06-22

## Current Baseline

- Repository: `pehal16/olympiad-national-kitchens`
- Branch: `main`
- Latest functional baseline before this memory note: `29738dc Add generated PM01 semi-finished cards`
- Production URL: `https://olympiad-gkts.pages.dev`
- Hosting/runtime: Cloudflare Pages + Pages Functions
- Storage: Cloudflare D1 via binding `DB`, R2/Cloudflare bindings for larger assets and voice storage where configured
- Wrangler project: `olympiad-gkts`

Always treat the latest `origin/main` as the source of truth. Older chat instructions, screenshots, Yandex-era assumptions, and old implementation plans are historical context only.

## Non-Negotiable Continuity Rules

- Start from latest `main`; do not roll back to older exam versions.
- Preserve current Cloudflare production path.
- Do not restore IP-based attempt blocking.
- Do not discard old results or student attempts while changing UI/content.
- Do not overwrite user/local changes without explicit instruction.
- Prefer additive, reviewable changes with tests.

## PM01 Exam State

The PM01 exam is an interactive production exam for:

- M0 situation
- M1 test
- M2 calculation
- M3 voice answer
- M4 simulation

Current PM01 total score contract: 100 points.

Current PM01 implementation version: `1.6.73`.

Methodical baseline for PM01 should stay aligned with the current FГОС СПО 43.01.09 and 43.02.15, especially ПК 1.1-ПК 1.4 and ОК 01, ОК 02, ОК 07, ОК 09, ОК 10. New tasks should remain production-situation tasks: workplace organization, safe equipment use, raw material preparation, semi-finished product processing, quality control, storage conditions, and practical decision-making.

Important current PM01 content change:

- Version `1.6.42` adds one visual quality-control simulation to M4 in each of the five PM01 variants.
- The new task mode is `visualMode: "quality_control"` on `bucket_sort` questions.
- Students inspect photo cards with status, defect/risk signals, and a short control-card note, then sort each party into: admit to work, correct conditions, or reject.
- The 100-point contract is unchanged. Each variant still has 20 questions, with M4 remaining 30 points.
- Version `1.6.43` documents and wires the next PM01 layer in `docs/pm01-digital-shift-matrix.md`: `PX Цифровая смена` is a training-only extension with five modern interactive families and `maxScore: 0` practice tasks.
- The teacher-facing agreement board for the next visual/content pass is `/pm01-approval.html`, with the durable package text in `docs/pm01-digital-shift-approval-packages.md`.
- Version `1.6.45` adds planned digital-shift preview asset slots with target paths and negative prompts; these are not final connected assets.
- Version `1.6.46` adds local per-shop approval decisions, notes, and copyable decision exports on `/pm01-approval.html`; decisions stay browser-local and do not alter official exam content.
- Version `1.6.47` adds local RP-intake fields and RP reconciliation export on `/pm01-approval.html` so working-program excerpts can be captured before final topic/question rewrites.
- Version `1.6.48` exposes a per-shop methodical matrix for PM01 digital-shift packages: RP topic placeholder, ПК/ОК, PX module, new task format, planned asset, criterion, and approval gate.
- Version `1.6.49` adds teacher-facing interaction storyboards for the five PX task families: visual layout, student flow, animation behavior, implementation path, uniqueness, assessment focus, and approval question.
- Version `1.6.50` adds verified normative anchors for PX approval: ФГОС 43.01.09, ФГОС 43.02.15, ФИРПО/ИРПО ПОП 43.01.09, and the pending local RP/KTP gate.
- Version `1.6.51` adds the PM01 digital-shift visual QA rubric plus style references and inspection checklists on every planned preview asset.
- Version `1.6.52` adds a training-only digital-shift cockpit plan for every shop package: top status, module map, central interaction, production journal, right reference panel, five-step operation timeline, and journal signals for student/teacher review.
- Version `1.6.53` makes the digital-shift cockpit interactive in training: students can select a PX stage, highlight the matching task card, and use the cockpit as a training navigator without changing official scoring.
- Version `1.6.54` adds an active cockpit focus card and linked production-journal highlight in training: the selected PX stage now shows its student action, control signal, interface reaction, criterion, and competencies while remaining `training-only`.
- Version `1.6.55` adds teacher-facing PM01 PX readiness gates on `/pm01-approval.html`: each shop now shows RP/KTP, methodical matrix, preview, teacher decision, final asset, and official-exam-lock gates plus copyable gate reports.
- Version `1.6.56` adds browser-local PM01 PX shift progress in training: students can select task cards, mark cockpit stages as reviewed, see completed timeline/log/task states, and keep the official score/protocol unchanged.
- Version `1.6.57` links PM01 PX progress to real training answers: completed practice tasks now mark the matching cockpit stage automatically, and the training result screen shows a separate digital-shift journal summary without affecting official scores or protocols.
- Version `1.6.58` lets students open a specific PX simulator directly from cockpit timeline steps, focus actions, and right-panel family chips in training; official exam routing and scoring stay unchanged.
- Version `1.6.59` adds a teacher-facing PM01 PX action queue on `/pm01-approval.html`: each shop now shows the next step before preview/final assets, based on RP/KTP intake, teacher decision, notes, and readiness gates.
- Version `1.6.60` adds a preview-generation batch export on `/pm01-approval.html`: only shops with RP/KTP intake and teacher decision `На preview` are included, and the export keeps `preview_only_until_teacher_approval`, visual inspection, target paths, style references, and `finalAsset: false`.
- Version `1.6.61` adds a browser-local preview inspection journal on `/pm01-approval.html`: each planned preview asset can be marked awaiting/accepted/revision/rejected with notes, copyable inspection reports, and the final-assets gate stays blocked until all preview assets in the shop are accepted.
- Version `1.6.62` adds a browser-local PM01 PX approval snapshot export/import on `/pm01-approval.html`: RP intake, teacher decisions, notes, and preview inspection statuses can be copied as JSON and restored in another browser without changing public exam data.
- Version `1.6.63` adds snapshot file transfer on `/pm01-approval.html`: teachers can download the approval snapshot as a `.json` file and restore it through file upload, still affecting only browser-local approval state.
- Version `1.6.64` adds a PM01 PX coverage audit on `/pm01-approval.html`: the board now checks methodical matrix rows, five task families, preview slots, ПК/ОК coverage including explicit OK 09/OK 10 RP checks, RP intake, preview decisions, visual inspection, and the final-assets gate before generation work continues.
- Version `1.6.65` adds a copyable/downloadable PM01 PX RP/KTP request kit on `/pm01-approval.html`: it prepares a Markdown request for teacher files, per-shop topic confirmation, local wording, assessment-material notes, and explicit OK 09/OK 10 verification before final topic rewrites or asset generation.
- Version `1.6.66` adds a browser-local PM01 PX ПК/ОК-сверка gate on `/pm01-approval.html`: every shop now records OK 09 and OK 10 status, notes, copyable review export, snapshot transfer, coverage audit totals, and a `competency_review` readiness gate before preview/final assets can proceed.
- Version `1.6.67` adds a browser-local PM01 PX interactive innovation review on `/pm01-approval.html`: every shop now records whether each modern task family is accepted, needs revision, or is deferred, with notes, copyable innovation export, snapshot transfer, coverage audit totals, action-queue routing, and an `innovation_review` gate before preview/final assets can proceed.
- Version `1.6.68` adds a source-backed PM01 PX normative dossier: ФГОС 43.01.09, ФГОС 43.02.15, ИРПО/ФИРПО ПОП and local RP/KTP gate now expose `sourceEvidence[]`, `normativeDossier`, copy/download Markdown export, coverage audit totals, and the explicit boundary that final topics/questions/assets wait for local РП/КТП.
- Version `1.6.69` adds a per-shop PM01 PX approval package export on `/pm01-approval.html`: every shop can copy/download one Markdown packet with RP topics, gates, next action, OK09/OK10 review, innovation review, production log, five task briefs, methodical matrix rows, preview prompts, target paths, style references, inspection checklist, and current preview-inspection state for teacher/user approval.
- Version `1.6.70` adds a combined PM01 PX approval export on `/pm01-approval.html`: action queue can copy/download one Markdown file with the shared audit plus all five per-shop approval packages for user/teacher review before preview generation and final RP/KTP-based rewrites.
- Version `1.6.71` adds a browser-local all-shop review gate on `/pm01-approval.html`: the combined five-shop package now has Draft/Sent/Preview/Revision/Waiting-RP status, notes, snapshot support, coverage-audit fields, and preview batch remains closed until the combined package is marked approved for preview.
- Version `1.6.72` adds downloadable PM01 PX preview batches: after the all-shop review gate and local shop gates, `/pm01-approval.html` can copy or download one Markdown batch with preview prompts, negative prompts, style references, inspection checklists, target paths, `outputUse: preview_only_until_teacher_approval`, and `finalAsset: false`.
- Version `1.6.73` adds downloadable PM01 PX final asset batches: only packages with the `final_assets` gate open after accepted preview inspection can copy/download Markdown for final generation, and the export keeps `connectAutomatically: false` plus repeated visual inspection before any exam connection.
- Official exam routes must stay 100 points and 20 questions; training may include practice-only simulators that do not affect protocols or ведомости.

The active student route is mixed across production areas. Students should not manually choose a favorable shop/section for the exam route.

Groups currently supported in the student flow include:

- `1-ПК-25`
- `2-ПК-25`
- `1-ПКД-25`

Group spelling variants should be normalized rather than treated as separate groups.

## Teacher Cabinet State

The teacher cabinet is intended to support:

- exam open/closed state;
- attempt reset/extra attempt controls;
- best result per student;
- compact group exports;
- voice answer quick review as done/not done;
- printable protocol;
- no IP-based lockout logic.

Keep teacher workflows compact and practical. Avoid returning to overloaded single-screen layouts that make results overlap.

## Visual Asset Policy

Existing PM01 assets live under:

- `public/assets/pm01/`
- generated new assets: `public/assets/pm01/generated/`
- generated semi-finished cards: `public/assets/pm01/generated/semi-finished/`

Important current visual change:

- Commit `29738dc` added 12 truly generated semi-finished product cards.
- These are intentionally separate from cropped/derived older photo cards.
- The rejected strange chicken split-card must not be reintroduced.
- Current accepted chicken generated card is `generated-chicken-drumsticks.png`.
- Version `1.6.42` reuses accepted existing PM01 visual assets for the new quality-control tasks; it does not add a new generated asset batch.
- Digital-shift practice tasks currently reuse accepted PM01 assets. New generated final assets should only be connected after teacher approval of the per-shop prompt package and visual inspection.
- Digital-shift preview assets now carry style references, inspection checklists, `inspectionGate: "visual_inspection_before_connection"`, and `outputUse: "preview_only_until_teacher_approval"`.

When adding PM01 images:

- Inspect each image visually.
- Compare the form with real culinary semi-finished products.
- Reject anatomically strange poultry, unclear rabbit cuts, wrong fish shapes, decorative food styling, cooked products, labels, text, logos, and misleading forms.
- If the visual is not methodically defensible, do not connect it to an answer card.

## Deployment And Checks

Useful commands:

```powershell
git status --short --branch
git pull --ff-only
npm.cmd test
npm.cmd run build:cloudflare
npm.cmd run verify:cloudflare -- https://olympiad-gkts.pages.dev
gh run list --workflow deploy-cloudflare.yml --limit 3
```

For local PM01 smoke tests, start `npm.cmd start` with a temporary `PORT` and `STORAGE_BACKEND=file`, then run:

```powershell
npm.cmd run verify:pm01 -- http://127.0.0.1:<port>
```

## How Future Work Should Begin

At the start of any new dialog or resumed task:

1. Check `git status --short --branch`.
2. Pull latest `main` if possible.
3. Read this memory file.
4. Inspect latest commits.
5. Continue from the current code and production behavior, not from an older mental snapshot.
