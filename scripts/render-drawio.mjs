// ============================================================================
// render-drawio.mjs
// ----------------------------------------------------------------------------
// Me-render DOKUMENTASI_FLOWCHART.drawio memakai renderer RESMI draw.io
// (viewer-static dari diagrams.net) di headless Chrome, lalu:
//
//   1. Mengukur jalur panah yang benar-benar dihasilkan draw.io
//      (state.absolutePoints) — bukan geometri perkiraan script pembuatnya.
//   2. Mengekspor tiap halaman sebagai SVG + PNG di docs/flowchart/drawio/.
//
// Yang diperiksa dari hasil render asli:
//   - node bertumpuk
//   - ruas panah menembus kotak node
//   - ruas panah tidak siku-siku (miring)
//   - label keluar dari kotak node-nya
//
// Pemakaian:
//   node scripts/render-drawio.mjs               # semua halaman
//   node scripts/render-drawio.mjs --only 1      # halaman 1 saja
//   node scripts/render-drawio.mjs --no-export   # hanya ukur, tanpa gambar
// ============================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import puppeteer from "puppeteer";

const VIEWER = resolve(".cache/viewer.min.js");
const DRAWIO = resolve("DOKUMENTASI_FLOWCHART.drawio");
const OUT = resolve("docs/flowchart/drawio");
const PAD = 24;
const TOL = 1.5; // px toleransi pembulatan

const args = process.argv.slice(2);
const only = args.includes("--only") ? Number(args[args.indexOf("--only") + 1]) : null;
const exportImages = !args.includes("--no-export");
const dump = args.includes("--dump");

// ─── Browser yang sudah terpasang ───────────────────────────────────────────
function findBrowser() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA
      ? resolve(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe")
      : null,
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return candidates.find((p) => p && existsSync(p)) ?? undefined;
}

// ─── Baca halaman dari file .drawio ─────────────────────────────────────────
function readPages() {
  return readFileSync(DRAWIO, "utf8")
    .split("<diagram ")
    .slice(1)
    .map((chunk, i) => {
      const name = (chunk.match(/name="([^"]*)"/) ?? [])[1] ?? `page-${i + 1}`;
      const body = chunk.slice(chunk.indexOf(">") + 1, chunk.lastIndexOf("</diagram>"));
      return { index: i + 1, name, xml: body.trim() };
    });
}

// ─── Ukur geometri hasil render ─────────────────────────────────────────────
// Dijalankan DI DALAM halaman, memakai API mxGraph milik viewer.
function measureInPage() {
  const g = window.__viewer.graph;
  const view = g.view;
  const scale = view.scale || 1;
  const tx = view.translate.x;
  const ty = view.translate.y;

  const vertices = [];
  const labels = [];
  const edges = [];

  for (const cell of Object.values(g.getModel().cells)) {
    if (!cell.geometry) continue;

    if (cell.vertex && !cell.geometry.relative) {
      const b = g.getCellBounds(cell);
      if (b) {
        // "container" = frame subgraph, dikenali dari punya sel anak. Frame harus
        // dikecualikan: node di dalamnya wajar terkurung, dan panah yang masuk
        // keluar frame memang melewati garis frame.
        const container = g.getModel().getChildCells(cell, true, false).length > 0;
        const ancestors = [];
        for (let p = cell.parent; p; p = p.parent) ancestors.push(p.id);
        vertices.push({
          id: cell.id,
          x: b.x,
          y: b.y,
          w: b.width,
          h: b.height,
          container,
          ancestors,
        });
      }
      continue;
    }
    // Label: sel anak dengan geometri relatif (menempel pada node/panah).
    if (!cell.vertex && !cell.edge && cell.geometry.relative) {
      const b = g.getCellBounds(cell);
      if (b) labels.push({ id: cell.id, x: b.x, y: b.y, w: b.width, h: b.height });
      continue;
    }
    if (cell.edge) {
      const state = view.getState(cell);
      const pts = (state?.absolutePoints ?? [])
        .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
        .map((p) => ({ x: p.x, y: p.y }));
      edges.push({ id: cell.id, source: cell.source?.id, target: cell.target?.id, points: pts });
    }
  }

  const bounds = view.getGraphBounds();
  return {
    vertices,
    labels,
    edges,
    view: { scale, tx, ty },
    graphBounds: { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height },
    svg: view.canvas.outerHTML,
  };
}

