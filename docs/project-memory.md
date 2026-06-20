# Project Memory

Last updated: 2026-06-20

## Current Baseline

- Repository: `pehal16/olympiad-national-kitchens`
- Branch: `main`
- Current baseline commit at the time of this note: `29738dc Add generated PM01 semi-finished cards`
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
