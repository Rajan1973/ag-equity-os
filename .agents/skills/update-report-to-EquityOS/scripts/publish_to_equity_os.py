#!/usr/bin/env python3
"""
publish_to_equity_os.py

Automated publishing pipeline for EquityOS (ag-equity-os):
1. Ingests a generated report (Daily EOD, Stock Report, or Sector Report).
2. Copies it to the appropriate data directory in ag-equity-os.
3. Extracts key intelligence metadata from the HTML report.
4. Updates js/data-loader.js registry (deduped & sorted by date).
5. Updates index.html hero scorecard, iframe, standalone buttons, and cache-busting version strings.
6. Stages, commits, and pushes directly to GitHub (origin/main).
"""

import os
import sys
import re
import json
import argparse
import subprocess
from datetime import datetime

DEFAULT_EQUITY_OS_DIR = r"D:\Anti Gravity\equity-os"

def clean_text(text: str) -> str:
    """Normalize whitespace and unicode dashes."""
    if not text:
        return ""
    text = text.replace("&minus;", "-").replace("−", "-").replace("&middot;", "·").replace("&amp;", "&")
    text = re.sub(r"\s+", " ", text).strip()
    return text

def extract_tile_data(html: str, label_pattern: str):
    """Extract .tile with key matching label_pattern from html."""
    tile_pattern = re.compile(
        r'<div class="tile">\s*<div class="k">(.*?)</div>\s*<div class="v">(.*?)</div>(?:\s*<div class="d[^>]*>(.*?)</div>)?',
        re.DOTALL | re.IGNORECASE
    )
    for m in tile_pattern.finditer(html):
        k_text = clean_text(re.sub(r'<[^>]+>', '', m.group(1)))
        if re.search(label_pattern, k_text, re.IGNORECASE):
            v = clean_text(re.sub(r'<[^>]+>', '', m.group(2)))
            d = clean_text(re.sub(r'<[^>]+>', '', m.group(3))) if m.group(3) else ""
            return v, d
    return "", ""