// ─── Analisis geometri ──────────────────────────────────────────────────────
const inside = (b, x, y, tol = 0) =>
  x > b.x + tol && x < b.x + b.w - tol && y > b.y + tol && y < b.y + b.h - tol;

function segmentHitsBox(a, b, box) {
  // Ruas sumbu-paralel: cukup periksa apakah bounding box ruas memotong kotak.
  const x1 = Math.min(a.x, b.x) + TOL;
  const x2 = Math.max(a.x, b.x) - TOL;
  const y1 = Math.min(a.y, b.y) + TOL;
  const y2 = Math.max(a.y, b.y) - TOL;
  return !(x2 < box.x || x1 > box.x + box.w || y2 < box.y || y1 > box.y + box.h);
}

function analyse(page) {
  const { vertices, labels, edges } = page;

  // Frame subgraph tidak selalu berupa container sungguhan di XML: bisa jadi
  // kotak biasa yang posisinya menaungi node. Apa pun bentuknya, secara visual
  // frame TIDAK BOLEH dihitung sebagai penghalang — node di dalamnya memang
  // terkurung, dan panah masuk/keluar memang melewati garis frame. Jadi frame
  // dideteksi secara geometris: kotak yang memuat kotak lain sepenuhnya.
  const frames = new Set();
  for (const a of vertices) {
    for (const b of vertices) {
      if (a === b) continue;
      if (
        b.x >= a.x - TOL &&
        b.y >= a.y - TOL &&
        b.x + b.w <= a.x + a.w + TOL &&
        b.y + b.h <= a.y + a.h + TOL &&
        (b.w < a.w - TOL || b.h < a.h - TOL)
      ) {
        frames.add(a.id);
        break;
      }
    }
  }

  // 1. Node bertumpuk — pasangan induk–anak (node di dalam frame) dikecualikan,
  //    karena terkurung itu memang tujuannya.
  let overlaps = 0;
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const A = vertices[i];
      const B = vertices[j];
      if (frames.has(A.id) || frames.has(B.id)) continue;
      if (
        Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x) > TOL &&
        Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y) > TOL
      )
        overlaps++;
    }
  }

  // 2. Ruas panah: miring, atau menembus node/label
  let slant = 0;
  let throughVertex = 0;
  let throughLabel = 0;
  const hits = [];
  const slants = [];
  const labelHits = [];
  for (const e of edges) {
    for (let i = 0; i < e.points.length - 1; i++) {
      const a = e.points[i];
      const b = e.points[i + 1];
      const horizontal = Math.abs(a.y - b.y) <= TOL;
      const vertical = Math.abs(a.x - b.x) <= TOL;
      if (!horizontal && !vertical) {
        slant++;
        slants.push({ edge: e.id, a, b });
        continue;
      }
      for (const v of vertices) {
        // Frame subgraph bukan penghalang: panah masuk/keluar frame memang
        // melewati garisnya. Yang tidak boleh: garis menembus kotak NODE.
        if (frames.has(v.id) || v.id === e.source || v.id === e.target) continue;
        if (segmentHitsBox(a, b, v)) {
          throughVertex++;
          hits.push({ edge: e.id, obstacle: v.id, a, b });
        }
      }
      for (const l of labels) {
        if (l.id === e.id) continue;
        if (segmentHitsBox(a, b, l)) {
          throughLabel++;
          labelHits.push({ edge: e.id, obstacle: l.id, a, b });
        }
      }
    }
  }

  // 3. Label yang keluar dari kotak node induknya
  let labelOutside = 0;
  for (const l of labels) {
    const parent = vertices.find(
      (v) =>
        !v.container &&
        l.x > v.x - 40 &&
        l.x < v.x + v.w + 40 &&
        l.y > v.y - 40 &&
        l.y < v.y + v.h + 40,
    );
    if (!parent) continue;
    if (
      l.x < parent.x - TOL ||
      l.y < parent.y - TOL ||
      l.x + l.w > parent.x + parent.w + TOL ||
      l.y + l.h > parent.y + parent.h + TOL
    )
      labelOutside++;
  }

  return {
    overlaps,
    slant,
    throughVertex,
    throughLabel,
    labelOutside,
    hits,
    slants,
    labelHits,
    frames: frames.size,
    nodes: vertices.length - frames.size,
    zeroLength: edges.reduce(
      (n, e) =>
        n +
        e.points.filter(
          (p, i) =>
            i > 0 && Math.abs(p.x - e.points[i - 1].x) < TOL && Math.abs(p.y - e.points[i - 1].y) < TOL,
        ).length,
      0,
    ),
  };
}

