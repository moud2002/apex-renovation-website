# Website verification inventory

- Home: first viewport hero, gold original logo, primary form CTA, portal external link, navigation.
- Every public page at desktop and 375px: one H1, distinct title/description, no horizontal overflow, readable imagery and headings, working internal links, no broken images.
- Native FAQ expand and collapse; mobile dialog navigation open/close/Escape and focus restoration.
- 3D: successful frame, stages 0/1/2, exploded versus assembled screenshots, drag, reset, mobile viewport, reduced motion and no-WebGL fallback.
- Portal illustration: all three tabs switch and return, no real client content.
- Inquiry: missing project/city validation; all steps; back preserves content; email-or-phone validation; consent; successful database-backed reference; browser error preserves data; no public lead retrieval.
- Inbox: incorrect login, correct login, list record, filter, status update, refresh, logout; user text rendered safely.
- Metadata: static service content, unique titles, preview noindex, sitemap and canonical production origin configurable, no invented address/reviews.
- Performance: locally served fonts, optimized images, lazy Three.js, no console errors, reduced-motion content visible.
- Privacy: no portal changes, credentials/private data absent from public files, concept labels, no false delivery or booking claims.

Testing may create clearly named synthetic inquiries in the separate preview inbox; never in the client portal.

## Verified build

- 37 automated tests passed: backend security and persistence, architectural model behavior, rendered-page checks, and local font resolution.
- Ten page routes checked at 1440px and 375px: HTTP 200, one H1, unique page titles, description metadata, and preview noindex.
- Fixed the homepage's mobile image-panel intrinsic width; rechecked 375px viewport equals 375px document width.
- All nine internal destination paths resolve; all images loaded without broken assets.
- Actual form submission saved one clearly labeled synthetic inquiry. Owner login, record viewing, status change to Closed, filter, refresh, and logout passed.
- Tested missing fields, email-or-phone validation, a phone-only draft, and network failure with draft preservation.
- Private inbox rejects incorrect credentials; anonymous inquiry-list access returns 401. Missing pages return 404.
- 3D stage selection, mouse drag, reset, mobile view, reduced motion, and simulated unavailable-WebGL fallback passed.
- Portal illustration tabs support pointer and keyboard selection. Mobile menu open/close/Escape/focus restoration and FAQ open/close passed.
- No application runtime exceptions were observed during these checks.

The Computer preview is not durable production hosting. Email notifications, a marketing domain, production indexing, and real-device Safari testing remain production-launch checks. The existing client portal was not modified.

## Hosted preview signoff

Verified the deployed preview, not only localhost. All ten routes returned 200 at 375px, with document width matching viewport width, both self-hosted font families loaded, no broken images, no failed requests, and no runtime errors. Nested page navigation, the live 3D model, a real synthetic form submission, owner inbox authentication, inquiry status update, and logout passed. Both synthetic test inquiries were marked Closed. Preview-only HTML/CSS path adaptation is documented in `script/prepare-preview.mjs`.
