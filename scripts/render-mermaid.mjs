// ============================================================================
// render-mermaid.mjs
// ----------------------------------------------------------------------------
// Mengubah setiap blok ```mermaid di DOKUMENTASI_FLOWCHART.md menjadi file
// SVG + PNG di docs/flowchart/ — supaya flowchart bisa DILIHAT sebagai gambar
// (bukan cuma dibaca sebagai teks).
//
// Renderer: @mermaid-js/mermaid-cli (mmdc) + Chrome yang sudah ada di komputer,
// jadi tidak perlu mengunduh Chromium (~150 MB) lagi.
//
// Pemakaian:
//   node scripts/render-mermaid.mjs                    # semua diagram
//   node scripts/render-mermaid.mjs --only 4           # hanya diagram ke-4
//   node scripts/render-mermaid.mjs --svg-only         # tanpa PNG (lebih cepat)
//   node scripts/render-mermaid.mjs --md FILE.md --out DIR
//
// Keluaran: <out>/NN-slug-judul.svg  dan  <out>/NN-slug-judul.png
// ============================================================================

import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// ─── Argumen ────────────────────────────────────────────────────────────────
function readArgs(argv) {
  const args = { md: "DOKUMENTASI_FLOWCHART.md", out: "docs/flowchart", only: null, svgOnly: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--md") args.md = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--only") args.only = Number(argv[++i]);
    else if (argv[i] === "--svg-only") args.svgOnly = true;
  }
  return args;
}

// ─── Cari browser yang sudah terpasang ──────────────────────────────────────
// puppeteer dipasang dengan PUPPETEER_SKIP_DOWNLOAD=1, jadi Chromium bawaan tidak
// ada — kita pakai Chrome/Edge milik pengguna.
function findBrowser() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe")
      : null,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return candidates.find((p) => p && existsSync(p)) ?? null;
}

function slug(text) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// ─── Ambil blok mermaid dari markdown ───────────────────────────────────────
// Judul diambil dari heading "## N. Judul" tepat di atas setiap blok.
function extractDiagrams(markdown) {
  const lines = markdown.split(/\r?\n/);
  const found = [];
  let heading = null;

  for (let i = 0; i < lines.length; i++) {
    const h = lines[i].match(/^##\s+(?:\d+\.\s*)?(.+?)\s*$/);
    if (h) heading = h[1].trim();

    if (!/^```mermaid\s*$/.test(lines[i])) continue;

    const body = [];
    for (i++; i < lines.length && !/^```\s*$/.test(lines[i]); i++) body.push(lines[i]);
    found.push({ index: found.length + 1, title: heading ?? `diagram-${found.length + 1}`, code: body.join("\n") });
  }
  return found;
}

// ─── Render ─────────────────────────────────────────────────────────────────
function runMmdc({ browser, config, mmd, output, format, scale, background, timeout }) {
  const cli = resolve("node_modules/@mermaid-js/mermaid-cli/src/cli.js");
  const argv = [
    cli,
    "-i",
    mmd,
    "-o",
    output,
    "-p",
    config,
    "-f", // timpa kalau sudah ada
    "--outputFormat",
    format,
  ];
  if (format === "png") argv.push("-s", String(scale), "-b", background);
  return execFileSync(process.execPath, argv, {
    stdio: ["ignore", "pipe", "pipe"],
    timeout,
    env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: "1" },
  });
}

const args = readArgs(process.argv.slice(2));
const mdPath = resolve(args.md);
const outDir = resolve(args.out);

if (!existsSync(mdPath)) {
  console.error(`Sumber tidak ditemukan: ${mdPath}`);
  process.exit(1);
}

const browser = findBrowser();
if (!browser) {
  console.error(
    "Chrome/Edge tidak ditemukan. Set PUPPETEER_EXECUTABLE_PATH ke path browser, lalu ulangi.",
  );
  process.exit(1);
}

const diagrams = extractDiagrams(readFileSync(mdPath, "utf8"));
if (diagrams.length === 0) {
  console.error(`Tidak ada blok \`\`\`mermaid di ${mdPath}`);
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
const scratch = mkdtempSync(join(tmpdir(), "mermaid-render-"));
const config = join(scratch, "puppeteer.json");
writeFileSync(
  config,
  JSON.stringify({
    executablePath: browser,
    args: ["--no-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
  }),
);

const kb = (p) => (statSync(p).size / 1024).toFixed(1) + " KB";

console.log(`Sumber     : ${mdPath}`);
console.log(`Keluaran   : ${outDir}`);
console.log(`Perender   : mmdc ${JSON.parse(readFileSync(resolve("node_modules/@mermaid-js/mermaid-cli/package.json"), "utf8")).version} + ${browser}`);
console.log(`Diagram    : ${diagrams.length}${args.only ? ` (hanya #${args.only})` : ""}\n`);

const results = [];
const started = Date.now();

for (const d of diagrams) {
  if (args.only !== null && d.index !== args.only) continue;

  const base = `${String(d.index).padStart(2, "0")}-${slug(d.title)}`;
  const mmd = join(scratch, `${base}.mmd`);
  writeFileSync(mmd, d.code + "\n");

  const row = { index: d.index, title: d.title, base, svg: "-", png: "-", error: null };
  try {
    const svgPath = join(outDir, `${base}.svg`);
    runMmdc({ browser, config, mmd, output: svgPath, format: "svg", timeout: 120_000 });
    row.svg = existsSync(svgPath) ? kb(svgPath) : "kosong";

    if (!args.svgOnly) {
      const pngPath = join(outDir, `${base}.png`);
      runMmdc({
        browser,
        config,
        mmd,
        output: pngPath,
        format: "png",
        scale: 2,
        background: "white",
        timeout: 120_000,
      });
      row.png = existsSync(pngPath) ? kb(pngPath) : "kosong";
    }
  } catch (err) {
    const msg = String(err.stderr ?? err.message ?? err)
      .split(/\r?\n/)
      .filter((l) => l.trim())
      .slice(-1)[0];
    row.error = msg.slice(0, 160);
  }

  results.push(row);
  const status = row.error ? "GAGAL" : "OK";
  console.log(
    `  ${String(d.index).padStart(2, "0")}. ${d.title.slice(0, 42).padEnd(44)} svg ${row.svg.padStart(9)}  png ${row.png.padStart(9)}  ${status}`,
  );
  if (row.error) console.log(`      ${row.error}`);
}

rmSync(scratch, { recursive: true, force: true });

const failed = results.filter((r) => r.error);
console.log(
  `\n${results.length - failed.length}/${results.length} diagram berhasil dirender` +
    ` dalam ${((Date.now() - started) / 1000).toFixed(1)} detik.`,
);
if (failed.length) {
  console.log(`Gagal: ${failed.map((f) => f.index).join(", ")}`);
  process.exit(1);
}
