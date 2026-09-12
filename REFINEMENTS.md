# September 12, 2026 investor redesign

## Changes
- Rebuilt the public presentation around full-home, duplex and fourplex renovations across North Alabama, with separate rental, resale and homeowner messaging.
- Added confident condensed typography, charcoal/parchment/bronze surfaces, clearer navigation, horizontal SVG arrows and new calls to action.
- Replaced the old generated imagery with two new architectural concepts and Mahmoud's unaltered real wine-room photograph.
- Added procedural home, duplex and fourplex models with finished, structure and floor-plan views, drag and button rotation, reset, lazy loading, reduced motion and an interactive Canvas fallback.
- Replaced the stepped inquiry wizard with a clear three-section project brief. Existing API fields, consent, duplicate-submission protection and retry identifiers remain supported.
- Reworked the capabilities, service, process and about pages to match. New-home construction is described as a future capability after required licensing.
- Corrected narrow-screen headline sizing, grid intrinsic widths, header alignment and mobile model controls.

## Preserved
All server files are byte-for-byte unchanged from commit `569fa3eba610627811d4034cfc1474fe04d478b2`. The footer Owner inbox destination, original login, inquiry management, external client portal, original gold brand assets and North Alabama service area are retained. The app still deploys through GitHub and Railway.

## Verification
- Production build passed under Node 22.
- All 37 existing regression tests passed. These include backend authentication, storage, validation, status changes, retries, restarts, rendered routes/assets and the retained legacy architecture code.
- Ten page routes checked at 320, 390, 768 and 1440 pixel iframe widths: all 40 combinations passed document-width and heading-clipping checks. Available content width is 15 pixels narrower due to the test browser's scrollbar.
- Visually reviewed desktop and phone layouts, the owner login, mobile navigation and interactive model views.
- New model type/view controls and rotation work through the software fallback in the browser. Accelerated WebGL could not be exercised because the test browser disables WebGL.
- Browser form validation, failure with draft preservation, restored submit controls, and successful retry were exercised against an isolated mock endpoint. Backend behavior was checked by the regression suite; browser tests did not create production inquiries.

Physical iPhone/Safari testing has not been performed. Production database persistence requires a separately configured Railway volume; the redesign itself does not add infrastructure or backups. No credentials, customer records, mock API or temporary browser harness are included in the source delivery.
