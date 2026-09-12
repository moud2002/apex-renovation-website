# Apex Property Renovation

Investor-focused, multi-page North Alabama renovation website with a real project showcase, architectural concepts, interactive home/duplex/fourplex models and a protected inquiry inbox.

## Run
Use Node 22. Run `npm ci`, `npm run build`, then `npm start`. The Express server defaults to port 5300 and serves both the built Astro pages and the inquiry API. `npm run dev` starts the Astro frontend development server; it does not start the inquiry backend.

`npm test` runs the existing backend, legacy architectural-model and rendered-site regression suites. See `QA.md` for the separate browser checks of the redesigned interface and new model.

## Application
- Public pages: home, capabilities, service details, process, about, project form and privacy.
- Inquiry form: property type, location, optional goal/budget/timing, scope, contact details and consent. The goal is incorporated into the existing details field.
- `/inbox/`: original owner login and inquiry management. Credentials and customer data stay outside the repository and public build.
- The external client portal at https://apexpropertyportal.com/ is linked and remains a separate application.
- No email or SMS notification provider is connected. Successful submission means the inquiry was stored by this application's API.

## Deployment
Repository: https://github.com/moud2002/apex-renovation-website

The included Dockerfile builds static pages and runs the existing Node 22/Express/SQLite application on Railway. See `RAILWAY-SETUP.md` for domain, storage and owner-account configuration. Source code and inquiry data have separate backup requirements: a GitHub backup branch does not back up the SQLite inbox.

The pre-redesign source is preserved at `backup/pre-investor-redesign`. Backend files are unchanged by this redesign. Do not add production credentials or a customer database to GitHub.

## Design and assets
See `DESIGN.md`, `ASSET-MANIFEST.md` and `REFINEMENTS.md`. Mahmoud's original wine-room photograph is included unchanged. Other photographs are labelled architectural concepts. The interactive models are illustrative and are not construction drawings.
