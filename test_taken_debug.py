#!/usr/bin/env python3
"""Deep debug script for taken-cartela polling. Tests the REST API directly.

Usage:
    python test_taken_debug.py [--round ROUND_ID] [--url BASE_URL]

Run from your local machine while a game is in progress.
"""

import argparse
import json
import sys
import urllib.request
import urllib.error

BASE = "https://kelem-bingo-api.onrender.com"

def fetch_json(path):
    url = BASE + path
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read()) if e.code != 404 else {"detail": "Not found"}

def main():
    parser = argparse.ArgumentParser(description="Debug taken-cartela polling")
    parser.add_argument("--round", "-r", help="Specific round ID to inspect")
    parser.add_argument("--url", "-u", default=BASE, help="Server base URL")
    args = parser.parse_args()

    global BASE
    if args.url:
        BASE = args.url.rstrip("/")

    print(f"\n{'='*60}")
    print(f"TAKEN-CARTELA DEEP DEBUG")
    print(f"{'='*60}")
    print(f"Server: {BASE}")
    print()

    # Step 1: Find active rounds (selecting or playing)
    print("--- Step 1: Find active rounds (status in [selecting, playing]) ---")
    status, data = fetch_json("/api/db/rounds?filters=" + urllib.parse.quote(json.dumps([["status", "in", ["selecting", "playing"]]])))
    print(f"  HTTP {status}")
    if status == 200:
        docs = data.get("documents", data if isinstance(data, list) else [])
        if isinstance(data, dict) and "documents" in data:
            docs = data["documents"]
        elif isinstance(data, dict):
            docs = [data]
        print(f"  Found {len(docs)} active round(s)")
        if not docs:
            print("  ❌ No active rounds found")
        for d in docs:
            rid = d.get("id", "?")
            rd = d.get("data", {})
            print(f"  Round: {rid}")
            print(f"    status: {rd.get('status')}")
            print(f"    player_count: {rd.get('player_count')}")
            tc = rd.get("taken_cartelas", [])
            print(f"    taken_cartelas ({len(tc)}): {tc[:20]}{'...' if len(tc) > 20 else ''}")
            print(f"    stake: {rd.get('stake')}")
            print(f"    players: {list(rd.get('players', {}).keys())}")
    else:
        print(f"  ❌ Error: {data}")

    # Step 2: If round ID provided, fetch that specific document
    print()
    print("--- Step 2: Fetch specific round document via REST ---")
    round_id = args.round
    if not round_id:
        # Find first selecting round
        status2, data2 = fetch_json("/api/db/rounds?filters=" + urllib.parse.quote(json.dumps([["status", "==", "selecting"]])))
        if status2 == 200:
            docs2 = data2.get("documents", []) if isinstance(data2, dict) and "documents" in data2 else (data2 if isinstance(data2, list) else [])
            if docs2:
                round_id = docs2[0].get("id", docs2[0] if isinstance(docs2[0], str) else None)

    if round_id:
        print(f"  Fetching round: {round_id}")
        status3, data3 = fetch_json(f"/api/db/rounds/{round_id}")
        print(f"  HTTP {status3}")
        if status3 == 200:
            rd_data = data3.get("data", {})
            print(f"  ✅ Round document found")
            print(f"    status: {rd_data.get('status')}")
            print(f"    taken_cartelas ({len(rd_data.get('taken_cartelas', []))}): {rd_data.get('taken_cartelas', [])[:30]}")
            print(f"    player_count: {rd_data.get('player_count')}")
            print(f"    players: {list(rd_data.get('players', {}).keys())}")
            print(f"    stake: {rd_data.get('stake')}")
            print(f"    created_at: {rd_data.get('created_at')}")
        else:
            print(f"  ❌ Error: {data3}")
    else:
        print("  ❌ No round ID available")

    # Step 3: Test the onSnapshot endpoint (direct document GET)
    print()
    print("--- Step 3: Direct document GET (same as polling does) ---")
    if round_id:
        status4, data4 = fetch_json(f"/api/db/rounds/{round_id}")
        print(f"  HTTP {status4}")
        if status4 == 200:
            rd_data = data4.get("data", {})
            tc = rd_data.get("taken_cartelas", [])
            print(f"  ✅ taken_cartelas = {tc[:30]}{'...' if len(tc) > 30 else ''}")
            print(f"  ✅ count = {len(tc)}")
            print(f"  ✅ document complete: {list(rd_data.keys())}")
        else:
            print(f"  ❌ Error fetching document: {data4}")

    # Step 4: Check cartelas_master (does the client fetch this?)
    print()
    print("--- Step 4: Cartelas master count ---")
    status5, data5 = fetch_json("/api/db/cartelas_master?order_by=number&order_dir=ASCENDING")
    print(f"  HTTP {status5}")
    if status5 == 200:
        docs5 = data5.get("documents", []) if isinstance(data5, dict) else (data5 if isinstance(data5, list) else [])
        print(f"  ✅ {len(docs5)} cartelas exist")
    else:
        print(f"  ❌ Error: {data5}")

    print()
    print("--- CONCLUSION ---")
    if round_id and status == 200:
        rd_data = data3.get("data", {})
        tc = rd_data.get("taken_cartelas", [])
        print(f"  Round {round_id}")
        print(f"  Status: {rd_data.get('status')}")
        print(f"  taken_cartelas: {len(tc)} items")
        print(f"  Players: {list(rd_data.get('players', {}).keys())}")
        if tc:
            print(f"  ✅ taken_cartelas HAS data — polling SHOULD detect these")
            print(f"  ❓ If the page still doesn't show 'TAKEN', the polling code is not running on the client")
        else:
            print(f"  ⚠️ taken_cartelas is empty — no player has confirmed yet")
    else:
        print("  ❌ Could not complete analysis")

    print(f"\n{'='*60}")
    print("To see live polling on the client, add this to the card-select page:")
    print("  A visible debug indicator has been added to the page (top-right corner)")
    print("  Look for the small 'TAKEN' debug badge on the card selection screen")
    print(f"{'='*60}")

if __name__ == "__main__":
    main()
