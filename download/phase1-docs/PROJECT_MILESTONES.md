# Project Milestones

**Project:** Enterprise Investment Platform
**Phase:** 1 — Discovery & Documentation
**Last Updated:** 2025
**Status:** Draft

---

## 1. Project Phases Overview

The project is organized into six sequential phases, each with clearly defined objectives, deliverables, and acceptance criteria. Phases are designed to be sequential — each phase builds upon the outputs and approvals of the previous phase. No phase begins until the preceding phase has been formally signed off by the project stakeholders.

| Phase | Name | Purpose |
|-------|------|---------|
| Phase 1 | Discovery & Documentation | Analyze requirements, define scope, produce all planning documentation |
| Phase 2 | Architecture & Technical Design | Design system architecture, database schema, API contracts, and security model |
| Phase 3 | Core Development | Build all platform features, integrate services, implement business logic |
| Phase 4 | Testing & QA | Comprehensive testing, bug fixing, performance optimization, security auditing |
| Phase 5 | Deployment & Launch | Production environment setup, data migration, go-live |
| Phase 6 | Post-Launch & Iteration | Monitor, fix, optimize, and plan future feature development |

Each phase concludes with a formal milestone review where the project team presents deliverables to stakeholders, addresses feedback, and obtains sign-off to proceed. This structured approach ensures alignment between the development team and business stakeholders at every stage.

---

## 2. Phase 1 Milestones — Discovery & Documentation

**Objective:** Establish a comprehensive understanding of the platform's requirements, constraints, and goals through analysis, interviews, and documentation.

### M1.1: Reference Site Analysis Complete

Analysis of the reference investment platform is completed, documenting its feature set, user flows, visual design patterns, and functional behaviors. Key differentiators and features to replicate are identified. This analysis forms the baseline for the project's feature inventory and user experience design. The output is a structured analysis document with screenshots, annotated flows, and a comparison matrix.

### M1.2: Discovery Interview Complete

A structured discovery interview is conducted with the project stakeholder(s) to capture business requirements, operational workflows, brand preferences, and technical constraints. The interview covers investment plan structures, commission models, deposit and withdrawal processes, KYC requirements, admin workflows, and user management policies. All interview findings are documented and validated with the stakeholder.

### M1.3: All Phase 1 Documents Generated and Approved

All 31 Phase 1 documentation files are generated, reviewed, and approved by the project stakeholder(s). Documents cover every aspect of the platform: requirements, architecture, testing, security, scalability, risk analysis, user stories, and more. Each document undergoes at least one review cycle with feedback incorporated before final approval.

**Deliverables:**
- All `.md` documentation files in the `phase1-docs/` directory
- Stakeholder sign-off on the complete documentation set
- Change log documenting all review feedback and resolutions

---

## 3. Phase 2 Milestones — Architecture & Technical Design

**Objective:** Translate the documented requirements into a detailed technical design that guides the development team through implementation.

### M2.1: System Architecture Approved

The high-level and detailed system architecture is documented, including service boundaries, communication patterns, data flow diagrams, technology selection rationale, and deployment topology. The architecture is reviewed against the requirements documented in Phase 1 and approved by the technical lead and project stakeholder.

### M2.2: Database Schema Designed and Documented

The complete PostgreSQL database schema is designed, including all tables, columns, data types, constraints, indexes, and relationships. Entity-relationship diagrams are produced. The schema supports all functional requirements identified in Phase 1, including the multi-level referral tree, transaction history, KYC progression, and investment tracking. Migration strategy and seeding approach are documented.

### M2.3: API Design Documented

All REST API endpoints are designed and documented using OpenAPI/Swagger specification. Each endpoint includes the HTTP method, path, request parameters, request body schema, response schema, authentication requirements, authorization requirements, error responses, and rate limiting rules. The API design is consistent, follows RESTful conventions, and supports all frontend and integration requirements.

### M2.4: Security Architecture Documented

The security architecture covers authentication flow (JWT + 2FA), authorization model (RBAC), data encryption (at rest and in transit), session management, rate limiting strategy, input validation approach, and audit logging. Security requirements from the Risk Analysis are mapped to specific technical implementations. The security architecture is reviewed against OWASP Top 10 vulnerabilities.

