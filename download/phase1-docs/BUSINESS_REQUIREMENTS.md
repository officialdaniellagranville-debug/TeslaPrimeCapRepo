# Business Requirements

## 1. Business Model Overview

InvestPro Platform operates as a managed investment service where users deposit funds into pre-defined investment plans and the platform handles all trading and investment activities on their behalf. The model eliminates the need for users to possess trading knowledge, monitor markets, or make investment decisions. Users select a plan that matches their capital availability and return expectations, deposit the required amount, and receive returns credited to their wallet upon plan maturity. The platform retains full discretion over how deposited funds are deployed across trading strategies, signal services, and other investment vehicles.

The platform generates revenue through a withdrawal fee structure rather than upfront charges or management fees. This aligns the platform's revenue with user success -- users must receive returns before a withdrawal occurs, and the fee is only applied when users attempt to move funds out of the ecosystem. This model incentivizes reinvestment and plan renewal, as users who compound their returns by reinvesting avoid withdrawal fees entirely. The referral program creates a viral growth loop by rewarding users who bring new participants, reducing customer acquisition costs and building a self-sustaining user acquisition channel.

The dual-mode architecture (Demo and Live) serves as both a user acquisition tool and a trust-building mechanism. Prospective users can experience the full platform functionality with simulated balances, observe how investments perform, test deposit and withdrawal flows, and evaluate the referral system before committing real funds. This reduces the psychological barrier to entry and increases conversion from visitor to funded user. The business model is designed for rapid geographic expansion, leveraging cryptocurrency and gift card deposits to reach users in regions underserved by traditional banking infrastructure.

## 2. Revenue Streams

### Primary Revenue: Withdrawal Fee

The platform's primary and currently only revenue stream is the 21% fee applied to all withdrawal requests from Live mode accounts. This fee is deducted at the point of withdrawal request -- the user enters the desired withdrawal amount, the system calculates and displays the 21% fee, the net amount is shown for confirmation, and only the net amount is disbursed to the user's designated receiving account or wallet. The 21% fee is allocated across the following operational cost categories:

| Fee Component | Allocation | Description |
|---------------|------------|-------------|
| Account Management | Portion of 21% | Ongoing portfolio management, account oversight, and customer support operations |
| Signal Fees | Portion of 21% | Fees paid to third-party trading signal providers whose strategies inform platform investment decisions |
| Insurance Policy | Portion of 21% | Coverage that provides a layer of protection for user deposits against defined adverse events |
| Investment Certificate | Portion of 21% | Cost of issuing investment certificates or documentation for each active plan |
| Value Added Tax (VAT) | Portion of 21% | Applicable taxes in jurisdictions where the platform has tax obligations |

The specific percentage allocation within the 21% total is an internal operational matter and does not need to be displayed to users. What users see is the total 21% fee deducted from their withdrawal amount at the time of request. The exact internal breakdown should be configurable by administrators through the system settings to accommodate changing cost structures.

### Secondary Revenue Opportunities (Future)

While Phase 1 relies solely on the withdrawal fee, future phases may introduce premium subscription tiers offering enhanced features such as priority withdrawal processing, advanced analytics, dedicated account managers, or reduced withdrawal fees. Additional payment method fees (such as processing charges for bank transfers or mobile money) may also be introduced as deposit methods expand. These are not in scope for Phase 1 and should not influence current system design beyond ensuring the fee calculation system is extensible.

## 3. Investment Plan Structure

The platform offers four investment tiers, each designed for a different investor profile and capital range. Plans are structured to reward larger deposits with longer durations and proportionally attractive returns. Users may hold multiple active plans simultaneously across different tiers, subject to the total investment not exceeding their available wallet balance. Each plan operates independently -- returns from one plan do not affect another, and plan maturity times are tracked individually.