// ─── Jalan ─────────────────────────────────────────────────────────────────
if (!existsSync(VIEWER)) {
  console.error(
    `Viewer belum ada: ${VIEWER}\nUnduh dulu:\n  curl -sL --create-dirs -o .cache/viewer.min.js https://viewer.diagrams.net/js/viewer-static.min.js`,
  );
  process.exit(1);
}

const pages = readPages().filter((p) => only === null || p.index === only);
const viewerScript = readFileSync(VIEWER, "utf8");
if (exportImages) mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: findBrowser(),
  // --allow-file-access-from-files diperlukan untuk mengukur isi PNG hasil
  // ekspor dari halaman file:// (tanpa ini canvas dianggap tercemar).
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--allow-file-access-from-files"],
});

// Mengukur berapa persen piksel PNG yang bukan putih. Gunanya: memastikan file
// gambar benar-benar berisi tulisan/gambar, bukan halaman kosong — kegagalan
// yang tidak terlihat dari daftar file (file ada, ukuran wajar, isinya putih).
async function inkCoverage(browser, pngPath) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 300, height: 300 });
    await page.goto("file:///" + pngPath.replace(/\\/g, "/"), { waitUntil: "load" });
    return await page.evaluate(async () => {
      const img = document.querySelector("img");
      if (!img) return null;
      await img.decode();
      const w = Math.max(1, Math.min(900, img.naturalWidth));
      const h = Math.max(1, Math.min(900, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;
      let ink = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 245 || data[i + 1] < 245 || data[i + 2] < 245) ink++;
      }
      return { ratio: ink / (w * h), w: img.naturalWidth, h: img.naturalHeight };
    });
  } catch {
    return null;
  } finally {
    await page.close();
  }
}

console.log(`Render : ${DRAWIO}`);
console.log(`Mesin  : viewer-static draw.io di Chrome headless\n`);  console.log("  #  node frame panah  tumpang  miring  tembus-node  titik-ganda  label-keluar  status  judul");
console.log("  " + "─".repeat(100));

