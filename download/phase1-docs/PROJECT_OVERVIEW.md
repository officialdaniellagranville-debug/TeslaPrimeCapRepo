# Project Overview

## 1. Executive Summary

InvestPro Platform is a managed investment plan application that allows users to deposit funds into structured, tiered investment plans and earn fixed returns over predetermined durations. The platform manages all trading and investment activities on behalf of users, removing the need for users to have any trading expertise. Users select from four investment tiers -- Basic, Silver, Gold, and Platinum -- each with defined minimum and maximum deposit amounts, lock-up durations, and return rates. Returns are credited directly to the user's wallet upon plan maturity.

The platform operates on a global scale, serving users in all jurisdictions where the service is legally permissible. It supports cryptocurrency deposits (BTC, ETH, USDT) and gift card deposits, making it accessible to users who may not have traditional banking access but do hold crypto or retail gift cards. A dual-mode architecture allows users to toggle between a Demo mode (simulated balances, no real funds at risk) and a Live mode (real money) with identical user interfaces, enabling prospective users to evaluate the platform before committing capital.

The growth model relies on a built-in referral system offering 10% direct referral commissions and a binary bonus structure for team builders who develop active downline networks. Revenue is generated primarily through a 21% withdrawal fee that covers account management, signal provision, insurance policies, and regulatory obligations. The platform is designed for rapid international deployment with multi-language support, a premium red-and-black visual identity, and a mobile-first responsive interface.

## 2. Platform Vision

The long-term vision for InvestPro Platform is to become the most accessible managed investment service globally by removing traditional barriers to entry -- bank account requirements, minimum trading knowledge, and geographic restrictions -- while maintaining a premium user experience that instills trust and confidence. The platform aims to serve millions of investors across 100+ countries by combining simplified deposit methods (including gift cards and cryptocurrency), transparent fee structures, and a referral-driven community model that rewards user advocacy. Future phases will introduce mobile applications, an API marketplace for third-party integrations, enterprise white-label capabilities, and expanded regulatory coverage to additional jurisdictions.

## 3. Target Audience

**Retail Investors (Primary):** Individual investors worldwide seeking passive returns through a managed investment model. These users typically have limited trading experience, hold cryptocurrency or retail gift cards, and prefer a hands-off approach where the platform handles all investment decisions. They range from first-time investors depositing the $200 minimum to experienced participants committing up to $100,000 in the Platinum tier. They value simplicity, transparency in fees, and the ability to test the platform risk-free in Demo mode before depositing real funds.

**Referral Marketers (Growth Accelerators):** Users who actively recruit new participants through the referral program. These individuals are motivated by the 10% direct commission on referrals and the binary bonus structure, which pays weekly based on the weaker leg's volume in their downline tree. They require tools to track their network, visualize their binary tree, monitor commission accruals, and share referral links across social media and messaging platforms. They typically have existing audiences in financial or opportunity-seeking communities.

**Platform Operators (Administrators):** Internal staff who manage day-to-day operations including KYC verification review, gift card deposit validation, withdrawal approval processing, investment plan configuration, user account management, and system monitoring. They require a comprehensive admin dashboard with queues, approval workflows, reporting tools, and the ability to respond to support tickets. See [FUNCTIONAL_REQUIREMENTS](./FUNCTIONAL_REQUIREMENTS.md) Section 10 for the full admin dashboard specification.

## 4. Key Differentiators

**Dual Demo/Live Mode:** Unlike competitors that either offer only live trading or separate demo environments with different interfaces, InvestPro provides both modes within a single application using identical UI/UX. Users can explore all features, test deposit flows, simulate investments, and experience the referral system without any financial risk. Switching between modes is seamless, and balances are strictly separated at the data layer to prevent any cross-contamination between simulated and real funds.

**Gift Card Deposits:** The platform accepts retail gift cards as a deposit method, a feature rarely found in investment platforms. Users upload a screenshot or photo of their gift card, which is verified by the admin team before the equivalent value is credited to their wallet. This opens the platform to users in regions with limited banking infrastructure but active gift card markets, significantly expanding the addressable user base beyond what cryptocurrency alone can reach.

**Multi-Currency Internal Accounting:** While USD serves as the primary accounting currency, the platform supports EUR, GBP, and other configurable fiat currencies for display and deposit reference purposes. Cryptocurrency deposits are automatically converted to USD equivalents at prevailing market rates. This flexibility allows the platform to present information in a user's preferred currency while maintaining a single, consistent internal ledger.

**Premium User Experience:** The red-and-black color scheme, dark-theme-first design, and Tesla-inspired aesthetic position the platform as a premium fintech product rather than a generic investment site. This visual identity, combined with responsive design, smooth transitions, and professional typography, builds immediate credibility and differentiates the platform from competitors using template-based designs.

## 5. Scope

### Phase 1 -- Core Platform (Current)

Phase 1 encompasses the complete minimum viable product required for public launch. This includes user registration and authentication with 2FA support, KYC verification at three levels, the full wallet system with demo and live balance separation, all four investment plan tiers, cryptocurrency and gift card deposit flows, the withdrawal system with the 21% fee structure, the referral system with direct commissions and binary bonuses, the user dashboard with portfolio charts and transaction history, the admin dashboard with all management and approval queues, in-app and email notifications, a support ticket system, multi-language support, SEO-optimized public pages, and responsive design across all device sizes.

### Future Phases (Not in Scope for Phase 1)

Phase 2 will introduce native mobile applications for iOS and Android, push notifications, advanced charting with technical indicators, an API marketplace for third-party integrations, and additional payment methods including bank transfers and mobile money. Phase 3 will add enterprise white-label capabilities, expanded regulatory licensing for additional jurisdictions, advanced analytics and reporting for power users, and a community forum or social features for investor networking.

