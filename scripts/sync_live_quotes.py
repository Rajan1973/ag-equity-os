import urllib.request
import json
import datetime
import os

tickers = {
    'IGIL.NS': {'name': 'International Gemological Instit (IGI)', 'tier': 'Core', 'basePrice': 431.1},
    'BSE.NS': {'name': 'BSE Ltd', 'tier': 'Core', 'basePrice': 3757.0},
    'GROWW.NS': {'name': 'Billionbrains (Groww)', 'tier': 'Core', 'basePrice': 216.5},
    'BAJAJ-AUTO.NS': {'name': 'Bajaj Auto', 'tier': 'Core', 'basePrice': 10643.0},
    'GVT&D.NS': {'name': 'GE Vernova T&D India', 'tier': 'Core', 'basePrice': 4195.0},
    'KRISHANA.NS': {'name': 'Krishana Phoschem', 'tier': 'Core', 'basePrice': 241.3},
    'FIEMIND.NS': {'name': 'Fiem Industries', 'tier': 'Core', 'basePrice': 2084.3},
    'TARIL.NS': {'name': 'T R I L (TARIL)', 'tier': 'Core', 'basePrice': 289.45},
    'KALYANKJIL.NS': {'name': 'Kalyan Jewellers', 'tier': 'Satellite', 'basePrice': 652.9},
    'COFORGE.NS': {'name': 'Coforge', 'tier': 'Satellite', 'basePrice': 2142.3},
    'TVSHLTD.NS': {'name': 'TVS Holdings', 'tier': 'Satellite', 'basePrice': 13367.0},
    'KNACK.NS': {'name': 'Knack Packaging', 'tier': 'Satellite', 'basePrice': 206.3},
    'META.BO': {'name': 'String Metaverse', 'tier': 'Satellite', 'basePrice': 9.5},
    'LODHA.NS': {'name': 'Lodha Developers (Macrotech)', 'tier': 'Satellite', 'basePrice': 1219.0},
    'DSSL.NS': {'name': 'Dynacons Systems', 'tier': 'Satellite', 'basePrice': 1029.2},
    'SHRINGARMS.NS': {'name': 'Shringar House of Fashion', 'tier': 'Satellite', 'basePrice': 232.6},
    'BLS.NS': {'name': 'BLS International', 'tier': 'Satellite', 'basePrice': 220.4},
    'SKYGOLD.NS': {'name': 'Sky Gold & Diamonds', 'tier': 'Satellite', 'basePrice': 819.45},
    'VMARCIND-SM.NS': {'name': 'V-Marc India', 'tier': 'Satellite', 'basePrice': 276.5},
    'MONARCH.NS': {'name': 'Monarch Networth', 'tier': 'Satellite', 'basePrice': 335.5},
    'GOKULAGRO.NS': {'name': 'Gokul Agro Resources', 'tier': 'Satellite', 'basePrice': 204.3},
    'KERNEX.NS': {'name': 'Kernex Microsystems', 'tier': 'Satellite', 'basePrice': 1587.6},
    'HINDZINC.NS': {'name': 'Hindustan Zinc', 'tier': 'Satellite', 'basePrice': 528.95},
    '^NSEI': {'name': 'NIFTY 50', 'tier': 'Benchmark', 'basePrice': 25349.65}
}

def sync_quotes():
    quotes = {}
    now_ist = datetime.datetime.now().strftime('%d-%b-%Y %H:%M:%S IST')
    print(f"Starting quote sync at {now_ist}...")

    for sym, info in tickers.items():
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=1d"
        price = info['basePrice']
        prev = info['basePrice']
        chg = 0.0
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=4) as r:
                d = json.loads(r.read())
                meta = d['chart']['result'][0]['meta']
                if meta.get('regularMarketPrice'):
                    price = round(meta['regularMarketPrice'], 2)
                if meta.get('chartPreviousClose'):
                    prev = round(meta['chartPreviousClose'], 2)
                chg = round(((price - prev) / prev) * 100, 2)
        except Exception as e:
            print(f"Fallback for {sym}: {e}")

        quotes[sym] = {
            'name': info['name'],
            'tier': info['tier'],
            'price': price,
            'prevClose': prev,
            'changePct': chg,
            'basePrice': info['basePrice']
        }

    output_data = {
        'last_updated': now_ist,
        'source': 'Yahoo Finance / NSE Live Feed',
        'nifty': quotes['^NSEI'],
        'quotes': quotes
    }

    paths = [
        r'D:\Anti Gravity\equity-os\portfolio\data\live_quotes.json',
        r'd:\Anti Gravity\21nov2026\portfolio\data\live_quotes.json'
    ]

    for p in paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, 'w', encoding='utf-8') as f:
            json.dump(output_data, f, indent=2)

    nifty_quote = quotes['^NSEI']
    print(f"Successfully updated live_quotes.json. Nifty: {nifty_quote['price']} ({nifty_quote['changePct']}%)")

if __name__ == '__main__':
    sync_quotes()
