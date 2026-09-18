// ============================================================================
// render-drawio-ascii.mjs
// ----------------------------------------------------------------------------
// Menampilkan isi file .drawio sebagai gambar ASCII di terminal.
//
// Gunanya: layout bisa diperiksa "dengan mata" langsung dari teks — tanpa perlu
// membuka draw.io dan tanpa perlu bisa melihat gambar. Node digambar sebagai
// kotak berisi kode (0-9A-Z...), panah digambar sebagai garis siku-siku dengan
// kepala panah, dan daftar kode → judul node dicetak di bawah gambar.
//
// Pemakaian:
//   node scripts/render-drawio-ascii.mjs                       # semua halaman
//   node scripts/render-drawio-ascii.mjs <file.drawio> 8       # hanya halaman 8
//   node scripts/render-drawio-ascii.mjs <file.drawio> 8 140 120
//                                                             ^lebar ^tinggi
// ============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FILE = process.argv[2] ?? "DOKUMENTASI_FLOWCHART.drawio";
const ONLY = process.argv[3] ? Number(process.argv[3]) : null;
const MAXW = Number(process.argv[4] ?? 116);
const MAXH = Number(process.argv[5] ?? 92);

const ALPHA = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const HEADS = { up: "^", down: "v", left: "<", right: ">" };

function decode(text) {
  return text
    .replace(/&#xa;/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function portOf(x, y) {
  if (x === 0) return { side: "left", frac: y };
  if (x === 1) return { side: "right", frac: y };
  if (y === 0) return { side: "top", frac: x };
  if (y === 1) return { side: "bottom", frac: x };
  return { side: "middle", frac: 0.5 };
}

function pointOnSide(box, port) {
  const { side, frac } = port;
  if (side === "bottom") return { x: box.x + box.w * frac, y: box.y + box.h };
  if (side === "top") return { x: box.x + box.w * frac, y: box.y };
  if (side === "right") return { x: box.x + box.w, y: box.y + box.h * frac };
  if (side === "left") return { x: box.x, y: box.y + box.h * frac };
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function parsePage(chunk, index) {
  const name = decode((chunk.match(/name="([^"]*)"/) || [])[1] ?? `page-${index + 1}`);

  const frames = [
    ...chunk.matchAll(
      /<mxCell id="(cluster_[A-Za-z0-9_]+)" value="([^"]*)"[^>]*><mxGeometry x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)"/g,
    ),
  ].map((m) => ({
    id: m[1],
    label: decode(m[2]),
    x: +m[3],
    y: +m[4],
    w: +m[5],
    h: +m[6],
    frame: true,
  }));

  const nodes = [
    ...chunk.matchAll(
      /<mxCell id="(node_[A-Za-z0-9_]+)" value="([^"]*)"[^>]*><mxGeometry x="(-?\d+)" y="(-?\d+)" width="(\d+)" height="(\d+)"/g,
    ),
  ].map((m) => ({
    id: m[1],
    label: decode(m[2]),
    x: +m[3],
    y: +m[4],
    w: +m[5],
    h: +m[6],
    frame: false,
  }));

  const boxById = new Map([...frames, ...nodes].map((b) => [b.id, b]));

  const edges = [];
  const edgeRe =
    /<mxCell id="edge_page-\d+_\d+" value="([^"]*)"[^>]*style="([^"]*)"[^>]*source="([^"]*)" target="([^"]*)"[^>]*><mxGeometry[^>]*>(<Array[^>]*>(.*?)<\/Array>)?/g;
  for (const m of chunk.matchAll(edgeRe)) {
    const [, label, style, source, target, , array] = m;
    const box = (key) => {
      const hit = style.match(new RegExp(key + "=([-0-9.]+)"));
      return hit ? Number(hit[1]) : 0.5;
    };
    const sourceBox = boxById.get(source);
    const targetBox = boxById.get(target);
    if (!sourceBox || !targetBox) continue;

    const sourcePort = portOf(box("exitX"), box("exitY"));
    const targetPort = portOf(box("entryX"), box("entryY"));
    const exitPoint = pointOnSide(sourceBox, sourcePort);
    const entryPoint = pointOnSide(targetBox, targetPort);
    const middle = array
      ? [...array.matchAll(/<mxPoint x="(-?\d+)" y="(-?\d+)"\/>/g)].map((p) => ({
          x: +p[1],
          y: +p[2],
        }))
      : [];

    edges.push({
      label: decode(label),
      from: sourceBox,
      to: targetBox,
      fromSide: sourcePort.side,
      toSide: targetPort.side,
      loop: /strokeColor=#ea580c/.test(style),
      points: [exitPoint, ...middle, entryPoint],
    });
  }

  return { index, name, nodes, frames, edges };
}

// ─── Gambar ─────────────────────────────────────────────────────────────────
function pencil(ch) {
  return (canvas, x, y, char) => {
    if (y < 0 || y >= canvas.length) return;
    if (x < 0 || x >= canvas[0].length) return;
    canvas[y][x] = char;
  };
}

// Karakter tikungan ditentukan oleh pasangan (arah datang, arah pergi) — bukan
// sekadar himpunan arah. "datang dari atas lalu belok kanan" (└) berbeda dari
// "datang dari kiri lalu belok bawah" (┐), walau himpunan arahnya sama-sama
// {vertikal, horizontal}.
const CORNERS = {
  "down>right": "└",
  "down>left": "┘",
  "up>right": "┌",
  "up>left": "┐",
  "right>down": "┐",
  "right>up": "┘",
  "left>down": "┌",
  "left>up": "└",
  "down>up": "│",
  "up>down": "│",
  "left>right": "─",
  "right>left": "─",
};

function cornerChar(dirIn, dirOut) {
  return CORNERS[`${dirIn}>${dirOut}`] ?? "+";
}

function directionBetween(a, b) {
  if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y) * 2) return b.x > a.x ? "right" : "left";
  return b.y > a.y ? "down" : "up";
}