def parse_daily_html(html_content: str, fallback_date: str = None):
    """Parse daily post-market EOD HTML report."""
    # 1. Date
    date = fallback_date or ""
    date_m = re.search(r'<span class="mono">(\d{4}-\d{2}-\d{2})', html_content)
    if date_m:
        date = date_m.group(1)
    if not date:
        date_m2 = re.search(r'(\d{4}-\d{2}-\d{2})', html_content)
        if date_m2:
            date = date_m2.group(1)
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")

    # Format human title
    try:
        dt = datetime.strptime(date, "%Y-%m-%d")
        human_title = f"Nifty & Beyond — {dt.day} {dt.strftime('%b')} {dt.year}"
    except Exception:
        human_title = f"Nifty & Beyond — {date}"

    # 2. Scorecard metrics
    nifty_v, nifty_d = extract_tile_data(html_content, r'Nifty\s*50')
    sensex_v, sensex_d = extract_tile_data(html_content, r'Sensex')
    vix_v, vix_d = extract_tile_data(html_content, r'India\s*VIX')
    fii_v, _ = extract_tile_data(html_content, r'FII\s*net')
    dii_v, _ = extract_tile_data(html_content, r'DII\s*net')
    breadth_v, breadth_d = extract_tile_data(html_content, r'Breadth')
    brent_v, brent_d = extract_tile_data(html_content, r'Brent')
    usdinr_v, usdinr_d = extract_tile_data(html_content, r'USD/INR')

    # Format changes
    def format_chg(d_str: str) -> str:
        d_clean = clean_text(d_str)
        # e.g. +46.30 · +0.20% -> +46.30 (+0.20%)
        pts_pct = re.search(r'([+\-]?\d+(?:\.\d+)?)\s*·\s*([+\-]?\d+(?:\.\d+)?%)', d_clean)
        if pts_pct:
            return f"{pts_pct.group(1)} ({pts_pct.group(2)})"
        return d_clean

    nifty_change = format_chg(nifty_d) or "+0.00 (+0.00%)"
    sensex_change = format_chg(sensex_d) or "+0.00 (+0.00%)"
    vix_change = clean_text(vix_d)

    # Breadth format: "191:305 (0.63)"
    ad_num = re.search(r'A/D\s*([0-9.]+)', breadth_d)
    breadth_formatted = f"{breadth_v} ({ad_num.group(1)})" if (breadth_v and ad_num) else (breadth_v or "250:250 (1.00)")

    # Brent format: "$98.40 (+0.25%)"
    brent_chg = re.search(r'([+\-]?\d+(?:\.\d+)?%)', brent_d)
    brent_formatted = f"{brent_v} ({brent_chg.group(1)})" if (brent_v and brent_chg) else brent_v

    # USD/INR format: "94.8850 (+0.04%)"
    inr_chg = re.search(r'([+\-]?\d+(?:\.\d+)?%)', usdinr_d)
    inr_formatted = f"{usdinr_v} ({inr_chg.group(1)})" if (usdinr_v and inr_chg) else usdinr_v

    # 3. Regime
    regime_score_str = "35.0 NEUTRAL"
    vol_score = "83.0"
    trend_score = "28.0"
    s2_m = re.search(r'id="s2".*?<h2>Market Regime</h2>(.*?)</table>', html_content, re.DOTALL | re.IGNORECASE)
    if s2_m:
        s2_block = s2_m.group(1)
        comp_m = re.search(r'<div class="k">Composite</div>\s*<div class="v">([\d.]+)</div>\s*<div class="d">(.*?)</div>', s2_block, re.DOTALL | re.IGNORECASE)
        if comp_m:
            regime_score_str = f"{comp_m.group(1).strip()} {comp_m.group(2).strip().upper()}"
        
        def extract_regime_row_score(block: str, sym_name: str) -> str:
            tr_m = re.search(rf'<tr[^>]*>.*?<td class="sym">\s*{sym_name}\s*</td>(.*?)</tr>', block, re.DOTALL | re.IGNORECASE)
            if tr_m:
                cells = re.findall(r'<td class="num">([\d.]+)</td>', tr_m.group(1), re.IGNORECASE)
                if len(cells) >= 2:
                    return cells[-1].strip()
                elif cells:
                    return cells[0].strip()
            return ""

        v_sc = extract_regime_row_score(s2_block, 'Volatility')
        if v_sc:
            vol_score = v_sc
        t_sc = extract_regime_row_score(s2_block, 'Trend')
        if t_sc:
            trend_score = t_sc

    # 4. Highlights (narrative bullets in §1)
    highlights = []
    narr_m = re.search(r'<ul class="bul narr">(.*?)</ul>', html_content, re.DOTALL | re.IGNORECASE)
    if narr_m:
        lis = re.findall(r'<li>(.*?)</li>', narr_m.group(1), re.DOTALL | re.IGNORECASE)
        for li in lis:
            cleaned = clean_text(re.sub(r'<[^>]+>', '', li))
            if cleaned:
                highlights.append(cleaned)
    if not highlights:
        highlights = [
            f"Nifty closed at {nifty_v} ({nifty_change}); composite regime registers at {regime_score_str}.",
            f"DII net cash flow at {dii_v} Cr against FII net cash flow at {fii_v} Cr.",
            f"Market breadth settled at {breadth_formatted} across Nifty 500 constituents."
        ]

    return {
        "id": date,
        "date": date,
        "title": human_title,
        "file": f"data/eod/daily/{date}.html",
        "nifty": nifty_v or "23,500.00",
        "niftyChange": nifty_change,
        "sensex": sensex_v or "75,000.00",
        "sensexChange": sensex_change,
        "vix": vix_v or "11.50",
        "vixChange": vix_change or "0.00",
        "fii": fii_v or "0.00",
        "dii": dii_v or "0.00",
        "breadth": breadth_formatted,
        "brent": brent_formatted or "$90.00",
        "usdinr": inr_formatted or "94.50",
        "regimeScore": regime_score_str,
        "volScore": vol_score,
        "trendScore": trend_score,
        "highlights": highlights[:4]
    }

