import asyncio
import json
import sys
import urllib.request

from playwright.async_api import async_playwright

sys.stdout.reconfigure(encoding="utf-8")

KEY = "8bb6b7c45e0e18fef1b758bc6dc85d7b1bac11b42e2e53faab3b88595572189d"
URL = "https://mantledb.sh/v2/roster-site-visits/ticker-messages"
HDR = {
    "X-Mantle-Key": KEY,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0",
}

payload = {
    "pending": [
        {
            "id": "t_demo1",
            "text": "تهنئة تجريبية للشريط الإخباري",
            "name": "خالد",
            "empId": "8715",
            "at": 1,
            "status": "pending",
        }
    ],
    "approved": [
        {
            "id": "t_ok1",
            "text": "مرحباً بكم في الشريط الإخباري",
            "name": "المشرف",
            "empId": "",
            "at": 2,
            "approvedAt": 2,
            "status": "approved",
        }
    ],
}
req = urllib.request.Request(
    URL, data=json.dumps(payload, ensure_ascii=False).encode(), headers=HDR, method="POST"
)
with urllib.request.urlopen(req, timeout=20) as r:
    print("seed", r.status)


async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        page = await browser.new_page(viewport={"width": 390, "height": 844})
        await page.goto("http://localhost:8765/index.html", wait_until="domcontentloaded")
        await page.evaluate(
            "() => { localStorage.setItem('rosterLang','ar'); localStorage.setItem('featureNotesFabDismissed_v1','1'); }"
        )
        await page.add_script_tag(url="http://localhost:8765/holiday-ticker.js?v=msg")
        await page.wait_for_timeout(1500)
        await page.evaluate(
            """() => {
          const c = document.getElementById('chg-card');
          if (c) { c.hidden = true; c.style.display = 'none'; }
          const f = document.getElementById('featureNotesFab');
          if (f) { f.hidden = true; f.style.display = 'none'; }
          window.rosterHolidayTicker && window.rosterHolidayTicker.refresh();
        }"""
        )
        await page.wait_for_timeout(1200)
        info = await page.evaluate(
            """() => {
          const el = document.getElementById('holidayTicker');
          const btn = document.getElementById('htOpenBoard');
          return {
            on: !!(el && el.classList.contains('on')),
            text: ((el && el.innerText) || '').replace(/\\s+/g, ' ').slice(0, 180),
            hasBtn: !!btn
          };
        }"""
        )
        print("ticker", info)
        await page.click("#htOpenBoard")
        await page.wait_for_timeout(1000)
        print("board", page.url)
        # moderate page loads
        await page.goto("http://localhost:8765/ticker-board/moderate.html", wait_until="domcontentloaded")
        await page.fill("#pinInput", "912")
        await page.click("#pinBtn")
        await page.wait_for_timeout(1500)
        stats = await page.evaluate(
            """() => ({
          pending: document.getElementById('statPending').textContent,
          approved: document.getElementById('statApproved').textContent,
          list: document.getElementById('list').innerText.slice(0, 120)
        })"""
        )
        print("mod", stats)
        await browser.close()


asyncio.run(main())
