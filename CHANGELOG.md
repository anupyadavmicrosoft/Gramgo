# GramGo Rural Mobility Platform - CHANGELOG

All notable changes and feature additions to the GramGo Rural Mobility Platform are documented in this file.

---

## [Unreleased] - 2026-07-11

### Added

#### 1. WhatsApp OTP Verification Architecture (Backend)
- **Database & Schemas**: Created a modular `/server/models/WhatsAppOtp.ts` model. Implemented a robust `WhatsAppOtpDb` repository mapping to a Mongoose `WhatsAppOtp` schema with a thread-safe, high-durability in-memory fallback store to ensure seamless operation even when MongoDB is offline.
- **Verification Attempt Limit Logic**: Implemented strict anti-brute-force controls: tracks incorrect attempts and automatically invalidates/deletes the OTP record upon the 3rd failed attempt.
- **OTP Expiry Logic**: Set verification codes to automatically expire after 5 minutes of creation.
- **Service & Routes Integration**: Added robust Express API routes inside `/server.ts`:
  - `POST /api/auth/otp/send`: Generates a secure, random 6-digit verification code, wipes previous OTP payloads of the same type for that number, saves the record, and dispatches the code using `WhatsAppService.sendTemplateTrigger`.
  - `POST /api/auth/otp/verify`: Verifies code accuracy. If `type === "login"`, it also automatically retrieves the user, signs a secure JWT session token, and signs the user in instantly in a single click.
  - Upgraded `POST /api/auth/register` to support optional/mandatory verification OTP inline checking during registration, preventing front-run spam registrations.
  - Transitioned `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` from mock logic to dynamic, real database-backed WhatsApp OTP verification with full attempt tracking.

#### 2. Segmented WhatsApp OTP Authentication Interfaces (Frontend)
- **Interactive Tabbed Login Screen** (`/src/components/Login.tsx`):
  - Overhauled the login experience with an elegant, modern segmented control tab bar to choose between **Standard Password** and **Secure WhatsApp OTP** login.
  - Fully responsive layout featuring inline loaders, custom simulation alert boxes containing `otpSimulated` codes, and error notifications.
  - Integrated active countdown clocks for Resend OTP (30s delay) using React hooks and refs.
- **Verified Onboarding / Registration** (`/src/components/Register.tsx`):
  - Created an inline phone verification component embedded directly into the onboarding form.
  - Automatically manages interactive state progression ("Verify", "Change", "Verified" with a green check badge).
  - Enforces OTP matching before the "Create Account" button can be successfully submitted, ensuring 100% verified mobile numbers.
- **Password Recovery Enhancement** (`/src/components/ForgotPassword.tsx`):
  - Connected the password recovery workflow to show dynamic simulated alert banners for generated codes.
  - Integrated with the backend's database-backed OTP validation for secure credential resetting.
- **Auth Context Expansion** (`/src/context/AuthContext.tsx`):
  - Added the `saveAuthSession(token, user)` capability to enable seamless login handshakes from standard or custom OTP verification controllers.

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