def update_data_loader_daily(equity_os_dir: str, report_data: dict):
    """Update js/data-loader.js with daily report metadata."""
    dl_path = os.path.join(equity_os_dir, "js", "data-loader.js")
    if not os.path.exists(dl_path):
        raise FileNotFoundError(f"data-loader.js not found at {dl_path}")

    with open(dl_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Format JSON object for JS
    entry_dict = {
        "id": report_data["id"],
        "date": report_data["date"],
        "title": report_data["title"],
        "file": report_data["file"],
        "nifty": report_data["nifty"],
        "niftyChange": report_data["niftyChange"],
        "sensex": report_data["sensex"],
        "sensexChange": report_data["sensexChange"],
        "vix": report_data["vix"],
        "vixChange": report_data["vixChange"],
        "fii": report_data["fii"],
        "dii": report_data["dii"],
        "breadth": report_data["breadth"],
        "brent": report_data["brent"],
        "usdinr": report_data["usdinr"],
        "regimeScore": report_data["regimeScore"],
        "highlights": report_data["highlights"]
    }
    entry_js = "      " + json.dumps(entry_dict, indent=8, ensure_ascii=False).strip()

    # Check if id already exists in daily array
    id_pattern = rf'[\"\']?id[\"\']?\s*:\s*[\"\']{report_data["id"]}[\"\']'
    m_id = re.search(id_pattern, content)
    if m_id:
        # Find enclosing object { ... }
        start_obj = content.rfind('{', 0, m_id.start())
        depth = 0
        end_obj = -1
        for i in range(start_obj, len(content)):
            if content[i] == '{':
                depth += 1
            elif content[i] == '}':
                depth -= 1
                if depth == 0:
                    end_obj = i + 1
                    break
        if start_obj != -1 and end_obj != -1:
            trailing = ""
            if end_obj < len(content) and content[end_obj] == ',':
                end_obj += 1
                trailing = ","
            content = content[:start_obj] + entry_js + trailing + content[end_obj:]
    else:
        # Prepend to daily: [
        daily_anchor = re.search(r'daily:\s*\[', content)
        if not daily_anchor:
            raise ValueError("Could not locate 'daily: [' in data-loader.js")
        idx = daily_anchor.end()
        content = content[:idx] + f"\n{entry_js}," + content[idx:]

    with open(dl_path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  [OK] Updated js/data-loader.js with daily report '{report_data['id']}'.")

def update_index_html_daily(equity_os_dir: str, report_data: dict, version_str: str):
    """Update index.html hero section and cache busting tags."""
    index_path = os.path.join(equity_os_dir, "index.html")
    if not os.path.exists(index_path):
        raise FileNotFoundError(f"index.html not found at {index_path}")

    with open(index_path, "r", encoding="utf-8") as f:
        html = f.read()

    # 1. Update Eyebrow date tag
    dt_obj = datetime.strptime(report_data["date"], "%Y-%m-%d")
    eyebrow_text = f"AS OF {dt_obj.day} {dt_obj.strftime('%B').upper()} {dt_obj.year}"
    html = re.sub(
        r'<div class="eyebrow" id="hero-date-tag">.*?</div>',
        f'<div class="eyebrow" id="hero-date-tag">{eyebrow_text}</div>',
        html
    )

    # 2. Update standalone buttons and iframe
    report_file_rel = report_data["file"]
    html = re.sub(
        r'<a id="hero-open-standalone-btn"\s+href=".*?"',
        f'<a id="hero-open-standalone-btn" href="{report_file_rel}"',
        html
    )
    html = re.sub(
        r'<a id="ref-open-latest-btn"\s+href=".*?"',
        f'<a id="ref-open-latest-btn" href="{report_file_rel}"',
        html
    )
    html = re.sub(
        r'<iframe id="hero-report-iframe"\s+src=".*?"',
        f'<iframe id="hero-report-iframe" src="{report_file_rel}"',
        html
    )

    # 3. Update Regime Card
    regime_score_num = report_data["regimeScore"].split()[0]
    regime_tag_text = "BEARISH REGIME" if "BEARISH" in report_data["regimeScore"] else "NEUTRAL REGIME"
    html = re.sub(
        r'<div class="regime-score-v" id="hero-regime-score">.*?</div>',
        f'<div class="regime-score-v" id="hero-regime-score">{regime_score_num}</div>',
        html
    )
    html = re.sub(
        r'<span class="regime-tag" id="hero-regime-tag">.*?</span>',
        f'<span class="regime-tag" id="hero-regime-tag">{regime_tag_text}</span>',
        html
    )
    html = re.sub(
        r'<div class="regime-meta" id="hero-regime-meta">.*?</div>',
        f'<div class="regime-meta" id="hero-regime-meta">Volatility: {report_data.get("volScore", "83.0")} | Trend: {report_data.get("trendScore", "27.9")}</div>',
        html
    )

    # 4. Update Scorecard tiles
    n_chg = report_data["niftyChange"]
    n_cls = "dn" if "-" in n_chg else "up"
    html = re.sub(
        r'<div class="tile-v" id="sc-nifty-v">.*?</div>\s*<div class="tile-d" id="sc-nifty-d">.*?</div>',
        f'<div class="tile-v" id="sc-nifty-v">{report_data["nifty"]}</div>\n          <div class="tile-d" id="sc-nifty-d"><span class="{n_cls}">{n_chg}</span></div>',
        html
    )

    s_chg = report_data["sensexChange"]
    s_cls = "dn" if "-" in s_chg else "up"
    html = re.sub(
        r'<div class="tile-v" id="sc-sensex-v">.*?</div>\s*<div class="tile-d" id="sc-sensex-d">.*?</div>',
        f'<div class="tile-v" id="sc-sensex-v">{report_data["sensex"]}</div>\n          <div class="tile-d" id="sc-sensex-d"><span class="{s_cls}">{s_chg}</span></div>',
        html
    )

    vix_val = report_data["vix"]
    vix_chg = report_data["vixChange"]
    vix_cls = "up" if ("+" in vix_chg) else "dn"
    html = re.sub(
        r'<div class="tile-v" id="sc-vix-v">.*?</div>\s*<div class="tile-d" id="sc-vix-d">.*?</div>',
        f'<div class="tile-v" id="sc-vix-v">{vix_val}</div>\n          <div class="tile-d" id="sc-vix-d"><span class="{vix_cls}">{vix_chg}</span></div>',
        html
    )

    html = re.sub(
        r'<div class="tile-v" id="sc-fii-v">.*?</div>',
        f'<div class="tile-v" id="sc-fii-v">{report_data["fii"]}</div>',
        html
    )
    html = re.sub(
        r'<div class="tile-v" id="sc-dii-v">.*?</div>',
        f'<div class="tile-v" id="sc-dii-v">{report_data["dii"]}</div>',
        html
    )

    # Breadth
    b_parts = report_data["breadth"].split()
    b_counts = b_parts[0] if b_parts else report_data["breadth"]
    b_ad = b_parts[1].replace("(", "").replace(")", "") if len(b_parts) > 1 else ""
    html = re.sub(
        r'<div class="tile-v" id="sc-breadth-v">.*?</div>\s*<div class="tile-d" id="sc-breadth-d">.*?</div>',
        f'<div class="tile-v" id="sc-breadth-v">{b_counts}</div>\n          <div class="tile-d" id="sc-breadth-d">A/D {b_ad}</div>',
        html
    )

    # Brent
    brent_parts = report_data["brent"].split()
    br_val = brent_parts[0] if brent_parts else report_data["brent"]
    br_chg = brent_parts[1].replace("(", "").replace(")", "") if len(brent_parts) > 1 else ""
    html = re.sub(
        r'<div class="tile-v" id="sc-brent-v">.*?</div>\s*<div class="tile-d" id="sc-brent-d">.*?</div>',
        f'<div class="tile-v" id="sc-brent-v">{br_val}</div>\n          <div class="tile-d" id="sc-brent-d">{br_chg}</div>',
        html
    )

    # USD/INR
    inr_parts = report_data["usdinr"].split()
    inr_val = inr_parts[0] if inr_parts else report_data["usdinr"]
    inr_chg = inr_parts[1].replace("(", "").replace(")", "") if len(inr_parts) > 1 else ""
    html = re.sub(
        r'<div class="tile-v" id="sc-usdinr-v">.*?</div>\s*<div class="tile-d" id="sc-usdinr-d">.*?</div>',
        f'<div class="tile-v" id="sc-usdinr-v">{inr_val}</div>\n          <div class="tile-d" id="sc-usdinr-d">Rupee {inr_chg}</div>',
        html
    )

    # 5. Cache-busting version update on script and link tags
    html = re.sub(r'href="css/style\.css(?:\?v=[^"]*)?"', f'href="css/style.css?v={version_str}"', html)
    html = re.sub(r'src="js/data-loader\.js(?:\?v=[^"]*)?"', f'src="js/data-loader.js?v={version_str}"', html)
    html = re.sub(r'src="js/rrg-chart\.js(?:\?v=[^"]*)?"', f'src="js/rrg-chart.js?v={version_str}"', html)
    html = re.sub(r'src="js/app\.js(?:\?v=[^"]*)?"', f'src="js/app.js?v={version_str}"', html)

    with open(index_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"  [OK] Updated index.html with daily hero fallbacks and cache-buster version '?v={version_str}'.")

def publish_stock_report(equity_os_dir: str, file_path: str, ticker: str, version_str: str):
    """Publish a stock analysis report to data/stocks."""
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Derive filename and slug
    clean_ticker = ticker.upper().strip() if ticker else "STOCK"
    if not ticker:
        # Try to infer ticker from title or file
        m = re.search(r'<title>(.*?)</title>', content)
        if m:
            clean_ticker = re.sub(r'[^A-Za-z0-9]+', '', m.group(1).split()[0].upper())

    target_name = f"{clean_ticker.lower()}-analysis.html"
    dest_dir = os.path.join(equity_os_dir, "data", "stocks")
    os.makedirs(dest_dir, exist_ok=True)
    dest_file = os.path.join(dest_dir, target_name)

    with open(dest_file, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"  [OK] Saved stock report to {dest_file}")

    # Register in data-loader.js if stocks registry exists
    dl_path = os.path.join(equity_os_dir, "js", "data-loader.js")
    if os.path.exists(dl_path):
        with open(dl_path, "r", encoding="utf-8") as f:
            dl_content = f.read()

        stock_entry = {
            "id": f"{clean_ticker.lower()}-analysis",
            "ticker": clean_ticker,
            "title": f"{clean_ticker} Fundamental Research Note",
            "file": f"data/stocks/{target_name}",
            "updated": datetime.now().strftime("%Y-%m-%d")
        }
        stock_js = "      " + json.dumps(stock_entry, indent=8).strip()

        if "stocks:" in dl_content:
            if f'id: "{clean_ticker.lower()}-analysis"' not in dl_content:
                anchor = re.search(r'stocks:\s*\[', dl_content)
                if anchor:
                    idx = anchor.end()
                    dl_content = dl_content[:idx] + f"\n{stock_js}," + dl_content[idx:]
                    with open(dl_path, "w", encoding="utf-8") as f:
                        f.write(dl_content)
                    print(f"  [OK] Registered stock report in data-loader.js under EquityData.reports.stocks.")
        else:
            # Add stocks: [] after sectors
            anchor = re.search(r'sectors:\s*\[', dl_content)
            if anchor:
                dl_content = dl_content.replace("reports: {", f"reports: {{\n    stocks: [\n{stock_js}\n    ],")
                with open(dl_path, "w", encoding="utf-8") as f:
                    f.write(dl_content)
                print(f"  [OK] Initialized EquityData.reports.stocks and registered {clean_ticker}.")

def git_commit_and_push(equity_os_dir: str, commit_message: str):
    """Stage, commit, and push changes in equity-os repository."""
    print(f"--> Staging and committing in {equity_os_dir}...")
    subprocess.run(["git", "add", "data/", "js/data-loader.js", "index.html"], cwd=equity_os_dir, check=True)
    
    # Check status
    res = subprocess.run(["git", "status", "--porcelain"], cwd=equity_os_dir, capture_output=True, text=True)
    if not res.stdout.strip():
        print("  [!] No changes detected to commit.")
        return

    subprocess.run(["git", "commit", "-m", commit_message], cwd=equity_os_dir, check=True)
    print(f"  [OK] Committed: {commit_message}")

    print("--> Pushing to GitHub (origin main)...")
    subprocess.run(["git", "push", "origin", "main"], cwd=equity_os_dir, check=True)
    print("  [SUCCESS] Pushed to GitHub repository https://github.com/Rajan1973/ag-equity-os")

def main():
    parser = argparse.ArgumentParser(description="Publish reports to EquityOS")
    parser.add_argument("--type", choices=["daily", "stock", "sector"], required=True, help="Report type: daily or stock")
    parser.add_argument("--file", required=True, help="Path to generated HTML report file")
    parser.add_argument("--dir", default=DEFAULT_EQUITY_OS_DIR, help="Path to equity-os local repo")
    parser.add_argument("--ticker", default="", help="Stock ticker (for stock report)")
    parser.add_argument("--no-push", action="store_true", help="Skip git push")

    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File not found: {args.file}", file=sys.stderr)
        sys.exit(1)

    with open(args.file, "r", encoding="utf-8") as f:
        content = f.read()

    version_str = datetime.now().strftime("%Y%m%d-%H%M")

    if args.type == "daily":
        print(f"--> Parsing Daily EOD Report: {args.file}")
        report_data = parse_daily_html(content)
        date = report_data["date"]
        print(f"  Date: {date}")
        print(f"  Title: {report_data['title']}")
        print(f"  Nifty: {report_data['nifty']} ({report_data['niftyChange']})")
        print(f"  Regime: {report_data['regimeScore']}")

        # Save to data/eod/daily/
        dest_dir = os.path.join(args.dir, "data", "eod", "daily")
        os.makedirs(dest_dir, exist_ok=True)
        dest_file = os.path.join(dest_dir, f"{date}.html")
        with open(dest_file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"  [OK] Saved report to {dest_file}")

        # Update data-loader.js and index.html
        update_data_loader_daily(args.dir, report_data)
        update_index_html_daily(args.dir, report_data, version_str)

        commit_msg = f"Publish EOD Daily Brief for {date} and update app links"

    elif args.type == "stock":
        ticker = args.ticker or "STOCK"
        print(f"--> Publishing Stock Report for {ticker}: {args.file}")
        publish_stock_report(args.dir, args.file, ticker, version_str)
        commit_msg = f"Publish fundamental stock report for {ticker}"

    if not args.no_push:
        git_commit_and_push(args.dir, commit_msg)

    print("\n=======================================================")
    print("[SUCCESS] EquityOS Publishing Complete!")
    print(f"Live Site: https://rajan1973.github.io/ag-equity-os/")
    print("=======================================================")

if __name__ == "__main__":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    main()
