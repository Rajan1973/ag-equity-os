#!/usr/bin/env python3
"""
RETIRED / DEPRECATED (2026-09-20)
---------------------------------
This sync script is retired following the RRG database merge.
The public RRG-Data Supabase instance (lwspbnufodlvvnrokaux) has been paused.
The live EquityOS RRG frontend now reads directly from the canonical
Nifty500 data warehouse (wtbufledttydooazwiuw).

Do not run this script. If executed, it exits immediately without error.
"""
import sys

print("NOTICE: sync_rrg_to_public.py is RETIRED. Live RRG app now connects directly to nifty500data.")
sys.exit(0)

"""
Historical script content preserved below for archive / reference purposes:
"""


# Public Supabase credentials for RRG-Data
PUBLIC_SUPA_URL = "https://lwspbnufodlvvnrokaux.supabase.co"
PUBLIC_SUPA_KEY = "sb_publishable_5TQc0xNB3yeeHFr6pKM8-Q__pufSmZp"

def find_database_url():
    """Look for DATABASE_URL in environment or standard .env locations."""
    if os.environ.get("DATABASE_URL"):
        return os.environ.get("DATABASE_URL")
    
    candidates = [
        Path("D:/Anti Gravity/post-market-report/.env"),
        Path(__file__).resolve().parent.parent / ".env",
        Path("D:/Anti Gravity/equity-os/.env")
    ]
    for env_path in candidates:
        if env_path.exists():
            with open(env_path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("DATABASE_URL="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
    return None

def get_public_weeks():
    """Fetch all distinct week_ends currently present in the public Supabase."""
    headers = {
        "apikey": PUBLIC_SUPA_KEY,
        "Authorization": f"Bearer {PUBLIC_SUPA_KEY}"
    }
    url = f"{PUBLIC_SUPA_URL}/rest/v1/rrg_metrics_v2?select=week_end&order=week_end.desc&limit=1000"
    try:
        r = requests.get(url, headers=headers, timeout=15)
        if r.ok:
            data = r.json()
            return sorted(list(set(row["week_end"] for row in data)))
    except Exception as e:
        print(f"Warning: Failed to fetch public weeks: {e}")
    return []

def sync_metrics_for_week(db_url: str, week_end: str):
    """Fetch metrics from primary DB for given week_end and upsert into public Supabase."""
    print(f"\n--- Syncing RRG Metrics for week_end: {week_end} ---")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM rrg_metrics_v2 WHERE week_end = %s", (week_end,))
    rows = cur.fetchall()
    conn.close()

    if not rows:
        print(f"No rows found in primary database for week_end = {week_end}.")
        return False

    print(f"Fetched {len(rows)} records from warehouse.")

    payload = []
    for r in rows:
        d = dict(r)
        for k, v in d.items():
            if k in ("instrument_id", "benchmark_id") and v is not None:
                d[k] = int(v)
            elif hasattr(v, "isoformat"):
                d[k] = v.isoformat()
            elif hasattr(v, "__float__") and v is not None:
                d[k] = float(v)
        payload.append(d)

    headers = {
        "apikey": PUBLIC_SUPA_KEY,
        "Authorization": f"Bearer {PUBLIC_SUPA_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }

    batch_size = 100
    success = True
    for i in range(0, len(payload), batch_size):
        batch = payload[i:i + batch_size]
        resp = requests.post(f"{PUBLIC_SUPA_URL}/rest/v1/rrg_metrics_v2", headers=headers, json=batch, timeout=20)
        if resp.status_code in (200, 201):
            print(f"  Batch {i // batch_size + 1}/{(len(payload) - 1) // batch_size + 1}: {len(batch)} rows upserted OK (HTTP {resp.status_code})")
        else:
            print(f"  Batch {i // batch_size + 1} failed: HTTP {resp.status_code} - {resp.text}")
            success = False
            break

    return success

def run_sync(target_date: str = None, force_all_recent: bool = False):
    """Main synchronization routine."""
    db_url = find_database_url()
    if not db_url:
        print("Error: Could not locate DATABASE_URL.")
        sys.exit(1)

    # 1. Connect to warehouse to see available dates
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT week_end FROM rrg_metrics_v2 ORDER BY week_end DESC LIMIT 8")
    warehouse_weeks = sorted([str(r[0]) for r in cur.fetchall()])
    conn.close()

    print(f"Primary Warehouse latest available weeks: {warehouse_weeks}")

    if target_date:
        if target_date not in warehouse_weeks:
            print(f"Warning: Requested date {target_date} not in recent warehouse weeks ({warehouse_weeks}).")
        weeks_to_sync = [target_date]
    else:
        # Check public Supabase to find missing weeks
        public_weeks = get_public_weeks()
        print(f"Public Supabase latest available weeks: {public_weeks[-8:] if public_weeks else []}")

        if force_all_recent:
            weeks_to_sync = warehouse_weeks
        else:
            # Sync any week present in warehouse that is missing from public
            weeks_to_sync = [w for w in warehouse_weeks if w not in public_weeks]

    if not weeks_to_sync:
        print("\nAll recent warehouse weeks are already present in public Supabase! Nothing to sync.")
        return

    print(f"\nWeeks to sync: {weeks_to_sync}")
    for w in weeks_to_sync:
        ok = sync_metrics_for_week(db_url, w)
        if ok:
            print(f"Successfully synced week {w}!")
        else:
            print(f"Failed to sync week {w}.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sync RRG metrics to public Supabase")
    parser.add_argument("--date", help="Specific week_end date (YYYY-MM-DD) to sync")
    parser.add_argument("--force-all", action="store_true", help="Force resync of all recent 8 weeks")
    args = parser.parse_args()

    run_sync(target_date=args.date, force_all_recent=args.force_all)
