---
trigger: always_on
---

# EquityOS RRG Database Architecture & Canonical Standards

> **Single Canonical Source (Effective 2026-09-20)**: The RRG frontend reads directly from the primary **nifty500data** warehouse. The old separate public database `lwspbnufodlvvnrokaux` is paused and retired.

## RRG Graph Architecture & Configuration

| Property | Value |
|---|---|
| **Canonical Database** | `nifty500data`, project ref `wtbufledttydooazwiuw`, region `ap-south-1` |
| **Old RRG-only Project** | `lwspbnufodlvvnrokaux` — **PAUSED** 2026-09-20 (historical rollback only) |
| **REST Base URL** | `https://wtbufledttydooazwiuw.supabase.co/rest/v1/` |
| **Client-Safe Publishable Key** | `sb_publishable__y6D6M1arQpM0ebcjlyj4A_KLwWYrkE` |
| **Tables Read by Frontend** | `rrg_instruments`, `rrg_benchmarks`, `rrg_metrics_v2` (public read policies enabled) |
| **Frontend Embedding** | `rrg/index.html` (embedded inside `index.html` under `#tab-rrg`) |
| **Calculation Formulation** | `v2-ema10-jdk-public` (weekly Friday-close relative strength vs benchmark) |
| **Freshness Logic** | `weeks[weeks.length - 1]` representing the latest completed Friday close |
| **Data Sync / Ingestion** | Handled upstream in `rajanchennai/market-data` (`compute-rrg.ts` at 20:45 IST Mon-Fri). No local sync script needed. `scripts/sync_rrg_to_public.py` is permanently retired. |

## Report Isolation Rules
- **Sector Reports & EOD Reports**: There is NO change in Sector Reports (`data/sectors/`) and EOD Reports (`data/eod/`). They remain self-contained, statically managed, and registered via `js/data-loader.js`.
