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
- Current implementation reuses already accepted PM01 visual assets.
- New generated final assets should be added only after teacher review of the per-shop prompt package.

## Approval Workflow

For each shop package:

1. Confirm RP topics and local wording from the teacher-provided files.
2. Review the five digital-shift tasks.
3. Approve image prompts and 1-2 preview images.
4. Generate final realistic assets into `public/assets/pm01/generated/...`.
5. Visually inspect every asset before connecting it to a question.
6. Run unit, build, local PM01 verification, and browser QA.
