# Settlement Rejection Implementation — Ledger Compatibility Audit Report

**Date:** 2026-04-04
**Implementation Status:** IMPLEMENTED but INCOMPLETE
**TypeScript Compilation:** ✅ PASS
**Runtime Testing:** ⚠️ BLOCKED — Ledger consumers not updated

---

## Executive Summary

The settlement rejection fixes (settlement_id linkage + ledger reversal creation) have been implemented and pass TypeScript validation. However, **three critical ledger consumer files do not handle the new 'reversal' entry type**, making runtime testing impossible without fixing them first.

**Blocking Issues:**
1. `useBalanceLedger.ts` — Reversal entries are silently skipped, breaking balance calculations
2. `CapitalPoolPanel.tsx` — Reversal entries are mislabeled as "Withdrawn by Partner"
3. `useDealCapital.ts` — CapitalEntry type doesn't include 'reversal'

---

## Critical Findings

### ISSUE #1: useBalanceLedger.ts — Reversal Entries Not Processed

**Severity:** 🔴 CRITICAL
**File:** `C:\Data\vanilla-supabase-vault\src\hooks\useBalanceLedger.ts`
**Lines:** 6, 67, 88-108

**Problem:**

The `BalanceEntry` type union (line 6) does not include `'reversal'`:
```typescript
type: 'capital_in' | 'capital_out' | 'reinvest' | 'payout' | 'withdrawal';
```

When `deal_capital_ledger` entries are processed (line 67), reversal entries with `type === 'reversal'` fail the type cast:
```typescript
type: le.type as BalanceEntry['type']  // ← 'reversal' not in union
```

Even if bypassed with `as any`, the switch statement (lines 88-108) has **NO case for 'reversal'**:

```typescript
switch (e.type) {
  case 'capital_in': ... break;
  case 'capital_out': ... break;
  case 'reinvest': ... break;
  case 'payout': ... break;
  case 'withdrawal': ... break;
  // ❌ NO CASE FOR 'reversal' — silently ignored!
}
```

**Impact:**
- ❌ Reversal entries are SILENTLY SKIPPED (no error thrown)
- ❌ Running balance calculation is INCORRECT after reversals
- ❌ BalanceSummary totals do not reflect reversals

**Example Scenario:**
```
Entry 1: {type: 'withdrawal', amount: 100, running_balance: -100}
Entry 2: {type: 'reversal', amount: -100}      ← SILENTLY IGNORED
Final running_balance: -100                      (should be 0)
```

**Fix Required:**
1. Add `'reversal'` to BalanceEntry type union (line 6)
2. Add `case 'reversal'` in switch statement (lines 88-108)
3. **Semantic Question:** Should reversals affect running balance at all?
   - **Answer:** No. Reversals are deal-specific ledger corrections, not relationship balance transactions.
   - **Recommendation:** Filter out reversals when querying (add `.not('type', 'eq', 'reversal')` to query)

---

### ISSUE #2: CapitalPoolPanel.tsx — Reversal Entries Mislabeled & Miscolored

**Severity:** 🔴 CRITICAL
**File:** `C:\Data\vanilla-supabase-vault\src\features\merchants\components\CapitalPoolPanel.tsx`
**Lines:** 52-53, 103-104

**Problem:**

TypeIcon and TypeLabel functions have hardcoded logic with no `'reversal'` case:

```typescript
const typeIcon = (type: string) =>
  type === 'reinvest' ? '🔄' :
  type === 'payout' ? '💰' :
  '📤';  // ← FALLBACK: shows as withdrawal icon

const typeLabel = (type: string) =>
  type === 'reinvest' ? t('reinvestedToPool') :
  type === 'payout' ? t('paidOutToPartner') :
  t('withdrawnByPartner');  // ← FALLBACK: shows as withdrawal label
```

When a reversal entry is displayed, it appears as:
- **Icon:** 📤 (withdrawal icon—INCORRECT)
- **Label:** "Withdrawn by Partner" (INCORRECT)
- **Color:** `var(--bad)` red (INCORRECT for compensation entry)
- **Amount:** `+` + negative_number → `"+-100"` (CONFUSING)

