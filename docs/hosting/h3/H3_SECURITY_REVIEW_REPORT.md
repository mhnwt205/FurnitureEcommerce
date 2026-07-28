# H3 Security Review Report

## Threat boundaries audited

Internet requests, credential cookies/JWTs, SQL Server via Prisma, VNPay callback/return query, multipart upload, Cloudinary, Gemini HTTP API, SMTP, browser-to-Render CORS, and environment secrets were inspected.

## OWASP Top 10 assessment

| OWASP area | Evidence | Result |
|---|---|---|
| A01 Broken Access Control | Route auth and permission middleware precede protected upload/payment routes; ownership check precedes VNPay URL creation | Control present; endpoint-by-endpoint dynamic authorization testing remains a release gate. |
| A02 Cryptographic Failures | Refresh cookies are HttpOnly/Secure/SameSite=None in production; refresh tokens use 64 random bytes and HMAC hash with required production secret | Control present; deployed HTTPS/domain configuration must be tested. |
| A03 Injection | Prisma is used for data operations; health uses constant `SELECT 1`; body limits/Zod appear at several public boundaries | No raw user-built SQL found in reviewed flows. |
| A04 Insecure Design | Atomic refresh rotation, payment finalization and support transactions exist; payment environment binding and release controls are incomplete | H3-005, H3-006. |
| A05 Security Misconfiguration | Helmet is installed, but CSP is disabled; production env validates origins and secrets | H3-010. |
| A06 Vulnerable Components | npm audit reports 5 High and 1 Low advisories | H3-001. |
| A07 Authentication Failures | JWT access expiry, refresh rotation/reuse detection, logout family revocation, auth rate limits, origin checks on cookie-mutating routes | Control present; live cross-domain cookie test required. |
| A08 Software/Data Integrity | VNPay signature verification and idempotent paid state exist; migration procedure absent | H3-005. |
| A09 Logging/Monitoring | Structured request logs and readiness logging exist; no metrics endpoint/alert strategy | H3-009. |
| A10 SSRF | Gemini URL is fixed; audit reports Nodemailer advisory with file/URL access impact | H3-001. |

## Specialized controls

- **VNPay:** query signature is verified before lookup/finalization; amount comparison and paid-state duplicate handling exist. `VNP_ENV` only validates allowed text and does not constrain `VNP_URL` or return URL, so sandbox/production separation lacks executable enforcement (H3-006).
- **Cloudinary:** authenticated routes, permission requirement for product upload, MIME/format lists and 5 MiB limits exist. MIME/extension values are request metadata and do not prove binary content (H3-008).
- **Gemini:** model response is parsed, accepts only string answer and recommendation IDs already in the server-selected allowlist, and catches errors to rule-based fallback. The upstream fetch has no timeout/retry (H3-007).

## Security decision

H3.0 baseline decision: do not release until H3-001 is remediated and regression-tested, and H3-004/H3-005 are closed before any production data migration. Treat H3-006 through H3-010 as explicit release-security gates or accepted, owned remediation work.

## H3.1 status update

H3-001, H3-004, and H3-005 are remediated and regression-tested. `npm audit --audit-level=high` passes with Critical=0 and High=0; the full audit retains one Low body-parser advisory. H3-006 through H3-010 remain release-security gates.
