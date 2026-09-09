import json
import os
import re

transcript_path = r"C:\Users\arjun\.gemini\antigravity-ide\brain\7f6af7e3-d089-4374-b11b-000f9bbad244\.system_generated\logs\transcript_full.jsonl"

with open(transcript_path, "r", encoding="utf-8") as f:
    for idx, line in enumerate(f):
        if len(line) > 40000:
            print(f"Line {idx} length: {len(line)}")
            obj = json.loads(line)
            # Recursively find text
            def search_text(d):
                if isinstance(d, str):
                    if "<!DOCTYPE html>" in d and "Nifty &amp; Beyond" in d:
                        return d
                elif isinstance(d, dict):
                    for v in d.values():
                        res = search_text(v)
                        if res: return res
                elif isinstance(d, list):
                    for item in d:
                        res = search_text(item)
                        if res: return res
                return None
            
            raw_text = search_text(obj)
            if raw_text:
                print(f"Found match in line {idx}!")
                # Split html files
                pieces = raw_text.split("<!DOCTYPE html>")
                for p_idx, p in enumerate(pieces):
                    if not p.strip():
                        continue
                    full_html = "<!DOCTYPE html>" + p
                    title_match = re.search(r"<title>(.*?)</title>", full_html, re.DOTALL)
                    title = title_match.group(1).strip() if title_match else f"doc_{p_idx}"
                    print(f"  Title: '{title}' (length: {len(full_html)})")
                    
                    if "Auto Ancillaries" in title:
                        dest = r"d:\Anti Gravity\equity-os\data\sectors\auto-ancillaries-q1fy27.html"
                    elif "Bearings" in title:
                        dest = r"d:\Anti Gravity\equity-os\data\sectors\bearings-q1fy27.html"
                    elif "8 Sep" in title:
                        dest = r"d:\Anti Gravity\equity-os\data\eod\daily\2026-09-08.html"
                    elif "7 Sep" in title:
                        dest = r"d:\Anti Gravity\equity-os\data\eod\daily\2026-09-07.html"
                    elif "Weekly Wrap" in title:
                        dest = r"d:\Anti Gravity\equity-os\data\eod\weekly\2026-09-05-weekly.html"
                    else:
                        continue
                    
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    with open(dest, "w", encoding="utf-8") as out:
                        out.write(full_html)
                    print(f"  ==> SAVED {len(full_html)} bytes to {dest}")
                break
