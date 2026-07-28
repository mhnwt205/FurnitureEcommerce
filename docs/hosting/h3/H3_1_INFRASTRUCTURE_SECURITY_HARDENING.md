# H3.1 Infrastructure & Security Hardening

## Scope and decision

H3.1 closes H3-001 through H3-005 from the H3.0 baseline. No business feature, API route, or production database was changed during validation. The SQL Server migration was rehearsed only against the isolated `FurnitureEcommerce_test` database.

**Decision: H3-001, H3-002, H3-003, H3-004, and H3-005 are CLOSED.**

## Closure evidence

| ID | Root cause | Implemented control | Regression evidence |
|---|---|---|---|
| H3-001 | Vulnerable direct and transitive runtime dependency graph | Cloudinary v2 buffered upload helper replaces the incompatible adapter; Multer 2.2, Nodemailer 9.0.3, and updated minimatch graph are locked. | Buffer helper has success/missing-URL/error tests. `npm audit --audit-level=high` exits 0. Full audit has one Low body-parser advisory. |
| H3-002 | Tests had no isolated database bootstrap path | `.env.test.example`, guarded `_test` database-name validation, and `test:prepare` provisioning/migration command. | 36 migrations found/applied on the isolated database; 83/83 backend tests pass. |
| H3-003 | CI had no backend gate | `backend-quality.yml` runs clean install, test preparation/test, Prisma validation, and High/Critical audit gate against SQL Server CI service. | Workflow syntax/repository review; commands executed locally with the same scripts. |
| H3-004 | Monetary persistence used binary Float | Product, order, order-item, and promotion monetary values changed to `Decimal(18,2)` through reviewed migration. DTOs preserve numeric JSON outputs. | Migration initially exposed an OrderItem default constraint dependency; migration was corrected and then applied successfully on the isolated database. Backend suite passes. |
| H3-005 | No deploy migration command or release procedure | `prisma:migrate:deploy` and test migration rehearsal are available; controlled release procedure below. | `test:prepare` calls Prisma `migrate deploy`; post-migration `prisma validate` and `/ready` are defined release gates. |

## Controlled production migration procedure

1. Freeze application writes and capture the release commit plus migration list: `npx prisma migrate status`.
2. DBA creates a timestamped SQL Server backup and restores it to an isolated verification target; record backup checksum and restore result.
3. Run `npm ci`, `npm run prisma:migrate:deploy`, then `npx prisma migrate status` with the production `DATABASE_URL` supplied only through the deployment secret store.
4. Deploy the application, query `/health` and `/ready`, and smoke-test numeric product/order/promotion responses plus one upload.
5. If validation fails, stop traffic and restore the verified backup under DBA ownership; do not use Prisma down migrations because Prisma has no automatic rollback command for applied production migrations.

## Validation record

| Command | Result |
|---|---|
| Backend `npm run test:prepare` | PASS; 36 migrations, isolated test database |
| Backend `npm test` | PASS; 83 passed, 0 failed |
| Backend `npm audit --audit-level=high` | PASS; Critical=0, High=0 |
| Backend `npx prisma validate` | PASS |
| Frontend `npm run lint` | PASS; 0 errors, 22 pre-existing warnings |
| Frontend `npm run test:run` | PASS; 14 passed |
| Frontend `npm run build` | PASS |

## Remaining risks

- One Low `body-parser` advisory remains in the full backend audit.
- H3-006 through H3-011 remain Medium and H3-012 through H3-013 remain Low; see the updated risk matrix and action plan.
- The live SQL Server backup/restore is a deployment operation and was not executed because production access is outside this task scope.

## Review verdict

Reviewed against correctness, readability, architecture, security, and performance. No Critical or required issue remains in the H3.1 change set. Approval is contingent on the validation record above and the controlled-release procedure being followed for production.