| Attribute | Basic | Silver | Gold | Platinum |
|-----------|-------|--------|------|----------|
| Minimum Deposit | $200 | $5,000 | $10,000 | $50,000 |
| Maximum Deposit | $4,999 | $9,999 | $49,999 | $100,000 |
| Duration | 24 hours | 72 hours | 7 days | 14 days |
| Expected Daily Return | 0.5% | 0.5% | 0.5% | 0.5% |
| Total Expected Return | ~0.5% | ~1.5% | ~3.5% | ~7.0% |
| Multiple Active Plans | Yes | Yes | Yes | Yes |
| Referral Bonus Eligible | Yes | Yes | Yes | Yes |
| 24/7 Support | Yes | Yes | Yes | Yes |
| Priority Support | No | No | Yes | Yes |
| Dedicated Account Manager | No | No | No | Yes |
| KYC Level Required | Level 1 | Level 2 | Level 2 | Level 3 |

The expected daily return of 0.5% is an average figure based on the platform's trading strategy performance. Actual returns may vary and are not guaranteed. The total expected return column shows the cumulative return over the plan's full duration assuming the 0.5% daily rate holds steady. Returns are calculated on the invested principal and credited as a lump sum to the user's wallet upon plan maturity, not as daily increments.

KYC level requirements ensure that higher-value investments undergo proportionally stronger identity verification. Level 1 (email verified) is sufficient for Basic plans. Level 2 (government-issued ID verified) is required for Silver and Gold plans. Level 3 (ID plus proof of address verified) is required for Platinum plans. Users who attempt to select a plan without the required KYC level will be prompted to complete the necessary verification before proceeding. See [FUNCTIONAL_REQUIREMENTS](./FUNCTIONAL_REQUIREMENTS.md) Section 3 for the full KYC specification.

## 4. Referral System

### Direct Referral Commission

Every registered user receives a unique referral link and referral code upon account creation. When a new user registers using a referral link or enters a referral code during signup, the referring user becomes their "sponsor." The sponsor earns a 10% commission on every deposit made by their direct referral. This commission is calculated at the time of deposit and credited to the sponsor's wallet immediately. For example, if a direct referral deposits $1,000 into a plan, the sponsor receives $100 in commission credited to their wallet balance.

Direct referral commissions apply to all deposit types (cryptocurrency and gift card deposits) and across all investment plan tiers. There is no cap on the number of direct referrals a user can have, and there is no cap on total direct referral commission earnings. Commissions are tracked per-referral and aggregated in the sponsor's referral dashboard.

### Binary Bonus Structure

The binary bonus system is designed to reward team builders who develop active networks on both sides of their referral tree. Each user's referral network is structured as a binary tree with a "left leg" and a "right leg." New referrals are automatically placed in the next available position in the tree, filling left-to-right, top-to-bottom within the sponsor's tree structure.

**Qualification Requirements:** To be eligible for binary bonus payouts, a user must have a minimum of $200 in their own active investment pool (not total lifetime deposits, but currently active plan investments). This ensures that participants benefiting from the binary structure are themselves active investors on the platform.

**Calculation Method:** Binary bonuses are calculated on a weekly cycle. At the end of each week, the system compares the total volume (deposits made by downline members) on the left leg versus the right leg. The bonus is paid on the volume of the weaker leg. For example, if the left leg generated $5,000 in new deposits during the week and the right leg generated $3,000, the binary bonus is calculated on $3,000 (the weaker leg). The stronger leg's excess volume ($2,000 in this example) may carry forward to the following week depending on the platform's flush policy (configurable by administrators).

**Bonus Rate:** The binary bonus rate and any caps (such as a maximum weekly payout ceiling) are configurable system settings managed by administrators. Default rates should be set during initial configuration and documented in the system settings specification.

**Payout Timing:** Binary bonuses are calculated and credited to eligible users' wallets on a weekly basis, with the calculation cycle closing at a defined day and time (e.g., Sunday 23:59 UTC) and payouts processing within 24 hours of cycle close.

### Referral Tracking and Visibility

Users have access to a referral dashboard showing their total direct referrals, active referrals, binary tree visualization, commission history (both direct and binary), pending commissions, and total lifetime referral earnings. The binary tree visualization should display at least three levels deep and indicate which positions are filled versus open. See [FUNCTIONAL_REQUIREMENTS](./FUNCTIONAL_REQUIREMENTS.md) Section 8 for the complete referral system functional specification.

## 5. Deposit Methods

### Cryptocurrency Deposits