## 6. Success Metrics

| Metric | Target (Phase 1, 6 months post-launch) | Description |
|--------|----------------------------------------|-------------|
| Daily Active Users (DAU) | 5,000+ | Unique users engaging with the platform daily |
| Monthly Deposit Volume | $2,000,000+ | Total value of deposits across all users per month |
| User Growth Rate | 15% month-over-month | New registrations relative to existing user base |
| Plan Uptake Distribution | 40% Basic, 30% Silver, 20% Gold, 10% Platinum | Distribution of active investments across tiers |
| Referral Conversion Rate | 25% of registered users | Users who join via a referral link versus organic |
| KYC Completion Rate | 70% of registered users | Users who complete at least Level 1 (email) verification |
| Demo-to-Live Conversion | 30% of demo users | Users who switch from Demo mode to Live mode within 14 days |
| Withdrawal Processing Time | Under 36 hours average | Time from withdrawal request to funds released |
| Support Ticket Resolution | Under 12 hours average | Time from ticket creation to resolution |

## 7. Document Map

The following table lists all 31 Phase 1 documentation deliverables. Documents included in this batch are marked with their filenames. Remaining documents are planned for subsequent batches.

| # | Document | Filename | Description |
|---|----------|----------|-------------|
| 1 | Project README | [README.md](./README.md) | Project overview, tech stack, phase status, and navigation |
| 2 | Project Overview | [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Executive summary, vision, audience, scope, metrics, document map |
| 3 | Business Requirements | [BUSINESS_REQUIREMENTS.md](./BUSINESS_REQUIREMENTS.md) | Business model, revenue, plans, referrals, deposits, withdrawals |
| 4 | Functional Requirements | [FUNCTIONAL_REQUIREMENTS.md](./FUNCTIONAL_REQUIREMENTS.md) | Feature-level specifications for all platform capabilities |
| 5 | Non-Functional Requirements | [NON_FUNCTIONAL_REQUIREMENTS.md](./NON_FUNCTIONAL_REQUIREMENTS.md) | Performance, security, scalability, compliance standards |
| 6 | System Architecture | SYSTEM_ARCHITECTURE.md | High-level architecture diagram, component relationships, data flow |
| 7 | Database Schema | DATABASE_SCHEMA.md | Complete Prisma schema, entity relationships, indexes, migrations |
| 8 | API Specification | API_SPECIFICATION.md | REST API endpoints, request/response formats, authentication |
| 9 | Authentication & Authorization | AUTH_SPECIFICATION.md | Auth flows, 2FA, session management, role-based access |
| 10 | UI/UX Design System | UI_UX_DESIGN_SYSTEM.md | Color system, typography, components, spacing, dark/light themes |
| 11 | Page Specifications | PAGE_SPECIFICATIONS.md | Wireframe-level specs for every page and screen |
| 12 | Component Library | COMPONENT_LIBRARY.md | Reusable React components, props, variants, usage guidelines |
| 13 | Investment Plan Engine | INVESTMENT_PLAN_ENGINE.md | Plan selection, funding, maturity, return calculation logic |
| 14 | Wallet System Design | WALLET_SYSTEM_DESIGN.md | Balance management, transactions, pending/available logic |
| 15 | Deposit Flow Design | DEPOSIT_FLOW_DESIGN.md | Crypto and gift card deposit workflows end-to-end |
| 16 | Withdrawal Flow Design | WITHDRAWAL_FLOW_DESIGN.md | Withdrawal request, fee calculation, approval, processing |
| 17 | Referral System Design | REFERRAL_SYSTEM_DESIGN.md | Direct commissions, binary tree, bonus calculations, payouts |
| 18 | KYC Verification Design | KYC_VERIFICATION_DESIGN.md | Document upload, verification levels, admin review workflow |
| 19 | Notification System | NOTIFICATION_SYSTEM.md | In-app and email notification types, templates, preferences |
| 20 | Admin Dashboard Spec | ADMIN_DASHBOARD_SPEC.md | Admin screens, queues, management interfaces, reports |
| 21 | User Dashboard Spec | USER_DASHBOARD_SPEC.md | User screens, portfolio view, charts, settings pages |
| 22 | Public Pages Spec | PUBLIC_PAGES_SPEC.md | Marketing pages: home, about, FAQ, contact, privacy, terms |
| 23 | Multi-Language Strategy | MULTI_LANGUAGE_STRATEGY.md | i18n framework, translation workflow, locale management |
| 24 | SEO Strategy | SEO_STRATEGY.md | Meta tags, structured data, sitemaps, performance for search |
| 25 | Security Architecture | SECURITY_ARCHITECTURE.md | Threat model, encryption, rate limiting, OWASP compliance |
| 26 | Deployment Strategy | DEPLOYMENT_STRATEGY.md | Docker, Coolify, CI/CD, environment management |
| 27 | Testing Strategy | TESTING_STRATEGY.md | Unit, integration, E2E testing, coverage targets |
| 28 | Monitoring & Observability | MONITORING_OBSERVABILITY.md | Logging, APM, alerting, dashboards, incident response |
| 29 | Data Migration Plan | DATA_MIGRATION_PLAN.md | Seed data, environment provisioning, migration scripts |
| 30 | Launch Checklist | LAUNCH_CHECKLIST.md | Pre-launch verification, go-live procedures, rollback plan |
| 31 | Risk Register | RISK_REGISTER.md | Identified risks, impact assessment, mitigation strategies |