# Project Memory

Last updated: 2026-09-24

## Current Baseline

- Repository: `pehal16/olympiad-national-kitchens`
- Branch: `main`
- Latest functional baseline before this memory note: `29738dc Add generated PM01 semi-finished cards`
- Production URL: `https://olympiad-gkts.pages.dev`
- Hosting/runtime: Cloudflare Pages + Pages Functions
- Storage: Cloudflare D1 via binding `DB`; learning attachments use the private Yandex Disk REST API because R2 billing is not enabled
- Wrangler project: `olympiad-gkts`

Always treat the latest `origin/main` as the source of truth. Older chat instructions, screenshots, Yandex-era assumptions, and old implementation plans are historical context only.

## Non-Negotiable Continuity Rules

- Start from latest `main`; do not roll back to older exam versions.
- Preserve current Cloudflare production path.
- Do not restore IP-based attempt blocking.
- Do not discard old results or student attempts while changing UI/content.
- Do not overwrite user/local changes without explicit instruction.
- Prefer additive, reviewable changes with tests.
- Every learning work must be traceable to the applicable working program and lesson sequence; factual norms, recipe data, equipment modes, sanitary requirements, and standards must be checked before publication. Student-facing wording must remain appropriately challenging, self-contained, concise, and accessible.

## National Kitchens Olympiad Launch Foundation

