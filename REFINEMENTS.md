# September 12 refinement

Based on the original Apex-Property-Renovation-Website source archive, not the Netlify export.

## Changes
- Locally hosted Nimbus Sans replaces the original fonts, with heavier headings and buttons. Original casing is retained.
- Consistent SVG line icons replace arrow/check/list glyphs. No marketing copy, color palette, imagery, section order, or service-area wording was changed.
- Small-screen fixes cover menu touch targets, bottom safe-area spacing, form columns, and service-title word spacing.
- Inquiry retry buttons restore their icon after submission. A cryptographic UUID fallback allows form initialization in browsers without crypto.randomUUID.
- GitHub/Railway deployment files use Node 22 and preserve the existing Express/SQLite application. See RAILWAY-SETUP.md.
- Development preview accepts terminal.local and hides the development toolbar; production layout is unaffected.

## Preserved
All original server files are byte-for-byte unchanged. The footer Owner inbox link, original username/password login, inquiry management, external client portal, North Alabama service area, images, colors, page content, and interactive house model remain.

## Verification
- Clean dependency installation succeeded under Node 22.23.2.
- Final production build passed.
- All 37 existing tests passed: backend authentication, storage, validation, status changes, retries/restarts, static routes/assets, and architectural model behavior.
- Ten main pages checked in Chrome at 320, 390, 768, and 1440 pixel iframe viewports; no page-width overflow or clipped headings/body/buttons detected after fixes. The scrollbar reduces available content width by 15 pixels in this environment.
- Visually reviewed phone and desktop homepages, narrow service page, phone inquiry form, mobile navigation, and owner login.
- Exercised project-selection validation and all three inquiry steps in the browser.
- No physical iPhone/Safari test or live GitHub/Railway deployment was performed. Backend persistence and owner authentication were tested locally; live hosting settings still require deployment verification.

No test inquiries, private credentials, node_modules, or temporary QA harness are included in the archive. The source is intended to be built by Railway; this is not a static Netlify upload.