The platform accepts three cryptocurrencies for deposit: Bitcoin (BTC), Ethereum (ETH), and Tether (USDT). Each cryptocurrency has a dedicated deposit address generated per user (or per transaction for enhanced privacy). The deposit flow is as follows:

1. The user selects their preferred cryptocurrency from the deposit page.
2. The system displays a unique wallet address and a QR code encoding that address.
3. The user sends funds from their personal wallet or exchange to the displayed address.
4. The system monitors the blockchain for incoming transactions to the generated address.
5. Once the transaction receives the required number of confirmations (configurable, default: 3 for BTC, 12 for ETH, 10 for USDT), the deposit is marked as confirmed.
6. The cryptocurrency amount is converted to USD at the prevailing market rate using the platform's designated price oracle.
7. The USD equivalent is credited to the user's wallet balance.

Market rates are sourced from a reliable price API and updated at regular intervals (e.g., every 60 seconds). The rate displayed to the user at the time of deposit initiation is locked for a reasonable window (e.g., 15 minutes) to account for blockchain confirmation time. If the rate changes significantly between deposit initiation and confirmation, the rate at the time of blockchain confirmation is used, and the user is notified of the final credited amount.

**Minimum and Maximum Deposits:** Cryptocurrency deposits have a minimum USD equivalent of $10 and a maximum per-transaction limit that corresponds to the highest plan maximum ($100,000) or a separately configured deposit ceiling. Users depositing amounts that fall between plan tiers (e.g., $7,500) can still fund their wallet; the plan selection is a separate step from depositing.

### Gift Card Deposits

Gift card deposits allow users to fund their accounts by submitting retail gift cards for verification and redemption. This deposit method is designed for users who may not have access to cryptocurrency or traditional banking but do have access to retail gift cards purchased through legitimate channels.

**Accepted Brands:** The list of accepted gift card brands is configurable by administrators. Typical accepted brands include major retailers, digital marketplaces, and prepaid card networks. The current list should be displayed on the deposit page so users know which cards are accepted before uploading.

**Deposit Flow:**

1. The user selects "Gift Card" as the deposit method on the deposit page.
2. The user selects the gift card brand from the displayed list.
3. The user enters the card value (face value of the gift card).
4. The user uploads a clear photo or screenshot of the gift card showing the card number, PIN, and security code (if applicable).
5. The user submits the deposit request, which enters a "Pending Verification" state.
6. An administrator reviews the submitted gift card image in the admin dashboard's deposit verification queue.
7. The administrator verifies the card's validity (checks the card balance, confirms it is not previously redeemed, and validates the brand).
8. Upon successful verification, the administrator approves the deposit, and the card's face value (in USD) is credited to the user's wallet.
9. If verification fails (invalid card, already redeemed, counterfeit), the administrator rejects the deposit and provides a reason to the user via the notification system.

**Processing Time:** Gift card deposits are processed manually by the admin team. The expected turnaround time is 2-24 hours depending on admin team capacity and the volume of pending verifications. Users should see an estimated processing time on the deposit page.

**Fraud Prevention:** The system must track gift card submissions per user to detect patterns of fraudulent submissions. Administrators should have access to a user's gift card history (approved, rejected, pending) when reviewing new submissions. Repeated rejections may trigger a flag for enhanced scrutiny or temporary suspension of the gift card deposit method for that user.

## 6. Withdrawal Rules

### Fee Structure

All withdrawals from Live mode accounts are subject to a 21% fee. This fee is non-negotiable and applies uniformly across all users, plan tiers, and withdrawal amounts. The fee is deducted at the point of withdrawal request:

- **Gross Withdrawal Amount:** The amount the user requests to withdraw.
- **Fee (21%):** Calculated as gross amount multiplied by 0.21.
- **Net Withdrawal Amount:** Gross amount minus fee. This is the amount actually sent to the user.

For example, a user requesting a $1,000 withdrawal pays a $210 fee and receives $790. The system must clearly display the gross amount, fee amount, and net amount before the user confirms the withdrawal request.

### Withdrawal Limits

