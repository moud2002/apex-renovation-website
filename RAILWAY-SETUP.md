# GitHub and Railway

The project is connected to moud2002/apex-renovation-website, with package.json and Dockerfile at the repository root. This is the original full application with its own owner login and database; it does not use Netlify Forms.

Connect the repository to a Railway service. The included Dockerfile builds the Astro pages and runs the existing Express server using Node 22. The server uses Railway's PORT automatically. The health check is /api/health.

## Storage and login

Before first launch, attach a persistent Railway volume mounted at /data. The Dockerfile sets DATA_DIR=/data/apex and ADMIN_ACCESS_FILE=/data/owner-access.md. Use one service replica with this SQLite database. Configure volume backups in Railway.

Set ADMIN_USERNAME and ADMIN_PASSWORD privately in Railway before the first successful start. The password must be 16–128 characters. These values initialize a new database only; changing the variable later does not reset an existing password. The original server/rotate-password.mjs utility supports password changes without deleting inquiries. Do not commit passwords or the generated access file to GitHub.

Your existing owner login remains at /inbox/. The existing client portal stays at https://apexpropertyportal.com/ and is separate from this website.

## Domain and request settings

Set SITE_URL to the exact HTTPS website origin, without a trailing slash. Set ALLOWED_ORIGINS to that same origin. ALLOW_OPAQUE_ORIGIN=false is set in the Dockerfile. Configure TRUST_PROXY for the actual Railway proxy path and verify request handling before accepting real leads.

Rebuild after changing SITE_URL. When intentionally launching publicly, set PUBLIC_INDEXABLE=true at build time and PREVIEW_NOINDEX=false at runtime. Otherwise the original preview noindex behavior remains.

## Verify after deployment

Submit a test inquiry, sign in through the footer's Settings link, confirm the inquiry appears, and update its status. Redeploy once and confirm the inquiry remains. Verify HTTPS, the final domain, and backup settings. The inbox does not send email or SMS notifications; that is unchanged from the original application.

The archive contains source code, not a migrated inquiry database or existing owner credentials. The existing Railway service is Apex Renovation Website / apex-renovation-website. Its source is pinned to a commit; deploy the intended new commit explicitly instead of assuming a service redeploy will pull the latest main branch.

At redesign inspection on September 12, 2026, this service had no attached volume and its inquiry inbox was empty. Persistent storage and scheduled backups are not provisioned by this source change. They require a separate infrastructure change before the inbox can safely retain real inquiries across redeploys.