### M2.5: Folder Structure and Project Scaffolding Defined

The monorepo folder structure is defined, specifying the location of frontend code, backend API routes, shared libraries, configuration files, database migrations, tests, and documentation. Technology-specific configuration files (TypeScript, ESLint, Prettier, Docker, Prisma) are specified. A project scaffolding script or template is prepared for rapid project initialization.

**Deliverables:**
- All Phase 2 `.md` documentation files
- Database schema (Prisma schema file)
- OpenAPI/Swagger specification
- ERD diagrams
- Architecture decision records (ADRs)
- Stakeholder sign-off on the complete Phase 2 design

---

## 4. Phase 3 Milestones — Core Development

**Objective:** Implement all platform features as specified in the approved design documents. This is the longest phase, encompassing the bulk of the development effort.

### M3.1: Project Scaffolding

The monorepo is initialized with the defined folder structure, all configuration files, Docker setup (Dockerfile and docker-compose for local development), and CI/CD pipeline configuration. The development environment can be spun up with a single command (`docker-compose up`). All developers can run the project locally, run tests, and build production artifacts.

### M3.2: Database Setup and Migrations

PostgreSQL is configured, Prisma is integrated, and the initial database schema is deployed via migrations. Seed scripts populate the database with initial data (admin users, default investment plans, system settings, reference data for supported cryptocurrencies, and gift card brands). Database connection pooling is configured and tested.

### M3.3: Authentication System

Complete authentication system including user registration (with email verification via OTP), login/logout, JWT-based session management with access and refresh tokens, password reset flow (email with secure token), two-factor authentication setup and verification (TOTP via authenticator app), and account lockout after failed attempts. All authentication endpoints are tested at the unit and integration levels.

### M3.4: User Dashboard and Profile

Authenticated user-facing pages including the main dashboard (portfolio overview, recent transactions, quick actions), profile page (view and edit personal information), settings page (password change, language preference, notification preferences, 2FA management), and notification center. The dashboard displays demo and live wallet balances, active investments, and pending actions.

### M3.5: Wallet System

The wallet system manages user balances with separate demo and live wallets. Each wallet tracks available balance, pending balance (from processing deposits or maturing investments), and total balance. The wallet dashboard displays balance breakdowns, recent transactions with filters, and balance history charts. All balance modifications go through a centralized wallet service to ensure consistency and auditability.

### M3.6: Deposit System

Both deposit methods are fully implemented. Crypto deposits support BTC, ETH, and USDT with unique address generation per user per currency. A background process monitors the blockchain for incoming transactions and credits user wallets upon confirmation (with configurable confirmation thresholds). Gift card deposits allow users to upload card photos and enter card details, with submissions entering an admin verification queue. All deposits generate notifications and update wallet balances through the centralized wallet service.

### M3.7: Investment Plan System

The four investment plans (Basic, Silver, Gold, Platinum) are configurable through the admin panel. Users can browse plans, view terms and expected returns, select a plan, and fund it from their live wallet. Active investments are tracked with start date, maturity date, expected return amount, and status. Upon maturity, returns are automatically credited to the user's live wallet with appropriate notifications.

### M3.8: Withdrawal System

Users can initiate withdrawal requests from their available live wallet balance. The system displays the 21% withdrawal fee and net amount before confirmation. Withdrawal requests enter an admin approval queue. Upon admin approval, the withdrawal is processed and the transaction is recorded. Users can track withdrawal status through their transaction history. All withdrawals are processed through the centralized wallet service to prevent double-spending.

### M3.9: Referral System

