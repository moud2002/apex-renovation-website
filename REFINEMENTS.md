# Navigation, imagery and identity follow-up

- Removed the owner's personal name from public text, image descriptions, metadata, account defaults and the current handoff documents.
- Added a left-arrow Back control to every inner page. It uses browser history for visits from another page on the site, with a parent-page or homepage fallback for direct and external visits. Normal modified-link behavior is preserved.
- Renamed the footer account link to Settings; its protected `/inbox/` destination is unchanged.
- Kept the original wine-room photograph in one homepage feature only. Added new duplex, deck and bathroom concepts, a three-image homepage range, and more appropriate imagery on the about, investor and inquiry pages.
- Changed the default owner username to `moud`. The owner-requested password is supported by an 8–128 character length rule. Salted password hashing, login rate limits, session protection and private storage remain in place. No password is embedded in the source.

The earlier investor redesign is documented below as release history. Its statement that server files were unchanged applies to that release; this follow-up changes the default username and password-length validation.

---

# September 12, 2026 investor redesign

## Changes
- Rebuilt the public presentation around full-home, duplex and fourplex renovations across North Alabama, with separate rental, resale and homeowner messaging.
- Added confident condensed typography, charcoal/parchment/bronze surfaces, clearer navigation, horizontal SVG arrows and new calls to action.
- Replaced the old generated imagery with two new architectural concepts and The owner's unaltered real wine-room photograph.
- Added procedural home, duplex and fourplex models with finished, structure and floor-plan views, drag and button rotation, reset, lazy loading, reduced motion and an interactive Canvas fallback.
- Replaced the stepped inquiry wizard with a clear three-section project brief. Existing API fields, consent, duplicate-submission protection and retry identifiers remain supported.
- Reworked the capabilities, service, process and about pages to match. New-home construction is described as a future capability after required licensing.
- Corrected narrow-screen headline sizing, grid intrinsic widths, header alignment and mobile model controls.

## Preserved
All server files are byte-for-byte unchanged from commit `569fa3eba610627811d4034cfc1474fe04d478b2`. The footer Settings destination, original login, inquiry management, external client portal, original gold brand assets and North Alabama service area are retained. The app still deploys through GitHub and Railway.

## Verification
- Production build passed under Node 22.
- All 37 existing regression tests passed. These include backend authentication, storage, validation, status changes, retries, restarts, rendered routes/assets and the retained legacy architecture code.
- Ten page routes checked at 320, 390, 768 and 1440 pixel iframe widths: all 40 combinations passed document-width and heading-clipping checks. Available content width is 15 pixels narrower due to the test browser's scrollbar.
- Visually reviewed desktop and phone layouts, the owner login, mobile navigation and interactive model views.
- New model type/view controls and rotation work through the software fallback in the browser. Accelerated WebGL could not be exercised because the test browser disables WebGL.
- Browser form validation, failure with draft preservation, restored submit controls, and successful retry were exercised against an isolated mock endpoint. Backend behavior was checked by the regression suite; browser tests did not create production inquiries.

Physical iPhone/Safari testing has not been performed. Production database persistence requires a separately configured Railway volume; the redesign itself does not add infrastructure or backups. No credentials, customer records, mock API or temporary browser harness are included in the source delivery.

# September 14, 2026 rehab and commercial update

## Positioning and client experience
- Added full-home rehab, duplex/fourplex rehab, commercial properties and portfolio ownership throughout the homepage, capabilities, process and project inquiry.
- Added a dedicated commercial rehab page covering condition/use review, interior and exterior work, trade coordination, required inspection steps and handover.
- Made the client experience a leading homepage section and primary navigation destination. Added a dedicated client-experience page and accessible interactive portal walkthrough.
- Portal copy was checked against the implementation serving apexpropertyportal.com: recorded scope/selections, task-based progress, schedules, dated updates, payment records, documents and assigned-project workspaces. The walkthrough contains feature explanations, not customer data or invented project metrics. It does not claim payment processing, e-signing, automatic site tracking, inspection certification or market exclusivity.
- Expanded the inquiry to six project categories including commercial and multiple properties, four intended-use options, budgets through $1 million+, and an optional company/ownership entity. Optional context is preserved in the existing details field without changing the API or database schema.
- Preserved the existing gold logo, black palette, hero house background, homepage wine-room photograph, interactive property models, external client portal link and Settings authentication.

## Verification
- Node 22 production build and all 42 automated tests passed, including commercial/portfolio inquiry storage across a restart. Final rendered-site tests passed after layout adjustments.
- Nine changed page routes passed width and heading checks at 320, 390, 768, 950 and 1440 pixel iframe widths (45 combinations). The test browser reserves 15 pixels for scrollbars.
- Visually reviewed the portal walkthrough on phone and desktop. All five tabs, Home/End keyboard navigation, commercial preselection and inquiry error/retry behavior were exercised.
- Verified company, intended use, commercial category and larger budget survive an error and retry with the same submission identifier. A portfolio submission also reached the local confirmation state, with the confirmation text checked at 320 pixels.
- Browser inquiries used an isolated QA endpoint; no test inquiries were submitted to production.
- Safari favicon/social metadata, public asset resolution and homepage image restrictions remain covered by the rendered-site checks.

Physical iPhone/Safari testing has not been performed. The website's existing Railway inquiry-storage configuration still needs a persistent volume before a public launch. This content update does not change hosting resources or credentials.
