// Verifikasi dark mode: hero (descender aksen serif) + batas section video.
const { chromium } = require("playwright-core");

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2800);
  await page.screenshot({ path: "verify-hero-dark.png" });

  await page.evaluate(() => {
    const scroller = document.querySelector(".homepage-scroll");
    const heading = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent.includes("Explore"),
    );
    const scrollerRect = scroller.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    scroller.scrollTop = scroller.scrollTop + (headingRect.top - scrollerRect.top) - 460;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: "verify-boundary-dark.png" });
  await browser.close();
  console.log("DONE");
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
