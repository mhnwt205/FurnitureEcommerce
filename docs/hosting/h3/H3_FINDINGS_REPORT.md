# H3 Findings Report

## H3-001 — Known vulnerable runtime dependency chain

- **Description:** Backend `npm audit --json` reports five High and one Low advisories.
- **Evidence:** Cloudinary `<2.7.0` arbitrary argument injection; Multer `<2.2.0` DoS; Nodemailer `<=9.0.0` file-read/SSRF advisory; transitive brace-expansion High DoS; multer-storage-cloudinary inherits Cloudinary; body-parser Low DoS. Audit metadata: High=5, Low=1.
- **Risk:** High
- **Impact:** Upload, mail, or dependency execution paths expose known published vulnerability conditions.
- **Recommendation:** Review each supported upgrade and lockfile diff; upgrade Cloudinary/multer/Nodemailer and compatible storage adapter; rerun test/audit. Do not use forced audit remediation.
- **Priority:** P0

## H3-002 — Backend test gate cannot execute without documented isolated test database

- **Description:** Required backend validation stops before test execution.
- **Evidence:** `npm.cmd test` output: `Backend test configuration rejected: TEST_DATABASE_URL is required and must not be empty`.
- **Risk:** High
- **Impact:** Backend regression and migration safety are unverified in the H3 baseline.
- **Recommendation:** Document/provision an isolated SQL Server test database in CI and local runbook; execute the existing test suite without production credentials.
- **Priority:** P0

## H3-003 — CI covers frontend only

- **Description:** Repository workflow runs frontend install/lint/test/build only.
- **Evidence:** `.github/workflows/frontend-quality.yml` has one frontend job; `backend/package.json` has no lint/audit/production migration scripts.
- **Risk:** High
- **Impact:** Backend code, Prisma schema/migrations, and dependency advisories can reach deployment without automated gate.
- **Recommendation:** Add backend `npm ci`, tests with isolated DB, Prisma validation/migration status, and audit triage as reviewed CI jobs.
- **Priority:** P0

## H3-004 — Currency and pricing fields use Float

- **Description:** Core commerce prices remain binary floating-point.
- **Evidence:** `Product.price` (`schema.prisma:121`), `Order.totalAmount` (171), `OrderItem.price/originalPrice/discountAmount/finalPrice/subtotal` (264-271), and `Promotion.discountValue` (440) are `Float`; newer VND snapshots use `Decimal(18,0)` (197-203).
- **Risk:** High
- **Impact:** Arithmetic and persisted totals can diverge by rounding across order, promotion, payment, refund, and reporting flows.
- **Recommendation:** Design and rehearse a backward-compatible Decimal/integer-VND migration with reconciliation checks before production release.
- **Priority:** P0

## H3-005 — Production migration execution is not defined

- **Description:** Migration history exists but deployment command and runbook are absent.
- **Evidence:** 32 migration directories and MSSQL lock file exist; `backend/package.json` only exposes `prisma migrate dev --name init`; no `migrate deploy` command or backend CI job found.
- **Risk:** High
- **Impact:** A release can run against an incompatible schema or apply an unreviewed migration without backup/rollback evidence.
- **Recommendation:** Add a reviewed release migration procedure using `prisma migrate deploy`, backup/restore rehearsal, status check, and post-migration readiness check.
- **Priority:** P0

## H3-006 — VNPay environment selector does not enforce endpoint separation

- **Description:** Production validation accepts `VNP_ENV`, but VNPay URL construction reads `VNP_URL` and `VNP_RETURNURL` directly without using that selector.
- **Evidence:** `backend/config/env.js:115-116` validates `VNP_ENV`; `backend/config/vnpay.js:28-31` uses only `VNP_TMNCODE`, `VNP_HASHSECRET`, `VNP_URL`, `VNP_RETURNURL`.
- **Risk:** Medium
- **Impact:** Sandbox credentials/URL and production credentials/URL can be paired incorrectly by environment configuration.
- **Recommendation:** Bind approved sandbox/production host allowlists to `VNP_ENV`, document return URL, and run signed IPN/duplicate-callback tests in each environment.
- **Priority:** P1

## H3-007 — Gemini call has no timeout or retry policy

- **Description:** The Gemini request uses `fetch` without `AbortSignal`, timeout, retry, or circuit policy.
- **Evidence:** `backend/services/aiAdvisor.service.js:617-637`; fallback is only reached after fetch rejects/returns error at lines 780-791.
- **Risk:** Medium
- **Impact:** Stalled upstream connections consume request capacity until platform/network timeout.
- **Recommendation:** Add bounded abort timeout, limited retry for safe transient statuses, and metrics for fallback/latency after contract tests.
- **Priority:** P1

