// Uji visual hero di 3 breakpoint (375/768/1280) + deteksi horizontal scroll.
// Pakai playwright-core + Microsoft Edge bawaan Windows (tanpa download browser).
const { chromium } = require("playwright-core");
const path = require("path");

const EDGE =
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

(async () => {
  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: true,
  });

  const viewports = [
    { w: 375, h: 667, name: "mobile" },
    { w: 768, h: 1024, name: "tablet" },
    { w: 1280, h: 800, name: "desktop" },
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({
      viewport: { width: vp.w, height: vp.h },
    });
    try {
      await page.goto("http://localhost:5173/", {
        waitUntil: "domcontentloaded",
        timeout: 20000,
      });
    } catch (e) {
      console.log(`${vp.name}: goto gagal — ${e.message}`);
    }
    await page.waitForTimeout(3000); // animasi hero masuk + font

    const metrics = await page.evaluate(() => {
      const doc = document.documentElement;
      const h2 = document.querySelector("section h2");
      const cs = h2 ? getComputedStyle(h2) : null;
      const mockupImg = document.querySelector("img[alt*='LedgerFlow']");
      const img = mockupImg ? mockupImg.getBoundingClientRect() : null;
      return {
        scrollWidth: doc.scrollWidth,
        clientWidth: doc.clientWidth,
        hasHScroll: doc.scrollWidth > doc.clientWidth,
        headingFontSize: cs ? cs.fontSize : null,
        headingText: h2 ? h2.textContent.slice(0, 60) : null,
        headingOverflow: h2
          ? h2.scrollWidth > h2.clientWidth + 1
          : null,
        heroVisualRight: img ? Math.round(img.right) : null,
        heroVisualWidth: img ? Math.round(img.width) : null,
      };
    });

    await page.screenshot({
      path: path.join(__dirname, "..", `hero-${vp.name}-${vp.w}.png`),
      fullPage: false,
    });
    console.log(`[${vp.name} ${vp.w}px]`, JSON.stringify(metrics));
    await page.close();
  }

  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
