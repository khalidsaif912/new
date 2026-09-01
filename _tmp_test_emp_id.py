import asyncio
from playwright.async_api import async_playwright


async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        p = await b.new_page(viewport={"width": 390, "height": 844})
        await p.goto("http://localhost:8765/ticker-board/", wait_until="domcontentloaded")
        await p.evaluate("() => localStorage.clear()")
        await p.reload(wait_until="domcontentloaded")
        await p.wait_for_timeout(800)
        await p.fill("#msg", "رسالة تجريبية")
        await p.click("#sendBtn")
        await p.wait_for_timeout(700)
        print("no id:", await p.locator("#status").inner_text())
        await p.fill("#empIdInput", "8715")
        await p.wait_for_timeout(1000)
        print("who:", await p.locator("#who").inner_text())
        print(
            "saved:",
            await p.evaluate(
                "() => ({id: localStorage.getItem('exportSavedEmpId'), name: localStorage.getItem('exportSavedEmpName')})"
            ),
        )
        await p.click("#sendBtn")
        await p.wait_for_timeout(1800)
        print("after:", await p.locator("#status").inner_text())
        await b.close()


asyncio.run(main())