function render(page) {
  const spanX = Math.max(...[...page.nodes, ...page.frames].map((n) => n.x + n.w)) - 0;
  const spanY = Math.max(...[...page.nodes, ...page.frames].map((n) => n.y + n.h)) - 0;

  let sx = spanX / (MAXW - 2);
  let sy = sx * 2; // satu baris teks ~ 2x lebar satu karakter
  const rowsNeeded = Math.ceil(spanY / sy) + 2;
  if (rowsNeeded > MAXH) {
    const k = rowsNeeded / MAXH;
    sx *= k;
    sy *= k;
  }

  const cols = Math.min(MAXW, Math.ceil(spanX / sx) + 2);
  const rows = Math.min(MAXH, Math.ceil(spanY / sy) + 2);
  const canvas = Array.from({ length: rows }, () => Array(cols).fill(" "));
  const put = pencil();

  const gx = (x) => Math.max(0, Math.min(cols - 1, Math.round(x / sx)));
  const gy = (y) => Math.max(0, Math.min(rows - 1, Math.round(y / sy)));

  // 1) Frame cluster (garis putus-putus)
  for (const f of page.frames) {
    const x0 = gx(f.x);
    const x1 = gx(f.x + f.w);
    const y0 = gy(f.y);
    const y1 = gy(f.y + f.h);
    for (let x = x0; x <= x1; x++) {
      put(canvas, x, y0, "┄");
      put(canvas, x, y1, "┄");
    }
    for (let y = y0; y <= y1; y++) {
      put(canvas, x0, y, "┆");
      put(canvas, x1, y, "┆");
    }
  }

  // 2) Garis panah (digambar sebelum node, supaya node selalu di atas)
  const heads = [];
  for (const e of page.edges) {
    for (let i = 0; i < e.points.length - 1; i++) {
      const a = e.points[i];
      const b = e.points[i + 1];
      const ax = gx(a.x);
      const ay = gy(a.y);
      const bx = gx(b.x);
      const by = gy(b.y);

      if (ax === bx) {
        const from = Math.min(ay, by);
        const to = Math.max(ay, by);
        for (let y = from; y <= to; y++) {
          if (canvas[y] && (canvas[y][ax] === " " || canvas[y][ax] === "┄")) put(canvas, ax, y, "│");
        }
        if (i === 0 && ay === by) put(canvas, ax, ay, "│");
      } else if (ay === by) {
        const from = Math.min(ax, bx);
        const to = Math.max(ax, bx);
        for (let x = from; x <= to; x++) {
          if (canvas[ay] && (canvas[ay][x] === " " || canvas[ay][x] === "┆")) put(canvas, x, ay, "─");
        }
      } else {
        // Jaga-jaga: rute tidak seharusnya miring.
        const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let s = 0; s <= steps; s++) {
          put(canvas, Math.round(ax + ((bx - ax) * s) / steps), Math.round(ay + ((by - ay) * s) / steps), "·");
        }
      }
    }

    // Tikungan: dirIn = arah datang (dari titik sebelumnya ke titik ini),
    // dirOut = arah pergi (dari titik ini ke titik berikutnya).
    for (let i = 1; i < e.points.length - 1; i++) {
      const dirIn = directionBetween(e.points[i - 1], e.points[i]);
      const dirOut = directionBetween(e.points[i], e.points[i + 1]);
      put(canvas, gx(e.points[i].x), gy(e.points[i].y), cornerChar(dirIn, dirOut));
    }

    const last = e.points[e.points.length - 1];
    const prev = e.points[e.points.length - 2];
    // Kepala panah menunjuk arah GERAK (dari titik sebelumnya ke titik masuk).
    heads.push({ x: gx(last.x), y: gy(last.y), dir: directionBetween(prev, last) });
  }

  // 3) Node (kotak + kode)
  page.nodes.forEach((n, i) => {
    const code = ALPHA[i] ?? "?";
    const x0 = gx(n.x);
    const x1 = gx(n.x + n.w);
    const y0 = gy(n.y);
    const y1 = gy(n.y + n.h);
    for (let x = x0; x <= x1; x++) {
      put(canvas, x, y0, "─");
      put(canvas, x, y1, "─");
    }
    for (let y = y0; y <= y1; y++) {
      put(canvas, x0, y, "│");
      put(canvas, x1, y, "│");
    }
    put(canvas, x0, y0, "┌");
    put(canvas, x1, y0, "┐");
    put(canvas, x0, y1, "└");
    put(canvas, x1, y1, "┘");
    n.code = code;
    if (x1 - x0 >= 2 && y1 - y0 >= 2) {
      put(canvas, Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2), code);
    } else {
      put(canvas, x0, y0, code);
    }
  });

  // 4) Kepala panah (setelah node, supaya batas node tidak menutupinya)
  for (const h of heads) {
    const char = HEADS[h.dir] ?? "?";
    const nearest = [
      [h.x, h.y],
      [h.x, h.y + (h.dir === "up" ? 1 : h.dir === "down" ? -1 : 0)],
      [h.x + (h.dir === "left" ? 1 : h.dir === "right" ? -1 : 0), h.y],
    ];
    put(canvas, nearest[0][0], nearest[0][1], char);
  }

  // 5) Label panah (Ya/Tidak) — hanya kalau selnya masih kosong/titik garis
  for (const e of page.edges) {
    if (!e.label) continue;
    const mid = Math.floor((e.points.length - 1) / 2);
    const point = e.points[mid];
    const x = gx(point.x) + 2;
    const y = gy(point.y);
    if (canvas[y] && canvas[y][x] === " ") {
      for (let k = 0; k < e.label.length && x + k < cols; k++) {
        if (canvas[y][x + k] !== " ") break;
        put(canvas, x + k, y, e.label[k]);
      }
    }
  }

  return {
    cols,
    rows,
    lines: canvas.map((row) => row.join("").replace(/\s+$/, "")),
    scale: { sx: Math.round(sx), sy: Math.round(sy) },
  };
}

