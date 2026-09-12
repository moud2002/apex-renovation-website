# Follow-up verification

- Production build passed; all 38 regression tests passed after the username and password-rule changes.
- All 40 responsive page/viewport checks passed at 320, 390, 768 and 1440 pixels.
- Every built HTML page was checked for the removed personal name; none remain.
- The wine-room image appears once across all built pages, on the homepage only.
- Every inner page includes the Back control, and every footer includes Settings.
- Browser navigation passed: capabilities back to home; about to inquiry back to about; direct whole-home visit falls back to the renovations page. The inner-page control was visually checked on desktop and at phone width.
- The password rule accepts 8–128 characters. Bootstrap and password rotation are tested at the eight-character boundary, with shorter, overlong and control-character passwords rejected. No requested password or private credentials are included in the source.

Previous release verification follows.

---

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
