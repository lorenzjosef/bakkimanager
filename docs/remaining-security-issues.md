# Remaining Security Issues

These issues were identified during the code review on 2026-03-29 and updated on 2026-03-30 after implementation work.

## ✅ Completed Security Fixes (2026-03-30)

### API Authentication/Authorization - COMPLETED

1. **Global Authentication Guard** - FIXED
   - Implemented `SessionAuthGuard` as a global APP_GUARD
   - All routes protected by default, use `@Public()` decorator for exceptions
   - Session token read from cookie or `x-bakki-session` header
   - Files: `apps/api/src/common/guards/session-auth.guard.ts`, `apps/api/src/common/decorators/public.decorator.ts`

2. **Role-Based Authorization** - FIXED
   - Implemented `RolesGuard` with `@Roles()` and `@OwnerOnly()` decorators
   - Applied to all mutation endpoints (Users, Species, Map, Health ops)
   - Files: `apps/api/src/common/guards/roles.guard.ts`, `apps/api/src/common/decorators/roles.decorator.ts`

3. **Session Store Abstraction** - FIXED
   - Created `SessionStore` interface with pluggable backends
   - `MemorySessionStore` for dev/test
   - `RedisSessionStore` for production (uses `BAKKI_REDIS_URL` env var)
   - Atomic operations, proper TTL handling, user→session indexes
   - Files: `apps/api/src/common/session/*.ts`

4. **Rate Limiting** - FIXED
   - Added `@nestjs/throttler` with two named limits:
     - Default: 100 requests per minute
     - Login: 5 requests per minute
   - Trust proxy support via `BAKKI_TRUST_PROXY=true`
   - Files: `apps/api/src/app.module.ts`, `apps/api/src/main.ts`

5. **Password Validation** - FIXED
   - Login DTO: Removed min length, added max length (256) for DoS protection
   - Password policy belongs in user creation/Odoo, not login
   - File: `apps/api/src/modules/auth/dto/login-request.dto.ts`

6. **Cookie Security** - FIXED
   - Changed `SameSite` from `lax` to `strict`
   - File: `apps/api/src/modules/auth/auth.service.ts`

7. **Geometry Validation** - FIXED
   - Created `validateGeoJsonGeometry()` with comprehensive checks
   - Type validation, coordinate bounds (WGS84), ring closure
   - DoS protection: max 10000 points, max nesting depth
   - Integrated into MapService.assertEditablePolygonGeometry()
   - Files: `apps/api/src/common/validation/geometry.validator.ts`, `apps/api/src/modules/map/map.service.ts`

### Electron Desktop Security - COMPLETED

8. **Content Security Policy** - FIXED
   - Added CSP via session.defaultSession.webRequest.onHeadersReceived
   - Restrictive policy: `default-src 'self'`, `script-src 'self'`, etc.
   - X-Content-Type-Options and X-Frame-Options headers
   - File: `apps/admin-desktop/src/main.ts`

9. **Start URL Validation** - FIXED
   - Validates `BAKKI_DESKTOP_START_URL` before loading
   - Production: only https or localhost http
   - Development: allows http/https
   - File: `apps/admin-desktop/src/main.ts`

10. **Session Token Storage** - FIXED
    - Removed plaintext fallback completely
    - Only persists tokens when `safeStorage.isEncryptionAvailable()` is true
    - Otherwise keeps token in memory only (requires re-login after restart)
    - File: `apps/admin-desktop/src/session-store.ts`

11. **External URL Handling** - FIXED
    - Only allows https in production, http added in development
    - Uses explicit protocol allowlist
    - File: `apps/admin-desktop/src/main.ts`

### CORS - Already Acceptable
- Env-based allowlist via `BAKKI_ALLOWED_ORIGINS`
- Falls back to localhost ports in non-development
- Development mode allows any origin for convenience

## 🔶 Outstanding Items (Lower Priority)

### 12. Sandbox Mode
**Location:** `apps/admin-desktop/src/main.ts`
**Status:** Documented, not enabled
**Reason:** Required for preload script environment variable access. Compensated with CSP, contextIsolation, and URL validation.

### 13. Database Credentials
**Location:** Multiple config files
**Status:** Deferred
**Reason:** Current env-based approach is acceptable for deployment target. Code is structured to support future secrets manager integration.

### 14. Redis Session Store in Production
**Status:** Implemented but optional
**Note:** Sessions will persist if `BAKKI_REDIS_URL` is configured. Otherwise falls back to in-memory (acceptable for single-instance deployment).

---

## Test Coverage Added

New security tests in:
- `apps/api/src/common/guards/session-auth.guard.test.ts`
- `apps/api/src/common/guards/roles.guard.test.ts`
- `apps/api/src/common/validation/geometry.validator.test.ts`

*Last updated: 2026-03-30*