**Impact:**
- ❌ Users see reversals as "Withdrawn by Partner" (wrong operation type)
- ❌ Reversal entries are colored red instead of neutral
- ❌ Amount display is ambiguous (`+-100`)
- ❌ Users cannot distinguish reversals from actual withdrawals

**Example UI Output (WRONG):**
```
| Type                  | Amount    | Note                        | Pool Balance | Date       |
|─────────────────────--|───────────│─────────────────────────────│──────────────│────────────│
| 💰 Payout to Partner  | +100      | Payout for settlement       | 900          | 2026-04-04 |
| 📤 Withdrawn by Prt   | +-100     | Reversal of rejected...     | 1000         | 2026-04-04 |
                                                                    ↑ correct pool
                                                         ↓ but labeled wrong
```

**Fix Required:**
1. Add `'reversal'` case to `typeIcon()` (line 52):
   ```typescript
   type === 'reversal' ? '↩️' : '📤'
   ```
2. Add `'reversal'` case to `typeLabel()` (line 53):
   ```typescript
   type === 'reversal' ? t('reversedSettlement') : t('withdrawnByPartner')
   ```
3. Add `'reversal'` case to color logic (line 103):
   ```typescript
   color: e.type === 'reversal' ? 'var(--info)' : (e.type === 'withdrawal' ? 'var(--bad)' : 'var(--good)')
   ```
4. Fix amount display (line 104) to handle negatives correctly:
   ```typescript
   {e.type === 'reversal' ? '↩️ ' : (e.type === 'withdrawal' ? '−' : '+')}{fmtU(Math.abs(e.amount))}
   ```

---

### ISSUE #3: CapitalEntry Type Does Not Include 'reversal'

**Severity:** 🟡 MEDIUM (TypeScript type safety)
**File:** `C:\Data\vanilla-supabase-vault\src\hooks\useDealCapital.ts`
**Lines:** 5-9

**Problem:**

```typescript
export interface CapitalEntry {
  id: string;
  deal_id: string;
  relationship_id: string;
  type: 'reinvest' | 'withdrawal' | 'payout';  // ← Missing 'reversal'
  amount: number;
  currency: string;
  period_id: string | null;
  initiated_by: string;
  note: string | null;
  pool_balance_after: number;
  created_at: string;
}
```

When ledger entries are cast to `CapitalEntry[]` (line 41), reversal entries violate the type contract:
```typescript
const ledger = (data || []) as unknown as CapitalEntry[];  // ← unsafe cast
```

The `as unknown as` bypasses TypeScript validation, allowing reversals into an array that claims to only contain 'reinvest' | 'withdrawal' | 'payout'.

**Impact:**
- ⚠️ Type safety is bypassed
- ⚠️ CapitalPoolPanel (which uses `capital.ledger`) will crash if typeIcon/typeLabel don't handle 'reversal'
- ⚠️ Future code may assume no 'reversal' type and break

**Fix Required:**
```typescript
type: 'reinvest' | 'withdrawal' | 'payout' | 'reversal';
```

---

## Low-Risk Findings

### ✅ useProfitDistribution.ts — COMPATIBLE

**File:** `C:\Data\vanilla-supabase-vault\src\hooks\useProfitDistribution.ts`
**Lines:** 73-82

This hook only reads `pool_balance_after` from the latest ledger entry:
```typescript
async function getDealPoolBalance(dealId: string): Promise<number> {
  const { data } = await supabase
    .from('deal_capital_ledger')
    .select('pool_balance_after')  // ← doesn't care about type
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(1);
  return data ? Number((data as any).pool_balance_after) : 0;
}
```

**Status:** ✅ Works correctly with reversals (reversal entries have correct `pool_balance_after`)

---

### ✅ useSettlements.ts (new reversal logic) — COMPATIBLE

**File:** `C:\Data\vanilla-supabase-vault\src\hooks\useSettlements.ts`
**Lines:** 136-178

