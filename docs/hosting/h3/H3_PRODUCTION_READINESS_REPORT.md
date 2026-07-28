# H3 Production Readiness Report

## Decision

**H3.0 baseline: NOT READY. H3.1: all High findings are CLOSED.** Production remains conditional on Medium finding treatment and the operator-controlled migration gate.

## Implemented runtime controls

- Request ID is accepted only when 8-128 safe characters or generated with UUID, and returned as `X-Request-Id` (`backend/middlewares/requestContext.middleware.js`).
- JSON logs include event, environment, request context, and production suppresses stack traces (`backend/utils/logger.js`).
- `helmet`, disabled `x-powered-by`, allowlist CORS with credentials, JSON 256 kB / URL-encoded 64 kB limits, and terminal error handler are mounted in deterministic order (`backend/app.js:45-83`).
- Liveness/readiness and shutdown controller exist (`backend/routes/health.routes.js`, `backend/utils/shutdown.js`).
- Frontend error boundary, route lazy loading, native fetch timeout default 15s, and SPA 404 route are present (`frontend/src/main.jsx`, `frontend/src/App.jsx`, `frontend/src/services/api/apiClient.js`).

## Missing production evidence or controls

| Area | Status | Finding |
|---|---|---|
| Dependency posture | 5 High + 1 Low audit advisories | H3-001 |
| Automated backend quality gate | No backend workflow; tests require unavailable test DB | H3-002, H3-003 |
| Monetary data | Core price/order/promotion fields use `Float` | H3-004 |
| Database release procedure | No deploy migration script/runbook | H3-005 |
| Payment environment binding | `VNP_ENV` is validated but is not used to bind VNPay endpoint/return URL | H3-006 |
| Upstream AI resilience | Gemini fetch has no abort signal, timeout or retry | H3-007 |
| Upload content verification/cleanup | MIME and extension validation only; no magic-byte inspection or deletion lifecycle | H3-008 |
| Metrics/scaling | No metrics endpoint; rate-limit/socket state process-local | H3-009 |
| Browser hardening | CSP explicitly disabled | H3-010 |
| Operational docs | README lacks startup, env, deploy, rollback, and production checklist | H3-011 |

## Production acceptance gates

Production approval requires all Critical and High findings closed, evidence for all deployment proof steps, successful migration rehearsal, and an owner/date for each Medium finding accepted for deferred remediation. Low findings do not block release once an owner and target release are recorded.

## H3.1 status update

All High findings are closed. The supplied migration was rehearsed on the isolated test database; it was not run against production. Production remains conditional on the documented backup/restore release gate and closure or explicit owned acceptance of H3-006 through H3-011.