The referral system implements a unique referral code/link per user, a binary tree structure for tracking referrals (left and right legs), direct referral commission calculation (10% of referred user's investment returns), and binary bonus calculation based on the weaker leg's volume. An admin-configurable commission structure allows adjustment of percentages and thresholds. The referral dashboard shows users their network, commission history, and earnings breakdown.

### M3.10: KYC System

Progressive KYC verification with multiple levels: Level 1 (basic information — email verified), Level 2 (government-issued ID upload), Level 3 (proof of address upload). Each level unlocks higher deposit and withdrawal limits. Users upload documents through a secure interface with clear instructions and requirements. Documents are stored on Cloudinary with private access. Admins review and approve/reject KYC submissions through a dedicated review queue with request and comparison views.

### M3.11: Admin Dashboard

A comprehensive admin dashboard providing: an overview panel (user count, active investments, pending withdrawals, platform balances), user management (search, view details, edit, suspend, activate), KYC review queue, deposit verification queue (gift cards), withdrawal approval queue, investment plan management (CRUD operations), referral and commission oversight, financial reports (deposits, withdrawals, commissions, platform balances), support ticket management, audit log viewer, and system settings configuration.

### M3.12: Email and Notification Systems

Transactional emails are implemented using Resend and React Email, covering: email verification OTP, password reset, 2FA setup, deposit confirmation, investment activation, investment maturity, withdrawal status updates, KYC status updates, and referral commission credits. In-app notifications are stored in the database and displayed in a real-time notification center on the user dashboard. Both email and in-app notification preferences are configurable by the user.

### M3.13: Public Pages

All public-facing pages are implemented with the red and black dark theme: landing page (hero section, features, plan highlights, CTA), about page (company information, team, mission), FAQ page (categorized questions and answers), contact page (contact form with optional support ticket creation), plans page (all four plans with details and comparison), privacy policy page, and terms of service page. All public pages support multi-language content.

### M3.14: Multi-Language Support

Internationalization (i18n) is implemented using next-intl or a similar library. The initial launch supports English with the infrastructure in place to add additional languages. Translation files are organized by locale and namespace. The language selection is available in the UI (header/footer), stored in the user's preferences, and applied via URL prefix or cookie. All user-facing strings (labels, messages, errors, emails) are externalized into translation files.

**Deliverables:**
- Complete, deployable application with all core features
- Docker configuration for production deployment
- Database migrations and seed scripts
- API documentation (auto-generated from code)
- Basic test coverage (unit tests for critical services)

---

## 5. Phase 4 Milestones — Testing & QA

**Objective:** Comprehensively test the platform, identify and fix all defects, optimize performance, and verify security.

### M4.1: Unit Test Suite (80%+ Coverage)

The unit test suite covers all backend services (investment calculations, commission logic, withdrawal processing, referral tree operations, KYC validation) and frontend utilities (validation functions, custom hooks, formatters) at the target coverage levels. All tests pass reliably with no flaky tests. Coverage reports are generated per module.

### M4.2: Integration Test Suite

All API endpoints are tested against a real database with comprehensive test cases covering valid, invalid, unauthorized, and edge-case requests. Database integration tests verify correct data persistence, relationship handling, and constraint enforcement. Redis integration tests verify caching behavior and session management.

### M4.3: E2E Test Suite (Critical Flows)

Playwright-based end-to-end tests cover all critical user flows: registration through email verification, login, deposit (crypto and gift card), investment plan selection and funding, investment maturity, withdrawal request and completion, referral link usage, and KYC submission and approval. All E2E tests pass reliably in the CI environment.

### M4.4: Security Audit

A comprehensive security audit is conducted covering: authentication and session management, authorization and access control, input validation and output encoding, file upload security, API security (rate limiting, JWT handling), and dependency vulnerability scanning (npm audit). Critical and high-severity findings are resolved before launch. Medium and low-severity findings are documented with remediation timelines.

### M4.5: Performance Testing and Optimization

Load testing is conducted at normal (1x), peak (3x), and stress levels. Performance benchmarks are established for key pages and API endpoints. Identified performance bottlenecks are resolved through query optimization, caching strategies, and code optimization. The platform meets the performance budget: page load under 2 seconds, API P95 under 500 ms.

### M4.6: Accessibility Audit

Automated accessibility testing (axe-core, Lighthouse) and manual testing (keyboard navigation, screen reader) are conducted across all user-facing pages. WCAG 2.1 AA compliance is verified. Critical accessibility issues are resolved before launch. The red and black dark theme is specifically audited for color contrast in all interactive states.

### M4.7: User Acceptance Testing (UAT)

The project stakeholder(s) perform user acceptance testing using the staging environment. All critical flows are tested from the user's perspective. Feedback is collected, prioritized, and addressed. UAT sign-off is required before the production launch is scheduled.

**Deliverables:**
- Test coverage reports (unit, integration, E2E)
- Security audit report with remediation status
- Performance benchmark report
- Accessibility audit report
- UAT sign-off document
- Bug fix changelog

---

## 6. Phase 5 Milestones — Deployment & Launch

**Objective:** Deploy the platform to production, verify all systems are operational, and execute the launch plan.

### M5.1: Production Environment Setup

The production server is provisioned and configured with: Docker and Docker Compose, the application containers (frontend, backend, workers), PostgreSQL with automated backups, Redis, SSL certificates (via Let's Encrypt/Traefik), Cloudflare CDN configuration, and monitoring/alerting setup. The production environment mirrors the staging environment as closely as possible to minimize deployment surprises.

### M5.2: Data Migration / Seed

Production database is initialized with migrations and seeded with: admin accounts, default investment plans (Basic, Silver, Gold, Platinum with correct tiers, durations, and return rates), system configuration settings, supported cryptocurrency definitions, gift card brand definitions, static page content (FAQ, privacy policy, terms of service), and email template configurations. No test data is present in the production database.

### M5.3: DNS and SSL Configuration

The production domain's DNS records are configured to point to the server (through Cloudflare for CDN and DDoS protection). SSL certificates are provisioned and verified. HTTP to HTTPS redirection is confirmed. Email delivery (SPF, DKIM, DMARC records) is configured for the production domain to ensure transactional emails are not flagged as spam.

### M5.4: Monitoring and Alerting Setup

Production monitoring is configured and verified: application error tracking (Sentry), uptime monitoring (UptimeRobot or equivalent), server resource monitoring (CPU, memory, disk), database monitoring (connection pool, slow queries, replication lag), and custom business metric alerts (failed logins, pending withdrawals, deposit volume anomalies). Alert routing is configured to notify the on-call team via email and/or messaging platform.

### M5.5: Soft Launch (Beta Users)

A limited soft launch with a small group of beta users (10–50) is conducted to validate the production environment under real usage. Beta users are selected from the stakeholder's network and are informed they are testing a beta platform. All feedback, issues, and usage patterns are documented. Critical issues discovered during soft launch are resolved before the full launch.

### M5.6: Full Launch

The platform is opened to the general public. The launch is accompanied by marketing activities as defined by the stakeholder. The development and operations team are on high alert for the first 48 hours, monitoring all systems and responding to issues immediately. A launch checklist is completed item by item to ensure nothing is missed.

**Deliverables:**
- Live production application at the production domain
- Verified DNS, SSL, and email configuration
- Active monitoring and alerting
- Soft launch feedback summary and resolutions
- Launch checklist (completed)

---

## 7. Phase 6 Milestones — Post-Launch & Iteration

**Objective:** Stabilize the platform, respond to user feedback, optimize performance, and plan future development.

### M6.1: Bug Fixes and Hotfixes (First 2 Weeks)

The first two weeks post-launch are dedicated to rapid bug fixing. Users report issues through the support system, and the development team triages and resolves them with high priority. A daily standup reviews new issues, progress on fixes, and deployment of hotfixes. A post-launch stability report is produced at the end of the two-week period summarizing all issues found and resolved.

### M6.2: User Feedback Collection and Analysis

Systematic collection and analysis of user feedback from support tickets, in-app feedback mechanisms, and direct communication. Feedback is categorized into bug reports, feature requests, and usability improvements. A prioritized backlog of improvements is created based on feedback frequency, business impact, and implementation effort.

### M6.3: Performance Monitoring and Optimization

Ongoing monitoring of platform performance under real-world load. Database query performance, API response times, page load times, and infrastructure resource utilization are tracked over time. Performance trends are analyzed weekly, and optimization work is scheduled as needed. The auto-scaling configuration is tuned based on observed traffic patterns.

### M6.4: Feature Roadmap Planning

Based on user feedback, business objectives, and the initial "Future Features" list (mobile app, social login, push notifications, additional payment methods, advanced analytics), a detailed feature roadmap is planned for the next development cycle. Each proposed feature is evaluated against business value, technical feasibility, and development effort before being scheduled.

---

## 8. Timeline Estimate

The following timeline estimates are based on a small development team (2–3 developers) working full-time on the project. Actual timelines may vary based on team size, experience, scope changes, and unforeseen challenges.

| Phase | Duration | Calendar Weeks | Notes |
|-------|----------|----------------|-------|
| Phase 1: Discovery & Documentation | 1 week | Week 1 | Current phase |
| Phase 2: Architecture & Technical Design | 1–2 weeks | Weeks 2–3 | Includes stakeholder review |
| Phase 3: Core Development | 8–12 weeks | Weeks 4–15 | Bulk of the effort |
| Phase 4: Testing & QA | 3–4 weeks | Weeks 16–19 | Overlaps with late Phase 3 |
| Phase 5: Deployment & Launch | 1–2 weeks | Weeks 20–21 | Includes soft launch |
| Phase 6: Post-Launch | Ongoing | Week 22+ | Continuous improvement |

**Total estimated time to launch: 14–21 weeks (approximately 3.5–5 months)**

The Phase 3 development timeline can be compressed with a larger team or extended if scope is added. Phase 4 testing overlaps with the later stages of Phase 3 (testing begins as features are completed rather than waiting for all features to be finished). A buffer of 1–2 weeks is built into the estimate to accommodate unforeseen delays.

---

## 9. Dependencies

The project phases have strict sequential dependencies that must be respected:

- **Phase 2 depends on Phase 1 approval:** Architecture and technical design cannot begin until all requirements are documented and approved. Starting design with incomplete requirements leads to rework and wasted effort.
- **Phase 3 depends on Phase 2 approval:** Development cannot begin until the database schema, API design, and security architecture are finalized. Code written against an unstable design will require significant refactoring.
- **Phase 4 depends on Phase 3 completion:** Comprehensive testing requires a feature-complete application. While some testing (unit tests) occurs during Phase 3, the full test suite requires all features to be implemented.
- **Phase 5 depends on Phase 4 sign-off:** Production deployment requires a stable, tested application. Launching with known critical defects damages the platform's reputation from the start.

Within Phase 3, individual milestones have internal dependencies: the authentication system (M3.3) must be complete before user-facing features (M3.4–M3.14) can be fully implemented. The wallet system (M3.5) must be in place before the deposit (M3.6), investment (M3.7), and withdrawal (M3.8) systems. These dependencies are reflected in the development sequencing.

---

## 10. Risk to Timeline

The following risks could delay the project timeline, along with mitigation strategies:

| Risk | Impact on Timeline | Mitigation |
|------|-------------------|------------|
| Scope creep during Phase 3 | +2–6 weeks | Strict change control process; new features go to backlog, not current sprint |
| Third-party service integration issues | +1–2 weeks | Spike investigations early in Phase 3; fallback strategies documented |
| Security audit findings requiring major changes | +1–3 weeks | Security-aware development from the start; regular security reviews during Phase 3 |
| Performance issues discovered in Phase 4 | +1–2 weeks | Performance testing during Phase 3 (not just Phase 4); query optimization as part of development |
| Stakeholder unavailability for reviews | +1–2 weeks per occurrence | Scheduled review windows; async review via document comments as fallback |
| Developer availability changes | +2–4 weeks | Cross-training and documentation reduce single-developer dependency; modular architecture allows parallel work |
| Gift card fraud detection complexity | +1–2 weeks | Start with manual verification; iterate on automation based on real patterns |
| Binary referral tree implementation complexity | +1–2 weeks | Invest in thorough design during Phase 2; prototype the tree structure early in Phase 3 |

The overall risk to the timeline is **medium**. The most likely delay scenario adds 2–4 weeks to the estimate, bringing the total to approximately 16–25 weeks. The least likely but most impactful scenario (multiple risks materializing simultaneously) could extend the timeline to 30+ weeks. Regular milestone reviews provide early visibility into timeline risks and allow proactive adjustment.