# Post-Cutover Smoke Checklist

Run this immediately after deployment and secret propagation.

## 1. Runtime Boot

Confirm:
- app loads
- login page renders
- no runtime env/config error appears

Minimum check:
- open `/login`
- sign in

## 2. Auth Flow

Confirm:
- session is created successfully
- protected routes load
- logout works

## 3. Merchant Workspace

Open the merchant workspace and confirm:
- relationships load
- deals load
- settlement tracker renders
- profit distribution panel renders
- no empty-state regression where data should exist

## 4. Settlement Lifecycle

Verify with a safe test record if available:
- create settlement
- approve settlement
- reject settlement
- reopened period appears correctly
- no duplicate reversal rows on retry

## 5. Ledger Integrity

Confirm:
- payout rejection preserves pool balance
- reinvest rejection restores prior pool balance
- withdrawal rejection restores prior pool balance
- reversal rows display correctly in capital ledger views

## 6. KPI Checks

Confirm:
- profit distribution totals are non-zero when settlement periods contain profit
- outstanding balances match approved settlements
- no `realized_pnl = null` deal collapses to zero when period data exists

## 7. Notifications / Related UX

Confirm:
- notifications still appear where expected
- settlement history updates after actions
- relevant tabs and overview panels refresh

## 8. Native/Web Asset Sanity

Confirm:
- latest web build is live
- Android asset sync reflects latest build if mobile is in scope
- iOS release build is regenerated on macOS if native release is in scope

## 9. Monitoring Window

Watch closely for the first deployment window:
- auth failures
- 401/403 spikes
- missing environment variables
- settlement mutation failures
- unexpected zero-profit KPI outputs

## 10. Rollback Trigger

Pause rollout if any of these happen:
- app cannot initialize auth
- settlement rejection creates incorrect pool balance
- KPI totals collapse unexpectedly
- deployment is still using old secrets
