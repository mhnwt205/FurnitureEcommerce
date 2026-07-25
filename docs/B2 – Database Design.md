# B2 – Database Design
Version: 1.0
Status: APPROVED
Scope: Voucher & Loyalty System
Project: FurnitureEcommerce

---

# 1. Purpose

This document defines the database architecture for the Voucher & Loyalty System.

It specifies:

- entities
- relationships
- constraints
- transactions
- persistence rules
- immutable data
- database invariants

Business rules belong to B1.

API contracts belong to B3.

Frontend behavior belongs to B4.

---

# 2. Design Principles

The database follows these principles.

## 2.1 Immutable Business History

Historical business data must never be overwritten.

Changes create new business state instead of modifying historical snapshots.

---

## 2.2 Snapshot Preservation

User Voucher stores a complete snapshot of the Voucher Definition at issuance time.

Future Definition changes never modify issued vouchers.

---

## 2.3 Transactional Consistency

Business operations involving:

- voucher issuance
- voucher consumption
- voucher restoration
- reward points
- tier rewards

must execute inside database transactions.

---

## 2.4 Backend Authority

The database never trusts frontend-calculated values.

Only backend services decide:

- payable amount
- voucher validity
- reward points
- tier

---

# 3. Entity Overview

The Voucher & Loyalty System introduces:

- VoucherDefinition
- UserVoucher
- VoucherApplication
- PublicVoucherClaim
- VoucherAssignment
- VoucherAssignmentRecipient
- LoyaltyAccount
- PointLedger
- UserTierAchievement
- LoyaltyOrderProcessing
- LoyaltyProgramConfig

Existing entities reused:

- User
- Order
- Notification

---

# 4. VoucherDefinition

Represents the template used to issue vouchers.

Responsibilities:

- voucher configuration
- discount rules
- expiration rules
- claim policy
- activation state

Definition data is mutable.

Definition history is preserved indirectly through issued User Voucher snapshots.

---

# 5. UserVoucher

Represents one issued voucher owned by one customer.

Contains:

- owner
- immutable Definition snapshot
- acquisition source
- expiration
- current status

Each User Voucher belongs to exactly one User.

One User may own many User Vouchers.

Snapshots are immutable.

---

# 6. VoucherApplication

Represents voucher usage history.

Purpose:

- preserve historical voucher usage
- preserve order snapshot
- support restoration
- support auditing

Design rules:

- immutable history
- one Order references one VoucherApplication
- restoration information stored separately
- restoration never deletes history

Constraints:

OrderId

UNIQUE

UserVoucherId

NOT UNIQUE

A voucher may therefore appear in multiple historical applications through restoration.

---

# 7. PublicVoucherClaim

Represents successful public claim operations.

Purpose:

Prevent duplicate claims.

Constraint:

(UserId, VoucherDefinitionId)

UNIQUE

Business rule:

One customer may successfully claim one Definition once.

---

# 8. VoucherAssignment

Represents one administrator assignment action.

Contains:

- administrator
- assignment reason
- idempotency information
- execution metadata

Represents the parent transaction.

---

# 9. VoucherAssignmentRecipient

Represents every issued voucher produced by one assignment.

One VoucherAssignment

↓

Many AssignmentRecipients

Each AssignmentRecipient

↓

One UserVoucher

---

# 10. LoyaltyAccount

Operational summary only.

Contains:

- current point balance
- current lifetime points
- current tier

It is not authoritative.

Authoritative source:

PointLedger

plus

Tier achievements

---

# 11. PointLedger

Immutable accounting ledger.

Supported entry types:

- EARN_ORDER
- REDEEM_VOUCHER
- REVERSE_ORDER
- ADMIN_ADJUSTMENT

Ledger entries are append-only.

No update.

No delete.

Current balance is derived.

---

# 12. UserTierAchievement

Represents every tier milestone.

Contains:

- achieved tier
- achieved time
- rewarded voucher
- reward status

One tier reward

↓

Granted once

Constraint:

RewardUserVoucherId

Nullable

UNIQUE

---

# 13. LoyaltyOrderProcessing

Supports idempotent reward processing.

Tracks:

- earned ledger
- reversed ledger

Unique constraints prevent duplicate processing.

---

# 14. LoyaltyProgramConfig

Singleton configuration table.

Contains:

- earning rate
- redemption defaults
- expiration defaults
- tier configuration references

Exactly one active configuration.

---

# 15. Existing Order Changes

Order introduces:

Canonical payable amount.

```
payableAmountVnd
```

Type:

Decimal(18,0)

Existing totalAmount remains for compatibility.

Business logic must gradually migrate toward payableAmountVnd.

---

# 16. Money Representation

Money uses:

Decimal(18,0)

Reasons:

- exact VND arithmetic
- avoids floating-point rounding
- Prisma compatibility
- SQL Server compatibility

Floating point values must never be used for business calculations.

---

# 17. Relationships

User

1

↓

Many UserVoucher

---

VoucherDefinition

1

↓

Many UserVoucher

(snapshot only)

---

VoucherDefinition

1

↓

Many PublicVoucherClaim

---

VoucherDefinition

1

↓

Many VoucherAssignmentRecipient

---

VoucherAssignment

1

↓

Many VoucherAssignmentRecipient

---

VoucherAssignmentRecipient

1

↓

1 UserVoucher

---

User

1

↓

Many PublicVoucherClaim

---

User

1

↓

Many PointLedger

---

User

1

↓

Many UserTierAchievement

---

Order

0..1

↓

1 VoucherApplication

---

VoucherApplication

↓

1 UserVoucher

---

# 18. Required Transactions

The following operations require database transactions.

Public Claim

- validate
- create User Voucher
- create Claim record
- commit

---

Admin Assignment

- validate
- create Assignment
- create recipients
- create User Vouchers
- commit

---

Voucher Consumption

- validate
- create VoucherApplication
- create Order
- mark voucher USED
- commit

---

Voucher Restoration

- validate
- restore voucher
- update VoucherApplication
- commit

---

Reward Processing

- calculate points
- insert ledger
- update account summary
- evaluate tier
- grant reward
- commit

---

# 19. Constraints

The following constraints are required.

PublicVoucherClaim

(UserId, VoucherDefinitionId)

UNIQUE

---

VoucherApplication

OrderId

UNIQUE

---

UserTierAchievement

RewardUserVoucherId

UNIQUE

Nullable

---

LoyaltyProgramConfig

Single active row

---

LoyaltyOrderProcessing

Unique earn ledger

Unique reverse ledger

---

# 20. Index Strategy

Indexes should exist for:

VoucherDefinition

- code
- active
- publicClaimEnabled

UserVoucher

- userId
- status
- expiresAt

PublicVoucherClaim

- userId
- voucherDefinitionId

VoucherAssignment

- createdBy
- createdAt

PointLedger

- userId
- createdAt

UserTierAchievement

- userId
- tier

Order

- payableAmountVnd

---

# 21. Database Invariants

The database must always satisfy:

- User Voucher snapshots never change.
- Voucher Definition updates never rewrite issued vouchers.
- VoucherApplication preserves complete history.
- Reward ledger is immutable.
- Tier rewards are granted once.
- Public claim uniqueness is enforced.
- Assignment is all-or-nothing.
- Money uses Decimal.
- Transactions preserve consistency.

---

# 22. Out of Scope

The following database behaviors are intentionally excluded.

- voucher reservation
- voucher scheduler
- automatic expiration jobs
- voucher revocation
- manual voucher restore
- manual voucher revoke
- tier downgrade
- historical data backfill

These require future design revisions.