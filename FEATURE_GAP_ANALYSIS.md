# FEATURE_GAP_ANALYSIS

## 1. Executive Summary
A comprehensive scan of `core-refactor-initiative` (Source) vs `vanilla-supabase-vault` (Target) reveals that the **Target repository has successfully maintained folder and architectural parity** (no missing files in `src/`). However, several critical subsystems are out of sync at the feature-implementation level. The Target repo is actually *ahead* in areas like Cash Management, Orders Ledger, and Agreement tabs, but it has regressed or is *behind* in advanced integrations, Dashboard UI, and Supabase Schema typing.

## 2. Feature Gap Matrix

| Feature | Source Location | Target Status | What is Missing | Dependencies Needed | Risk | Recommendation | Defer/Now |
|---------|-----------------|---------------|-----------------|---------------------|------|----------------|-----------|
| **Supabase Types Schema Parity** | `src/integrations/supabase/types.ts` | Behind | Target is missing ~7KB of generated DB types present in the Source repo, meaning certain tables or columns are not properly typed. | None | High | Re-generate types or safely merge missing table definitions without deleting Target's new tables. | **Now** |
| **Advanced Dashboard UI & KPIs** | `src/pages/DashboardPage.tsx` | Behind | Target dashboard is significantly smaller (22KB vs 41KB). Missing the "ROI", "Cycle Time", "Velocity", and "Merchant Deal" net profit analysis modules, as well as the Recharts period stats panels. | `useTrackerState`, `merchantDealKpis` query | Medium | Migrate Dashboard features cleanly. Preserve any target preferences (like the "This month / Last month" split). | **Now** |
| **Chat Room / Core API** | `src/features/chat/api/rooms.ts` & `messages.ts` | Behind | Target is slightly misaligned on chat payload codec and secure trade panel logic. | Latest DB types | Low | Merge source `message-codec.ts` into target equivalent without destroying target chat additions. | **Now** |
| **Trade Engine Deals / i18n** | `src/lib/deal-engine.ts` & `src/lib/i18n.ts` | Behind | Core engine logic for deals has some discrepancy. Translation files need alignment. | None | Low | Direct copy/adaptation. | **Now** |
| **Cash Management (Stock)** | `src/features/stock/components/CashManagement.tsx` | **Ahead** | Target is actually ahead (71KB vs 61KB). | None | Informational | Do **not** overwrite target. | N/A |
| **Agreements Tab** | `src/features/merchants/components/AgreementsTab.tsx` | **Ahead**| Target is ahead (39KB vs 31KB). | None | Informational | Do **not** overwrite target. | N/A |
| **Orders Page** | `src/pages/OrdersPage.tsx` | **Ahead** | Target has ledger imports and is ahead (214KB vs 197KB). | None | Informational | Do **not** overwrite target. | N/A |

## 3. Recommended Implementation Order
1. **Schema & Typings**: Integrate the missing `types.ts` from Source into Target to ensure no compiler errors during subsequent steps.
2. **Dashboard Migration**: Migrate the heavy `DashboardPage.tsx` intelligence and charting over carefully, matching the Target's exact data hooks.
3. **Chat Alignment**: Finalize chat api alignments.
4. **Validation**: Test.
