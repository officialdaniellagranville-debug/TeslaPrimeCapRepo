# Role Matrix

## 1. Role Matrix Overview

This document defines every role in the system, their capabilities, restrictions, and relationships. It complements the [PERMISSION_MATRIX.md](./PERMISSION_MATRIX.md) by providing the narrative context for each role.

The platform implements a strict role-based access control (RBAC) model with six distinct roles. Each role has a clearly defined scope of access, ensuring the principle of least privilege is enforced across all system layers — from the UI down to database queries and API endpoints.

Roles are not merely labels; they govern navigation visibility, API route access, data scope, and available actions. Every request is authorized against the authenticated user's role before any business logic executes.

---

## 2. Role Definitions

### Super Admin

| Attribute | Detail |
|---|---|
| **Description** | The highest authority on the platform. Responsible for overall system health, team management, and critical decisions. There should be very few Super Admins (1–3 maximum). |
| **Capabilities** | Full access to all system features. Can manage other admins, create/edit roles, modify system settings, adjust financial parameters, view all data, export all reports, override any decision. |
| **Restrictions** | Cannot delete audit logs (only export). Cannot perform financial transactions on behalf of users without audit trail. All actions are logged immutably. |
| **Assignment** | Only existing Super Admins can assign this role. Requires manual verification and approval process. |
| **Dashboard Access** | Full admin dashboard with all sections visible. |
| **Notification Scope** | Receives all system alerts, security alerts, financial anomaly alerts, and critical error notifications. |

**Operational Notes:**
- Super Admin actions that modify financial parameters (fees, plan rates, withdrawal limits) must include a mandatory reason field persisted in the audit log.
- Any override of an Admin or KYC Officer decision is flagged for review.
- Super Admins cannot remove their own role — at least one Super Admin must always exist on the platform.

---

### Admin

| Attribute | Detail |
|---|---|
| **Description** | Day-to-day operations manager. Handles user management, financial operations, and support oversight. The primary operational role. |
| **Capabilities** | Manage users (view, edit, ban), process KYC reviews, approve/reject deposits and withdrawals, manage investment plans, view all reports, respond to support tickets, view audit logs. |
| **Restrictions** | Cannot modify system settings (fees, roles, permissions). Cannot adjust user wallet balances. Cannot delete audit logs. Cannot assign Super Admin role. |
| **Assignment** | Assigned by Super Admin. Can be promoted from KYC Officer or Support Agent based on performance. |
| **Dashboard Access** | Admin dashboard with all sections except System Settings and Role Management. |
| **Notification Scope** | Receives operational alerts, new KYC submissions, withdrawal requests, support escalations. |

**Operational Notes:**
- Admins can ban users but cannot delete user accounts (data retention compliance).
- Deposit approvals for gift card payments require the Admin to view the uploaded screenshot and verify before approving.
- Admins processing withdrawals must verify the withdrawal amount does not exceed available balance after the 21% fee deduction.

---

### KYC Officer

| Attribute | Detail |
|---|---|
| **Description** | Specialized role focused solely on identity verification and document review. Critical for compliance. |
| **Capabilities** | View KYC submissions, review documents (view images, approve, reject with reasons), view user basic profiles (for KYC context only), view KYC-related audit logs. |
| **Restrictions** | Cannot access wallet or financial data. Cannot view investment details. Cannot manage users. Cannot process deposits or withdrawals. Cannot access any admin settings. |
| **Assignment** | Assigned by Admin or Super Admin. Requires training on KYC/AML procedures and compliance requirements. |
| **Dashboard Access** | Admin dashboard with ONLY KYC Review section visible. All other sections hidden or inaccessible. |
| **Notification Scope** | Receives new KYC submission alerts, KYC-related notifications only. |

**Operational Notes:**
- KYC Officers must provide a mandatory rejection reason when rejecting a submission.
- Document images are served through a time-limited signed URL (Cloudinary) to prevent unauthorized sharing.
- KYC Officers can see only the user's name, email, and submitted documents — no financial context is visible.