This hook **creates** reversals but does not read them back:
```typescript
const { data: ledgerEntries } = await supabase
  .from('deal_capital_ledger')
  .select('*')
  .eq('period_id', input.period_id)
  .in('type', ['payout', 'reinvest', 'withdrawal']);  // ← excludes 'reversal'
```

**Status:** ✅ Correctly filters to avoid creating reversals of reversals

---

## Test Matrix Status

**Current Status:** ⚠️ **BLOCKED** — Cannot run without fixing ledger consumers

### Path 1: addTrade(settleImmediately=true) → rejection
**Expected behavior:**
- Settlement record created with `settlement_id` linkage
- Period marked as `settled`
- No ledger entry yet (settlement still pending)
- On rejection: period reopened, no reversal needed

**Status:** ❌ CANNOT TEST
- settlement_id linkage untested
- period reopening untested

### Path 2: usePayoutProfit() → rejection
**Expected behavior:**
- Payout ledger entry created: `{type: 'payout', amount: 100, pool_balance_after: 900}`
- Settlement record created
- On rejection: reversal entry created: `{type: 'reversal', amount: -100, pool_balance_after: 1000}`
- Period reopened

**Status:** ❌ CANNOT TEST
- Ledger reversal untested
- **BLOCKING:** CapitalPoolPanel will crash displaying reversal

### Path 3: useReinvestProfit() → rejection
**Expected behavior:**
- Reinvest ledger entry created: `{type: 'reinvest', amount: 200, pool_balance_after: 1100}`
- Period marked settled
- On rejection: reversal entry created: `{type: 'reversal', amount: -200, pool_balance_after: 900}`

**Status:** ❌ CANNOT TEST
- **BLOCKING:** CapitalPoolPanel will crash displaying reversal

### Path 4: useWithdrawFromPool() → rejection
**Expected behavior:**
- Withdrawal ledger entry created: `{type: 'withdrawal', amount: 50, pool_balance_after: 850}`
- Settlement record created
- On rejection: reversal entry created: `{type: 'reversal', amount: -50, pool_balance_after: 900}`

**Status:** ❌ CANNOT TEST
- **BLOCKING:** CapitalPoolPanel will crash displaying reversal
- **BLOCKING:** useBalanceLedger silently ignores reversal, breaks balance

---

## Ledger Balance Integrity Check

**Pool Balance Calculation After Reversal:**

For a payout reversal:
```
Original: {type: 'payout', amount: 100, pool_balance_after: 900}
↓
Reversal: {type: 'reversal', amount: -100, pool_balance_after: 1000}
                              ↑ restored to pre-payout state ✓
```

**Formula used in useApproveSettlement():**
```typescript
if ((entry as any).type === 'payout') {
  newPoolBalance = (entry as any).pool_balance_after + (entry as any).amount;
  // 900 + 100 = 1000 ✓
}
```

**Validation:** ✅ CORRECT

For a reinvest reversal:
```
Original: {type: 'reinvest', amount: 200, pool_balance_after: 1100}
↓
Reversal: {type: 'reversal', amount: -200, pool_balance_after: 900}
                              ↑ removed reinvestment ✓
```

**Formula used:**
```typescript
if ((entry as any).type === 'reinvest') {
  newPoolBalance = (entry as any).pool_balance_after - (entry as any).amount;
  // 1100 - 200 = 900 ✓
}
```

**Validation:** ✅ CORRECT

---

## Required Fixes (Ordered by Criticality)

### MUST FIX BEFORE TESTING:

**1. src/hooks/useDealCapital.ts — Add 'reversal' to type**
```typescript
// Line 9: Change from
type: 'reinvest' | 'withdrawal' | 'payout';

// To:
type: 'reinvest' | 'withdrawal' | 'payout' | 'reversal';
```