const png = [];
let bad = 0;
try {
  for (const p of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: 2400, height: 1800 });
    await page.setContent(
      `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
         html,body{margin:0;background:#fff}
         #host{width:4000px;height:4000px}
       </style></head><body><div id="host"></div></body></html>`,
      { waitUntil: "load" },
    );
    await page.addScriptTag({ content: viewerScript });
    // Viewer resmi meminta argumen kedua berupa DOM element (bukan string XML):
    // ia membaca d.ownerDocument lalu men-serialize lewat mxUtils.getXml(d).
    await page.evaluate((xml) => {
      const host = document.getElementById("host");
      const doc = new DOMParser().parseFromString(xml, "text/xml");
      window.__viewer = new GraphViewer(host, doc.documentElement, {
        nav: false,
        resize: false,
        tooltips: false,
      });
    }, p.xml);

    await page.waitForFunction(() => window.__viewer?.graph?.view?.canvas, { timeout: 30_000 });
    await page.evaluate(() => window.__viewer.graph.view.validate());

    const raw = await page.evaluate(measureInPage);
    const stats = analyse(raw);

    if (dump) {
      console.log(
        `\n--- dump halaman ${p.index} --- view.scale=${raw.view.scale} translate=(${raw.view.tx},${raw.view.ty})`,
      );
      for (const v of raw.vertices)
        console.log(
          `  vertex ${v.id.padEnd(18)} container=${v.container ? "ya " : "tidak"} ` +
            `anc=[${v.ancestors.join(",")}] ` +
            `box=(${Math.round(v.x)},${Math.round(v.y)} ${Math.round(v.w)}x${Math.round(v.h)})`,
        );
      for (const e of raw.edges)
        console.log(
          `  edge   ${e.id.padEnd(18)} ${e.source} -> ${e.target}  ${e.points.length} titik: ` +
            e.points.map((pt) => `(${Math.round(pt.x)},${Math.round(pt.y)})`).join(" "),
        );
      for (const h of stats.hits)
        console.log(
          `  TEMBUS ${h.edge} menembus ${h.obstacle} pada ruas ` +
            `(${Math.round(h.a.x)},${Math.round(h.a.y)})-(${Math.round(h.b.x)},${Math.round(h.b.y)})`,
        );
      for (const s of stats.slants)
        console.log(
          `  MIRING ${s.edge} ruas (${Math.round(s.a.x)},${Math.round(s.a.y)})-(${Math.round(s.b.x)},${Math.round(s.b.y)})`,
        );
      for (const h of stats.labelHits)
        console.log(`  TEMBUS-TEKS ${h.edge} menembus label ${h.obstacle}`);
      console.log();
    }

    const clean =
      stats.overlaps === 0 &&
      stats.slant === 0 &&
      stats.throughVertex === 0 &&
      stats.labelOutside === 0;
    // Titik ganda dari router draw.io sendiri (segmen panjang nol) tidak
    // dihitung sebagai kegagalan — tidak terlihat, hanya muncul sebagai handle
    // saat diedit. Dilaporkan terpisah supaya tetap terpantau.
    if (!clean) bad++;

    console.log(
      `  ${String(p.index).padStart(2)}  ${String(stats.nodes).padStart(4)}` +
        `  ${String(stats.frames).padStart(5)}` +
        `  ${String(raw.edges.length).padStart(5)}` +
        `  ${String(stats.overlaps).padStart(7)}` +
        `  ${String(stats.slant).padStart(6)}` +
        `  ${String(stats.throughVertex).padStart(12)}` +
        `  ${String(stats.zeroLength).padStart(12)}` +
        `  ${String(stats.labelOutside).padStart(12)}` +
        `  ${(clean ? "OK" : "PERIKSA").padEnd(7)} ${p.name.slice(0, 30)}`,
    );

    if (exportImages) {
      // Ekspor SVG: lebarkan kanvas ke seluruh isi, lalu simpan.
      const svgMarkup = await page.evaluate((pad) => {
        const svg = window.__viewer.graph.view.canvas;
        const b = window.__viewer.graph.view.getGraphBounds();
        const w = Math.ceil(b.width + pad * 2);
        const h = Math.ceil(b.height + pad * 2);
        svg.setAttribute("viewBox", `${b.x - pad} ${b.y - pad} ${w} ${h}`);
        svg.setAttribute("width", String(w));
        svg.setAttribute("height", String(h));
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        return { markup: svg.outerHTML, w, h };
      }, PAD);

      const slug = `${String(p.index).padStart(2, "0")}-${p.name
        .replace(/^\d+\.\s*/, "")
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 48)}`;
      const svgPath = resolve(OUT, `${slug}.svg`);
      writeFileSync(
        svgPath,
        `<?xml version="1.0" encoding="UTF-8"?>\n${svgMarkup.markup.replace(
          /^<svg/,
          `<svg xmlns:xlink="http://www.w3.org/1999/xlink"`,
        )}`,
      );

      // Rasterkan SVG itu jadi PNG (Chrome bisa membuka file SVG langsung).
      const raster = await browser.newPage();
      await raster.setViewport({
        width: Math.min(4000, svgMarkup.w + 4),
        height: Math.min(4000, svgMarkup.h + 4),
        deviceScaleFactor: 2,
      });
      await raster.goto("file:///" + svgPath.replace(/\\/g, "/"), { waitUntil: "load" });
      const pngPath = resolve(OUT, `${slug}.png`);
      await raster.screenshot({ path: pngPath });
      await raster.close();

      const ink = await inkCoverage(browser, pngPath);
      png.push(
        ink
          ? { slug, ratio: ink.ratio, w: ink.w, h: ink.h }
          : { slug, ratio: null, w: 0, h: 0 },
      );
    }

    await page.close();
  }
} finally {
  await browser.close();
}

console.log(
  `\n${pages.length - bad}/${pages.length} halaman bersih menurut renderer draw.io sendiri` +
    ` — diukur dari jalur panah yang benar-benar digambar draw.io (absolutePoints),` +
    ` bukan dari hitungan script pembuatnya.`,
);

if (png.length) {
  const blank = png.filter((p) => p.ratio === null || p.ratio < 0.005);
  console.log(`\nPNG hasil ekspor (${png.length} gambar) — cek "tidak kosong":`);
  for (const p of png)
    console.log(
      `  ${p.slug.slice(0, 44).padEnd(46)} ${String(p.w).padStart(5)}x${String(p.h).padStart(4)}px  ` +
        `tinta ${p.ratio === null ? "?" : (p.ratio * 100).toFixed(2) + "%"}`,
    );
  console.log(
    blank.length
      ? `\nPERINGATAN: ${blank.length} PNG tampak kosong — ${blank.map((b) => b.slug).join(", ")}`
      : `\nSemua PNG berisi gambar (tidak ada yang kosong).`,
  );
  if (blank.length) process.exitCode = 1;
}
