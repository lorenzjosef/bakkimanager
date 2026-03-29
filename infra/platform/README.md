# Platform

This directory holds platform assets for local development and later deployment.

## Local Bakki Core

The local Bakki Core database is a PostGIS container defined in:

- `infra/platform/docker-compose.local.yml`

Expected workflow:

1. Generate a local env file:
   - `yarn env:init-local`
2. Review and edit `.env.local`
   - set `BAKKI_CORE_DB_PASSWORD`
   - set Spaces values if you want media probes to work
3. Start PostGIS:
   - `yarn bakki-core:db:doctor`
   - `yarn bakki-core:db:up`
4. Start the API:
   - `yarn dev:api`
5. Open `System Settings > Odoo`
6. Run:
   - `Run Bakki Core Bootstrap`
   - `Sync Now`
   - `Run Upload Probe` after Spaces config exists

Useful commands:

- `yarn bakki-core:db:doctor`
- `yarn bakki-core:db:logs`
- `yarn bakki-core:db:down`
- `yarn bakki-core:migrate`

The DB wrapper now checks for:

- a local env file (`.env.local` preferred, `.env` fallback)
- Docker availability when the Bakki Core target is local
- whether the configured Bakki Core target is local or remote

If either prerequisite is missing, it fails with an explicit blocker message instead of a raw shell error.

If `BAKKI_CORE_DATABASE_URL` points at a remote managed database, the local stack commands:

- `yarn bakki-core:db:up`
- `yarn bakki-core:db:down`
- `yarn bakki-core:db:logs`

will now stop immediately and tell you that the current Bakki Core target is remote, because those commands only manage the local Docker PostGIS stack.

## Production Direction

Production still targets:

- DigitalOcean app hosting for web and API
- DigitalOcean PostgreSQL/PostGIS for Bakki Core
- DigitalOcean Spaces for media
- Odoo Online SaaS at `bakki.odoo.com`