- **Minimum Withdrawal:** $10 (net of fees). A user must request a gross withdrawal of at least $12.66 to receive the $10 minimum after the 21% fee.
- **Maximum Withdrawal:** No per-transaction maximum, subject to the user's available wallet balance. However, administrators may set configurable daily, weekly, or monthly withdrawal limits per user tier or globally.

### Processing Workflow

1. The user submits a withdrawal request specifying the amount and the destination (cryptocurrency wallet address for crypto withdrawals, or bank account details if bank withdrawal is supported).
2. The system validates the request: sufficient available balance, minimum amount met, destination format is valid.
3. The 21% fee is calculated and displayed. The user confirms.
4. The requested amount is placed in a "pending withdrawal" state, deducted from the user's available balance.
5. The withdrawal enters the admin approval queue.
6. An administrator reviews the withdrawal request, checking for any flags (suspicious activity, KYC status, recent deposit patterns).
7. The administrator approves or rejects the withdrawal. If rejected, the full amount (no fee) is returned to the user's available balance with an explanation.
8. Upon approval, the withdrawal is marked as "Processing" and the actual fund transfer is initiated.
9. Once the transfer is confirmed on the blockchain (for crypto) or completed (for bank), the withdrawal is marked as "Completed."

### Processing Timeframe

- **Standard Processing:** 24-48 hours from request submission to completion.
- **Weekend Delays:** Withdrawals submitted on Friday evening through Sunday may experience additional processing delays due to limited admin availability and blockchain network congestion. Users should be informed of this during the withdrawal flow.
- **Priority Processing (Future):** Gold and Platinum tier investors may receive priority withdrawal processing in future phases, reducing the standard window.

### Fee Justification Display

When users view the withdrawal fee, the platform should display a brief, professional explanation of what the fee covers. This transparency builds trust and reduces support inquiries about the fee. The explanation should mention: account management, trading signal services, insurance coverage, investment certification, and applicable taxes (VAT). The specific language for this disclosure should be approved by compliance and legal counsel before launch.

## 7. Currency Strategy

### Primary and Secondary Currencies

USD serves as the platform's sole internal accounting currency. All wallet balances, investment plan amounts, referral commissions, and withdrawal calculations are performed and stored in USD. This simplifies the financial logic, eliminates currency conversion complexity in the core engine, and provides a consistent basis for reporting.

EUR and GBP are supported as display currencies for user-facing interfaces. Users can select their preferred display currency in their profile settings, and all monetary values (balances, plan amounts, returns) will be displayed in the selected currency at the current exchange rate. The underlying stored value remains in USD at all times; the conversion is purely presentational.

### Exchange Rate Management

Exchange rates for fiat currencies (USD/EUR, USD/GBP) and cryptocurrencies (BTC/USD, ETH/USD, USDT/USD) are sourced from a designated price API. Rates are cached and refreshed at configurable intervals (recommended: every 60 seconds for crypto, every 5 minutes for fiat). A fallback API source should be configured to ensure continuity if the primary source experiences downtime.

When a user deposits cryptocurrency, the USD conversion rate at the time of blockchain confirmation (not initiation) is used to determine the credited amount. When displaying balances in EUR or GBP, the rate at the time of page load is used, and the displayed amount should include a note that it is an approximation based on the current rate.

### Rate Configuration

Exchange rate sources, refresh intervals, and fallback providers are configurable by administrators through the system settings. This allows the platform to switch providers, adjust refresh frequency, or add new currency pairs without code changes. See [NON_FUNCTIONAL_REQUIREMENTS](./NON_FUNCTIONAL_REQUIREMENTS.md) for reliability requirements around external API dependencies.

## 8. Demo vs Live Mode

### Mode Overview

Every user account operates in two parallel modes: Demo and Live. Both modes share the same user interface, navigation, feature set, and visual design. The only differences are in the underlying data and the financial implications. Demo mode uses simulated balances and simulated transactions; Live mode uses real funds and real transactions.

### Mode Behavior

