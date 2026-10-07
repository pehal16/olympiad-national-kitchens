# Restaurant story — layout 2

Approved 2026-10-07. Visual revision only: blueprint 15, storyVersion 1 and the issued food assetVersion remain unchanged. Native question photos, descriptions, recipes, timings, grading and protected mode take precedence over illustrative concept food and copy. No audio, 3D, rotations or extra mandatory transitions.

## Design inventory

Five distinct compositions: foreground photo album; overhead map; close open notebook; set restaurant table with four equal menu options; kitchen workbench with actual composition. The same guest, white shirt, cafe, natural daylight and marble connect the chapters. Arrival, neutral service and waiting receive matching wide and portrait backgrounds. All backgrounds contain no food, answers or raster UI. Photos and controls are HTML.

Accepted desktop concepts are preserved in docs/assets/restaurant-immersive: album.png, map.png, notes.png, orders.png, kitchen.png. Mobile references: map-mobile.png, orders-mobile.png, kitchen-mobile.png. Intentional implementation differences: original issued food photos and complete task descriptions; no decorative hamburger menu; existing recipe-specific stages and operation labels; no invented ticket numbers; rules, early finish and save state available on mobile. No fixed example answer is used to initialize a task.

Tokens: background #f6f4ec; paper #fbf8f1; ink #173d37; muted #58665e; accent #147568; rule #cddbd4. Georgia/serif headings and food titles; Arial/system sans-serif body and controls. Body/control text at least 16px; primary controls at least 48px high; headings 24–38px. Spacing uses 8/12/16/24/32px; photo corners 8px, paper controls 10px. Real-food images have no color overlays, preserve proportions and use contain. Only scenery can cover/crop. Selected does not mean correct. SVG directional/enlargement icons share 2px strokes.

At >=1100px T1 has a 60/40 scene/answer split (photo >=500px at 1366px viewport), T2 four columns, T3 two notebook pages, T4 guest context plus a 2x2 menu, T5 pantry/scene/operations. At 768–1099px the scene shrinks first and T2 uses two columns. At <=767px T1/T3 stack, T2 has two photo columns, T4 one full-width option per row, T5 scene first and two ingredient columns. Scrolling preserves food size. Timers remain in a compact sticky strip. Keyboard shrink gives priority to T3 clues and input.

## Ownership and state

OlympiadStory owns the scoped restaurant shell, chapter background, route, guest text and server-confirmed neutral events. Tour controllers retain answer/draft/lock ownership and accept presentationMode=restaurant, default standard. Shared buttons retain their existing IDs and are moved/restored once through the existing controller lifecycle. Re-rendering preserves draft sources and the protected input focus contract.

T1 zoom/retry remains within the current page, preserves source URL and closes back to its trigger. Failed question photos continue to block blind answers; failure/retry never unlocks protected mode. Map photos stay large after assignment and all four countries remain usable. T4 complete text, equal options and existing keyboard/drag/clear/zoom remain.

Story T5 service is embedded after rendering the server-confirmed next state. It never blocks currentQuestion or steals focus. Existing legacy modal service keeps its blocking behavior. The exact receipt photos/composition, natural serving scale and neutral mood are retained; beginning the next selection returns the visual area to the workbench. A receipt is identified by attempt/question, not a local optimistic draft. Failure/dismissal/reload never submits again. Terminal service may appear on the waiting page; grades remain hidden.

Only current and next neutral backgrounds preload. APIs are not service-worker/CDN cached. DecorationsDisabled removes the immersive shell and returns standard presentation while keeping real question images. Shell revisions update together without forced active-page reload. Old attempts without story keep their presentation.

## Visible story copy

Brand: Ресторан путешествий. Chapter names: Фотоальбом; Карта путешествий; Записная книжка; Пожелания компании; Финальная кухня. Existing question/recipe text comes from the issued question. Action labels remain the controller's actual confirmation/operation labels. Neutral messages: Записано; Сопоставления записаны; Название записано; Заказ принят; Подача сохранена. Guest uses existing short chapter copy; notebook transition can use «Теперь мой почерк: он иногда спорит с памятью». No correctness language or emotional change before publication.

## Acceptance

Full 36-answer real controller route, reload/retry/guards/T3 focus, all 210 T5 combinations, hidden/published results and 0/1/intermediate/51 collection. Desktop 1536x1024/1440x900/1366x768, mobile 320/360/390/430, touch/keyboard/reduced motion/failed images. Compare each chapter's concept and browser screenshot for copy, layout, type, palette, asset framing and controls. Record deviations and fixes in verification evidence. npm test, Cloudflare build, local PM01 verifier; isolated preview 50/60 full participants, zero lost/duplicate answers, p95 <=3000ms; main deployment and read-only production verifier. College-device rehearsal remains separate external acceptance.