## H3-008 — Upload binary validation and remote cleanup are incomplete

- **Description:** Upload validates client MIME and Cloudinary allowed format, but does not inspect magic bytes; review uploads buffer in memory and no Cloudinary public-ID deletion lifecycle is recorded.
- **Evidence:** `backend/routes/upload.routes.js:19-39`, `55-73`, `155-171`.
- **Risk:** Medium
- **Impact:** Metadata-disguised files and orphaned remote assets increase attack/storage exposure; concurrent review buffers reach 25 MiB before framework overhead.
- **Recommendation:** Verify file signatures server-side, set concurrency/request-count limits, retain Cloudinary public IDs, and delete remote assets on failed/removed records.
- **Priority:** P1

## H3-009 — Metrics and multi-instance-safe state are absent

- **Description:** No metrics endpoint/instrumentation was found; rate limit and Socket.IO state are process-local.
- **Evidence:** no `metrics` or `compression` mount in `backend/app.js`; `backend/.env.example` documents one Render instance with in-memory rate limits and Socket.IO state.
- **Risk:** Medium
- **Impact:** Capacity/security-limit visibility is absent and horizontal instances apply independent limits and realtime state.
- **Recommendation:** Define RED metrics/alerts and retain single-instance constraint or migrate rate-limit/Socket state to shared infrastructure before scaling.
- **Priority:** P1

## H3-010 — Content Security Policy is disabled

- **Description:** Helmet is mounted with `contentSecurityPolicy: false`.
- **Evidence:** `backend/app.js:48`.
- **Risk:** Medium
- **Impact:** Browser lacks a policy layer restricting script, connection, image, and framing sources.
- **Recommendation:** Inventory Vercel, Render, Google OAuth, Cloudinary and required assets; deploy report-only CSP, review violations, then enforce.
- **Priority:** P1

## H3-011 — Production documentation is insufficient

- **Description:** Tracked root README does not document setup, environment, deployment, migration, rollback, or production checks.
- **Evidence:** `README.md` contains only `# Furniture Ecommerce Website`.
- **Risk:** Medium
- **Impact:** Deployment execution depends on undocumented operator knowledge.
- **Recommendation:** Publish version-controlled README, environment guide, deployment runbook, rollback procedure, and production checklist.
- **Priority:** P1

## H3-012 — Frontend bundle budget is not enforced

- **Description:** Build succeeds but emits large chunks without a configured budget/manual chunk policy.
- **Evidence:** build output: AdminDashboard 401.23 kB (117.31 kB gzip), entry 305.84 kB (98.49 kB gzip); `frontend/vite.config.js` only configures React and dev server.
- **Risk:** Low
- **Impact:** Slow-network admin/application startup performance has no release threshold.
- **Recommendation:** Record route-specific performance budget and measure before adding chunking policy.
- **Priority:** P2

## H3.1 closure update — 2026-07-28

| Finding | Status | Closure evidence |
|---|---|---|
| H3-001 | **CLOSED** | `npm audit --audit-level=high` passed: Critical=0, High=0. Cloudinary v2 buffered uploader replaces the incompatible adapter; Multer 2.2 and Nodemailer 9.0.3 are locked. One Low body-parser advisory remains. |
| H3-002 | **CLOSED** | `.env.test.example`, safe `_test` database validation, and `npm run test:prepare` produced a repeatable isolated database test run. 36 migrations; 83/83 tests passed. |
| H3-003 | **CLOSED** | Backend CI installs, prepares/tests its isolated SQL Server database, validates Prisma, and blocks High/Critical audit findings. |
| H3-004 | **CLOSED** | Monetary fields are `Decimal(18,2)`; the migration was applied successfully to the isolated test database and DTOs retain numeric JSON values. |
| H3-005 | **CLOSED** | `prisma:migrate:deploy` and controlled migration procedure now exist; live backup/restore remains a mandatory operator gate. |

H3-006 through H3-013 remain open at their recorded Medium/Low risks.

## H3-013 — Lint warnings remain

- **Description:** ESLint exits zero with 22 warnings, primarily React hook dependency and Fast Refresh export warnings.
- **Evidence:** `npm.cmd run lint` result: 22 warnings, 0 errors.
- **Risk:** Low
- **Impact:** Dependency omissions can produce stale closures/effects and warnings obscure new quality signals.
- **Recommendation:** Triage each warning with behavior tests; do not bulk-suppress.
- **Priority:** P2