- Release 1.7.0 is a reviewable launch foundation for the planned inside-college olympiad. The full operational plan is `docs/olympiad-launch-plan.md`, and the draft exchange format for future questions is `docs/olympiad-question-package.example.json`. Two source-backed visual pilot tasks now exercise the real format, but the teacher must still approve their wording and answer keys before the official bank is frozen.
- Participant responses now reveal only the current question plus route/tour metadata. The former full future-question route is no longer sent to the browser, and the client waits for server confirmation before showing the next question.
- `dish_assembly` supports image cards, a dish scene, transparent visual layers, text fallback, keyboard/click/drag interaction and reduced-motion behavior. Existing ingredient matrices use the new visual assembly board even before approved food images are added. Variant validation rejects external/unsafe visual paths, missing image alt text, and dish assemblies without an approved recipe scope and participant-visible variant label.
- Visual package `public/assets/olympiad/visual-v1/` contains six individually inspected dish images, fifteen transparent ingredient cards and `asset-review.json` with generation/review records and recipe sources. The participant homepage has a six-dish gallery, while `/visual-demo.html` is the no-score hands-on preview for Margherita and the explicitly named Russian restaurant Caesar variant.
- The two pilot `dish_assembly` questions use a lazy local Three.js bundle from `public/assets/runtime/dish-scene-3d.js`. The current source entry is `src/client/dish-scene-photo.js`: it renders a ceramic plate with transparent food photographs as independently selected layers. `visual-v2/layers/` holds individually inspected photoreal baked pizza base, tomato spread, and melted mozzarella; existing `visual-v1/ingredients/` cutouts supply the other plated ingredients. The old primitive-food source `src/client/dish-scene-3d.js` is no longer the build entry. Pointer rotation, toolbar controls, capped pixel ratio, no continuous animation loop, and automatic 2D fallback remain. Every candidate in a 3D task must have an image, visual layer and supported model descriptor; public payloads keep those descriptors but omit the correct ingredient IDs. Do not use the complete reference-dish photograph as a selection reward, since that would reveal the answer.
- Variant generation accepts and stores a deterministic seed and blueprint version. The T2 selector now gives every source block a chance to become the anchor; a 10,000-seed audit produced 10,000 unique routes with no never-issued source. Four T4 sources still appear in every route and T3 exposure remains uneven because the source pool has different numbers of questions per cuisine, so official launch still requires a frozen balanced manifest set after the final questions are supplied. Use `npm.cmd run audit:variants` to measure this.
- Browser focus/fullscreen events are queued locally and written idempotently to the append-only attempt event store. D1 migrations `0006_olympiad_integrity_events.sql` and `0007_olympiad_attempt_concurrency.sql` must be applied before deploying 1.7.0. Events are review signals and never change scores automatically.
- Every new attempt has a random device access token; only its SHA-256 hash is stored, and current/pulse/answer/finish/integrity routes require the token. The browser persists a pending start token before the first request so lost start responses can be retried without orphaning the attempt, and keeps an in-memory fallback when localStorage is unavailable. Deterministic attempt identity uses a separate `ATTEMPT_ID_SECRET`; Cloudflare deployment fails closed when this secret is missing or shorter than 32 characters and never derives it from the administrator password. Start is atomic, and D1 answer/timer/finish writes use a state revision with compare-and-swap. Concurrent duplicate starts resolve to one attempt, duplicate answers advance once, and repeated finish keeps the original `finishedAt`. The file store only protects one local process, and YDB is a compatibility fallback without strict multi-process CAS; official olympiad traffic must use Cloudflare D1.
- Start checks the event calendar directly, participant hot paths read attempt summaries rather than all variants/answers, pending/current answers are flushed before early finish, and exact ranking ties share a place. Active and expired attempts remain visible to the administrator but are unranked.
- Static files are restricted out of the Pages Worker by `public/_routes.json`; visual assets must be optimized before they are added to the olympiad bank. The local load harness defaults to localhost and requires `ALLOW_REMOTE_LOAD_TEST=1` for any preview/staging target.
- Runtime question, option, item, bucket and slot IDs are deterministic but opaque per seed and question; private answer maps are remapped with them. Public payloads omit source IDs and internal content metadata. Validation rejects asset filenames that advertise answer roles and visual assembly tasks where only some cards have a layer, preventing DOM/API and visual-presence clues.
- Final local Miniflare/D1 target-load QA passed with 50 participants, 50 unique attempts, 38 synchronized rounds, 1,900 logical answers plus 190 simultaneous duplicate answer requests, 55 idempotency-tested integrity requests, and no errors or double progression. Five duplicate start pairs resolved to one attempt each; on an isolated test database registration p95 was 466 ms, start p95 815.9 ms, answer p95 893.3 ms and p99 912.5 ms. A 60-participant over-capacity stress run remained functionally correct but recorded answer p95 1.03 s, 30 ms above the local target. A separate 10-participant run verified 20 simultaneous duplicate finish requests keep one `finishedAt` with finish p95 232.3 ms. Browser QA passed token-protected resume, unauthenticated 401, current-question privacy, visual board keyboard/click behavior, persisted tab-loss events, desktop/mobile layouts, two lost start responses with one reused token, operation with localStorage disabled, terminal 409/422 retry stopping, and zero JavaScript errors. The visual-v1 demo additionally passed live WebGL mounting, ingredient add/remove, dish switching, rotation controls, reference-image/variant updates and 390×844 overflow checks. The visual-v1 regression also passed 50/50 participants, 50 unique attempts and three synchronized answer rounds on local Miniflare/D1 with no functional errors; this cold local run had p95 answer latency 1.56 s, so timing still needs the planned Cloudflare preview rehearsal. The JSON file backend failed under the same burst and remains unsuitable for the event. Node tests pass 127/127, the 10,000-seed variant audit passes, and the Cloudflare build succeeds. A separate Cloudflare preview rehearsal with final images is still required before production.
- A forced delayed-answer browser race test confirmed `answer-start → answer-complete → finish-start`, one stored answer, one finish request, and no page errors. Pending answer flushes share one in-flight promise, lock the answer surface and controls, reject false success without server confirmation, and never let an empty draft overwrite a meaningful queued answer.
- The user chose open participation by any student, without a preapproved roster or one-time admission codes. The current form remains suitable only for development and supervised pilot use. Before loading the official private bank, add start/answer rate limits, a short start window, rejected-request audit, managed device recovery, and second-tab coordination; otherwise fabricated profiles can enumerate the route with empty answers. Format checks do not establish identity, so official supervised sessions need a human identity check and a documented response to suspicious submissions.
- The participant receives an on-screen attempt receipt. External email/other notification delivery is not implemented and must not be sent without review and explicit confirmation of the exact outgoing action.
- Release 1.7.0 was published as a clearly labelled test/pilot version on Cloudflare Pages from commit `a4810e5` in successful GitHub Actions run `35978344399` on 2026-09-24. The workflow applied additive D1 migrations `0006` and `0007` and configured the independent `ATTEMPT_ID_SECRET` without exposing its value. Production `/api/health`, the public olympiad API, landing image, visual demo, and the read-only PM01 regression check returned successfully. This publication is not authorization for official results: teacher approval, balanced/frozen variants, rate limiting, short start window, identity process, and a real RF-network/60-client rehearsal remain open.
- The 2026-09-23 RF-access and exam-control pass adds stricter olympiad-only name-format checks, a teacher start journal sourced from saved attempts, a compact active-exam screen, and best-effort paste/Print Screen shortcut events. Browser events never prove that a screenshot was created, and an open profile form cannot prove identity. Cloudflare documents ISP-level disruption for Russian visitors; `docs/olympiad-rf-access-plan.md` describes a full API/data migration to a Russian host. No host, domain, PostgreSQL adapter, migration, or production cutover has yet been selected or performed.
- The user chose Timeweb Cloud for short-term hosting. A separate project named “Олимпиада — Национальные кухни мира” was created in their account on 2026-09-23, without changing the “Гастроном” project. No paid VPS has been ordered: the user explicitly chose to prepare the migration first. The selected Novosibirsk form shows 2 vCPU, 4 GB RAM, 50 GB NVMe, Ubuntu 24.04, IPv4 and one backup for 2.46 RUB/hour total; recheck at order time. Stopping a VPS does not stop charges; after tests/event it must be deleted only after an off-server verified data export, and its public IP must also be removed. See `docs/timeweb-olympiad-runbook.md`.
- The Timeweb preparation adds `olympiad-server.js` as an olympiad-only Node entry, backed by transactional SQLite/WAL through `src/sqlite-d1.js` and the existing D1 attempt-store contract. PM01 and learning routes/static files return 404 on this entry. Local synthetic HTTP rehearsals passed with 40/60 unique attempts, duplicate start/answer/event checks and no errors. A 60-client all-question run completed 38 synchronized rounds and 2,508 answer requests at p95 147.7 ms; a separate 60-client early-finish run made 120 idempotent finish requests at p95 171.7 ms. These are not VPS or Russian-network measurements. `scripts/backup-olympiad-sqlite.js` creates and verifies a local SQLite backup, but an off-VPS transfer and restore test remain required. All 132 Node tests, the Cloudflare build and local PM01 regression pass. The official VPS, HTTPS/domain, migration of any existing olympiad records, security/rate limits, teacher approval and live 60-client rehearsal are still pending.
- A GitHub Pages access trial is published from the separate `gh-pages` branch at `https://pehal16.github.io/olympiad-national-kitchens/` (commit `e0ad04d`). It contains only the no-score visual demo, not the official olympiad API, attempt storage, scoring, or teacher journal. The page explicitly warns participants that their answers are not saved. The local build script is `scripts/build-github-pages-preview.js`. GitHub reports the Pages build complete; one local live-browser check passed, but reachability from actual Russian student networks and 50–60-client load have not been tested. Cloudflare remains production.
- The 2026-09-24 landing-screen pass gives the olympiad a quieter college-branded hero, one state-aware primary action, rules/registration links, a three-step explanation, a decorative generated food image under `public/assets/olympiad/landing/`, and a visible initial-load failure/retry state. The production landing and prestart screens explicitly say this is a test launch and that results are not official before organizer approval. Registration, start and result navigation reflect actual state; form submission and start are protected from duplicate clicks; early-finish results show the true answered count. A same-tab session pointer restores a token-protected active attempt or receipt after reload; unavailable browser storage may still require re-registration or organizer help. The image is decorative, not an exam answer reference. Local browser QA passed desktop/mobile landing, registration, active-attempt reload, early finish, result reload, 390px overflow, and zero console errors. Production browser QA passed page identity, nonblank rendering, desktop/mobile first view, landing CTA focus/scroll, and no JavaScript console errors, without creating a real participant. Node tests passed 132/132, Cloudflare build and PM01 verifier passed. The 10,000-seed variant audit reported 10,000 distinct route signatures and no score mismatches, but four T4 questions still appeared in every route and exposure in other tours varied. Teacher calibration and a frozen balanced official set remain necessary. `docs/olympiad-launch-plan.md` records a source-backed fairness/accessibility review and the user's open-participation decision. Open self-registration does not verify identity; browser focus/screenshot signals do not prove cheating.