**Demo Mode:**
- Users receive a simulated starting balance (configurable, default: $10,000) upon account creation.
- Deposits in Demo mode simulate the deposit flow but do not involve real cryptocurrency or gift cards. The user selects a deposit method and enters an amount, and the simulated funds are credited immediately.
- Investment plans in Demo mode function identically to Live mode in terms of plan selection, duration, and return calculation, but the returns are simulated.
- Withdrawals in Demo mode simulate the withdrawal flow (including the 21% fee display) but no real funds are transferred. Simulated funds are returned to the Demo balance.
- Referral tracking works in Demo mode (referrals are real users), but commissions earned from referrals' Live deposits are only credited to the sponsor's Live wallet, not their Demo wallet.

**Live Mode:**
- All transactions involve real money. Deposits require actual cryptocurrency transfers or gift card submissions.
- Investment plan returns are calculated based on actual platform performance.
- Withdrawals transfer real funds to the user's designated receiving account.
- KYC verification is required for Live mode transactions. Users must complete the applicable KYC level before depositing or investing in Live mode.

### Mode Switching

Users can toggle between Demo and Live modes via a prominent switch in the navigation bar. The switch is accompanied by clear visual indicators showing which mode is active (e.g., a colored badge or label). When switching modes, the UI updates to show the corresponding wallet balance, transaction history, active investments, and dashboard data. There is no restriction on how often users can switch between modes.

### Data Separation

Demo and Live data are strictly separated at the database level. Demo transactions are stored with a mode flag that prevents them from ever being included in Live financial calculations, reporting, or admin withdrawal queues. This separation must be enforced at the data access layer to prevent any possibility of cross-contamination, even in the event of a bug in the application logic. Admin dashboards for financial operations (withdrawal approval, deposit verification) only display Live mode data.

## 9. Geographic Strategy

### Global Availability

The platform is designed for global deployment and is available to users in all countries and territories where the service is legally permissible. There are no geographic restrictions on registration or Demo mode usage. Users from any country can create an account, complete KYC, explore the platform in Demo mode, and browse public pages.

### Restricted Jurisdictions

Users from countries subject to OFAC (Office of Foreign Assets Control) sanctions are prohibited from using Live mode. The list of restricted jurisdictions is maintained as a configurable list in the system settings and should be regularly updated to reflect current sanctions. During registration and KYC verification, the platform checks the user's declared country of residence against this restricted list. Users from restricted jurisdictions can still use Demo mode but cannot deposit real funds, invest in Live mode, or request withdrawals.

### Compliance Approach

The platform implements a risk-based compliance approach. KYC verification (document upload, proof of address, selfie verification) serves as the primary tool for identity verification and sanctions screening. The KYC process includes checks against sanctions lists and politically exposed persons (PEP) databases through third-party verification services. Transaction monitoring rules flag unusual patterns (large deposits, rapid withdrawals, multiple accounts from the same IP) for administrative review. The platform reserves the right to suspend accounts and freeze funds pending investigation of suspicious activity.

Future phases may include integration with additional compliance tools, automated transaction monitoring systems, and regulatory reporting capabilities as the platform expands into jurisdictions with more stringent financial services requirements.

## 10. Language Strategy

### Initial Language Support

English is the default and primary language for all platform interfaces, documentation, and communications. The platform's initial launch will include English as the fully polished language with all strings translated and verified. Additional languages will be added based on market analysis and user demand data collected during the initial launch period.

### Internationalization Framework

The platform uses a standard i18n (internationalization) framework built on a JSON-based translation file structure. All user-facing strings in the application are externalized into locale files, with no hardcoded text in component code. The framework supports:

- **String Interpolation:** Dynamic values (names, amounts, dates) are injected into translated strings using parameterized placeholders.
- **Pluralization:** Language-specific pluralization rules are handled by the i18n library to correctly display singular and plural forms.
- **Date and Number Formatting:** Locale-specific formatting for dates (e.g., MM/DD/YYYY vs DD/MM/YYYY), currencies (symbol placement, decimal separators), and large numbers (thousand separators).
- **RTL Support:** The framework and CSS architecture support right-to-left (RTL) languages (Arabic, Hebrew, Farsi) through automatic layout mirroring. See [NON_FUNCTIONAL_REQUIREMENTS](./NON_FUNCTIONAL_REQUIREMENTS.md) Section 8 for RTL specifications.

### Translation Approach

