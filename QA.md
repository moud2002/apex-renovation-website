# Redesign verification

## Completed
- Node 22 production build: passed; 11 static pages built.
- Existing regression suite: 37 passed, 0 failed. Includes backend authentication, validation, persistence/restarts, inquiry state, retry handling, rendered assets and retained legacy architecture behavior.
- Responsive browser suite: ten routes at 320, 390, 768 and 1440 pixel iframe widths; 40/40 passed with no page-width overflow or clipped headings. Browser scrollbars reduce usable content width by 15 pixels.
- Visual review: desktop and phone homepage, service page, project form, mobile navigation, owner login and model.
- Mobile menu: opens as a dialog, closes and restores expanded state.
- New architectural model: property selection, finished/structure/layout modes, rotate and reset controls. The no-WebGL software fallback renders and remains interactive.
- Project brief: missing-property validation; property, city, rental goal, budget, scope, name, email and consent entry; first request failure preserves input and restores the submit button; retry shows a reference. This browser test used an isolated mock API, not the production inbox.
- All original server files compared byte-for-byte with the pre-redesign source; unchanged.

## Limits and operations
Physical iPhone/Safari and accelerated WebGL were not available in this environment. The fallback path was exercised in the browser; the accelerated path was production-built. Layout results are browser viewport checks, not a claim of physical-device testing.

GitHub preserves source code. SQLite inquiries require persistent storage and a separate backup process. The current Railway service had no volume at inspection, and its inbox contained zero records before publication preparation. Recheck before any production redeploy; do not overwrite an existing inquiry database without a preservation plan. No email/SMS notification service is connected.
