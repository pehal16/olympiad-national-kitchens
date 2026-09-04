# Project Continuity Rules

This repository must always be treated as a living production project. Start every new Codex session from the latest committed revision, not from older chat context, old screenshots, or earlier implementation plans.

## Required Start Protocol

Before making changes:

1. Run `git status --short --branch`.
2. Run `git pull --ff-only` when network and permissions allow it.
3. Review the latest commits with `git log -5 --oneline --decorate`.
4. Read `docs/project-memory.md`.

If local changes exist, assume they are intentional user or agent work. Do not discard, reset, checkout, or revert them unless the user explicitly asks for that exact operation.

## Source Of Truth

- The current branch `main` and `origin/main` are the baseline.
- Production is Cloudflare Pages, project `olympiad-gkts`.
- Do not move work back to older Yandex/serverless behavior unless the user explicitly requests that migration.
- Do not reintroduce removed IP attempt restrictions.
- Do not replace current PM01 exam content with older versions from previous prompts or screenshots.

## Verification And Delivery

For code or content changes, use the repo's current checks:

- `npm.cmd test`
- `npm.cmd run build:cloudflare`
- `npm.cmd run verify:pm01 -- http://127.0.0.1:<port>` when a local server is used
- `npm.cmd run verify:cloudflare -- https://olympiad-gkts.pages.dev` after deployment

When the user asks to finish the work end to end, commit and push to `main`, then confirm the Cloudflare deployment.

## Memory Maintenance

When a major feature, deployment migration, data model, exam structure, or asset strategy changes, update `docs/project-memory.md` in the same commit. This keeps future dialogs anchored to the current project state.

## College Workflow Continuity

When a task concerns daily college materials, schedules, working programs, lesson plans, lectures, homework, practical work, or laboratory work:

1. Read `docs/teacher-daily-workflow.md` before acting.
2. Read `storage/teacher-workflow-private.json` when it exists. Treat it as private local configuration and never commit or quote its personal values in public documentation.
   Read the complete additional teaching-material rules file referenced by `paths.lessonRulesPath`, when configured. It contains newer standing teacher requirements; do not rely only on the shorter repository summary. If the file is unavailable, report that the complete rule check is not verified.
3. When the user adds or changes a standing rule, update `docs/teacher-daily-workflow.md` and its change log in the same task.
4. Preserve old source documents and existing exam/olympiad behavior unless the user explicitly asks to change them.
5. Never send email or another external message until the user has reviewed the final files and explicitly confirmed the exact outgoing action.
6. Read `docs/learning-methodical-audit.md` for learning-platform content work. Technical deployment or passing tests is not evidence that a work satisfies every pedagogical requirement. Do not describe flagged content as fully methodically accepted until its source-backed corrective review is complete.
