# H3 Deployment Readiness Report

## Decision

**Status: NOT READY for Vercel + Render production deployment.** This decision is supported by unresolved High findings H3-001 to H3-005: known high-severity dependencies, non-runnable backend test gate in this workspace, no backend CI quality gate, Float currency fields, and no production migration command/runbook.

## Vercel frontend

| Requirement | Status | Evidence / release gate |
|---|---|---|
| Production build | Verified | `npm.cmd run build` passed. |
| SPA deep links | Static verified | `frontend/vercel.json` rewrites `/(.*)` to `/index.html`; React final `path="*"` renders 404. |
| API environment | Static verified | `VITE_API_URL` is required absolute HTTP(S), `frontend/src/config/environment.js:1-29`. Set it to the deployed Render `/api` base URL for Production and Preview. |
| Browser secrets | Verified in source | `.env.example` contains only API URL and Google client ID. Do not put Cloudinary, VNPay, JWT, SMTP, database, or Gemini secrets in `VITE_*`. |
| CSP compatibility | Not ready | Backend disables Helmet CSP; publish an explicit frontend CSP after recording Vercel/Google/Cloudinary/connect origins (H3-010). |
| Bundle budget | Gate required | Build emits 401.23 kB AdminDashboard chunk and 305.84 kB entry chunk; set a measured budget before release (H3-012). |

## Render backend

| Requirement | Status | Evidence / release gate |
|---|---|---|
| Start command | Static verified | `npm start` runs `node server.js`, `backend/package.json`. |
| Proxy handling | Static verified | Production `trust proxy` uses validated `TRUST_PROXY_HOPS` 1-10. Set exact Render proxy-hop value. |
| Liveness/readiness | Static verified | `/health` liveness and `/ready` SQL `SELECT 1` readiness. Configure Render health check to `/health`; use `/ready` for pre-traffic validation. |
| Shutdown | Static verified | SIGTERM closes Socket.IO/HTTP and disconnects Prisma within 30s. Set Render grace period at least 30s or revise after measured shutdown test. |
| Cross-origin auth | Release gate | Set `FRONTEND_URL` and comma-separated `CORS_ALLOWED_ORIGINS` to exact HTTPS Vercel origins. Production cookie is `Secure; SameSite=None; HttpOnly; Path=/api/auth`; verify browser login/refresh/logout with deployed domains. |
| Secrets/env | Release gate | `validateEnvironment` requires DB, auth, Google, VNPay, Cloudinary, Gemini, SMTP, proxy and origins in production. Supply via Render secret environment variables only. |
| Database migration | Not ready | No `prisma migrate deploy` script/CI/runbook. Run a reviewed production migration stage against a backup before application release (H3-005). |
| Runtime scale | Gate required | In-memory express rate-limit and Socket.IO state are process-local (`backend/.env.example`). Use one instance or introduce shared backing before horizontal scale (H3-009). |

## Required deployment proof

1. Attach clean `npm ci`, backend test with isolated `TEST_DATABASE_URL`, audit remediation result, frontend lint/test/build logs.
2. Back up SQL Server; run migration status and `prisma migrate deploy` through a production-safe release job; record migration ID and rollback owner.
3. Configure Vercel Production/Preview URL variables and Render secrets; run `/health` and `/ready` after deploy.
4. Execute live HTTPS smoke tests: login, refresh rotation, logout, CORS rejection, product/review upload rejection and success, VNPay sandbox IPN duplicate, AI upstream failure fallback.
5. Record security headers, CSP policy, error logs, dependency versions, and rollback command in the release record.

## H3.1 status update

**Status: READY FOR A CONTROLLED DEPLOYMENT, subject to Medium release gates.** H3-001 through H3-005 are closed. Backend evidence: 36 isolated-database migrations, 83/83 tests, Prisma validate, and `npm audit --audit-level=high` all pass; Critical=0 and High=0. The backend CI workflow enforces the same tests with a CI-only SQL Server URL. Before live deployment, the operator must take and verify a SQL Server backup/restore, run `prisma migrate status` then `prisma migrate deploy`, deploy, and verify `/health` plus `/ready`.
