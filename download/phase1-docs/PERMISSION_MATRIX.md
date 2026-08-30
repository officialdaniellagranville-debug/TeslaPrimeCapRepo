# Permission Matrix — Enterprise Investment Platform

> **Project:** Managed Investment Plan Platform  
> **Phase:** 1 — Requirements & Specification  
> **Last Updated:** 2025

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✓ | **GRANT** — Permission is allowed for this role |
| ✗ | **DENY** — Permission is explicitly denied for this role |
| *(condition)* | **CONDITIONAL** — Permission is granted only when the stated condition is met |

---

## Permission Matrix

| # | Permission | Super Admin | Admin | KYC Officer | Support Agent | User |
|---|-----------|:-----------:|:-----:|:-----------:|:-------------:|:----:|
|   | **User Management** | | | | | |
| 1 | `user.view` — View user profiles | ✓ | ✓ | ✗ | ✓ *(own assigned tickets' users only)* | ✗ |
| 2 | `user.create` — Create users | ✓ | ✗ | ✗ | ✗ | ✗ |
| 3 | `user.update` — Update user profiles | ✓ | ✓ *(non-protected fields only)* | ✗ | ✗ | ✓ *(own profile only)* |
| 4 | `user.delete` — Soft delete users | ✓ | ✗ | ✗ | ✗ | ✗ |
| 5 | `user.ban` — Ban/unban users | ✓ | ✓ | ✗ | ✗ | ✗ |
| 6 | `user.impersonate` — Impersonate user | ✓ | ✗ | ✗ | ✗ | ✗ |
|   | **KYC Management** | | | | | |
| 7 | `kyc.view` — View KYC submissions | ✓ | ✓ | ✓ | ✗ | ✓ *(own submissions only)* |
| 8 | `kyc.review` — Review and approve/reject KYC | ✓ | ✓ | ✓ | ✗ | ✗ |
| 9 | `kyc.override` — Override KYC level | ✓ | ✗ | ✗ | ✗ | ✗ |
|   | **Financial Operations** | | | | | |
| 10 | `deposit.view` — View all deposits | ✓ | ✓ | ✗ | ✗ | ✓ *(own deposits only)* |
| 11 | `deposit.approve` — Approve gift card deposits | ✓ | ✓ | ✗ | ✗ | ✗ |
| 12 | `deposit.reject` — Reject gift card deposits | ✓ | ✓ | ✗ | ✗ | ✗ |
| 13 | `withdrawal.view` — View all withdrawals | ✓ | ✓ | ✗ | ✗ | ✓ *(own withdrawals only)* |
| 14 | `withdrawal.approve` — Approve withdrawals | ✓ | ✓ | ✗ | ✗ | ✗ |
| 15 | `withdrawal.reject` — Reject withdrawals | ✓ | ✓ | ✗ | ✗ | ✗ |
| 16 | `wallet.adjust` — Manually adjust wallet balances | ✓ | ✗ | ✗ | ✗ | ✗ |
| 17 | `plan.manage` — CRUD on investment plans | ✓ | ✗ | ✗ | ✗ | ✗ |
| 18 | `fee.manage` — Update fee percentages | ✓ | ✗ | ✗ | ✗ | ✗ |
|   | **Referral Management** | | | | | |
| 19 | `referral.view` — View referral trees | ✓ | ✓ | ✗ | ✗ | ✓ *(own tree only)* |
| 20 | `referral.commission.view` — View commission details | ✓ | ✓ | ✗ | ✗ | ✓ *(own commissions only)* |
| 21 | `referral.commission.adjust` — Adjust commissions | ✓ | ✗ | ✗ | ✗ | ✗ |
| 22 | `referral.dispute` — Resolve referral disputes | ✓ | ✓ | ✗ | ✗ | ✗ |
|   | **Support** | | | | | |
| 23 | `ticket.view` — View tickets | ✓ | ✓ | ✓ *(KYC-related tickets only)* | ✓ | ✓ *(own tickets only)* |
| 24 | `ticket.respond` — Respond to tickets | ✓ | ✓ | ✓ *(KYC-related tickets only)* | ✓ | ✓ *(own tickets only)* |
| 25 | `ticket.close` — Close tickets | ✓ | ✓ | ✓ *(KYC-related tickets only)* | ✓ | ✗ |
| 26 | `ticket.escalate` — Escalate to admin | ✓ | ✗ | ✓ | ✓ | ✗ |
| 27 | `ticket.delete` — Delete tickets | ✓ | ✓ | ✗ | ✗ | ✗ |
|   | **Reports** | | | | | |
| 28 | `report.view` — View reports | ✓ | ✓ | ✗ | ✗ | ✗ |
| 29 | `report.export` — Export reports | ✓ | ✓ | ✗ | ✗ | ✗ |
| 30 | `report.financial` — Financial reports | ✓ | ✓ | ✗ | ✗ | ✗ |
|   | **System** | | | | | |
| 31 | `settings.view` — View system settings | ✓ | ✓ | ✗ | ✗ | ✗ |
| 32 | `settings.update` — Update system settings | ✓ | ✓ *(non-restricted fields only)* | ✗ | ✗ | ✗ |
| 33 | `audit.view` — View audit logs | ✓ | ✓ | ✗ | ✗ | ✗ |
| 34 | `audit.export` — Export audit logs | ✓ | ✓ | ✗ | ✗ | ✗ |
| 35 | `role.manage` — Manage roles and permissions | ✓ | ✗ | ✗ | ✗ | ✗ |
| 36 | `notification.system` — Send system-wide notifications | ✓ | ✓ | ✗ | ✗ | ✗ |

---

## Condition Notes

### User Management
| Permission | Role | Condition |
|-----------|------|-----------|
| `user.view` | Support Agent | Can only view profiles of users who have open tickets assigned to them |
| `user.update` | Admin | Cannot modify protected fields (role, KYC level, email verification status) |
| `user.update` | User | Can only update their own profile (name, password, preferences) |
| `user.impersonate` | Super Admin | All impersonation sessions are logged in the audit log with the impersonator's ID and duration |

### KYC Management
| Permission | Role | Condition |
|-----------|------|-----------|
| `kyc.view` | User | Can only view their own KYC submissions and status |
| `kyc.override` | Super Admin | Only the Super Admin can manually set a user's KYC level. Requires audit log entry with justification. |

### Financial Operations
| Permission | Role | Condition |
|-----------|------|-----------|
| `deposit.view` | User | Can only view their own deposit history |
| `withdrawal.view` | User | Can only view their own withdrawal history |
| `wallet.adjust` | Super Admin | Manual wallet adjustments require an audit log entry with reason, amount, and affected user |
| `fee.manage` | Super Admin | Fee changes (e.g., the 21% withdrawal fee) require confirmation dialog and are logged with old and new values |
| `plan.manage` | Super Admin | Cannot delete or disable plans that have active investments. Changes to active plans require migration strategy. |

### Referral Management
| Permission | Role | Condition |
|-----------|------|-----------|
| `referral.view` | User | Can only view their own referral tree and direct referrals |
| `referral.commission.view` | User | Can only view their own commission history |
| `referral.commission.adjust` | Super Admin | Commission adjustments require reason and are logged. Adjustments can increase, decrease, or reverse commissions. |

### Support
| Permission | Role | Condition |
|-----------|------|-----------|
| `ticket.view` | KYC Officer | Can only view tickets categorized as "KYC" or "Verification" |
| `ticket.respond` | KYC Officer | Can only respond to tickets categorized as "KYC" or "Verification" |
| `ticket.close` | KYC Officer | Can only close tickets categorized as "KYC" or "Verification" |
| `ticket.view` | User | Can only view their own support tickets |
| `ticket.respond` | User | Can only add messages to their own open tickets |
| `ticket.escalate` | KYC Officer, Support Agent | Escalation assigns the ticket to an Admin and adds an escalation flag |

### Reports
| Permission | Role | Condition |
|-----------|------|-----------|
| `report.view` | Admin | Access to user reports and system reports. Financial reports require explicit `report.financial` permission. |
| `report.export` | Admin | All exports are logged with the admin's ID, report type, and timestamp |
| `report.financial` | Admin | Required in addition to `report.view` to access financial data (revenue, fees, balances) |

### System
| Permission | Role | Condition |
|-----------|------|-----------|
| `settings.update` | Admin | Cannot modify fee percentages, plan details, or role configurations. Limited to email settings, feature flags, and general settings. |
| `settings.update` | Super Admin | Full access to all settings including fees, plans, and critical system parameters |
| `notification.system` | Admin | System notifications are sent to all users. Content must be reviewed before sending. Logged in audit trail. |

---

## Implicit Permissions (All Authenticated Users)

The following actions are available to all authenticated users regardless of role:

| Action | Description |
|--------|-------------|
| Own profile read | View own profile information |
| Own profile update | Update own name, password, and preferences |
| Own wallet read | View own wallet balances and transaction history |
| Own investment read | View own investments (active and historical) |
| Own deposit create | Create cryptocurrency or gift card deposits |
| Own withdrawal create | Request withdrawals from own wallet |
| Own referral read | View own referral link, stats, and tree |
| Own KYC submit | Upload KYC documents for own account |
| Own ticket create | Create support tickets |
| Own ticket respond | Add messages to own open tickets |
| Own notification read | View and manage own notifications |
| Own notification prefs | Configure own notification preferences |
| Own session manage | View and revoke own active sessions |
| Own 2FA manage | Enable, disable, and manage own 2FA settings |

---

## Role Definitions

### Super Admin
- Full system access with no restrictions
- Can manage roles, permissions, fees, plans, and all system settings
- Can impersonate users for debugging
- Can adjust wallets and commissions
- Only role that can override KYC levels and manage fee percentages
- All audit actions logged

### Admin
- Full operational access except role/fee management
- Can manage users, KYC, deposits, withdrawals, and referrals
- Can view all reports and audit logs
- Can update non-restricted system settings
- Can send system-wide notifications
- Cannot impersonate users, manage roles, or change fee percentages

### KYC Officer
- Specialized role for identity verification
- Can view, review, approve, and reject KYC documents
- Can view and respond to KYC-related support tickets
- Cannot access financial operations, reports, or system settings
- Access limited to KYC queue and KYC-related tickets

### Support Agent
- Frontline support role
- Can view and respond to assigned or unassigned support tickets
- Can escalate tickets to admins
- Can view basic user profiles (for assigned tickets only)
- Cannot access financial operations, KYC review, reports, or settings

### User (Investor)
- Standard investor account
- Full access to own data and self-service features
- Can deposit, invest, withdraw, and manage referrals
- No access to admin panel or other users' data
- Feature access may be further restricted by KYC level

### Unverified User
- Pre-verification state (after registration, before email verification)
- Can only access email verification flow
- Cannot access dashboard or any platform features
- Account is activated upon successful email verification → becomes User

---

## Permission Inheritance

The permission system follows a hierarchical inheritance model:

```
Super Admin
├── inherits all Admin permissions
│   ├── inherits all KYC Officer permissions (expanded scope)
│   └── inherits all Support Agent permissions (expanded scope)
└── plus: user.create, user.delete, user.impersonate, kyc.override,
         wallet.adjust, plan.manage, fee.manage,
         referral.commission.adjust, role.manage,
         full settings.update
```

Each higher role inherits all permissions of the roles below it, with an expanded scope. For example, an Admin can view all KYC submissions (inheriting from KYC Officer) plus access financial operations and reports that the KYC Officer cannot.

---

## Implementation Notes

1. **Middleware Enforcement:** Permission checks should be enforced at both the middleware level (route protection) and the API endpoint level (defense in depth).
2. **Permission Cache:** Active permissions for each role should be cached in Redis and invalidated on role/permission changes.
3. **Audit Trail:** All permission-gated actions must create an audit log entry regardless of success or failure.
4. **API Response:** If a user attempts an action without the required permission, the API should return `403 Forbidden` with a clear error message.
5. **UI Hiding vs. Disabling:** UI elements requiring permissions the user lacks should be hidden (not just disabled) to avoid confusion. Server-side validation is the source of truth.
6. **Role Assignment:** Only Super Admin can assign or revoke Admin and KYC Officer roles. Admin can assign Support Agent role. Users self-assign the User role upon registration.

---

*End of Permission Matrix Document — Phase 1*