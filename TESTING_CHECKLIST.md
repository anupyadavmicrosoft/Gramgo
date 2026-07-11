# GramGo Rural Mobility Platform - TESTING CHECKLIST

This checklist provides a structured guide to thoroughly test the newly integrated **Referral System Foundation** and **Payment Hub enhancements** in the GramGo Rural Mobility Platform.

---

## 📋 1. Registration & Referral Validation Testing

### Test Case 1.1: Automatic Referral Link Pre-population
- [ ] Open the application and navigate to `/register?ref=SHERPUR50`.
- [ ] Verify that the **Referral Code** field is automatically pre-populated with `"SHERPUR50"`.
- [ ] Verify that an inline checkmark or loading spinner triggers immediately to validate the code.

### Test Case 1.2: Manual Referral Code Validation
- [ ] Navigate to `/register`.
- [ ] Enter an invalid code (e.g., `FAKECODE`). Click **Verify Code**.
- [ ] Verify that a red error alert appears: `"This referral code is invalid or expired."`.
- [ ] Clear the field and enter a valid code of an existing user. Click **Verify Code**.
- [ ] Verify that a green checkmark appears with the message: `"Valid code from [Referrer Name]. You will receive a ₹50 credit bonus!"`.

### Test Case 1.3: Registration with Valid Code
- [ ] Fill out the remaining passenger details in the form with a validated referral code.
- [ ] Submit the form to register.
- [ ] Verify successful redirection to `/passenger`.
- [ ] Open **My Subsidy Wallet** (or check balance).
- [ ] Verify that the new user's wallet has been credited with the **₹50 Signup Bonus**.

---

## 📋 2. Referral Dashboard & Statistics Testing

### Test Case 2.1: Referral Stats & Ledger Initialization
- [ ] Log in as an existing user.
- [ ] Navigate to the new **Refer & Earn Credits** tab in the sidebar.
- [ ] Verify that the custom **Invite Banner** renders beautifully with the reward descriptions.
- [ ] Verify that the **Total Invited**, **Pending Rewards**, **Claimed Rewards**, and **Total Earned** cards display accurate data (defaults to 0 for new users).

### Test Case 2.2: Copying & Sharing Code Suffixes
- [ ] In the **Your Unique Referral Code** card, click the Copy button.
- [ ] Verify that the icon switches to a checkmark for 2 seconds and copies the code to the clipboard.
- [ ] Click the **Share** button.
- [ ] Verify that the native Share dialog triggers (on supported devices) or redirects to a pre-filled WhatsApp/SMS text containing the referral registration link.

### Test Case 2.3: Customizing Code Suffix
- [ ] In the Referral Dashboard, click **Customize Your Referral Code suffix**.
- [ ] Input a custom suffix (e.g., `PILOT99`). Click **Update**.
- [ ] Verify that a green success banner appears: `"Your referral code has been updated successfully!"`.
- [ ] Verify that the code card now displays the newly updated code.
- [ ] Input special characters (e.g., `MY@CODE`). Verify that invalid characters are automatically stripped or show validation errors.

---

## 📋 3. Reward Triggering & Wallet Claims Testing

### Test Case 3.1: Triggering Ride Completion Reward
- [ ] Register a passenger using a referral code.
- [ ] Request an emergency ride and have a driver accept it.
- [ ] Transition the ride status to **Completed** (via the driver dashboard OR the admin manual override hub).
- [ ] Log back in as the **Referrer** (the user whose code was used).
- [ ] Navigate to the **Refer & Earn Credits** dashboard.
- [ ] Verify that a new reward row appears in the ledger with the description `"First-Ride Completion Bonus"` and status `"pending"`.
- [ ] Verify that the **Pending Rewards** statistic has increased by **₹100**.

### Test Case 3.2: Claiming Rewards
- [ ] As the Referrer, click the **Claim** button on a pending reward row.
- [ ] Verify that the button shows a loading spinner during validation.
- [ ] Verify that the row status switches to `"claimed"` with a success alert.
- [ ] Check the navbar balance or **My Subsidy Wallet** tab.
- [ ] Verify that the wallet balance has increased by the claimed amount immediately without requiring a page reload.

---

## 📋 4. Payment History & Filtering Verification

### Test Case 4.1: Live Text Search
- [ ] Log in as an Admin. Navigate to the **Payment History** section.
- [ ] Type a transaction ID, user name, or driver name into the search bar.
- [ ] Verify that the payment list filters dynamically in real-time.

### Test Case 4.2: Multivariable Filters
- [ ] Select a specific status filter (e.g., `success`, `failed`, `pending`).
- [ ] Select a date range.
- [ ] Verify that the listed ledger matches the intersections of all selected parameters.
- [ ] Click **Clear Filters** and verify the full list restores immediately.

---

## 📋 5. WhatsApp OTP Verification Testing

### Test Case 5.1: Dynamic WhatsApp OTP Login (No Password)
- [ ] Go to the `/login` page.
- [ ] Click on the **WhatsApp OTP** login tab.
- [ ] Enter a registered demo phone number (e.g., `9876543210`). Click **Send OTP via WhatsApp**.
- [ ] Verify that the simulated OTP code box renders with a secure random 6-digit code.
- [ ] Verify that the **Resend Code** link is disabled with a 30s countdown timer running.
- [ ] Enter the incorrect OTP code. Click **Verify & Sign In**.
- [ ] Verify that a red error alert appears, informing you of the invalid attempt and remaining attempts left.
- [ ] Enter 3 incorrect OTPs in a row.
- [ ] Verify that on the 3rd fail, the OTP is invalidated with the alert: `"Too many failed attempts. This OTP has been invalidated. Please generate a new one."`
- [ ] Request a new OTP, wait 5 minutes (or simulate time passage), and verify that entering it returns `"OTP has expired"`.
- [ ] Request another new OTP, input the correct code (or debug fallback `"123456"`), and click **Verify & Sign In**.
- [ ] Verify that you are instantly and securely logged in and redirected to your primary dashboard.

### Test Case 5.2: Verified Onboarding / User Registration OTP
- [ ] Navigate to `/register`.
- [ ] Enter user details (name, village, password, etc.).
- [ ] Enter a mobile number.
- [ ] Verify that the **Create Account** submit button remains blocked / returns an error if clicked before verifying.
- [ ] Click the **Verify** button next to the Phone input field.
- [ ] Verify that the OTP input field, countdown timer, and simulated code badge display beautifully.
- [ ] Click **Change** to modify the number, and verify that the input field unlocks and clears verification states.
- [ ] Re-enter the number, click **Verify**, type the correct 6-digit code, and click **Verify OTP**.
- [ ] Verify that a green check badge `"Verified"` appears, and the input locks to prevent modification.
- [ ] Click **Create Account**.
- [ ] Verify successful account creation, registration database mapping, and redirection.

### Test Case 5.3: WhatsApp OTP Forgot Password / Password Reset
- [ ] Navigate to `/forgot-password`.
- [ ] Enter a registered user's phone or email. Click **Request OTP Code**.
- [ ] Verify that a simulated recovery code banner appears on Step 2.
- [ ] Input an incorrect code. Verify that attempt limits and decrement messages trigger cleanly.
- [ ] Input 3 incorrect recovery codes. Verify that the system invalidates the OTP block and rejects further entry until a new OTP is requested.
- [ ] Request a new OTP, enter the correct code, enter a new password (min 6 chars), and click **Reset Password & Sign In**.
- [ ] Verify the green "Success" screen appears, and that you can now successfully log in with the new password.

