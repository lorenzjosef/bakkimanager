# Bakki Deployment Todo

## 1. Odoo Online

- [x] Verify external API access is enabled on `bakki.odoo.com` (read/write verified via JSON-2)
- [ ] Verify the Odoo Online plan supports the required external API surface for production load
- [ ] Document the required Odoo user/service account for Bakki integration
- [ ] Production/staging: move the Odoo API key out of `API_Keys.txt` into managed runtime secret configuration
- [ ] Production/staging: clear any remaining `API_Keys.txt` fallback usage and rely on managed runtime secrets only

## 2. DigitalOcean Platform

- [x] Provision app hosting for `admin-web`
- [x] Provision app hosting for `apps/api`
- [x] Provision PostgreSQL/PostGIS for Bakki Core
- [ ] Provision Spaces for media
- [x] Configure the hosted Bakki Core runtime env to point at the current managed PostgreSQL/PostGIS cluster
- [ ] Configure secrets and runtime env vars for API, Odoo, and Spaces

## 2A. Local Development Platform

- [x] Add a local PostGIS Docker Compose stack for Bakki Core
- [x] Add root scripts for local DB up/down/logs
- [x] Extend the local DB doctor to show the resolved Bakki Core target and TCP reachability
- [x] Generate local `.env.local` so Odoo credentials resolve from environment instead of `API_Keys.txt`
- [x] Bring up a local PostgreSQL/PostGIS runtime on this machine and bootstrap Bakki Core successfully
- [ ] Bring up the local PostGIS stack on a machine with Docker installed
- [x] Run Bakki Core bootstrap against the local database

## 3. Runtime Configuration

- [x] Configure `ODOO_URL=https://bakki.odoo.com` in local runtime defaults
- [x] Configure Odoo database/tenant identifiers for local runtime defaults
- [x] Configure Odoo API key secret in local `.env.local`
- [x] Configure Bakki Core database connection for local development
- [x] Configure a local development media provider so local runtime checks pass without hosted Spaces secrets
- [x] Add `BAKKI_DESKTOP_API_BASE_URL` so packaged Electron builds can target a hosted API origin directly
- [ ] Configure hosted media storage credentials
- [ ] Remove all non-local runtime dependence on `API_Keys.txt`

## 4. Deployment Workflow

- [x] Add an aggregated release-readiness preflight command (`yarn release:check`)
- [x] Fix the App Platform API route-prefix alignment and re-verify hosted `GET /api/v1/health` plus `GET /api/v1/auth/session` on March 29, 2026
- [ ] Define dev/staging/production environments for web, API, and DB
- [ ] Define migration workflow for Bakki Core schema changes
- [ ] Define rollback workflow for failed API or DB releases
- [ ] Run staging deployment end to end

## 5. Recovery

- [ ] Document Bakki Core backup and restore workflow
- [ ] Document Spaces backup expectations
- [ ] Document Odoo Online outage behavior and degraded-mode expectations