## Learning Works Pilot

- The living source of truth for the teacher's daily material-preparation workflow is `docs/teacher-daily-workflow.md`.
- The full newer local teaching rules are referenced by `paths.lessonRulesPath` in the private configuration and must be read in addition to this workflow. The living audit in `docs/learning-methodical-audit.md` separates technical delivery from methodical acceptance. Release 1.6.91 closes the prerequisite/explanation/worked-example gaps for practices 1–3, but practices 4–7, the exact 2023 Anfimova edition, and provenance of all spice photographs remain open. See `docs/learning-study-sources.md`; do not claim complete FГОС or visual acceptance from passing tests alone.
- Current platform package version in the working tree: `1.7.0`; the learning pilot contains seven source-faithful МДК 01.01 practical works and does not change the official PM01 100-point contract.
- Release 1.6.92 implements the teacher's explicit request for practice 3 only: the detailed beef calculation is optional for grade 5. Required recipe/output tables now score 50 + 30; the optional guided explanation scores up to 20 after teacher review (14 + 6 rubric). Grade thresholds remain 90/75/60. Four response fields replace six blank columns; given 103 g/76 g/20 portions, formula and a collapsible fully worked 10-portion example are supplied. The calculator inserts a student-entered expression, result and unit. Progress separates the required tables from the optional task.
- The server computes available manual points from sealed submitted answers, not draft/client fields: skipped or partially filled excellent task permits submission but earns 0 bonus; a full explanation permits quality-based manual scoring. File and D1 integration tests cover skipped/partial/full cases, forged grade/bonus rejection, accepted 80/4 and 100/5, selective reseeding and retained immutable answers. Browser QA on synthetic accounts verifies both grading flows, save/reload, division-by-zero protection, example expansion and desktop/mobile layout. No real student QA attempts were submitted.
- Release 1.6.92 deployed from `c6a6026` in successful GitHub Actions run `33976408331` on 2026-09-05. One deliberate production reseed upgraded only practice 3 to revision 8. The started old assignment `assign_58c96d66-fab4-4634-92f7-bdbed305b36c` was archived, not overwritten; the corrected published assignment is `assign_0ff0bf2a-c956-4453-a1ad-885d2714b98f`, version `workv_41f1390b-715d-487e-85eb-ba7c2cd4f4a4`. All 10 existing submissions retained their IDs/status/grade/revision, and a pre/post SHA-256 comparison of the old practice-3 answer/revision snapshot matched. Assignment records increased 17 → 18; all other assignments remained unchanged. No credentials or roster entries were created.
- Final 1.6.92 checks: 105/105 Node tests, Cloudflare build, local and production read-only PM01 verification passed. The production check used the same temporary PowerShell 7 transport documented for 1.6.91; all five routes returned 200 and PM01 stayed at 100 points with no exposed keys. Production template inspection confirms the optional four-field guided block at 20 points. Browser plugin was unavailable; cached Playwright CLI checked Chromium at 1440×1000 and 390×844 on isolated local storage. Correct page titles/nonblank rendering/no framework overlay/no JavaScript errors, example toggle, calculator error/success, reload persistence, base-only 80/4 and full 100/5 publishing plus student history were checked. A partial optional submission was covered in both File and D1 integration tests. Native iOS/Safari and real-student end-to-end submissions were intentionally not tested. Screenshots and temporary QA scripts remain outside the repository.
- Release 1.6.91 adds structured student explanations in `src/learning/pilot-study.js`: source → explanation → fully worked analogous example → independent task. Practice 1 has gross/net/waste/units and two verified examples; practice 2 has a searchable 16-entry, six-field spice library with fresh/dried basil separated; practice 3 begins with the real recipe page and explains columns, alternatives and output before a 10-portion example and the 20-portion task. No new scored questions or recipe norms were introduced.
- Current content revisions are per work: 7 for practices 1–2, 8 for practice 3, 6 for 4–7. Pilot reseeding compares the desired definition revision for each work, not a global revision. Only practice 3 changes in 1.6.92. Started assignments must be archived and replaced with a separately published assignment, never silently upgraded; previous answers/grades remain available.
- Release 1.6.91 QA: 102 Node tests, Cloudflare build and local PM01 regression pass. Synthetic student checks cover group/name entry, spice search/empty/reset states, keyboard cards, image enlargement/Escape focus return, calculator insertion and persisted answers after theory navigation/reload. Desktop 1440×1000 and mobile 390×844 were visually checked; section navigation accounts for wrapped sticky headers. Source Word files and real student answers were not edited during QA.
- Release 1.6.91 deployed successfully from `a33b359` in GitHub Actions run `33970822959` on 2026-09-05. One deliberate production reseed upgraded only practices 1–3 to revision 7; the configured group's assignments kept their IDs because none had been started. Practices 4–7 and legacy-course assignments remained unchanged. Before/after checks retained all 17 assignment records and all 6 existing submissions with their status/grade; no new credentials or rosters were created. Read-only template inspection confirmed 7/5/7 study sections and the 16-entry spice library. Teacher preview, nested image dialog, and an additional 820×844 viewport also passed.
- Production verification note: direct Node `fetch` on this Windows host returned `fetch failed`. The unchanged `scripts/verify-pm01-production.js` passed all assertions using a temporary read-only PowerShell 7 HTTP transport outside the repository. The five production routes returned 200, version 1.6.91, five PM01 variants/modules, the 100-point contract, and zero exposed private answer-key fields. Do not misreport the direct-network command as having passed.
- Private local paths, the VK schedule chat, and the working email address are stored only in the ignored file `storage/teacher-workflow-private.json`.
- The separate mode `Учебные работы` is implemented under `/learning.html`, `/learning-admin.html`, and `/api/learning/*`; it remains independent from PM01 and olympiad attempts.
- The pilot includes roles, groups, subjects, courses, roster import, 18 block types, immutable work versions, assignments, autosave, file evidence, automatic and manual review, correction cycles, grades, audit, and the journal.
- The student workspace now actually recovers its user/submission-scoped local answer backup after a failed save and reload. Recovery is automatic only at the same server revision; stale or already submitted drafts are never replayed over server answers. A conflict keeps the local copy available for download, locks editing/submission, and requires confirmation before discarding it. Navigation and logout flush pending answers first; a failed flush keeps the work open. Storage failures must not falsely promise a local backup.
- Instruction illustrations and matching-task source images can be enlarged in a keyboard-accessible dialog, including the teacher preview. Equipment thumbnails use `object-fit: contain` to preserve the whole diagram. Escape returns focus to the originating control; reused confirmation dialogs reset their result so Escape cannot repeat an earlier approval.
- Read-only production roster audit on 2026-09-04 confirmed four real groups with 70 students plus the separate four-student synthetic pilot. This does not mean all planned 10–15 groups have been imported or all subjects assigned.
- Release 1.6.90 QA: 100 Node tests and the Cloudflare build pass; local PM01 regression passes. Synthetic browser checks cover failed-save recovery after reload, server persistence after reconnect/retry, blocked unsaved navigation, stale-copy download and confirmed discard, desktop/mobile image viewing (1440×1000 and 390×844), focus return, and nested teacher-preview dialogs. Injected network failures produce expected failed-request console entries; normal student and teacher views have no errors or warnings. No content revision or production reseed is required for this UI-only release.
- Local development uses a file repository; Cloudflare uses D1 migrations `0003`–`0005`, while student attachments are kept under the configured private Yandex Disk folder and served only through authorized learning API routes.
- The Cloudflare workflow validates the existing Yandex Disk OAuth token, writes the Yandex settings as Pages secrets, and deliberately has no R2 binding or R2 subscription dependency.
- Learning passwords use salted PBKDF2-SHA-256 with the private server pepper and a portable 100,000-iteration ceiling required by the Cloudflare Workers Web Crypto runtime.
- Students enter the learning cabinet by selecting an active group and their full name; student logins and passwords are not displayed or requested. The teacher cabinet continues to require protected credentials. Legacy student credential rows remain only for schema and data compatibility.
- Group/name entry deliberately prioritizes classroom convenience over identity assurance: anyone who can see a roster can select another student's profile. Use this mode only under the college's approved organizational rules and do not expose grades or sensitive personal data beyond the learning purpose.
- The administrator recovery workflow derives the recovery password hash with the active `LEARNING_AUTH_SECRET` inside GitHub Actions. The recoverable credential itself is kept only as a Windows-encrypted local credential and must never be committed or printed in logs.
- A safe synthetic pilot creates one fictional group, four fictional students, five subjects, and seven works based on the verified sequence of МДК 01.01 for 3-ПК-26: raw-material request, spices, recipe-book use, vegetable-workplace flow, vegetable equipment, fish-workplace organization, and fish-processing equipment.
- The current pilot contains only practical works № 1–7 from the teacher's МДК 01.01 materials for 3-ПК-26: raw-material requisition; traditional spices and seasonings; recipe-book use; vegetable workplace organization; МОК-150М and МПР-350М operation; fish-workplace organization; fish-processing equipment with the RO-1M study object. Generic tests, unrelated equipment, reflections, and invented examples are prohibited in these pilot works.
- The first pilot work is a real calculation worksheet: the dish, per-portion norm, portions, and waste percentage are supplied; the student fills the net table, the vegetable gross table, and the final requisition.
- Calculation blocks and numeric table cells provide a contextual four-operation calculator. A row can preload its own safe arithmetic expression, and the result is inserted into the selected answer cell without exposing the answer key.
- Ordering, matching, and classification use direct drag-and-drop on desktop. Touch and keyboard users can select a card and then its destination; ordering keeps an Alt + arrow keyboard path but no longer displays up/down buttons.
- The current spice practical contains sixteen samples and seven manually reviewed culinary-use situations. The original source practical has eight samples and five situations; the expansion follows the teacher's later request for more spices, but requires a complete source-backed theory/reference entry for each added sample. Automatic photo identification and plant-part classification do not replace that methodical review. See the current audit rather than the older eight-sample summary.
- Practical № 3 uses L. E. Golunova's 2003 collection, recipe № 423 «Тефтели», 2nd composition variant with rice, beef, page 261, and an exact 20-portion recalculation. Do not call it Roman column II: the selected left filled pair is 103/76 g, while the scanned column header is misaligned. Practical № 5 contains only МОК-150М and МПР-350М operation cards plus the source calculation Q=30 kg, G=150 kg/h and a 7 kg batch limit.
- Practical № 6 is the two-academic-hour fish-workplace task from the 2026–2027 thematic plan. It uses the source production situation of 15 kg chilled scaly fish and covers functional zoning, sanitary sequence, the six-stage processing flow, four control points, the workplace equipment table, and one uploaded workplace diagram. Four verified illustrations from the teacher's source package are reused under `public/assets/learning/practices/pz6/`.
- Practical № 7 is the four-academic-hour fish-equipment task from the same thematic plan. It covers the purposes of RO-1M, PR-2, GS-1, and the mincing mechanism; the components and operating principle of RO-1M; safe start, work, shutdown, and sanitation; a complete operation card; and one uploaded labeled machine diagram. The unsafe legacy direction to wash the scraper while powered is explicitly excluded: sanitation starts only after full shutdown and disconnection.
- Pilot content has an explicit revision marker. Re-running pilot deployment upgrades untouched assignments; a started assignment stays bound to its immutable version, is archived, and receives a separate corrected assignment. The five deprecated generic pilot titles are archived and hidden from the student dashboard without deleting submissions.
- Accepted visual references are `docs/assets/learning-practice-1-calculation-concept.png`, `docs/assets/learning-practice-workspace-v2-concept.png`, and `docs/assets/learning-practice-workspace-mobile-v2-concept.png`. Generated concept text is never an authoritative content source.
- The technology-card builder now covers source details, scope, gross/net formulation, technological operations, output, serving, quality, storage, and allergens. The technology-scheme builder creates a live ordered flow and can enforce minimum stages and control points.
- Existing source-package illustrations are stored under `public/assets/learning/spices/` and `public/assets/learning/equipment/`. Reuse does not establish photographic provenance or complete technical accuracy; the 2026-09-05 audit leaves full spice-photo provenance and equipment manual checks open.
- Manual schedule/replacement intake is still separate. Automatic VK access is a later optional integration.
- Draft generation may use working programs, lesson plans, approved old materials, and templates, but publication remains blocked until teacher review.
- Email preparation may be automated, but external sending always requires explicit confirmation and an idempotent delivery record.
- Current implementation status: the full local pilot lifecycle and the first methodically grounded МДК 01.01 content package are implemented. Real-group rollout must follow `docs/learning-pilot-runbook.md`, beginning with one group and one subject; roster import and publication require a separate deliberate step.

