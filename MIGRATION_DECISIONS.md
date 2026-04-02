# MIGRATION DECISIONS

1. **Rule of Target Primacy**: We discovered during the gap analysis that the Target repository (`vanilla-supabase-vault`) is actually **ahead** of the Source repo (`core-refactor-initiative`) in several massive domains (Orders, CashManagement, Agreements). Therefore, we will strictly **NOT mechanically overwrite** the target repo.

2. **Supabase Core Integration**: The Source repo has Supabase Database types that are not present in the Target repo. They will be carefully merged line-by-line so Target does not lose `handle_new_user` triggers or custom edge setups.

3. **Dashboard Unification**: The main feature missing is the advanced "Financial Intelligence" layer of the Dashboard (ROI, Velocity, Cycle Time). The target version was recently stripped down or regressed to 22KB. I will implement the 41KB logic from Source but maintain compatibility with the user's current route boundary system, caching guards, and Supabase RLS.

4. **Order of execution**:
   - `types.ts`
   - `DashboardPage.tsx`
   - `i18n.ts`
   - Cleanup and testing.
