# B4 – Frontend Design
Version: 1.0
Status: APPROVED
Scope: Voucher & Loyalty System
Project: FurnitureEcommerce

---

# 1. Purpose

This document defines the frontend architecture and user interaction for the Voucher & Loyalty System.

It specifies:

- page structure
- navigation
- component responsibilities
- state management
- refresh strategy
- backend interaction
- error handling

Business rules belong to B1.

Database design belongs to B2.

API contracts belong to B3.

---

# 2. Design Principles

The frontend follows the principles below.

## 2.1 Backend Authority

The frontend never calculates business results.

The backend is authoritative for:

- voucher validity
- voucher availability
- payable amount
- reward points
- customer tier
- discount calculation

Frontend only renders backend responses.

---

## 2.2 Stateless Business Logic

Business decisions must never exist inside React components.

Components only:

- display data
- collect user input
- invoke backend APIs
- render responses

---

## 2.3 Optimistic UI

Voucher & Loyalty operations do not use optimistic updates.

Every successful mutation must wait for backend confirmation.

---

## 2.4 Single Source of Truth

The backend is the single source of truth.

Frontend caches are temporary views only.

---

# 3. Frontend Modules

Customer

- My Vouchers
- Claim Voucher
- Reward Points
- Tier Information
- Reward Catalog
- Checkout Voucher Selection

Administrator

- Voucher Definitions
- Voucher Assignment
- Reward Catalog Management
- Loyalty Configuration

---

# 4. Route Structure

Customer

```

/account/vouchers

/account/rewards

/account/tier

/account/reward-catalog

```

Administrator

```

/admin/voucher-definitions

/admin/voucher-assignments

/admin/reward-catalog

/admin/loyalty

```

Checkout

```

/checkout

```

---

# 5. Component Responsibilities

Voucher List

Responsible for:

- display vouchers
- pagination
- sorting
- filtering

Must not:

- determine voucher validity
- calculate expiration status

---

Voucher Card

Displays:

- code
- discount
- expiration
- status
- acquisition source

---

Voucher Selection

Displays:

- available vouchers only
- current order eligibility
- backend validation result

---

Reward Dashboard

Displays:

- current points
- lifetime points
- tier
- available rewards

---

Tier Card

Displays:

- current tier
- achieved date
- next threshold

---

Admin Definition Table

Displays:

- active state
- public claim
- expiration
- usage summary

---

Admin Assignment Dialog

Collects:

- recipients
- voucher definition
- assignment reason

Never performs assignment logic.

---

# 6. Checkout Integration

Checkout loads:

- cart
- promotion
- shipping
- available vouchers

Voucher selection sends:

```

voucherId

```

only.

Frontend never sends:

- discount amount
- final price
- calculated totals

Backend calculates everything.

---

# 7. State Management

Local component state

Used for:

- dialogs
- loading
- filters
- forms

Server state

Used for:

- vouchers
- rewards
- tier
- checkout summary

Business state never exists locally.

---

# 8. Refresh Strategy

After successful backend transaction commit,
the frontend must invalidate and refetch affected resources.

Affected resources include:

- voucher list
- reward points
- customer tier
- checkout summary
- reward catalog

No manual page refresh should be required.

---

# 9. Browser Navigation

The frontend must correctly handle:

- browser back
- browser forward
- page reload
- multiple tabs

State must always be synchronized with backend data.

---

# 10. BFCache Handling

When a page is restored using Browser Back/Forward Cache (BFCache),

the frontend must:

- detect pageshow(persisted=true)
- invalidate affected server state
- refetch financial resources
- preserve current URL

This prevents stale voucher, reward and checkout information.

---

# 11. Loading States

Every asynchronous request must expose:

- loading
- success
- error

Loading indicators must prevent duplicate submissions.

---

# 12. Error Handling

Frontend displays backend errors only.

Frontend must not invent business explanations.

Validation messages originate from backend.

---

# 13. Authorization

Customer pages require authenticated customers.

Administrator pages require administrator permissions.

Unauthorized navigation redirects appropriately.

---

# 14. Mutation Rules

After successful backend transaction commit,

the frontend must:

- invalidate cache
- refetch affected queries
- close dialogs
- display success notification

Failed mutations never update local state.

---

# 15. Notification Strategy

Success

Toast notification.

Failure

Backend error message.

Long-running operations

Loading indicator.

---

# 16. Accessibility

Interactive controls must support:

- keyboard navigation
- focus visibility
- screen readers

Dialogs must trap focus.

---

# 17. Responsive Design

Customer pages support:

- desktop
- tablet
- mobile

Administrator pages prioritize desktop usability.

---

# 18. Frontend Invariants

The frontend must always satisfy:

- Backend is authoritative.
- Business logic never exists in React components.
- Checkout sends voucherId only.
- Voucher calculations occur on backend.
- Cache is invalidated after successful transaction commit.
- BFCache restores always trigger refetch.
- Failed mutations never modify local business state.

---

# 19. Out of Scope

Version 1 intentionally excludes:

- offline mode
- optimistic voucher redemption
- optimistic checkout
- websocket synchronization
- real-time voucher updates
- automatic voucher recommendation
- client-side discount calculation