**2. src/features/merchants/components/CapitalPoolPanel.tsx — Handle 'reversal' display**
```typescript
// Line 52: Change from
const typeIcon = (type: string) => type === 'reinvest' ? '🔄' : type === 'payout' ? '💰' : '📤';

// To:
const typeIcon = (type: string) =>
  type === 'reinvest' ? '🔄' :
  type === 'payout' ? '💰' :
  type === 'reversal' ? '↩️' :
  '📤';

// Line 53: Change from
const typeLabel = (type: string) => type === 'reinvest' ? t('reinvestedToPool') : type === 'payout' ? t('paidOutToPartner') : t('withdrawnByPartner');

// To:
const typeLabel = (type: string) =>
  type === 'reinvest' ? t('reinvestedToPool') :
  type === 'payout' ? t('paidOutToPartner') :
  type === 'reversal' ? t('reversedSettlement') :
  t('withdrawnByPartner');

// Line 103: Change from
style={{ color: e.type === 'withdrawal' ? 'var(--bad)' : 'var(--good)' }}

// To:
style={{ color: e.type === 'reversal' ? 'var(--info)' : (e.type === 'withdrawal' ? 'var(--bad)' : 'var(--good)') }}

// Line 104: Change from
{e.type === 'withdrawal' ? '−' : '+'}{fmtU(e.amount)}

// To:
{e.type === 'reversal' ? '↩️ ' : (e.type === 'withdrawal' ? '−' : '+')}{fmtU(Math.abs(e.amount))}
```

**3. src/hooks/useBalanceLedger.ts — Handle 'reversal' type**

Option A (RECOMMENDED): Filter out reversals since they're deal-specific:
```typescript
// Line 34-38: Change from
supabase
  .from('deal_capital_ledger')
  .select('*')
  .eq('relationship_id', relationshipId)
  .order('created_at', { ascending: true })

// To:
supabase
  .from('deal_capital_ledger')
  .select('*')
  .eq('relationship_id', relationshipId)
  .neq('type', 'reversal')  // ← Exclude reversals
  .order('created_at', { ascending: true })
```

Option B (If reversals should appear in balance): Add to type & switch:
```typescript
// Line 6: Add 'reversal' to union
type: 'capital_in' | 'capital_out' | 'reinvest' | 'payout' | 'withdrawal' | 'reversal';

// Line 88-108: Add case (no-op, since reversals don't affect relationship balance)
case 'reversal':
  // Reversals are deal-specific corrections, not relationship balance events
  break;
```

---

## Semantic Questions

1. **Should 'reversal' entries appear in the balance ledger (useBalanceLedger)?**
   - **Current Implementation:** Silently skipped (broken)
   - **Recommendation:** Filter them out. They're deal-specific, not relationship-level events.
   - **Rationale:** The balance ledger tracks capital transfers and relationship-level transactions. Reversals are internal deal corrections.

2. **Should DealCapitalSummary totals reflect reversals?**
   - **Current Implementation:** Totals show only original operations
   - **Status:** Semantically correct (historical view)
   - **Recommendation:** Add documentation clarifying that these are "historical" totals, not net effect.

3. **What translations are needed for 'reversal' entries?**
   - `t('reversedSettlement')` — for the type label in CapitalPoolPanel
   - Add to all language files (i18n)

---

## Summary

| File | Issue | Severity | Status | Fix Complexity |
|------|-------|----------|--------|-----------------|
| useDealCapital.ts | Missing 'reversal' in type | MEDIUM | UNFIXED | LOW (1 line) |
| CapitalPoolPanel.tsx | Mislabeled reversals | CRITICAL | UNFIXED | MEDIUM (5 lines + i18n) |
| useBalanceLedger.ts | Silent skip on reversal | CRITICAL | UNFIXED | LOW-MEDIUM (filter or switch case) |
| useProfitDistribution.ts | — | — | OK | — |
| useSettlements.ts | — | — | OK | — |

**Overall Status:**
- ✅ Settlement rejection logic: IMPLEMENTED & CORRECT
- ✅ TypeScript validation: PASSING
- ⚠️ Ledger consumer compatibility: INCOMPLETE (3 files need updates)
- ❌ Runtime testing: BLOCKED until above fixes applied

**Next Action:** Apply the three required fixes, then re-run `tsc --noEmit` and execute the runtime test matrix.