---

### Support Agent

| Attribute | Detail |
|---|---|
| **Description** | Frontline support for user inquiries. Handles tickets and provides user assistance. Limited access to protect sensitive data. |
| **Capabilities** | View user basic profiles (name, email, registration date, KYC level), view support tickets, respond to tickets, close tickets, escalate tickets to Admin, view limited transaction history (dates and statuses only, not amounts). |
| **Restrictions** | Cannot view KYC documents. Cannot view wallet balances or transaction amounts. Cannot process any financial operations. Cannot modify user data. Cannot access admin settings or reports. |
| **Assignment** | Assigned by Admin or Super Admin. |
| **Dashboard Access** | Admin dashboard with ONLY Support Tickets section visible. User profile view limited to basic info. |
| **Notification Scope** | Receives new ticket assignments, ticket escalation alerts. |

**Operational Notes:**
- Support Agents can view transaction dates and statuses (e.g., "Deposit — Approved", "Withdrawal — Pending") but never the monetary amounts.
- Ticket escalation to Admin is required when the inquiry involves financial disputes, KYC issues, or account recovery.
- Support Agents cannot close tickets flagged as "financial dispute" — only Admins can resolve those.

---

### User (Investor)

| Attribute | Detail |
|---|---|
| **Description** | The primary platform user. Individuals who register, deposit funds, invest in plans, and earn returns. |
| **Capabilities** | Manage own profile, view own wallet, make deposits, purchase investment plans, request withdrawals, manage own referral network, view own reports and analytics, create support tickets, configure own notification preferences, enable/disable 2FA. |
| **Restrictions** | Cannot access any admin features. Cannot view other users' data. Cannot modify financial records. Cannot bypass KYC requirements. Cannot exceed deposit/withdrawal limits for their KYC level. Demo mode users cannot withdraw real funds. |
| **Assignment** | Automatically assigned upon registration and email verification. |
| **Dashboard Access** | Full user dashboard (wallet, investments, deposits, withdrawals, referrals, profile, notifications, support). |
| **Notification Scope** | Receives all personal notifications (financial, security, account, referral). |

**Operational Notes:**
- Users operating in Demo mode have a simulated wallet with virtual funds. All plan purchases and returns are simulated. Switching to Live mode requires KYC completion and a real deposit.
- Users in Live mode must complete KYC Level 1 (basic identity) before depositing, and KYC Level 2 (enhanced due diligence) for the Gold and Platinum plan tiers.
- The 21% withdrawal fee is displayed clearly before any withdrawal is confirmed.

---

### Unverified User

| Attribute | Detail |
|---|---|
| **Description** | A registered user who has not yet verified their email address. Most limited role. |
| **Capabilities** | View public pages, complete email verification, resend verification email, delete own account. |
| **Restrictions** | Cannot access dashboard. Cannot deposit, invest, or withdraw. Cannot create support tickets (beyond pre-login contact form). Session expires after 24 hours if email not verified. |
| **Assignment** | Default state upon registration. Automatically upgraded to User upon email verification. |
| **Dashboard Access** | None — redirected to email verification page. |
| **Notification Scope** | Email verification reminder only. |

**Operational Notes:**
- The verification email contains a time-limited token (expires in 1 hour). Users can request a resend once every 60 seconds.
- If the email is not verified within 24 hours, the session is invalidated. The account remains in the database but is inert until verified.
- Users may delete their own account while in the Unverified state without any data retention requirement.

---

## 3. Role Hierarchy

```
Super Admin (Level 6)
    └── Admin (Level 5)
            ├── KYC Officer (Level 4)
            └── Support Agent (Level 3)
                    └── User / Investor (Level 2)
                            └── Unverified User (Level 1)
```

**Inheritance Rules:**

