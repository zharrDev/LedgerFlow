// Inspeksi v2: paksa semua elemen pointer-events:auto supaya hit-test
// menangkap overlay dekoratif (glow/blur), lalu petakan pewarna di sekitar
// garis batas pada beberapa kolom x.
const { chromium } = require("playwright-core");

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

(async () => {
  const browser = await chromium.launch({ executablePath: EDGE, headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => localStorage.setItem("theme", "dark"));
  await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(2500);

  await page.evaluate(() => {
    const scroller = document.querySelector(".homepage-scroll");
    const heading = [...document.querySelectorAll("h2")].find((h) =>
      h.textContent.includes("Explore"),
    );
    const scrollerRect = scroller.getBoundingClientRect();
    const headingRect = heading.getBoundingClientRect();
    scroller.scrollTop = scroller.scrollTop + (headingRect.top - scrollerRect.top) - 520;
    const style = document.createElement("style");
    style.textContent = "* { pointer-events: auto !important; }";
    document.head.appendChild(style);
  });
  await page.waitForTimeout(600);

  const result = await page.evaluate(() => {
    const painterAt = (x, y) => {
      let el = document.elementFromPoint(x, y);
      const chain = [];
      while (el) {
        const cs = getComputedStyle(el);
        const bg = cs.backgroundColor;
        const bi = cs.backgroundImage;
        if ((bg && bg !== "rgba(0, 0, 0, 0)") || (bi && bi !== "none")) {
          chain.push(
            `${el.tagName}.${String(el.className).slice(0, 55)} bg=${bg} img=${bi.slice(0, 60)}`,
          );
          break;
        }
        el = el.parentElement;
      }
      return chain[0] || "(no painter)";
    };
    const out = [];
    for (const x of [20, 640, 1260]) {
      let prev = null;
      for (let y = 320; y <= 620; y += 2) {
        const p = painterAt(x, y);
        if (p !== prev) {
          out.push({ x, y, painter: p });
          prev = p;
        }
      }
    }
    return out;
  });
  console.log(JSON.stringify(result, null, 1));
  await browser.close();
})().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
