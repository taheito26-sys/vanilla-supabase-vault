# Supabase Key Rotation Checklist

Project:
- `wvjcgtteblsjxcapanov`

Scope:
- Final pre-cutover security gate
- Rotate Supabase keys
- Update local and deployment secrets
- Rebuild generated assets
- Verify startup

## 1. Rotate Keys In Supabase

Rotate these values for the target project:
- Publishable key
- Service role key

Record the new values securely.

## 2. Update Local Runtime

Update:
- `C:\Data\vanilla-supabase-vault\.env.local`

Required variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## 3. Update Deployment Secret Stores

Update any environment stores used by deployment or automation:
- Vercel project env vars, if applicable
- CI/CD secret stores
- local shell profiles or task runners
- Supabase function secrets if any external jobs mirror the key

## 4. Rebuild Generated Client Assets

A previous generated asset bundle still contains old key material.

Rebuild before cutover so stale assets are replaced:
- web build output
- Capacitor web assets
- iOS generated public assets
- Android generated public assets

Suggested commands:

```powershell
npm run build
npm run cap:sync
```

If native release artifacts are produced separately, regenerate those too.

## 5. Verify No Hardcoded Source Secret Remains

Current status:
- hardcoded key removed from `C:\Data\vanilla-supabase-vault\seed.cjs`

Post-rotation, verify only local ignored env files contain the secret.

## 6. Verify Runtime

Run:

```powershell
node scripts/check-supabase-env.cjs
npm run dev -- --host 127.0.0.1
```

Confirm:
- env variables are present
- app starts
- `/login` loads
- no runtime configuration errors

## 7. Final Go/No-Go

Go only if all are true:
- rotated keys are active
- local env updated
- deployment env updated
- generated assets rebuilt
- startup verified
- no stale hardcoded source secret remains

## 8. Rollback Note

If startup fails after rotation:
- stop the rollout
- restore previous non-public runtime only if absolutely necessary
- identify which env store or generated asset missed the update
- rerun verification before resuming cutover
