# Apex Property Renovation

A separate, multi-page public marketing website. The existing client portal at https://apexpropertyportal.com/ is linked but not modified.

## Run and build
Use Node 20.20 or later. Run `npm ci`, `npm run build`, then `npm start`. The server defaults to port 5300.

The preview bundles static HTML for every page, self-hosted fonts, optimized architectural concept images, lightweight page motion, and a lazily loaded interactive Three.js architectural model. Concept imagery is not a completed-project portfolio.

## Inquiries
The project form saves inquiries in a separate SQLite database. The protected `/inbox/` page lets the owner view and mark leads New, Contacted, or Closed. No email or SMS notification service is connected.

Read `server/CONTRACT.json` and `server/HANDOFF.json` for validation, configuration, security, and operations. Private credentials and inquiry data are outside this repository and outside the public build.

## Production launch
1. Choose a new marketing domain. Do not repoint or replace `apexpropertyportal.com`.
2. Deploy this standalone app to separate HTTPS hosting with a private persistent data volume.
3. Configure `DATA_DIR` and `ADMIN_ACCESS_FILE` outside the public build. Configure trusted proxy settings and exact allowed frontend origins.
4. Set `SITE_URL` to the new marketing origin; rebuild so canonicals, Open Graph image URLs, breadcrumbs, and sitemap use that domain.
5. Only when intentionally launching, set `PUBLIC_INDEXABLE=true` for the build and `PREVIEW_NOINDEX=false` for the server. Keep `/inbox/` and `/api/` private/noindex.
6. Connect and verify an owner-selected email notification destination if wanted. The current working inbox does not imply email delivery.
7. Verify inquiry delivery, HTTPS, backup/restore, retention, and owner access on production.
8. Verify the domain in Google Search Console and submit `/sitemap.xml`. Complete accurate business listings using only verified business details. No search-ranking position is guaranteed.

## Tests
`npm run build && npm test` runs backend, architectural interaction, and rendered-site checks. Browser QA covers desktop/mobile pages, the 3D stages, forms, and the inbox.

## Runtime boundaries
The Computer preview is for review and testing, not durable public hosting. Keep its backend running for interactive testing. Real customer inquiries should wait for the separate production hosting and notification/monitoring workflow to be confirmed.

For the nested Computer preview only, run `node script/prepare-preview.mjs` after the build and deploy `dist`. This changes built HTML asset and navigation paths to relative file URLs. Run a fresh `npm run build` for production to restore normal clean routes. The Owner inbox link in the footer opens the protected inquiry inbox.
