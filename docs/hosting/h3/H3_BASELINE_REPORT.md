# H3 Baseline Report

**Audit date:** 2026-07-28
**Branch:** `feature/hosting-h3-deployment-readiness`
**Scope:** React/Vite frontend, Express/Prisma backend, SQL Server schema, JWT/refresh sessions, VNPay, Cloudinary, Gemini, CI/CD, documentation, OWASP controls.
**Change scope:** audit documents only. No business logic, API, schema, dependency, configuration, commit, push, or PR was changed.

## Method and evidence standard

Each conclusion below derives from static source/configuration evidence or a recorded command result. Deployment-provider dashboards, DNS, production environment values, and a SQL Server instance were not supplied; the report marks those items as release gates rather than asserting their state.

## Validation record

| Command | Result | Evidence |
|---|---|---|
| `backend/npm.cmd test` | Blocked | Test runner rejects execution because `TEST_DATABASE_URL` is empty. |
| `backend/npm.cmd audit --json` | Failed gate | 5 High and 1 Low advisories. |
| `backend/npx.cmd prisma validate` | Pass | Prisma schema valid. |
| `frontend/npm.cmd run lint` | Pass with warnings | 22 ESLint warnings, 0 errors. |
| `frontend/npm.cmd run test:run` | Pass | 3 files, 14 tests passed. |
| `frontend/npm.cmd run build` | Pass | 760 modules; largest emitted JS chunk 401.23 kB / 117.31 kB gzip. |

## Audit coverage

| Area | Verified baseline | Evidence |
|---|---|---|
| Backend bootstrap | dotenv loads before validation; startup validates production env; graceful SIGTERM/SIGINT and fatal-process shutdown disconnect Prisma | `backend/server.js:1-45`, `backend/config/env.js:70-123`, `backend/utils/shutdown.js:1-58` |
| HTTP pipeline | trust proxy, Helmet, request ID, credentialed allowlist CORS, request logger, body limits, health/readiness, terminal handlers ordered in `createApp` | `backend/app.js:43-83` |
| Health | `/health` is liveness; `/ready` runs `SELECT 1`, has 2s timeout, returns 503 while shutdown/database failure | `backend/routes/health.routes.js:3-32` |
| Frontend | Vite production build, Vercel SPA rewrite, environment URL validation, lazy routes, app boundary and 404 route | `frontend/vite.config.js`, `frontend/vercel.json`, `frontend/src/config/environment.js`, `frontend/src/main.jsx`, `frontend/src/App.jsx` |
| Database | SQL Server Prisma schema, 32 migration directories, indexes/uniques present, schema validates | `backend/prisma/schema.prisma`, `backend/prisma/migrations`, `prisma validate` output |
| Authentication | JWT access token, 64-byte opaque refresh token, hashed session table, rotation/reuse family revocation, HttpOnly production Secure/SameSite=None cookie | `backend/utils/tokenService.js`, `backend/services/refreshSession.service.js`, `backend/utils/authCookie.js`, `backend/routes/auth.routes.js` |
| Payment | VNPay config required, HMAC signature verification, amount comparison, transactional finalization and duplicate result response | `backend/config/vnpay.js`, `backend/controllers/payment.controller.js:58-167`, `backend/services/vnpayPaymentFinalization.service.js` |
| Upload | Auth/rate limiting, 5 MiB per-file cap, 8 product/5 review maxima, MIME + extension lists, Cloudinary error responses | `backend/routes/upload.routes.js:19-177` |
| AI | 1000-char Zod request validation, 10/15min limiter, Gemini JSON prompt, whitelist mapping, rule-based fallback | `backend/controllers/aiAdvisor.controller.js`, `backend/routes/aiAdvisor.routes.js`, `backend/services/aiAdvisor.service.js:617-793` |
| DevOps/docs | frontend-only GitHub Actions quality gate; root README only contains title; backend lacks lint/CI/migration-deploy scripts | `.github/workflows/frontend-quality.yml`, `README.md`, `backend/package.json` |

## Baseline conclusion

The codebase has working frontend production build, SPA rewrite, startup environment validation, request tracing, controlled CORS, health/readiness checks, graceful shutdown, refresh-token rotation, VNPay signature verification, and upload/AI rate limiting. It is **not deployment-ready** until High findings H3-001 through H3-005 are remediated and the release gates in the deployment report are evidenced.

See the companion reports for readiness decisions, security assessment, full findings, matrix, and H3.1-H3.8 roadmap.
