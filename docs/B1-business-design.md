# B1 – Business Design
Version: 1.0
Status: APPROVED
Scope: Voucher & Loyalty System
Project: FurnitureEcommerce

---

# 1. Purpose

This document defines the business rules for the Voucher & Loyalty System.

It is the authoritative source for business behavior.

Database implementation belongs to B2.

API contracts belong to B3.

Frontend behavior belongs to B4.

Any implementation must follow this document without redesigning business rules.

---

# 2. Scope

This design introduces the following business modules:

- Voucher Definition
- User Voucher
- Public Voucher Claim
- Voucher Assignment
- Reward Points
- Customer Tier
- Reward Catalog

Promotion is an existing module and remains independent.

---

# 3. Promotion and Voucher

Promotion and Voucher are two different business concepts.

Promotion:

- managed independently
- applied automatically according to promotion rules
- affects merchandise price

Voucher:

- belongs to a customer after issuance
- manually selected during checkout
- one voucher per order
- may originate from multiple acquisition channels

Promotion MUST NOT create vouchers.

Voucher MUST NOT replace promotions.

---

# 4. Pricing Order

Checkout pricing order is fixed.

Original Merchandise Amount

↓

Promotion Discount

↓

Voucher Discount

↓

Shipping Fee

↓

Final Payable Amount

No implementation may change this calculation order.

---

# 5. Voucher Definition

Voucher Definition is the template from which User Vouchers are issued.

A Definition describes:

- voucher code
- voucher type
- discount configuration
- minimum order
- issuance policy
- expiration policy
- claim policy
- activation state

Updating a Voucher Definition affects only future issued vouchers.

Previously issued vouchers always preserve their original snapshot.

---

# 6. User Voucher

A User Voucher represents an issued voucher owned by exactly one customer.

Each User Voucher contains an immutable snapshot of the issuing Voucher Definition.

Business data preserved includes:

- discount type
- discount value
- maximum discount
- minimum order
- expiration
- acquisition source

Future Definition changes never modify existing User Vouchers.

---

# 7. Voucher Status

Persisted statuses:

- AVAILABLE
- USED

Derived status:

- EXPIRED

Reserved for future versions:

- RESERVED
- REVOKED

EXPIRED is calculated from expiration time.

It is never stored.

---

# 8. Voucher Acquisition Sources

Supported acquisition sources:

- PUBLIC_CLAIM
- ADMIN_ASSIGNMENT
- TIER_REWARD
- POINT_REDEMPTION

Additional acquisition sources require future design approval.

---

# 9. Public Claim

Customers may claim vouchers only when:

- authenticated
- Definition is active
- Definition allows public claim
- current time is inside claim window
- customer has not previously claimed that Definition

Business rule:

One customer may claim one Voucher Definition only once.

There is no global claim limit in Version 1.

---

# 10. Admin Assignment

Administrators may assign vouchers directly.

Assignment supports:

- one recipient
- multiple recipients

Bulk assignment is transactional.

If any recipient is invalid:

The entire assignment fails.

Partial assignment is not allowed.

The same Definition may be assigned multiple times through separate assignment actions.

---

# 11. Voucher Usage

Only one voucher may be applied to an order.

Voucher selection occurs during checkout.

The backend is authoritative.

Frontend sends only the selected voucher identifier.

The backend performs:

- ownership validation
- availability validation
- expiration validation
- pricing validation
- transaction
- voucher consumption

---

# 12. Voucher Consumption

Voucher consumption occurs inside the Order transaction.

Business sequence:

1. Validate voucher

2. Validate order

3. Consume voucher

4. Create order

5. Persist voucher snapshot

6. Mark voucher USED

7. Commit transaction

Consumption must be atomic.

---

# 13. Voucher Restoration

Voucher restoration occurs only when:

- order cancellation restores voucher
- completed refund restores voucher

Voucher restoration does NOT occur when:

- payment attempt fails
- VNPay callback fails
- customer abandons checkout

Restored vouchers retain their original expiration.

Expiration is never extended.

---

# 14. Customer Tier

Supported tiers:

Bronze

Silver

Gold

Diamond

Thresholds:

Bronze

Default

Silver

≥ 10,000,000 VND

Gold

≥ 30,000,000 VND

Diamond

≥ 70,000,000 VND

Tier evaluation considers:

- completed orders only
- paid merchandise only

Guest checkout never participates.

Tier downgrade is not supported.

---

# 15. Tier Rewards

Each tier reward is granted once.

If a customer crosses multiple thresholds simultaneously:

All newly reached rewards are granted.

Missing reward configuration must never rollback tier achievement.

---

# 16. Reward Points

Reward points are earned only after order completion.

Formula:

floor(orderAmount / 10,000)

Ledger types:

- EARN_ORDER
- REDEEM_VOUCHER
- REVERSE_ORDER
- ADMIN_ADJUSTMENT

Reward points use an immutable ledger.

Balance is derived.

---

# 17. Reward Catalog

Reward Catalog exchanges points for Voucher Definitions.

Redeemed vouchers use acquisition source:

POINT_REDEMPTION

Default redemption expiration:

30 days

---

# 18. Notifications

Existing Notification infrastructure is reused.

Business transactions complete first.

Notifications are generated after successful transaction commit.

Notifications must never participate in transaction rollback.

---

# 19. Idempotency

Voucher assignment supports idempotent requests.

Repeated requests with the same Idempotency-Key and identical payload return the original result.

Different payloads using the same key are rejected.

---

# 20. Business Invariants

The following invariants must always hold.

Promotion and Voucher remain independent.

One voucher per order.

One public claim per customer per Definition.

Bulk assignment is all-or-nothing.

User Voucher snapshots are immutable.

Voucher consumption is transactional.

Voucher restoration preserves expiration.

Tier never downgrades.

Reward ledger is immutable.

Notifications occur only after commit.

---

# 21. Out of Scope

The following features are intentionally excluded.

- Voucher reservation
- Voucher revocation
- Voucher scheduler
- Tier downgrade
- Manual voucher restoration
- Manual voucher revocation
- Multiple vouchers per order
- Automatic voucher application
- Promotion-generated vouchers

These require future design revisions.