- Higher roles **inherit view permissions** of all lower roles. An Admin can see everything a Support Agent can see, plus their own scope.
- Higher roles do **NOT** inherit action permissions unless explicitly granted. A Support Agent cannot approve KYC even though they can view user profiles.
- The permission enforcement is implemented at three layers:
  1. **UI Layer** — Navigation items, buttons, and sections are conditionally rendered based on role.
  2. **API Layer** — Every API endpoint validates the caller's role before executing business logic.
  3. **Database Layer** — Row-level security or query scoping ensures data isolation per role.

---

## 4. Role Transitions

All possible role changes and their triggers:

| Transition | Trigger | Actor | Notes |
|---|---|---|---|
| Unverified → User | Email verification completed | System (automatic) | Token verified via email link. Immediate upgrade. |
| User → KYC Officer | Promotion | Super Admin or Admin | Requires completion of KYC/AML training. |
| User → Support Agent | Promotion | Super Admin or Admin | Requires completion of support training. |
| Support Agent → Admin | Promotion | Super Admin | Based on performance review and tenure. |
| KYC Officer → Admin | Promotion | Super Admin | Based on performance review and compliance record. |
| Admin → Super Admin | Promotion | Super Admin | Requires manual verification and multi-admin approval. Maximum 3 Super Admins. |
| Any role → User | Demotion | Super Admin | Strips all admin privileges. Audit logged with reason. |
| Any role → Banned | Ban | Admin or Super Admin | Account suspended. All sessions invalidated. Data retained. |
| User → Unverified | N/A | Not applicable | This transition does not occur. Once verified, a user stays verified. |

**Transition Rules:**

- All role changes are logged in the audit table with: previous role, new role, actor, reason, and timestamp.
- Demotions and bans trigger an email notification to the affected user.
- Promotion to Super Admin requires at least two existing Super Admins to approve (if more than one exists).
- Banned users can be reinstated to User role by Admin or Super Admin, but not to any admin role.

---

## 5. Role-Based UI

The platform UI dynamically adapts based on the authenticated user's role. This is not cosmetic — it reflects the actual permission boundaries enforced at the API layer.

### Navigation Items

| Navigation Item | Super Admin | Admin | KYC Officer | Support Agent | User | Unverified |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard (Home) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Wallet | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Investments | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Deposits | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Withdrawals | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Referrals | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| KYC Review | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Support Tickets | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| User Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Reports | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| System Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Role Management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Audit Logs | ✅ | ✅ (view only) | ✅ (KYC only) | ❌ | ❌ | ❌ |
| Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Notifications | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### Action Buttons

| Action | Super Admin | Admin | KYC Officer | Support Agent | User | Unverified |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Approve/Reject KYC | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve/Reject Deposit | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve/Reject Withdrawal | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Ban User | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Edit User Profile | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign Roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Modify System Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Export Data | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Make Deposit | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Purchase Plan | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Request Withdrawal | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Create Ticket | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Escalate Ticket | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Enable/Disable 2FA | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |

### Data Visibility Scopes

| Data Type | Super Admin | Admin | KYC Officer | Support Agent | User |
|---|---|---|---|---|---|
| All user profiles | Full | Full | Name/Email only | Name/Email/KYC Level | Own only |
| KYC documents | Full access | Full access | Full access | ❌ | Own documents only |
| Wallet balances | All users | All users | ❌ | ❌ | Own only |
| Transaction amounts | All users | All users | ❌ | ❌ | Own only |
| Transaction status | All users | All users | ❌ | Dates/statuses only | Own only |
| Investment details | All users | All users | ❌ | ❌ | Own only |
| Referral data | All users | All users | ❌ | ❌ | Own network only |
| Audit logs | Full (export only) | View only | KYC entries only | ❌ | ❌ |
| System settings | Full | View only | ❌ | ❌ | ❌ |
| Financial reports | Full | Full | ❌ | ❌ | ❌ |