Translations are managed through a combination of professional translation services for high-priority languages and community-contributed translations for secondary languages. The translation workflow is:

1. English source strings are extracted from the codebase into JSON locale files.
2. Professional translators produce verified translations for priority languages.
3. Translations are reviewed and integrated into the locale files.
4. The platform's language selector allows users to choose from available languages, with the selection persisted in their profile preferences.
5. Untranslated strings fall back to English, ensuring no broken or missing text in the interface.

### Language Detection

The platform detects the user's preferred language from their browser's `Accept-Language` header on first visit and automatically sets the interface language if a matching translation is available. Users can override this at any time through the language selector in their profile settings or in the footer of public pages.

## 11. Partnership Model

### Payment Processors

Cryptocurrency deposit and withdrawal processing is handled through the platform's own wallet infrastructure, with blockchain transactions executed directly. No third-party payment processor is required for basic crypto operations. However, the platform may integrate with payment gateway providers in future phases to support additional deposit methods such as bank transfers, credit/debit cards, and mobile money. The system architecture should accommodate these integrations without significant refactoring.

### Liquidity and Trading

The platform's investment activities (managing deposited funds through trading strategies) are handled internally. Details of the specific trading strategies, liquidity providers, and execution venues are operational concerns that do not affect the platform's user-facing architecture. The platform's claimed average daily return of 0.5% is based on these internal strategies and is presented to users as the expected return rate for investment plans.

### KYC Verification Services

Third-party KYC verification services may be integrated to enhance the identity verification process. These services can perform document authentication, facial matching (selfie to ID photo comparison), sanctions screening, and PEP checks. The platform's KYC workflow is designed to function with or without third-party service integration -- in the absence of a third-party service, administrators perform manual verification. When a third-party service is integrated, it provides automated preliminary verification, with administrators reviewing flagged cases and edge cases. The selection and integration of a KYC service provider is an operational decision that should be made before launch based on cost, coverage, and compliance requirements.

### Email and Communication

Transaction and marketing emails are delivered through Resend, with email templates built using React Email. This combination provides a developer-friendly workflow for creating, testing, and iterating on email templates while leveraging Resend's delivery infrastructure for reliable inbox placement. No additional email service partnerships are required for Phase 1.

## 12. Financial Risk Disclosure

### Required Disclaimers

The platform must present clear, prominent risk disclosures to all users before they deposit funds or activate an investment plan in Live mode. These disclosures serve both a compliance function (meeting regulatory requirements in many jurisdictions) and a trust-building function (demonstrating transparency about the nature of the investment). At minimum, the following disclaimers must be displayed:

**Investment Risk:** The platform's claimed average daily return of 0.5% is a historical average based on past trading performance and is not a guarantee of future returns. Actual returns may be higher or lower than the stated average. Users may lose some or all of their invested principal. Past performance is not indicative of future results.

**Withdrawal Fee Disclosure:** All withdrawals from Live mode accounts are subject to a 21% fee. This fee is non-refundable and applies regardless of the withdrawal amount or the user's investment outcomes. Users should factor this fee into their return expectations and withdrawal planning.

**Not Financial Advice:** The platform does not provide personalized financial advice. The investment plans described are managed products, and users should not interpret any information on the platform as a recommendation to invest. Users are encouraged to consult with a qualified financial advisor before making investment decisions.

**Regulatory Status:** The platform's regulatory status varies by jurisdiction. The platform may not be registered as a securities broker-dealer, investment adviser, or financial institution in all jurisdictions where it operates. Users are responsible for understanding the regulatory implications of using the platform in their country of residence.

### User Acknowledgment

Before making their first Live mode deposit, users must explicitly acknowledge that they have read, understood, and accepted the risk disclosures. This acknowledgment is captured as a timestamped record in the user's account and cannot be bypassed. The acknowledgment must be repeated if the risk disclosure text is materially updated, requiring users to re-accept the updated terms before their next deposit.

### Ongoing Disclosure

Risk disclosures should be accessible from the user dashboard (linked in the footer or account settings) and from relevant pages (investment plan selection, deposit page, withdrawal page). The platform should also include a brief risk notice in the footer of all pages, with a link to the full disclosure document.