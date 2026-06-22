# PM01 Digital Shift Matrix

Last updated: 2026-06-20

## Purpose

This document fixes the next PM01 development layer: `Цифровая производственная смена`.

The official exam contract stays unchanged:

- 5 fixed variants plus mixed exam route;
- 20 official questions per fixed variant;
- 100 official points;
- M1 = 20, M2 = 30, M3 = 20, M4 = 30.

The new digital-shift layer is training-only. It is designed to make PM01 feel like a modern production simulator while keeping the official protocol stable.

## Normative Anchor

Current alignment target:

- FГОС СПО 43.01.09 `Повар, кондитер`;
- FГОС СПО 43.02.15 `Поварское и кондитерское дело` as an advanced methodological reference;
- ПК 1.1-ПК 1.4;
- ОК 01, ОК 02, ОК 07, ОК 09, ОК 10;
- current PM01 exam bank and comprehensive material tickets.

Working programs, calendar-thematic plans, and local assessment materials are expected from the teacher before rewriting official topics and wording from RP. Until then, RP topics in this matrix are treated as draft alignment targets.

## Interactive Families

| Family | Student Action | Why It Is Modern |
|---|---|---|
| Quality control | Inspect a photo party, control-card text, risk signals, then choose whether to admit, correct, or reject. | Tests visual production judgment instead of isolated recall. |
| Shift investigation | Mark risk zones on a realistic workshop scene. | Turns hotspot tasks into a production audit. |
| Production timeline | Rebuild a process from incoming raw material to control point. | Checks process thinking and sequence discipline. |
| Storage and marking | Decide what to do with party storage, labels, cold chain, and товарное соседство. | Connects sanitation, traceability, and реализация. |
| Order assembly | Assemble the whole production order path. | Tests whether the student sees the full shift, not disconnected operations. |

## Variant Packages

| Variant | Draft RP Topics To Confirm | Digital Shift Focus | Visual Asset Direction |
|---|---|---|---|
| Vegetables | workplace of vegetable shop; mechanical processing of vegetables and mushrooms; cuts; storage of peeled/cut vegetables | shift of vegetable semi-finished parties from acceptance to cold storage | photorealistic vegetable training shop, gastro containers, labelled trays, raw cuts only |
| Fish | fish quality check; fish processing; fish mince mass; cold storage and separated flows | freshness and fish-flow safety before heat treatment | clean fish workshop, fillet, fish mince, breaded raw semi-products, cooling zone |
| Meat | meat raw material processing; portion/small-piece semi-products; mince and meat grinder safety | safe meat grinder flow and quality of formed meat parties | meat shop, grinder parts, tools, raw meat semi-products, no cooked meat |
| Poultry/Rabbit | poultry, game, rabbit processing; defrosting; cutting; separate inventory | sanitary separation and quality control of poultry/rabbit parties | poultry/rabbit processing line, clean trays, raw semi-products only |
| Complex Order | order distribution by shops; batch calculation; packaging; marking; storage | production management from request to packaged transfer | multi-shop issue zone, closed labelled containers, cold storage, no restaurant plating |

## Implementation Status

