# Handover for Antigravity — RRG Database Merge (ag-equity-os)

**Date:** 2026-09-20
**Scope:** `ag-equity-os` only — what changed in this repo, and what this project's
own context files (`AGENT.md`, `CLAUDE.md`, `.cursor/rules/agent.mdc`,
`.github/copilot-instructions.md`, `.windsurfrules`, `EQUITYOS_HANDBOOK.htm`, etc.)
still describe incorrectly.

This work was done in a separate session (Claude Code, not Antigravity) directly
against GitHub and Supabase. Antigravity's own project memory has no record of it.
Read this once, update whatever local project knowledge references the old
architecture, then this file has served its purpose.

---

## 1. What changed, in one paragraph

The RRG chart used to read from a *separate* Supabase project, "RRG-Data"
(`lwspbnufodlvvnrokaux`), which was fed by a one-way sync from the primary
`nifty500data` warehouse (`wtbufledttydooazwiuw`). That sync had drifted — one
week was missing 13 stocks, and computed values no longer matched the warehouse.
The two databases have now been merged: `nifty500data` is the **single canonical
source**, and every RRG frontend (this one included) reads from it directly.
The old project is **paused**, not deleted, as a rollback safety net.

## 2. What's already fixed in this repo

`rrg/index.html` was edited directly and pushed to `main` (commit `3de81fa`,
see §6):

- `SUPA_URL` changed from `lwspbnufodlvvnrokaux.supabase.co` to
  `wtbufledttydooazwiuw.supabase.co`
- `SUPA_KEY` changed to nifty500data's publishable key
- The header badge and the FAQ note's "separate RRG-Data Supabase project" copy
  were updated to reflect the merged architecture
- **Bonus finding:** this repo's copy of `rrg/index.html` already had the correct
  `weeks[weeks.length-1]` freshness-badge logic — unlike the other two frontend
  copies (`Rajan1973.github.io/rotation`, `rrg-nifty-indices`), which had a bug
  showing the *oldest* week in the 8-week tail instead of the latest. That bug
  was fixed there too, but this repo never had it.

**Verified live** at `https://rajan1973.github.io/ag-equity-os/rrg/`: latest
week `2026-09-18`, all 14 index points rendering, correct quadrant counts.

## 3. What's NOT fixed yet — action items for this project

### 3a. `rrg/rrg-user-manual.html` still describes the old architecture
Line 37 (approx.): *"The app reads RRG V2 records from the separate RRG-Data
Supabase project."* This should read something like: *"The app reads RRG V2
records from the nifty500data warehouse, the single canonical source for all
quantitative market and RRG data."* Same class of fix as `index.html` — I didn't
make it because it wasn't in scope for what was asked, but it should be done for
consistency. Trivial one-line edit.

### 3b. `scripts/sync_rrg_to_public.py` is now dead code — and will start failing
This script's whole job was: read `rrg_metrics_v2` from `wtbufledttydooazwiuw`
(the warehouse) and upsert it into `lwspbnufodlvvnrokaux` (the old "public"
project) so the live app had something to read. **That old project is now
paused.** Since the frontend reads the warehouse directly, this script has no
remaining purpose — but if anyone runs it (manually; it isn't wired to any
GitHub Actions workflow in this repo, I checked `.github/` and found none), it
will fail with connection/HTTP errors against a paused Supabase project rather
than silently doing nothing. **Recommend:** delete it, or at minimum add a
top-of-file comment marking it retired, so nobody re-runs it expecting it to
matter.

### 3c. `scratch/rrg-nifty-indices/*` — old vendored copies
`scratch/rrg-nifty-indices/rrg_app_updated.html` and `rrg-user-manual.html` are
stale mirrors of the `rrg-nifty-indices` repo, still pointing at
`lwspbnufodlvvnrokaux`. Low priority since it's a scratch folder, not what's
deployed — flagging for completeness only.

### 3d. Project context files (`AGENT.md`, `CLAUDE.md`, handbook, etc.)
I did not read every one of these in full. If any of them document the RRG
architecture as "two Supabase projects" (source warehouse + separate public
mirror), that description is now stale — there is one project. Worth a grep for
`lwspbnufodlvvnrokaux` or `RRG-Data` across the repo before trusting any of
those docs on this topic.

### 3e. Unrelated, but re-flagging since it's still sitting there
This working copy has a large block of **pre-existing uncommitted local
changes** (419-line deletions across `.mcp.json`, `.jetro/lib/jet/credentials.py`,
`CLAUDE.md`, `.cursor/mcp.json`, and others) that predate this session. I did
not touch, stage, or commit any of it — only `rrg/index.html` was committed each
time. One of those filenames has "credentials" in it; worth reviewing and either
committing or discarding intentionally rather than leaving it dangling.

## 4. Facts to put in this project's memory going forward

| Fact | Value |
|---|---|
| Canonical database | `nifty500data`, project ref `wtbufledttydooazwiuw`, region `ap-south-1` |
| Old RRG-only project | `lwspbnufodlvvnrokaux` — **paused** 2026-09-20, not deleted, treat as historical/rollback only |
| REST base URL | `https://wtbufledttydooazwiuw.supabase.co/rest/v1/` |
| Publishable key (client-safe) | `sb_publishable__y6D6M1arQpM0ebcjlyj4A_KLwWYrkE` |
| Tables the frontend reads | `rrg_instruments`, `rrg_benchmarks`, `rrg_metrics_v2` only — all three have public read policies |
| RRG automation | `compute-rrg.ts`, step 7 of `daily-update.yml` in **`rajanchennai/market-data`** (a different repo, not this one), Mon–Fri 20:45 IST. Not something this project can or should try to trigger. |
| Full technical reference | See the companion document `NIFTY500_DATABASE_TECH_SPEC.md` (also handed to the user) for the complete schema, RLS matrix, RRG formulas, and integration rules. |

## 5. Commits made in this repo, for the record

```
3de81fa  rrg: point RRG app at nifty500data (merged database)
```
(The freshness-badge bug was already correct here — see §2 — so no second
commit was needed in this repo for that fix, unlike the other two.)