## PM01 Exam State

The PM01 exam is an interactive production exam for:

- M0 situation
- M1 test
- M2 calculation
- M3 voice answer
- M4 simulation

Current PM01 total score contract: 100 points.

Current PM01 implementation version: `1.6.79`.

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
- Version `1.6.74` adds browser-local PM01 PX final asset inspection: each generated final file can record actual path, accepted/revision/rejected status, note, copy/download inspection report, snapshot transfer, coverage-audit metrics, `final_visual_inspection` gate, and a separate `connection_review` gate before any exam connection.
- Version `1.6.75` adds browser-local PM01 PX connection review: after accepted final assets, each shop records draft/approved/revision/hold connection status, teacher note, copy/download connect-review report, snapshot transfer, coverage-audit metrics, and the explicit rule that `approved_connection` only permits a separate code change rather than automatic asset connection.
- Version `1.6.76` adds a copy/download `Connection implementation package` after `approved_connection`: it includes only accepted final asset paths, repeats manual implementation checklists, records `publicExamChanged: false`, `manualCodeChangeRequired: true`, and still does not connect images automatically.
- Version `1.6.77` adds `Check public files` to the connection implementation package: approved final asset paths are resolved to public `/assets/` URLs, checked as reachable images in the browser, saved in snapshot state, and exported as `fileCheckStatus` evidence before any manual code change.
- Version `1.6.78` adds a computed `readyForManualCodeChange` gate to the connection implementation package: a shop is ready only after approved connection review, accepted final assets with actual paths, and all public file checks returning `reachable_image`; blocker codes are exported for unresolved cases.
- Version `1.6.79` adds `digitalShift.practiceGuard`: a computed public guard manifest plus engine/verifier checks that keep PX `digital_shift`/`practiceOnly` content out of official routes, require five zero-score training families per variant, and repeat answer-key/public-data safety boundaries.
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