- `practiceOnly` questions are available only in training routes.
- Practice questions have `maxScore: 0`.
- The official score remains `100`.
- The new training module is `PX Цифровая смена`.
- The public data exposes `digitalShift.practiceGuard`: a computed training-only guard manifest with the official-route block (`digital_shift`/`practiceOnly` forbidden), PX family contracts, per-variant coverage, public-data safety rules, and the RP/final-asset approval boundary.
- Current implementation reuses already accepted PM01 visual assets.
- The digital-shift package exposes four `normativeAnchors`: ФГОС 43.01.09, ФГОС 43.02.15, FIRPO POP 43.01.09, and the pending local RP/KTP gate. Each anchor now carries `sourceEvidence[]` rows.
- The digital-shift package exposes `normativeDossier` verified on 2026-06-22: it documents the official PM01 scope, allowed training-only modernization, and the items blocked until local RP/KTP arrives.
- Teacher-facing approval packages are available in `docs/pm01-digital-shift-approval-packages.md` and on `/pm01-approval.html`.
- Each package exposes two planned `previewAssets` with `targetPath`, `negativePrompt`, `status: awaiting_preview`, and `finalAsset: false`.
- Each planned preview asset also carries style references, visual purpose, aspect ratio, inspection checklist, `inspectionGate: visual_inspection_before_connection`, and preview-only output status.
- Each package exposes five `methodicalMatrix` rows: RP topic placeholder, ПК/ОК, PX module, current task wording, new format, planned asset target, check criterion, and approval gate.
- The digital-shift package exposes five `interactionBlueprints`: visual mode, layout, student flow, animation behavior, implementation path, uniqueness, assessment focus, and teacher approval question.
- The digital-shift package exposes `visualAssetRubric` so preview/final image approval is checked against the same acceptance and rejection criteria before any asset is connected to a task.
- Each package exposes `shiftCockpit`: a training-only cockpit plan with top status, module map, central interaction, production journal, right reference panel, five-step operation timeline, journal signals, and `approvalGate: requires_rp_preview_and_ui_approval`.
- Student training uses `shiftCockpit` as an interactive navigator: selecting a PX stage highlights the matching task card and shows the linked action, control signal, journal event, criterion, and competencies without changing official scoring.
- Student training also stores browser-local PX shift progress: task cards are selectable, cockpit stages can be marked as reviewed, completed timeline/log/task states are highlighted, and the data never enters official scoring or protocols.
- Answering a PX practice task automatically closes the matching cockpit stage, and the training result screen renders a separate digital-shift journal summary; this remains outside the official 100-point contract.
- During an active training attempt, PX cockpit timeline steps, focus actions, and right-panel family chips can open the exact practice simulator by `practiceFamily`; this is disabled for official exam routes.
- Teacher approval uses readiness gates per shop: official exam lock, methodical matrix, RP/KTP intake, `competency_review` for OK 09/OK 10, `innovation_review` for modern task appearance/implementation/uniqueness, preview asset plan, teacher preview decision, and final asset blocker are shown before final generated assets can be connected.
- `/pm01-approval.html` includes a copyable/downloadable `Запрос РП/КТП` Markdown kit for collecting teacher working-program excerpts, KTP topics, local assessment wording, and explicit OK 09/OK 10 verification before final rewrites.
- Each shop on `/pm01-approval.html` includes a copyable/downloadable `Пакет согласования цеха` Markdown export that combines RP topics, gates, OK/innovation review, five tasks, methodical matrix rows, preview prompts, target paths, style references, inspection checklist, and current visual-inspection state for teacher approval.
- `/pm01-approval.html` also includes a copyable/downloadable `Сводный пакет 5 цехов` Markdown export for sending the full PM01 PX approval package in one file.
- The same all-shop block includes a browser-local `Журнал сводного согласования`; `Preview batch` stays closed until the combined package is marked `На preview`, even when individual shops are locally ready.
- After that all-shop gate, `/pm01-approval.html` can copy or download the `Preview batch` Markdown for preview-image generation while keeping `finalAsset: false` and the official exam unchanged.
- After preview inspection is accepted, `/pm01-approval.html` can copy/download a `Final assets batch` Markdown with `connectAutomatically: false`; generated final images still need repeated visual inspection before any connection to the exam.
- After final files are generated, `/pm01-approval.html` keeps a browser-local `Final asset inspection` journal with actual paths, `accepted_final` decisions, revision/rejection notes, snapshot transfer, and a `connection_review` gate. This still does not connect images automatically.
- The `connection_review` gate has its own browser-local decision journal and Markdown export. `approved_connection` is only permission to prepare a separate code change; no image is connected automatically from the approval board.
- After `approved_connection`, `/pm01-approval.html` shows `Connection implementation package`: a copy/download handoff for a later manual code change with actual final paths, repeated checklist, `publicExamChanged: false`, `manualCodeChangeRequired: true`, and `connectAutomatically: false`.
- The same package can run `Check public files`, which verifies that approved final paths resolve to reachable image files under the public `/assets/` route and carries `fileCheckStatus` evidence into snapshot/export state.
- A computed `readyForManualCodeChange` gate stays false until the connection review is approved, all final assets are accepted with actual paths, and every file check is `reachable_image`; blocker codes are exported for the manual implementer.
- `/pm01-approval.html` includes a copyable `Coverage audit` that checks the 25 matrix rows, five interaction families, 10 preview slots, RP intake, preview decisions, visual inspection status, final-asset gate, and ПК/ОК coverage before image generation continues.
- New generated final assets should be added only after teacher review of the per-shop prompt package.

## Approval Workflow

For each shop package:

1. Confirm RP topics and local wording from the teacher-provided files.
2. Review the five digital-shift tasks.
3. Approve image prompts and 1-2 preview images.
4. Generate final realistic assets into `public/assets/pm01/generated/...`.
5. Visually inspect every asset before connecting it to a question.
6. Run unit, build, local PM01 verification, and browser QA.
