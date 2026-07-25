# B3 – API Contract

**Version:** 1.0
**Status:** APPROVED — RECONSTRUCTED
**Scope:** Voucher & Loyalty System
**Project:** FurnitureEcommerce

---

# 1. Purpose

This document defines the HTTP API contract for the Voucher & Loyalty System.

It specifies:

- endpoint paths
- authentication and authorization
- request DTOs
- response DTOs
- pagination, filtering, and sorting
- validation behavior
- error codes
- idempotency behavior
- concurrency expectations

Business rules belong to B1.

Database design belongs to B2.

Frontend behavior belongs to B4.

The backend is authoritative for all voucher, pricing, point, tier, and reward decisions.

---

# 2. Contract Status

The following Voucher C1 routes are locked:

```text
GET    /api/voucher-definitions
POST   /api/voucher-definitions
PATCH  /api/voucher-definitions/:id

GET    /api/vouchers
GET    /api/vouchers/:id

POST   /api/voucher-claims
POST   /api/voucher-assignments
```

Checkout, Reward Points, Tier, and Reward Catalog contracts are defined in this document at the design level but are implemented in later phases.

Implementation must not rename or remount the locked C1 routes.

---

# 3. General Conventions

## 3.1 Content Type

Requests containing JSON use:

```http
Content-Type: application/json
```

Responses use:

```http
Content-Type: application/json
```

---

## 3.2 Date and Time

All date-time fields use ISO 8601.

Example:

```json
{
  "createdAt": "2026-07-24T09:30:00.000Z"
}
```

The backend stores and returns timestamps consistently.

The frontend must not infer expiration using an unsynchronized local interpretation when the backend already provides the effective status.

---

## 3.3 Money

All VND values are integer amounts.

Example:

```json
{
  "minimumOrderAmountVnd": 1000000,
  "discountValueVnd": 200000
}
```

API consumers must not send floating-point monetary values.

The backend remains authoritative for all financial calculations.

---

## 3.4 Identifiers

Identifiers are serialized as JSON numbers when the existing database entity uses an integer ID.

Clients must treat identifiers as opaque references and must not derive business meaning from them.

---

## 3.5 Boolean Fields

Boolean values must use JSON booleans:

```json
{
  "isActive": true
}
```

Values such as `"true"`, `1`, and `"1"` are invalid unless explicitly supported by a query parser.

---

# 4. Authentication and Authorization

## 4.1 Public Requests

Voucher Definition administration is never public.

Public voucher claim still requires an authenticated customer.

---

## 4.2 Customer Requests

The following operations require an authenticated, non-guest customer:

```text
GET  /api/vouchers
GET  /api/vouchers/:id
POST /api/voucher-claims
```

Guest checkout users cannot:

- claim vouchers
- own vouchers
- redeem points
- participate in tiers

---

## 4.3 Administrator Requests

The following operations require the corresponding administrative permission:

```text
GET    /api/voucher-definitions
POST   /api/voucher-definitions
PATCH  /api/voucher-definitions/:id
POST   /api/voucher-assignments
```

The implementation must use the existing RBAC and permission middleware.

It must not introduce role-name checks when permission-based authorization already exists.

The exact permission constants must remain aligned with the repository permission seed.

---

# 5. Standard Response Envelope

A successful single-resource response uses:

```json
{
  "data": {}
}
```

A successful collection response uses:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 0,
    "totalPages": 0
  }
}
```

A successful mutation may include:

```json
{
  "data": {},
  "message": "Operation completed successfully"
}
```

The API must use one consistent response structure throughout the module.

It must not return different envelope formats for equivalent endpoints.

---

# 6. Standard Error Envelope

Errors use:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}
  },
  "requestId": "request-id"
}
```

`details` is optional.

