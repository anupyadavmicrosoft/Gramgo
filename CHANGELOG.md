# GramGo Rural Mobility Platform - CHANGELOG

All notable changes and feature additions to the GramGo Rural Mobility Platform are documented in this file.

---

## [Unreleased] - 2026-07-07

### Added

#### 1. Referral System Foundation (Backend)
- **Database & Schemas**: Created modular schemas (`Referral`, `ReferralReward`, `ReferralTransaction`) in `/server/models/Referral.ts` utilizing robust Mongoose schemas with a high-durability in-memory fallback pattern to prevent runtime server crashes when MongoDB is offline.
- **Service Layer**: Implemented business logic inside `/server/services/referralService.ts`:
  - `getOrCreateReferral`: Retrieves or initializes a unique referral code suffix based on the user's name.
  - `registerReferral`: Automatically issues a signup bonus of ₹50 to the newly registered friend, and logs a pending ₹50 referrer reward.
  - `processRideCompletion`: Automatically upgrades referral status to "completed_first_ride" upon the referee's first completed transit trip and logs a ₹100 referrer first-ride reward.
  - `claimReward`: Transfers pending referral rewards directly into the user's Subsidy Wallet, updates the ledger, and updates reward status to `claimed`.
- **Controllers & API Router**: Created `/server/controllers/referralController.ts` and `/server/routes/referralRoutes.ts` with the following endpoints:
  - `GET /api/referrals/dashboard`: Fetches a unified package of the user's code, statistics, transaction history, and claims.
  - `POST /api/referrals/validate`: Validates potential signup codes with the referee's name displayed as safety feedback.
  - `POST /api/referrals/custom-code`: Enables customization of referral code suffixes (alphanumeric validation).
  - `POST /api/referrals/claim/:id`: Processes manual reward claims with wallet balance sync.
- **Ride Status Hooks**:
  - Automatically linked `ReferralService.processRideCompletion(passengerId)` to the Volunteer Driver's active ride-completion action block inside `/server.ts`.
  - Linked the completion hook into the Admin manual/offline status update route inside `/server.ts`.

#### 2. Referral Hub Dashboard (Frontend)
- **Modular Component**: Created `/src/components/ReferralDashboard.tsx`, featuring:
  - **Invite Banner**: Highly polished banner explaining rewards (₹50 signup, ₹50 referrer bonus, ₹100 first-ride completion).
  - **Stats Cards Grid**: Interactive display of total referred friends, pending/claimed balances, and total earnings.
  - **Referral Code Card**: Unique copy-to-clipboard functionality with active checkmark feedback, plus native Web Share API support with text falls-back to WhatsApp/SMS.
  - **Custom Suffix Input**: Allows players to customize suffixes (e.g. `KUMAR123`), verifying unique bounds instantly.
  - **Rewards & Transactions Ledger**: Chronological lists detailing invited neighbors, active statuses, and "Claim Reward" action triggers which feed directly into their Subsidy Wallet.
- **Hub Sidebar Integration**:
  - Added new "Refer & Earn Credits" sidebar buttons in both `PassengerHub.tsx` and `DriverHub.tsx` navigation.
  - Connected the `onRewardClaimed` dashboard callback to trigger instant `refreshUser()` profile syncs, meaning claimed money updates instantly across the navbar and header wallet indicators.
- **Onboarding Auto-populate**:
  - Updated `/src/components/Register.tsx` to listen for `?ref=...` query parameters, pre-populating code suffixes immediately.
  - Integrated dynamic validation feedback directly below the input field, showing verified referrers' names before the form is submitted.

### Changed
- **Registration Pipeline**: Expanded the `register` payload in `/src/context/AuthContext.tsx` and the backend `/api/auth/register` to support optional referral codes, cleanly connecting onboarded drivers and passengers to the invite network.
- **Payment Controls**: Embedded payment searching, status filters, date ranges, and custom receipts directly into `/src/components/PaymentHub.tsx`.
