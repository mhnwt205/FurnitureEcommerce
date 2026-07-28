# H3 Prioritized Action Plan — H3.1 to H3.8

## Sequencing rule

No production deployment occurs before H3.1 through H3.4 are complete and evidenced. Each phase must preserve business behavior unless separately approved, run relevant regression tests, and update the release record.

| Phase | Objective | Findings | Exit evidence |
|---|---|---|---|
| H3.1 | Dependency remediation | H3-001 | Reviewed package/lockfile upgrades, targeted upload/mail tests, `npm audit` triage with no unaccepted High advisory. |
| H3.2 | Backend test and CI gate | H3-002, H3-003 | Isolated SQL Server test database, repeatable backend test run, CI executes backend install/test/Prisma validate/audit. |
| H3.3 | Monetary data integrity design | H3-004 | Approved Decimal/integer-VND migration design, inventory of read/write paths, reconciliation and rollback test plan. |
| H3.4 | Migration release safety | H3-005 | `migrate deploy` release job/runbook, backup/restore rehearsal, migration status, post-deploy `/ready` verification. |
| H3.5 | Payment and auth deployment verification | H3-006 | VNPay sandbox/production configuration binding, signed success/failure/duplicate IPN tests, Vercel-Render HTTPS cookie/CORS login-refresh-logout evidence. |
| H3.6 | External-boundary resilience | H3-007, H3-008 | Gemini timeout/retry/fallback tests; upload signature validation, limits/concurrency behavior, Cloudinary cleanup lifecycle tests. |
| H3.7 | Observability and browser hardening | H3-009, H3-010 | Metrics/alert design and scale decision; CSP report-only violation evidence followed by enforced policy. |
| H3.8 | Operator documentation and performance hygiene | H3-011, H3-012, H3-013 | Version-controlled deployment/env/rollback/checklist docs, bundle budget report, warning-by-warning lint disposition. |

## Immediate P0 order

1. H3.1: resolve advisory exposure without `npm audit fix --force`.
2. H3.2: establish isolated test DB and backend CI evidence.
3. H3.3/H3.4: approve money-field migration design and execute migration rehearsal before accepting orders in production.

## Release checklist after H3.8

- All High findings closed with command logs and peer review.
- Medium findings closed or explicitly accepted by accountable owner with expiry date.
- Vercel environment has only browser-safe values; Render secrets are configured and validated.
- SQL Server backup, migration deployment, and restore rehearsal are recorded.
- `/health`, `/ready`, cross-origin auth, upload, VNPay and Gemini fallback smoke tests pass in deployed HTTPS environment.
- No commit, push, or PR is created by H3.0 itself.

## H3.1 completion and next sequence

H3.1 completed H3-001 through H3-005. The next priority is H3.2 for VNPay environment binding and deployed cross-domain authentication evidence, followed by H3.3 external-boundary resilience, H3.4 metrics/CSP, and H3.5 operator documentation/performance hygiene.
