// ============================================================================
// check-render.mjs
// ----------------------------------------------------------------------------
// Memeriksa hasil render (docs/flowchart/*.svg) dan membandingkannya dengan
// file .drawio — supaya kualitas gambar bisa diperiksa sebagai angka, bukan
// hanya "kelihatannya sudah rapi".
//
// Yang diperiksa per diagram:
//   1. jumlah node, panah, dan subgraph di SVG  ==  jumlah di .drawio
//   2. ada node bertumpuk di render (kotak saling tumpang-tindih)
//   3. ada node tanpa label / label kosong
//
// Catatan bentuk: node biasa = <rect>, keputusan = <polygon> (belah ketupat),
// database = <path> (silinder). Ketiganya harus dikenali — kalau tidak, node
// keputusan dan database akan terlewat dan hitungannya tampak tidak cocok.
// Silinder hanya punya path tanpa koordinat kotak, jadi batasnya diperkirakan
// dari kotak label + tebal tutup silinder (cukup untuk cek tumpang-tindih).
//
// Pemakaian: node scripts/check-render.mjs [folder-render] [file.drawio]
// ============================================================================

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

const RENDER_DIR = resolve(process.argv[2] ?? "docs/flowchart");
const DRAWIO = resolve(process.argv[3] ?? "DOKUMENTASI_FLOWCHART.drawio");
const TOLERANCE = 2; // px — kotak yang bersinggungan wajar; yang tumpang-tindih tidak