// ─── Main ───────────────────────────────────────────────────────────────────
const xml = readFileSync(resolve(FILE), "utf8");
const chunks = xml.split("<diagram ").slice(1);
const pages = chunks.map((chunk, i) => parsePage(chunk, i));

for (const page of pages) {
  if (ONLY !== null && page.index + 1 !== ONLY) continue;
  const { lines, cols, rows, scale } = render(page);
  console.log(`\n${"━".repeat(cols)}`);
  console.log(`${page.index + 1}. ${page.name}`);
  console.log(
    `${"━".repeat(cols)}   (${cols}x${rows} karakter, skala ~${scale.sx}px/kolom, ${scale.sy}px/baris)\n`,
  );
  console.log(lines.join("\n"));
  console.log(`\nNode (${page.nodes.length}) · panah (${page.edges.length}):`);
  for (const n of page.nodes) {
    const label = n.label.length > 64 ? n.label.slice(0, 61) + "..." : n.label;
    console.log(`  [${n.code}] ${label}`);
  }
  console.log(`\nPanah (${page.edges.length}) — supaya pasangan & arahnya bisa dibaca tanpa gambar:`);
  for (const e of page.edges) {
    const first = e.points[0];
    const last = e.points[e.points.length - 1];
    const dy = last.y - first.y;
    const arah =
      dy > 4 ? "tur↓" : dy < -4 ? "naik↑ (balik)" : "sebaris→";
    const lbl = e.label ? ` [${e.label}] ` : " ";
    const trim = (s) => (s.length > 30 ? s.slice(0, 29) + "…" : s);
    console.log(
      `  [${e.from.code}] ${trim(e.from.label)}${lbl}→ [${e.to.code}] ${trim(e.to.label)}` +
        `   ${arah} (keluar ${e.fromSide} / masuk ${e.toSide})`,
    );
  }
  const loops = page.edges.filter((e) => e.loop).length;
  console.log(`  panah balik (oranye): ${loops}`);
}