Validation errors may include field-level information:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fields": {
        "name": ["Name is required"]
      }
    }
  },
  "requestId": "request-id"
}
```

Internal stack traces, Prisma errors, SQL errors, and secrets must never be returned to clients.

---

# 7. HTTP Status Conventions

| Status | Meaning |
|---:|---|
| `200` | Successful read or update |
| `201` | Resource created successfully |
| `400` | Malformed or semantically invalid request |
| `401` | Authentication required or invalid |
| `403` | Authenticated but not permitted |
| `404` | Resource does not exist or is not visible to requester |
| `409` | Business or concurrency conflict |
| `422` | Optional validation status only if consistently used by the existing backend |
| `429` | Rate limit exceeded |
| `500` | Unexpected server failure |

The Voucher module should follow the status-code conventions already established in the project.

It must not expose inconsistent validation statuses without a project-wide reason.

---

# 8. Pagination

Collection endpoints use:

```text
page
limit
```

Defaults:

```text
page = 1
limit = 20
```

Rules:

- `page` must be an integer greater than or equal to `1`.
- `limit` must be an integer greater than or equal to `1`.
- The backend must enforce a maximum limit.
- Invalid pagination values return `400 VALIDATION_ERROR`.
- Pagination metadata is calculated by the backend.

Example:

```http
GET /api/vouchers?page=1&limit=20
```

---

# 9. Sorting

Sorting uses:

```text
sortBy
sortOrder
```

Supported order values:

```text
asc
desc
```

Unknown sort fields are rejected.

The backend must use an allowlist and must never pass arbitrary sort field names directly into Prisma.

Default ordering should be deterministic and include a stable secondary key where needed.

---

# 10. Voucher Definition API

## 10.1 Definition Representation

A Voucher Definition response contains fields equivalent to:

```json
{
  "id": 101,
  "code": "WELCOME200",
  "name": "Welcome Voucher",
  "description": "Discount for eligible orders",
  "discountType": "FIXED_AMOUNT",
  "discountValueVnd": 200000,
  "discountPercentage": null,
  "maximumDiscountAmountVnd": null,
  "minimumOrderAmountVnd": 1000000,
  "isActive": true,
  "publicClaimEnabled": true,
  "claimStartsAt": "2026-07-24T00:00:00.000Z",
  "claimEndsAt": "2026-08-31T23:59:59.999Z",
  "validFrom": "2026-07-24T00:00:00.000Z",
  "validUntil": "2026-09-30T23:59:59.999Z",
  "validityDaysAfterIssue": null,
  "createdAt": "2026-07-24T09:30:00.000Z",
  "updatedAt": "2026-07-24T09:30:00.000Z"
}
```

Exact property names must match the approved Prisma and implementation schema.

The API must not expose internal fields that are unrelated to clients.

---

## 10.2 Discount Types

Supported discount types are limited to the values defined by the database enum.

Typical behavior includes:

```text
FIXED_AMOUNT
PERCENTAGE
```

For a fixed discount:

- fixed VND amount is required
- percentage fields are absent or null

For a percentage discount:

- percentage is required
- maximum discount may be required or optional according to the Definition
- fixed discount amount is absent or null

The backend rejects contradictory discount configurations.

---

## 10.3 List Voucher Definitions

```http
GET /api/voucher-definitions
```

### Authorization

Administrative read permission required.

### Query Parameters

```text
page
limit
search
isActive
publicClaimEnabled
discountType
sortBy
sortOrder
```

### Search

`search` may match approved searchable fields such as:

- code
- name
- description

Search behavior must be implemented using a safe allowlisted query.

### Success

```http
200 OK
```

```json
{
  "data": [
    {
      "id": 101,
      "code": "WELCOME200",
      "name": "Welcome Voucher",
      "discountType": "FIXED_AMOUNT",
      "discountValueVnd": 200000,
      "minimumOrderAmountVnd": 1000000,
      "isActive": true,
      "publicClaimEnabled": true,
      "createdAt": "2026-07-24T09:30:00.000Z",
      "updatedAt": "2026-07-24T09:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

## 10.4 Create Voucher Definition

```http
POST /api/voucher-definitions
```

### Authorization

Administrative create permission required.

### Request DTO

```json
{
  "code": "WELCOME200",
  "name": "Welcome Voucher",
  "description": "Discount for eligible orders",
  "discountType": "FIXED_AMOUNT",
  "discountValueVnd": 200000,
  "discountPercentage": null,
  "maximumDiscountAmountVnd": null,
  "minimumOrderAmountVnd": 1000000,
  "isActive": true,
  "publicClaimEnabled": true,
  "claimStartsAt": "2026-07-24T00:00:00.000Z",
  "claimEndsAt": "2026-08-31T23:59:59.999Z",
  "validFrom": "2026-07-24T00:00:00.000Z",
  "validUntil": "2026-09-30T23:59:59.999Z",
  "validityDaysAfterIssue": null
}
```

### Validation

The backend validates at least:

- code format and uniqueness
- required name
- supported discount type
- positive discount value
- valid percentage range
- nonnegative minimum order
- maximum discount compatibility
- claim start before claim end
- validity start before validity end
- absolute expiration and relative-expiration configuration compatibility
- public claim configuration consistency

A Definition code must be normalized consistently before uniqueness checks.

### Success

```http
201 Created
```

### Possible Errors

```text
VALIDATION_ERROR
VOUCHER_DEFINITION_CODE_ALREADY_EXISTS
VOUCHER_DEFINITION_CONFIGURATION_INVALID
FORBIDDEN
```

---

## 10.5 Update Voucher Definition

```http
PATCH /api/voucher-definitions/:id
```

### Authorization

Administrative update permission required.

### Request DTO

Only explicitly supported mutable fields may be sent.

Example:

```json
{
  "name": "Updated Welcome Voucher",
  "description": "Updated description",
  "isActive": false,
  "publicClaimEnabled": false,
  "claimEndsAt": "2026-09-15T23:59:59.999Z"
}
```

### Rules

- Partial update is supported.
- Unknown fields are rejected or stripped according to the established validation policy.
- Immutable identity and audit fields cannot be changed.
- Updating a Definition never mutates previously issued User Voucher snapshots.
- The backend must prevent mass assignment.
- The resulting complete configuration must remain valid.

### Success

```http
200 OK
```

### Possible Errors

```text
VOUCHER_DEFINITION_NOT_FOUND
VOUCHER_DEFINITION_CODE_ALREADY_EXISTS
VOUCHER_DEFINITION_CONFIGURATION_INVALID
VALIDATION_ERROR
FORBIDDEN
```

---

# 11. Customer Voucher API

## 11.1 User Voucher Representation

A User Voucher response contains fields equivalent to:

```json
{
  "id": 501,
  "voucherDefinitionId": 101,
  "code": "WELCOME200",
  "name": "Welcome Voucher",
  "description": "Discount for eligible orders",
  "discountType": "FIXED_AMOUNT",
  "discountValueVnd": 200000,
  "discountPercentage": null,
  "maximumDiscountAmountVnd": null,
  "minimumOrderAmountVnd": 1000000,
  "acquisitionSource": "PUBLIC_CLAIM",
  "status": "AVAILABLE",
  "effectiveStatus": "AVAILABLE",
  "issuedAt": "2026-07-24T09:30:00.000Z",
  "expiresAt": "2026-09-30T23:59:59.999Z",
  "usedAt": null,
  "currentUsedOrderId": null
}
```

`effectiveStatus` may be used to expose the derived `EXPIRED` state without storing it.

The endpoint must not expose another customer's ownership details.

---

## 11.2 List Current Customer Vouchers

```http
GET /api/vouchers
```

### Authorization

Authenticated customer required.

### Ownership

The authenticated user is derived from the access token.

The API must not accept `userId` as a query parameter for customer ownership.

### Query Parameters

```text
page
limit
status
acquisitionSource
sortBy
sortOrder
```

Supported status filters may include:

```text
AVAILABLE
USED
EXPIRED
```

`EXPIRED` is derived by backend query or post-query evaluation.

### Default Sorting

The default must be deterministic.

A recommended default is:

1. usable vouchers first
2. nearest expiration first
3. newest ID as stable fallback

The exact locked sorting allowlist must match implementation.

### Success

```http
200 OK
```

---

## 11.3 Get Current Customer Voucher

```http
GET /api/vouchers/:id
```

### Authorization

Authenticated customer required.

### Ownership Rule

The resource is returned only when it belongs to the authenticated customer.

A voucher owned by another user must not be exposed.

The implementation should return `404 VOUCHER_NOT_FOUND` rather than reveal that the voucher exists for another customer.

### Success

```http
200 OK
```

### Possible Errors

```text
VOUCHER_NOT_FOUND
UNAUTHORIZED
```

---

# 12. Public Claim API

## 12.1 Claim Voucher

```http
POST /api/voucher-claims
```

### Authorization

Authenticated, non-guest customer required.

### Request DTO

```json
{
  "voucherDefinitionId": 101
}
```

The client must not send:

- `userId`
- voucher snapshot fields
- status
- acquisition source
- expiration
- discount values

All issuance data is derived by the backend.

### Transaction

The backend performs atomically:

1. Resolve authenticated customer.
2. Validate Voucher Definition.
3. Validate active state.
4. Validate public-claim eligibility.
5. Validate claim window.
6. Ensure the customer has not previously claimed the Definition.
7. Create the User Voucher snapshot.
8. Create the Public Voucher Claim record.
9. Commit.
10. Trigger notification after commit.

### Success

```http
201 Created
```

```json
{
  "data": {
    "id": 501,
    "voucherDefinitionId": 101,
    "code": "WELCOME200",
    "acquisitionSource": "PUBLIC_CLAIM",
    "effectiveStatus": "AVAILABLE",
    "issuedAt": "2026-07-24T09:30:00.000Z",
    "expiresAt": "2026-09-30T23:59:59.999Z"
  },
  "message": "Voucher claimed successfully"
}
```

### Possible Errors

```text
VOUCHER_DEFINITION_NOT_FOUND
VOUCHER_DEFINITION_INACTIVE
VOUCHER_PUBLIC_CLAIM_DISABLED
VOUCHER_CLAIM_NOT_STARTED
VOUCHER_CLAIM_ENDED
VOUCHER_ALREADY_CLAIMED
VOUCHER_CONFIGURATION_INVALID
UNAUTHORIZED
```

### Concurrency

Two simultaneous claims by the same user for the same Definition must not create two vouchers.

The database uniqueness constraint is authoritative.

A duplicate-key race must be translated to:

```http
409 Conflict
```

```text
VOUCHER_ALREADY_CLAIMED
```

Raw database errors must not escape.

---

# 13. Administrative Voucher Assignment API

## 13.1 Assign Voucher

```http
POST /api/voucher-assignments
```

### Authorization

Administrative assignment permission required.

### Idempotency Header

The request requires:

```http
Idempotency-Key: <value>
```

Header names are case-insensitive according to HTTP semantics.

The value must:

- contain between 16 and 128 characters
- be either a valid UUIDv4
- or match the opaque key character set:

```regex
^[A-Za-z0-9._~-]+$
```

Multiple `Idempotency-Key` header values are invalid.

Failure returns:

```http
400 Bad Request
```

```text
IDEMPOTENCY_KEY_INVALID
```

---

## 13.2 Request DTO

```json
{
  "voucherDefinitionId": 101,
  "recipientUserIds": [10, 11, 12],
  "reason": "Customer recovery campaign"
}
```

Rules:

- `recipientUserIds` must contain at least one user.
- Duplicate recipient IDs inside one request are invalid or must be deterministically deduplicated before hashing and processing.
- Every recipient must be a valid eligible customer.
- Guest or invalid users cannot receive the assignment.
- `reason` follows the configured length limit.
- The client cannot supply snapshot or status fields.

---

## 13.3 Bulk Transaction Rule

Bulk assignment is all-or-nothing.

The backend must atomically:

1. Validate administrator.
2. Validate Idempotency-Key.
3. Normalize and hash the request payload.
4. Validate Voucher Definition.
5. Validate every recipient.
6. Create the parent assignment.
7. Create one recipient record per recipient.
8. Issue one User Voucher per recipient.
9. Commit all records.
10. Trigger notifications after commit.

If any recipient fails validation, no voucher is issued to any recipient.

---

## 13.4 Repeated Assignments

A customer may receive multiple copies of the same Voucher Definition through distinct successful administrative assignment actions.

Public-claim uniqueness does not apply to administrative assignments.

Each distinct action requires its own Idempotency-Key.

---

## 13.5 Idempotency Behavior

### Same key and same normalized payload

Return the original successful result.

No additional vouchers are issued.

The response should preserve the original logical outcome.

### Same key and different payload

Reject the request.

Recommended status:

```http
409 Conflict
```

Error code:

```text
IDEMPOTENCY_KEY_CONFLICT
```

### Concurrent duplicate requests

Only one assignment transaction may create records.

Other requests with the same key and same payload return the original result once available or follow the project's safe in-progress conflict behavior.

No duplicate vouchers may be issued.

---

## 13.6 Success

```http
201 Created
```

```json
{
  "data": {
    "assignmentId": 9001,
    "voucherDefinitionId": 101,
    "recipientCount": 3,
    "reason": "Customer recovery campaign",
    "createdAt": "2026-07-24T09:30:00.000Z",
    "recipients": [
      {
        "userId": 10,
        "userVoucherId": 701
      },
      {
        "userId": 11,
        "userVoucherId": 702
      },
      {
        "userId": 12,
        "userVoucherId": 703
      }
    ]
  },
  "message": "Vouchers assigned successfully"
}
```

Sensitive recipient fields must not be returned unnecessarily.

---

## 13.7 Possible Errors

```text
IDEMPOTENCY_KEY_REQUIRED
IDEMPOTENCY_KEY_INVALID
IDEMPOTENCY_KEY_CONFLICT
VOUCHER_DEFINITION_NOT_FOUND
VOUCHER_DEFINITION_INACTIVE
VOUCHER_ASSIGNMENT_RECIPIENTS_REQUIRED
VOUCHER_ASSIGNMENT_RECIPIENT_INVALID
VOUCHER_ASSIGNMENT_DUPLICATE_RECIPIENT
VOUCHER_CONFIGURATION_INVALID
VALIDATION_ERROR
FORBIDDEN
```

---

# 14. Checkout Voucher Contract

This section belongs to the C2 implementation phase.

The existing checkout/order creation endpoint remains the checkout entry point.

The frontend sends only:

```json
{
  "voucherId": 501
}
```

along with the existing checkout data.

The frontend must not send:

```text
voucherCode
voucherDiscount
discountAmount
finalTotal
payableAmountVnd calculated by client
```

---

## 14.1 Backend Validation

The backend validates:

- authenticated customer ownership
- voucher status
- derived expiration
- current usage state
- minimum merchandise amount
- voucher configuration
- order compatibility
- one voucher per order

The backend recalculates:

1. original merchandise amount
2. promotion discount
3. voucher discount
4. shipping
5. final payable amount

---

## 14.2 Checkout Failure Codes

```text
VOUCHER_NOT_FOUND
VOUCHER_NOT_OWNED
VOUCHER_NOT_AVAILABLE
VOUCHER_EXPIRED
VOUCHER_ALREADY_USED
VOUCHER_MINIMUM_ORDER_NOT_MET
VOUCHER_NOT_APPLICABLE
VOUCHER_CONFIGURATION_INVALID
```

Financial validation failures must not consume the voucher.

---

## 14.3 Atomic Consumption

The order transaction must atomically:

1. validate voucher
2. consume voucher using a conditional update
3. create the order
4. store the voucher application snapshot
5. associate the used order
6. commit

A concurrent attempt to use the same voucher must return a controlled business conflict.

It must not create two orders using the same available state.

---

# 15. Voucher Restoration Contract

Voucher restoration is an internal service operation triggered by approved order workflows.

Version 1 does not expose a public manual-restore endpoint.

Valid triggers:

```text
ORDER_CANCELLED
COMPLETED_ORDER_REFUNDED
```

Invalid restoration triggers include:

- failed payment attempt
- failed VNPay callback
- abandoned checkout

The restored voucher keeps its original expiration.

If the original expiry is already in the past, the effective status becomes `EXPIRED`.

Restoration does not delete or rewrite VoucherApplication history.

---

# 16. Reward Point API

This section is implemented in C3.

Recommended customer read route:

```http
GET /api/loyalty/account
```

It returns operational summary data such as:

```json
{
  "data": {
    "pointBalance": 2500,
    "lifetimePoints": 8200,
    "currentTier": "SILVER"
  }
}
```

Recommended ledger route:

```http
GET /api/loyalty/points
```

Supported filtering and pagination should include ledger type and creation time where required.

The client cannot submit earned-point amounts for order completion.

Point earning is triggered internally from completed-order processing.

---

# 17. Tier API

This section is implemented in C4.

Recommended customer route:

```http
GET /api/loyalty/tier
```

Response may include:

```json
{
  "data": {
    "currentTier": "SILVER",
    "eligibleCompletedMerchandiseAmountVnd": 16000000,
    "nextTier": "GOLD",
    "nextTierThresholdVnd": 30000000,
    "remainingAmountVnd": 14000000,
    "achievements": [
      {
        "tier": "SILVER",
        "achievedAt": "2026-07-24T09:30:00.000Z"
      }
    ]
  }
}
```

The backend calculates all threshold and progress values.

---

# 18. Reward Catalog API

This section is implemented in C5.

Recommended routes:

```text
GET  /api/reward-catalog
POST /api/reward-redemptions
```

A redemption request sends only the selected reward reference:

```json
{
  "rewardCatalogItemId": 301
}
```

The backend decides:

- point cost
- Definition
- expiration
- voucher snapshot
- availability
- final point deduction

Successful redemption uses acquisition source:

```text
POINT_REDEMPTION
```

The default issued-voucher expiry is 30 days unless the approved reward configuration provides another value.

Redemption must atomically:

1. validate catalog item
2. validate balance
3. append `REDEEM_VOUCHER` ledger entry
4. issue User Voucher
5. update operational account summary
6. commit
7. notify after commit

---

# 19. Notification Contract

Notification generation happens only after the business transaction commits successfully.

Notification failures:

- must not rollback voucher issuance
- must not rollback assignments
- must not rollback claims
- must not rollback reward redemption
- must not rollback tier achievement

The existing Notification service must be reused.

The Voucher API does not create a competing notification infrastructure.

---

# 20. Security Requirements

All endpoints must enforce:

- authentication where required
- permission middleware for administration
- ownership checks
- DTO allowlisting
- mass-assignment protection
- safe pagination and sorting
- safe Prisma filtering
- request-size limits
- rate limits where appropriate
- structured logs
- request IDs
- sanitized errors

Administrative assignment logs must not expose secrets or full sensitive payloads unnecessarily.

---

# 21. IDOR Protection

Customer endpoints must derive the customer identity from authentication context.

The following are forbidden:

```text
GET /api/vouchers?userId=other-user
POST /api/voucher-claims with userId
```

A customer cannot access another customer's voucher by changing a path ID.

Unauthorized cross-owner access should return a non-enumerating `404`.

---

# 22. Concurrency Requirements

The API contract requires controlled outcomes for:

- simultaneous public claims
- repeated administrative assignments
- simultaneous voucher consumption
- repeated order callbacks
- repeated reward processing
- repeated reversal processing

Expected outcomes are business responses such as:

```text
VOUCHER_ALREADY_CLAIMED
IDEMPOTENCY_KEY_CONFLICT
VOUCHER_NOT_AVAILABLE
ORDER_ALREADY_PROCESSED
```

Unexpected database errors must be translated and logged.

No race may result in:

- duplicate public claims
- duplicate assignment issuance for one idempotent action
- double voucher consumption
- duplicate point earning
- duplicate point reversal
- duplicate tier reward issuance

---

# 23. Rate Limiting

Existing global and route-level rate limiting conventions apply.

At minimum, protection should be considered for:

- public claim
- administrative assignment
- reward redemption

A rate-limited response uses:

```http
429 Too Many Requests
```

The response must not disclose internal limiter configuration unnecessarily.

---

# 24. Validation Rules

Validation must happen before business execution where possible.

The backend must reject:

- unknown enum values
- unknown sort fields
- invalid dates
- invalid monetary values
- unsupported request properties
- duplicate recipient IDs when prohibited
- malformed idempotency keys
- contradictory Definition settings
- empty PATCH bodies

Validation libraries should use strict object schemas when compatible with the existing project.

---

# 25. Error-Code Registry

## 25.1 General

```text
VALIDATION_ERROR
UNAUTHORIZED
FORBIDDEN
RESOURCE_NOT_FOUND
RATE_LIMIT_EXCEEDED
INTERNAL_SERVER_ERROR
```

## 25.2 Voucher Definition

```text
VOUCHER_DEFINITION_NOT_FOUND
VOUCHER_DEFINITION_CODE_ALREADY_EXISTS
VOUCHER_DEFINITION_INACTIVE
VOUCHER_DEFINITION_CONFIGURATION_INVALID
VOUCHER_PUBLIC_CLAIM_DISABLED
VOUCHER_CLAIM_NOT_STARTED
VOUCHER_CLAIM_ENDED
```

## 25.3 User Voucher

```text
VOUCHER_NOT_FOUND
VOUCHER_NOT_OWNED
VOUCHER_NOT_AVAILABLE
VOUCHER_EXPIRED
VOUCHER_ALREADY_USED
VOUCHER_MINIMUM_ORDER_NOT_MET
VOUCHER_NOT_APPLICABLE
VOUCHER_CONFIGURATION_INVALID
```

## 25.4 Claim

```text
VOUCHER_ALREADY_CLAIMED
```

## 25.5 Assignment

```text
VOUCHER_ASSIGNMENT_RECIPIENTS_REQUIRED
VOUCHER_ASSIGNMENT_RECIPIENT_INVALID
VOUCHER_ASSIGNMENT_DUPLICATE_RECIPIENT
```

## 25.6 Idempotency

```text
IDEMPOTENCY_KEY_REQUIRED
IDEMPOTENCY_KEY_INVALID
IDEMPOTENCY_KEY_CONFLICT
```

## 25.7 Loyalty

Reserved for later phases:

```text
LOYALTY_ACCOUNT_NOT_FOUND
INSUFFICIENT_REWARD_POINTS
REWARD_CATALOG_ITEM_NOT_FOUND
REWARD_CATALOG_ITEM_INACTIVE
ORDER_LOYALTY_ALREADY_PROCESSED
ORDER_LOYALTY_REVERSAL_ALREADY_PROCESSED
TIER_REWARD_ALREADY_GRANTED
```

Exact later-phase error registries must be finalized before C3–C5 implementation.

---

# 26. Frontend Cache Invalidation Contract

After a successful backend transaction commit, the frontend must invalidate and refetch affected resources.

Examples:

| Mutation | Resources to refresh |
|---|---|
| Public claim | Voucher list, voucher detail |
| Admin Definition create/update | Definition list and detail |
| Admin assignment | Assignment result, affected administrative views |
| Checkout with voucher | Voucher list, order data, checkout summary |
| Reward redemption | Loyalty account, point ledger, voucher list, reward catalog |
| Tier achievement | Loyalty account, tier information, voucher list when a reward is issued |

The backend response is authoritative.

The frontend must not locally simulate committed financial or loyalty state.

---

# 27. Backward Compatibility

The Voucher API must avoid breaking existing:

- authentication contracts
- order creation fields
- promotion behavior
- notification behavior
- permission middleware
- `totalAmount` compatibility

`Order.payableAmountVnd` becomes the canonical VND payable amount according to B2.

Existing fields may remain during migration but must not override the canonical value.

---

# 28. API Invariants

The API must always satisfy:

- Promotion and Voucher remain separate.
- Customer ownership comes from authentication context.
- One public claim per customer per Definition.
- One voucher per order.
- Frontend sends `voucherId` only for checkout.
- Backend calculates all financial values.
- Administrative bulk assignment is all-or-nothing.
- Assignment is idempotent.
- Notifications occur only after transaction commit.
- Failed mutations do not return a false success.
- Internal database errors are never exposed.
- Concurrent requests cannot violate database invariants.

---

# 29. Out of Scope

Version 1 excludes API contracts for:

- manual voucher restoration
- manual voucher revocation
- voucher reservation
- automatic voucher recommendation
- multiple vouchers per order
- tier downgrade
- historical loyalty backfill
- customer-to-customer voucher transfer
- deleting immutable voucher application history
- deleting immutable point ledger entries

These require a future approved design revision.

---

# 30. Implementation Verification Note

Because this document was reconstructed from the locked B1–B4 decisions, the following implementation-specific items must be checked against the repository before declaring the document fully synchronized:

- exact Prisma property names
- exact enum names
- existing response-envelope helper
- exact RBAC permission constants
- project-wide validation status convention
- maximum pagination limit
- exact sorting allowlists
- existing checkout endpoint path
- later C3–C5 endpoint paths

Verification may correct naming mismatches only.

It must not change the locked business behavior defined by B1.