const decode = (t) =>
  t
    .replace(/&#xa;/gi, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();

const attr = (tag, name) => {
  const m = tag?.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
};
const num = (tag, name) => {
  const v = attr(tag, name);
  return v === null ? null : Number(v);
};

// ─── Baca satu SVG hasil render ─────────────────────────────────────────────
function readSvg(file) {
  const svg = readFileSync(file, "utf8");
  const nodes = [];

  // Tiap node dibaca per kelompok <g class="node ...">, bukan dengan satu regex
  // raksasa — supaya bentuk kotak (rect) dan belah ketupat (polygon) sama-sama
  // tertangkap, dan label boleh berisi markup bersarang.
  const groups = [...svg.matchAll(/<g class="node [^"]*"[^>]*>/g)];
  for (let i = 0; i < groups.length; i++) {
    const head = groups[i][0];
    const seg = svg.slice(groups[i].index, groups[i + 1]?.index ?? svg.length);

    const translate = attr(head, "transform")?.match(/translate\(([-0-9.]+),\s*([-0-9.]+)\)/);
    if (!translate) continue;
    const tx = Number(translate[1]);
    const ty = Number(translate[2]);

    // Bentuk: polygon (keputusan) lebih dulu, lalu rect, terakhir path (silinder).
    const poly = seg.match(/<polygon [^>]*class="[^"]*label-container[^"]*"[^>]*\/?>/);
    const rect = seg.match(/<rect [^>]*class="[^"]*label-container[^"]*"[^>]*\/?>/);
    const path = seg.match(/<path [^>]*class="[^"]*label-container[^"]*"[^>]*\/?>/);

    let box = null;
    if (poly) {
      const shape = attr(poly[0], "transform")?.match(/translate\(([-0-9.]+),\s*([-0-9.]+)\)/);
      const ox = shape ? Number(shape[1]) : 0;
      const oy = shape ? Number(shape[2]) : 0;
      const pts = attr(poly[0], "points")
        .trim()
        .split(/\s+/)
        .map((p) => p.split(",").map(Number));
      if (pts.length >= 3) {
        const xs = pts.map((p) => p[0] + ox + tx);
        const ys = pts.map((p) => p[1] + oy + ty);
        box = {
          x: Math.min(...xs),
          y: Math.min(...ys),
          w: Math.max(...xs) - Math.min(...xs),
          h: Math.max(...ys) - Math.min(...ys),
        };
      }
    } else if (rect) {
      box = {
        x: tx + num(rect[0], "x"),
        y: ty + num(rect[0], "y"),
        w: num(rect[0], "width"),
        h: num(rect[0], "height"),
      };
    }

    // Label selalu ada, apa pun bentuk kotaknya.
    const label = seg.match(/<span class="nodeLabel"[^>]*>([\s\S]*?)<\/span>/);
    const text = decode(label?.[1] ?? "");

    // Silinder (database): batas diperkirakan dari kotak label + tutup silinder.
    if (!box && path) {
      const lt = seg
        .match(/<g class="label"[^>]*transform="translate\(([-0-9.]+),\s*([-0-9.]+)\)"/)
        ?.slice(1, 3)
        .map(Number);
      const fo = seg.match(/<foreignObject width="([-0-9.]+)" height="([-0-9.]+)"/);
      if (lt && fo) {
        const padX = 12;
        const padY = 16;
        box = {
          x: tx + lt[0] - padX,
          y: ty + lt[1] - padY,
          w: Number(fo[1]) + padX * 2,
          h: Number(fo[2]) + padY * 2,
        };
      }
    }
    if (!box) continue;
    nodes.push({ ...box, label: text });
  }

  // Panah: hitung elemen <path>, bukan kemunculan string "flowchart-link" —
  // string itu juga ada di blok <style>, sehingga dulu kelebihan 1 per diagram.
  const edges = (svg.match(/<path [^>]*class="[^"]*flowchart-link[^"]*"/g) ?? []).length;
  // Hanya <g class="cluster"> — bukan pembungkus <g class="clusters"> dan bukan
  // <g class="cluster-label">, yang keduanya bukan subgraph.
  const clusters = (svg.match(/<g class="cluster[ "']/g) ?? []).length;

  return { nodes, edges, clusters };
}

// ─── Baca jumlah node/panah/subgraph per halaman di .drawio ─────────────────
function readDrawioPages(file) {
  return readFileSync(file, "utf8")
    .split("<diagram ")
    .slice(1)
    .map((chunk, i) => ({
      index: i + 1,
      name: decode((chunk.match(/name="([^"]*)"/) ?? [])[1] ?? ""),
      nodes: (chunk.match(/<mxCell id="node_/g) ?? []).length,
      edges: (chunk.match(/<mxCell id="edge_page-\d+_\d+"/g) ?? []).length,
      clusters: (chunk.match(/<mxCell id="cluster_/g) ?? []).length,
    }));
}

// ─── Jalan ─────────────────────────────────────────────────────────────────
if (!existsSync(RENDER_DIR)) {
  console.error(
    `Folder render tidak ada: ${RENDER_DIR}\nJalankan dulu: node scripts/render-mermaid.mjs`,
  );
  process.exit(1);
}

const svgFiles = readdirSync(RENDER_DIR)
  .filter((f) => f.endsWith(".svg"))
  .sort();
const pages = existsSync(DRAWIO) ? readDrawioPages(DRAWIO) : [];

console.log(`Render : ${RENDER_DIR} (${svgFiles.length} SVG)`);
console.log(
  `Banding: ${existsSync(DRAWIO) ? DRAWIO : "(file .drawio tidak ada — hanya memeriksa render)"}\n`,
);
console.log("  #   node svg/drawio   panah svg/drawio   sub svg/drawio  tumpang  kosong  status");
console.log("  " + "─".repeat(84));

let bad = 0;
for (const [i, f] of svgFiles.entries()) {
  const { nodes, edges, clusters } = readSvg(join(RENDER_DIR, f));
  const page = pages.find((p) => p.name.startsWith(f.slice(0, 2) + ".")) ?? pages[i];

  let overlapping = 0;
  for (let a = 0; a < nodes.length; a++) {
    for (let b = a + 1; b < nodes.length; b++) {
      const A = nodes[a];
      const B = nodes[b];
      const dx = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
      const dy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
      if (dx > TOLERANCE && dy > TOLERANCE) overlapping++;
    }
  }

  const blank = nodes.filter((n) => n.label.length === 0).length;
  const cocok =
    !page ||
    (page.nodes === nodes.length && page.edges === edges && page.clusters === clusters);
  const ok = overlapping === 0 && blank === 0 && cocok;
  if (!ok) bad++;

  const tab = (svgN, drawN) => `${String(svgN).padStart(4)}/${String(drawN ?? "-").padEnd(4)}`;
  console.log(
    `  ${String(i + 1).padStart(2)}  ${tab(nodes.length, page?.nodes)}      ` +
      `${tab(edges, page?.edges)}      ${tab(clusters, page?.clusters)}` +
      `     ${String(overlapping).padStart(4)}  ${String(blank).padStart(5)}   ` +
      `${(ok ? "OK" : "PERIKSA").padEnd(7)} ${f.replace(/^\d+-|\.svg$/g, "").slice(0, 30)}`,
  );
}

console.log(
  `\n${svgFiles.length - bad}/${svgFiles.length} diagram bersih` +
    ` — node/panah/subgraph cocok dengan .drawio, tidak ada kotak bertumpuk, tidak ada label kosong.`,
);
if (bad) {
  console.log("Ada diagram yang perlu diperiksa (lihat kolom tumpang/kosong/status).");
  process.exit(1);
}
