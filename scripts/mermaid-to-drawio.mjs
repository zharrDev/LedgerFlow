// ============================================================================
// mermaid-to-drawio.mjs
// ----------------------------------------------------------------------------
// Mengubah setiap blok ```mermaid (flowchart) di DOKUMENTASI_FLOWCHART.md
// menjadi satu halaman di dalam file .drawio (mxGraph XML), supaya bisa dibuka
// & diedit di app.diagrams.net (draw.io) atau ekstensi "Draw.io Integration".
//
// PRINSIP RUTE — supaya tiap panah jelas pasangan & arahnya:
//
//   · Jalan MENDATAR selalu di celah antar-baris (bagian yang memang kosong).
//     Jalan mendatar di tengah baris akan menembus kotak node — ini yang bikin
//     garis tampak "nyasar" dan tidak jelas menuju mana.
//   · Jalan TEGAK selalu di koridor (x) yang sudah dipastikan bebas node:
//     kolom dummy untuk panah lintas-baris, jalur luar kanan untuk panah balik.
//   · SLOT PORT — tiap panah punya titik sambung sendiri di sisi node (kalau
//     3 panah menempel di titik yang sama, garisnya menumpuk dan tampak seperti
//     satu panah yang bercabang).
//   · RANK — panah yang menutup siklus (retry/cooldown) TIDAK dipakai
//     menghitung rank; kalau ikut dipakai, posisi node bisa terbalik.
//
// Pemakaian:
//   node scripts/mermaid-to-drawio.mjs
//   node scripts/mermaid-to-drawio.mjs <input.md> <output.drawio>
// ============================================================================

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const INPUT = process.argv[2] ?? "DOKUMENTASI_FLOWCHART.md";
const OUTPUT = process.argv[3] ?? "DOKUMENTASI_FLOWCHART.drawio";

const GAP_X = 80; // jarak antar node satu baris
const GAP_Y = 96; // jarak antar baris (rank) — jadi celah tempat jalan mendatar
const GROUP_GAP = 150; // jarak antar blok cluster/kelompok
const MAX_CHARS = 28; // panjang baris maksimum di dalam node
const MARGIN = 40; // offset supaya semua koordinat positif
const LANE_GAP = 26; // jarak antar jalur panah balik di sisi kanan
const LANE_START = 70; // jarak jalur pertama dari node paling kanan
const DUMMY = 10; // ukuran dummy node (koridor panah lintas-baris)

// ─── Baca blok mermaid beserta judul section terdekat ───────────────────────
function extractDiagrams(markdown) {
  const lines = markdown.split(/\r?\n/);
  const diagrams = [];
  let heading = null;
  let buffer = null;

  for (const line of lines) {
    const h = line.match(/^#{2,3}\s+(.*)$/);
    if (h && buffer === null) heading = h[1].trim();

    if (line.trim() === "```mermaid") {
      buffer = [];
      continue;
    }
    if (buffer !== null && line.trim() === "```") {
      diagrams.push({ title: heading ?? "Diagram", source: buffer.join("\n") });
      buffer = null;
      continue;
    }
    if (buffer !== null) buffer.push(line);
  }
  return diagrams;
}

// ─── Parser flowchart Mermaid (subset yang dipakai dokumen ini) ─────────────
const ARROWS = ["-.->", "-->", "==>", "---"];

// Cari SEMUA panah di satu baris (mendukung rantai `A --> B --> C`).
function findArrows(line) {
  const found = [];
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuote = !inQuote;
    if (inQuote) continue;
    for (const token of ARROWS) {
      if (line.startsWith(token, i)) {
        found.push({ index: i, token });
        i += token.length - 1;
        break;
      }
    }
  }
  return found;
}

function parseNodeSpec(text) {
  const m = text.match(/^([A-Za-z0-9_]+)([\s\S]*)$/);
  if (!m) return null;
  const id = m[1];
  const rest = (m[2] ?? "").trim();
  if (!rest) return { id, label: null, shape: null };

  const patterns = [
    { re: /^\[\("([\s\S]*)"\)\]$/, shape: "cylinder" },
    { re: /^\{"([\s\S]*)"\}$/, shape: "decision" },
    { re: /^\["([\s\S]*)"\]$/, shape: "rect" },
    { re: /^\("([\s\S]*)"\)$/, shape: "rounded" },
    { re: /^\[([\s\S]*)\]$/, shape: "rect" },
  ];
  for (const { re, shape } of patterns) {
    const hit = rest.match(re);
    if (hit) return { id, label: hit[1].replace(/^"|"$/g, ""), shape };
  }
  return { id, label: null, shape: null };
}

// Pecah satu baris menjadi rangkaian node + label tiap panah.
function parseChain(line) {
  const arrows = findArrows(line);
  if (!arrows.length) return null;

  const parts = [];
  let cursor = 0;
  for (const arrow of arrows) {
    parts.push(line.slice(cursor, arrow.index));
    cursor = arrow.index + arrow.token.length;
  }
  parts.push(line.slice(cursor));

  const labels = [];

  // Label bergaya pipa menempel di AWAL bagian setelah panah.
  const withoutPipeLabels = parts.map((part, i) => {
    let text = part.trim();
    if (i > 0 && text.startsWith("|")) {
      const close = text.indexOf("|", 1);
      if (close > 0) {
        labels[i - 1] = text.slice(1, close).replace(/^"|"$/g, "").trim();
        text = text.slice(close + 1).trim();
      }
    }
    return text;
  });

  // Label bergaya `-- label` menempel di AKHIR bagian sebelum panah.
  const nodeSpecs = withoutPipeLabels.map((text, i) => {
    if (i < withoutPipeLabels.length - 1 && !/[\]\})]$/.test(text)) {
      const withLabel = text.match(/^(.*?)\s+--\s+(.+)$/);
      if (withLabel) {
        labels[i] = withLabel[2].replace(/^"|"$/g, "").trim();
        return withLabel[1].trim();
      }
    }
    return text;
  });

  const steps = nodeSpecs
    .map((text, i) => {
      const spec = parseNodeSpec(text);
      return spec ? { spec, arrow: arrows[i]?.token ?? null, label: labels[i] ?? "" } : null;
    })
    .filter(Boolean);

  return steps.length >= 2 ? steps : null;
}

function parseDiagram(source) {
  const nodes = new Map();
  const edges = [];
  const clusters = [];
  const fills = new Map();
  let current = null;

  const clusterIds = new Set(
    [...source.matchAll(/^\s*subgraph\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1]),
  );

  const ensureNode = (id, label, shape) => {
    if (clusterIds.has(id)) return null;
    let node = nodes.get(id);
    if (!node) {
      node = { id, label: id, shape: "rect", cluster: current ? current.id : null };
      nodes.set(id, node);
    }
    if (label) node.label = label;
    if (shape) node.shape = shape;
    if (!node.cluster && current) node.cluster = current.id;
    if (current) current.members.add(id);
    return node;
  };

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("%%") || /^flowchart\b/.test(line)) continue;

    if (line === "end") {
      current = null;
      continue;
    }

    const sub = line.match(/^subgraph\s+([A-Za-z0-9_]+)(?:\["([\s\S]*)"\])?$/);
    if (sub) {
      current = { id: sub[1], label: sub[2] ?? sub[1], members: new Set() };
      clusters.push(current);
      continue;
    }

    const style = line.match(/^style\s+([A-Za-z0-9_]+)\s+(.+)$/);
    if (style) {
      const fill = style[2].match(/fill:\s*([^,;]+)/);
      if (fill) fills.set(style[1], fill[1].trim().toLowerCase());
      continue;
    }

    if (/^classDef\b/.test(line) || /^class\b/.test(line)) continue;

    const chain = parseChain(line);
    if (!chain) {
      const solo = parseNodeSpec(line);
      if (solo) ensureNode(solo.id, solo.label, solo.shape);
      continue;
    }

    for (const step of chain) ensureNode(step.spec.id, step.spec.label, step.spec.shape);

    for (let i = 0; i < chain.length - 1; i++) {
      edges.push({
        from: chain[i].spec.id,
        to: chain[i + 1].spec.id,
        label: chain[i].label || "",
        dashed: chain[i].arrow === "-.->",
      });
    }
  }

  return { nodes, edges, clusters, fills };
}

// ─── Ukuran node ────────────────────────────────────────────────────────────
function wrapLine(text, max) {
  if (text.length <= max) return [text];
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= max) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [text];
}

function wrapLabel(label) {
  return label
    .split(/<br\s*\/?>/i)
    .flatMap((segment) => wrapLine(segment, MAX_CHARS))
    .join("<br/>");
}

function measure(node) {
  node.label = wrapLabel(node.label);
  const lines = node.label.split(/<br\s*\/?>/i);
  const longest = Math.max(...lines.map((l) => l.length), 1);
  let width = Math.min(300, Math.max(140, Math.round(longest * 7.1 + 34)));
  let height = Math.max(46, lines.length * 20 + 26);
  if (node.shape === "decision") {
    width = Math.round(width * 1.12);
    height += 8;
  }
  if (node.shape === "cylinder") height += 12;
  return { width, height };
}

// ─── Layout satu kelompok ───────────────────────────────────────────────────
// Koordinat lokal (bisa negatif; digeser ke positif di tahap akhir).
function layoutGroup(nodeIds, internalEdges, nodes) {
  const sizeOf = (id) => nodes.get(id) ?? { width: DUMMY, height: DUMMY };

  // 1) Rank. Panah yang menutup siklus dicatat lalu DIKECUALIKAN.
  const out = new Map(nodeIds.map((id) => [id, []]));
  const preds = new Map(nodeIds.map((id) => [id, []]));
  for (const edge of internalEdges) {
    if (!out.has(edge.from) || !out.has(edge.to)) continue;
    out.get(edge.from).push(edge.to);
    preds.get(edge.to).push(edge.from);
  }

  const state = new Map();
  const finish = [];
  const backEdges = new Set();
  const visit = (u) => {
    state.set(u, 1);
    for (const v of out.get(u)) {
      if (state.get(v) === 1) {
        backEdges.add(`${u}>${v}`);
        continue;
      }
      if (state.get(v) !== 2) visit(v);
    }
    state.set(u, 2);
    finish.push(u);
  };
  for (const id of nodeIds) if (!state.get(id)) visit(id);

  const rank = new Map(nodeIds.map((id) => [id, 0]));
  for (const u of [...finish].reverse()) {
    for (const v of out.get(u)) {
      if (backEdges.has(`${u}>${v}`)) continue;
      rank.set(v, Math.max(rank.get(v), rank.get(u) + 1));
    }
  }
  const maxRank = Math.max(...nodeIds.map((id) => rank.get(id) ?? 0));

  // 2) Pisahkan panah: turun, naik (balik), sebaris.
  const downward = [];
  const upward = [];
  for (const edge of internalEdges) {
    const a = rank.get(edge.from);
    const b = rank.get(edge.to);
    if (a === undefined || b === undefined) continue;
    if (b > a) downward.push(edge);
    else if (b < a) upward.push(edge);
  }

  // 3) Dummy node = koridor tegak untuk panah yang melompati beberapa baris.
  const chainOf = new Map();
  const dummies = [];
  downward.forEach((edge, i) => {
    const chain = [];
    for (let r = rank.get(edge.from) + 1; r < rank.get(edge.to); r++) {
      const dummy = { id: `__d${i}_${r}`, rank: r, width: DUMMY, height: DUMMY };
      dummies.push(dummy);
      chain.push(dummy);
    }
    chainOf.set(edge, chain);
  });

  const baseLayers = Array.from({ length: maxRank + 1 }, () => []);
  for (const id of nodeIds) baseLayers[rank.get(id) ?? 0].push(id);
  for (const dummy of dummies) baseLayers[dummy.rank].push(dummy.id);

  const linkOut = new Map();
  const linkIn = new Map();
  const link = (u, v) => {
    if (!linkOut.has(u)) linkOut.set(u, []);
    if (!linkIn.has(v)) linkIn.set(v, []);
    linkOut.get(u).push(v);
    linkIn.get(v).push(u);
  };
  for (const edge of downward) {
    let prev = edge.from;
    for (const dummy of chainOf.get(edge)) {
      link(prev, dummy.id);
      prev = dummy.id;
    }
    link(prev, edge.to);
  }

  // 4) Urutan: barycenter + pencarian lokal + restart acak.
  const countCrossings = (work) => {
    let total = 0;
    for (let r = 0; r < maxRank; r++) {
      const index = new Map(work[r + 1].map((id, i) => [id, i]));
      const segs = [];
      work[r].forEach((u, ui) => {
        for (const v of linkOut.get(u) ?? []) {
          if (index.has(v)) segs.push([ui, index.get(v)]);
        }
      });
      for (let i = 0; i < segs.length; i++) {
        for (let j = i + 1; j < segs.length; j++) {
          if ((segs[i][0] - segs[j][0]) * (segs[i][1] - segs[j][1]) < 0) total++;
        }
      }
    }
    return total;
  };

  const optimize = (init) => {
    const work = init.map((layer) => layer.slice());

    for (let r = 1; r <= maxRank; r++) {
      const index = new Map();
      work.forEach((layer) => layer.forEach((id, i) => index.set(id, i)));
      const seed = new Map(work[r].map((id, i) => [id, i]));
      const anchor = (id) => {
        const ups = (linkIn.get(id) ?? []).map((u) => index.get(u)).filter((v) => v !== undefined);
        return ups.length ? Math.min(...ups) : Number.MAX_SAFE_INTEGER;
      };
      work[r].sort((a, b) => anchor(a) - anchor(b) || seed.get(a) - seed.get(b));
    }

    const reorder = (r, direction) => {
      const target = r + direction;
      if (target < 0 || target > maxRank) return;
      const index = new Map(work[target].map((id, i) => [id, i]));
      const neighbour = direction < 0 ? linkIn : linkOut;
      const before = new Map(work[r].map((id, i) => [id, i]));
      const keyed = work[r].map((id) => {
        const related = (neighbour.get(id) ?? []).filter((x) => index.has(x));
        const avg = related.length
          ? related.reduce((sum, x) => sum + index.get(x), 0) / related.length
          : Number.MAX_SAFE_INTEGER;
        return { id, avg, seed: before.get(id) };
      });
      keyed.sort((a, b) => a.avg - b.avg || a.seed - b.seed);
      work[r] = keyed.map((k) => k.id);
    };

    for (let pass = 0; pass < 8; pass++) {
      for (let r = 1; r <= maxRank; r++) reorder(r, -1);
      for (let r = maxRank - 1; r >= 0; r--) reorder(r, 1);
    }

    let score = countCrossings(work);
    for (let round = 0; round < 8 && score > 0; round++) {
      let improved = false;
      for (let r = 0; r <= maxRank; r++) {
        for (let i = 0; i + 1 < work[r].length; i++) {
          [work[r][i], work[r][i + 1]] = [work[r][i + 1], work[r][i]];
          const now = countCrossings(work);
          if (now < score) {
            score = now;
            improved = true;
          } else {
            [work[r][i], work[r][i + 1]] = [work[r][i + 1], work[r][i]];
          }
        }
      }
      if (!improved) break;
    }
    return { layers: work, crossings: score };
  };

  let rngState = 20260918;
  const rand = () => {
    rngState = (rngState * 1103515245 + 12345) % 2147483648;
    return rngState / 2147483648;
  };
  const shuffled = (source) =>
    source.map((layer) => {
      const copy = layer.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });

  let bestResult = optimize(baseLayers);
  for (let attempt = 0; attempt < 24 && bestResult.crossings > 0; attempt++) {
    const candidate = optimize(shuffled(baseLayers));
    if (candidate.crossings < bestResult.crossings) bestResult = candidate;
  }
  const layers = bestResult.layers;
  const bestCrossings = bestResult.crossings;

  // 5) Posisi x: rapatkan tiap baris, lalu geser agar segaris dengan tetangga
  //    di baris atas (panah lintas-baris jadi tegak).
  const x = new Map();
  let cursor = 0;
  for (const id of layers[0]) {
    x.set(id, cursor);
    cursor += sizeOf(id).width + GAP_X;
  }
  const layer0Width = Math.max(0, cursor - GAP_X);
  for (const id of layers[0]) x.set(id, (x.get(id) ?? 0) - layer0Width / 2);

  for (let r = 1; r <= maxRank; r++) {
    const above = new Map();
    for (const id of layers[r - 1]) above.set(id, (x.get(id) ?? 0) + sizeOf(id).width / 2);
    let rowCursor = -Infinity;
    for (const id of layers[r]) {
      const related = (linkIn.get(id) ?? []).map((u) => above.get(u)).filter((v) => v !== undefined);
      const preferred = related.length
        ? related.reduce((a, b) => a + b, 0) / related.length - sizeOf(id).width / 2
        : rowCursor;
      const pos = Math.max(preferred, rowCursor);
      x.set(id, pos);
      rowCursor = pos + sizeOf(id).width + GAP_X;
    }
  }

  // 6) Posisi y: satu baris = satu rank; catat juga celah antar-baris.
  const rowTop = new Map();
  const rowBottom = new Map();
  const y = new Map();
  let rowY = 0;
  for (let r = 0; r <= maxRank; r++) {
    const rowIds = layers[r];
    if (!rowIds.length) continue;
    const rowHeight = Math.max(...rowIds.map((id) => sizeOf(id).height));
    rowTop.set(r, rowY);
    rowBottom.set(r, rowY + rowHeight);
    for (const id of rowIds) y.set(id, rowY + (rowHeight - sizeOf(id).height) / 2);
    rowY += rowHeight + GAP_Y;
  }

  const gapBelow = (r) => {
    const bottom = rowBottom.get(r);
    const nextTop = rowTop.get(r + 1);
    if (bottom === undefined) return 0;
    return nextTop === undefined ? bottom + GAP_Y / 2 : (bottom + nextTop) / 2;
  };
  const gapAbove = (r) => {
    const top = rowTop.get(r);
    const prevBottom = rowBottom.get(r - 1);
    if (top === undefined) return 0;
    return prevBottom === undefined ? top - GAP_Y / 2 : (top + prevBottom) / 2;
  };

  // 7) Normalkan kiri ke 0 (sumbu y digeser di tahap akhir).
  const minX = Math.min(...[...x.values()]);
  const positions = new Map();
  for (const id of nodeIds) positions.set(id, { x: x.get(id) - minX, y: y.get(id) });
  const maxRight = Math.max(...nodeIds.map((id) => x.get(id) - minX + sizeOf(id).width));

  const centreX = (id) => x.get(id) - minX + sizeOf(id).width / 2;

  // 8) Jalur mendatar dibagi rata di dalam celah antar-baris. Kalau semua panah
  //    memakai y yang sama, garis-garisnya menindih jadi satu baris panjang dan
  //    tidak bisa diikuti. Tiap panah dapat "lane" sendiri di celah itu.
  const gapUsage = new Map(); // gapIndex (= rank baris ATAS) -> pemakai
  const noteGap = (gapIndex, edge, seedX) => {
    if (!gapUsage.has(gapIndex)) gapUsage.set(gapIndex, []);
    gapUsage.get(gapIndex).push({ edge, seedX });
  };
  const centreOfLocal = (id) => (x.get(id) ?? 0) + sizeOf(id).width / 2;

  const downGapIndexes = new Map();
  for (const edge of downward) {
    const rs = rank.get(edge.from);
    const rt = rank.get(edge.to);
    const indexes = [];
    for (let r = rs; r < rt; r++) indexes.push(r);
    downGapIndexes.set(edge, indexes);
    indexes.forEach((r) => noteGap(r, edge, centreOfLocal(edge.from)));
  }

  const upGapIndexes = new Map();
  for (const edge of upward) {
    const indexes = [rank.get(edge.from) - 1, rank.get(edge.to) - 1];
    upGapIndexes.set(edge, indexes);
    indexes.forEach((r) => noteGap(r, edge, centreOfLocal(edge.from)));
  }

  const gapBand = (r) => {
    if (r < 0) {
      const top = rowTop.get(0) ?? 0;
      return { top: top - GAP_Y, bottom: top };
    }
    const top = rowBottom.get(r) ?? 0;
    const bottom = rowTop.get(r + 1) ?? top + GAP_Y;
    return { top, bottom };
  };

  const laneYs = new Map(); // edge -> Map<gapIndex, y>
  for (const [gapIndex, users] of gapUsage) {
    const { top, bottom } = gapBand(gapIndex);
    // Urutkan sesuai posisi asal supaya jalur tidak saling menyilang.
    users.sort((a, b) => a.seedX - b.seedX);
    users.forEach((u, i) => {
      const y = Math.round(top + ((bottom - top) * (i + 1)) / (users.length + 1));
      if (!laneYs.has(u.edge)) laneYs.set(u.edge, new Map());
      laneYs.get(u.edge).set(gapIndex, y);
    });
  }

  // 9) Spesifikasi rute (koordinat lokal). Bentuk akhir + port di buildRoutes().
  const routes = new Map();

  for (const edge of downward) {
    const corridorXs = (chainOf.get(edge) ?? []).map((d) => centreX(d.id));
    const lanes = laneYs.get(edge);
    const gaps = downGapIndexes.get(edge).map((r) => lanes?.get(r) ?? gapBelow(r));
    routes.set(edge, { kind: "down", corridorXs, gaps });
  }

  // Kanal panah balik tidak perlu di ujung paling kanan — cukup di sebelah
  // kanan node yang benar-benar dilewatinya. Kanal di ujung jauh membuat
  // jalur mendatarnya panjang melintang seluruh gambar.
  const rightEdgeOf = (id) => x.get(id) - minX + sizeOf(id).width;
  let channelLane = 0;
  for (const edge of upward) {
    const rs = rank.get(edge.from);
    const rt = rank.get(edge.to);
    const [gapSource, gapTarget] = upGapIndexes.get(edge);
    const lanes = laneYs.get(edge);

    const crossed = [];
    for (let r = rt; r < rs; r++) {
      for (const id of layers[r]) crossed.push(rightEdgeOf(id));
    }
    const clearance = Math.max(
      ...crossed,
      rightEdgeOf(edge.from),
      rightEdgeOf(edge.to),
      layer0Width,
    );

    routes.set(edge, {
      kind: "up",
      channel: clearance + LANE_START + channelLane * LANE_GAP,
      gaps: [
        lanes?.get(gapSource) ?? gapAbove(rs),
        lanes?.get(gapTarget) ?? gapAbove(rt),
      ],
    });
    channelLane++;
  }

  // Panah sebaris: langsung kalau bersebelahan; kalau melompati node lain,
  // diputar lewat celah di bawah barisnya.
  const slot = new Map();
  layers.forEach((layer) => layer.forEach((id, idx) => slot.set(id, idx)));
  for (const edge of internalEdges) {
    if (routes.has(edge)) continue;
    const ra = rank.get(edge.from);
    const rb = rank.get(edge.to);
    if (ra !== rb) {
      routes.set(edge, { kind: "side" });
      continue;
    }
    const adjacent = Math.abs((slot.get(edge.from) ?? 0) - (slot.get(edge.to) ?? 0)) <= 1;
    routes.set(
      edge,
      adjacent ? { kind: "flat" } : { kind: "flatDetour", gap: gapBelow(ra) },
    );
  }

  // Celah atas/bawah tiap baris per node — dipakai panah antar-blok supaya
  // jalan mendatarnya jatuh di celah (bebas node), bukan di tengah baris.
  const rowAboveMap = new Map();
  const rowBelowMap = new Map();
  for (const id of nodeIds) {
    const r = rank.get(id) ?? 0;
    rowAboveMap.set(id, gapAbove(r));
    rowBelowMap.set(id, gapBelow(r));
  }

  // Pita tiap celah antar-baris (termasuk celah di atas baris pertama) — dipakai
  // untuk membagi lane panah antar-blok.
  const bands = new Map();
  for (let r = -1; r <= maxRank; r++) {
    if (r < 0) {
      const top = rowTop.get(0) ?? 0;
      bands.set(-1, { top: top - GAP_Y, bottom: top });
      continue;
    }
    const top = rowBottom.get(r);
    if (top === undefined) continue;
    bands.set(r, { top, bottom: rowTop.get(r + 1) ?? top + GAP_Y });
  }

  return {
    positions,
    routes,
    width: maxRight,
    crossings: bestCrossings,
    rowAbove: rowAboveMap,
    rowBelow: rowBelowMap,
    bands,
    rank,
  };
}

// ─── Layout halaman ─────────────────────────────────────────────────────────
function layout(diagram) {
  const { nodes, edges, clusters } = diagram;
  for (const node of nodes.values()) {
    const size = measure(node);
    node.width = size.width;
    node.height = size.height;
  }

  // Diagram ber-subgraph (arsitektur): tiap subgraph satu blok, ditata sendiri
  // lalu ditempel berdampingan supaya frame cluster tidak saling menimpa.
  const groups = [];
  if (clusters.length) {
    for (const cluster of clusters) {
      const nodeIds = [...nodes.values()].filter((n) => n.cluster === cluster.id).map((n) => n.id);
      if (nodeIds.length) groups.push({ nodeIds });
    }
    const freeIds = [...nodes.values()].filter((n) => !n.cluster).map((n) => n.id);
    if (freeIds.length) groups.push({ nodeIds: freeIds });
  } else {
    groups.push({ nodeIds: [...nodes.keys()] });
  }

  const groupOf = new Map();
  groups.forEach((g, i) => g.nodeIds.forEach((id) => groupOf.set(id, i)));

  diagram.routes = new Map();
  diagram.rowAbove = new Map();
  diagram.rowBelow = new Map();
  const groupBounds = [];
  // Pita celah & rank disimpan PER KELOMPOK: tiap kelompok menata barisnya
  // sendiri, jadi nomor rank yang sama bisa punya tinggi baris berbeda.
  const groupBands = [];
  const groupRanks = [];
  let offsetX = 0;
  groups.forEach((group, gi) => {
    const internal = edges.filter(
      (e) => groupOf.get(e.from) === gi && groupOf.get(e.to) === gi && nodes.has(e.from) && nodes.has(e.to),
    );
    const { positions, routes, width, rowAbove, rowBelow, bands, rank } = layoutGroup(
      group.nodeIds,
      internal,
      nodes,
    );
    groupBands.push(bands);
    groupRanks.push(rank);

    for (const [id, pos] of positions) {
      const node = nodes.get(id);
      node.x = offsetX + pos.x;
      node.y = pos.y;
    }
    for (const [id, y] of rowAbove) diagram.rowAbove.set(id, y);
    for (const [id, y] of rowBelow) diagram.rowBelow.set(id, y);
    for (const [edge, route] of routes) {
      diagram.routes.set(edge, {
        ...route,
        channel: route.channel === undefined ? undefined : offsetX + route.channel,
        corridorXs: (route.corridorXs ?? []).map((v) => offsetX + v),
      });
    }
    groupBounds.push({ start: offsetX, end: offsetX + width });
    offsetX += width + GROUP_GAP;
  });

  // Panah antar-blok (mis. Backend → layanan eksternal): dirutekan lewat celah
  // antar-baris + kanal tegak di celah antar-blok. Kalau masuk dari samping,
  // garisnya harus melewati node lain yang sebaris.
  for (const edge of edges) {
    if (diagram.routes.has(edge)) continue;
    const from = groupOf.get(edge.from);
    const to = groupOf.get(edge.to);
    if (from === undefined || to === undefined || from === to) {
      diagram.routes.set(edge, { kind: "side" });
      continue;
    }
    const first = Math.min(from, to);
    const second = Math.max(from, to);
    diagram.routes.set(edge, {
      kind: "across",
      channel: (groupBounds[first].end + groupBounds[second].start) / 2,
    });
  }

  // Panah antar-blok juga dibagi lane di celah antar-baris — kalau tidak,
  // jalan mendatarnya bertumpuk pada satu baris yang sama. Pita celah diambil
  // dari kelompok asal/tujuan masing-masing, bukan dicampur antar kelompok.
  const acrossUse = new Map();
  for (const edge of edges) {
    const route = diagram.routes.get(edge);
    if (!route || route.kind !== "across") continue;
    const sourceGroup = groupOf.get(edge.from);
    const targetGroup = groupOf.get(edge.to);
    if (sourceGroup === undefined || targetGroup === undefined) continue;
    const sourceRank = groupRanks[sourceGroup].get(edge.from);
    const targetRank = groupRanks[targetGroup].get(edge.to);
    if (sourceRank === undefined || targetRank === undefined) continue;

    route.bandSourceKey = `${sourceGroup}|${sourceRank - 1}`;
    route.bandTargetKey = `${targetGroup}|${targetRank - 1}`;
    const seed = nodes.get(edge.from)?.x ?? 0;
    for (const key of new Set([route.bandSourceKey, route.bandTargetKey])) {
      const [gi, band] = key.split("|").map(Number);
      if (!acrossUse.has(key)) {
        acrossUse.set(key, { bounds: groupBands[gi].get(band), users: [] });
      }
      acrossUse.get(key).users.push({ edge, seed });
    }
  }
  for (const [key, group] of acrossUse) {
    if (!group.bounds) continue;
    group.users.sort((a, b) => a.seed - b.seed);
    group.users.forEach((u, i) => {
      const y = Math.round(
        group.bounds.top + ((group.bounds.bottom - group.bounds.top) * (i + 1)) / (group.users.length + 1),
      );
      const route = diagram.routes.get(u.edge);
      if (route.bandSourceKey === key) route.gapSource = y;
      if (route.bandTargetKey === key) route.gapTarget = y;
    });
  }

  for (const cluster of clusters) {
    const members = [...cluster.members].map((id) => nodes.get(id)).filter(Boolean);
    if (!members.length) {
      cluster.box = null;
      continue;
    }
    const pad = 26;
    const top = Math.min(...members.map((n) => n.y)) - pad - 28;
    const left = Math.min(...members.map((n) => n.x)) - pad;
    const right = Math.max(...members.map((n) => n.x + n.width)) + pad;
    const bottom = Math.max(...members.map((n) => n.y + n.height)) + pad;
    cluster.box = {
      x: Math.round(left),
      y: Math.round(top),
      width: Math.round(right - left),
      height: Math.round(bottom - top),
    };
  }
}

// ─── Rute akhir: slot port + jalan ortogonal ────────────────────────────────
const round3 = (n) => Math.round(n * 1000) / 1000;

function pointOnSide(box, side, frac) {
  if (side === "bottom") return { x: box.x + box.width * frac, y: box.y + box.height };
  if (side === "top") return { x: box.x + box.width * frac, y: box.y };
  if (side === "right") return { x: box.x + box.width, y: box.y + box.height * frac };
  return { x: box.x, y: box.y + box.height * frac };
}

function sidesFor(kind, sourceBox, targetBox) {
  const scx = sourceBox.x + sourceBox.width / 2;
  const tcx = targetBox.x + targetBox.width / 2;
  switch (kind) {
    case "down":
      return { exit: "bottom", entry: "top" };
    case "up":
      // Keluar-masuk dari ATAS: jalur mendatarnya jadi jatuh di celah antar-
      // baris (bebas node), bukan di tengah baris yang berisi kotak node.
      return { exit: "top", entry: "top" };
    case "across":
      // Antar-blok: keluar-masuk dari atas supaya jalan mendatarnya di celah.
      return { exit: "top", entry: "top" };
    case "right":
      return { exit: "right", entry: "left" };
    case "left":
      return { exit: "left", entry: "right" };
    case "flat":
      return tcx > scx ? { exit: "right", entry: "left" } : { exit: "left", entry: "right" };
    default:
      return { exit: "bottom", entry: "bottom" };
  }
}

function lateralOf(box, side) {
  return side === "bottom" || side === "top" ? box.x + box.width / 2 : box.y + box.height / 2;
}

// Buang titik berurutan yang sama DAN titik yang cuma mampir di tengah garis
// lurus — waypoint mubazir membuat draw.io menambah tikungan kecil sendiri.
function tidy(points) {
  const unique = [];
  for (const p of points) {
    const last = unique[unique.length - 1];
    if (!last || Math.round(last.x) !== Math.round(p.x) || Math.round(last.y) !== Math.round(p.y)) {
      unique.push({ x: Math.round(p.x), y: Math.round(p.y) });
    }
  }
  const out = [];
  for (let i = 0; i < unique.length; i++) {
    const prev = out[out.length - 1];
    const next = unique[i + 1];
    const collinear =
      prev &&
      next &&
      ((prev.x === unique[i].x && unique[i].x === next.x) ||
        (prev.y === unique[i].y && unique[i].y === next.y));
    if (collinear) continue;
    out.push(unique[i]);
  }
  return out;
}

function buildRoutes(diagram) {
  const { nodes, edges, clusters } = diagram;
  const boxOf = (id) => {
    const node = nodes.get(id);
    if (node) return { x: node.x, y: node.y, width: node.width, height: node.height };
    const cluster = clusters.find((c) => c.id === id);
    return cluster?.box ? { ...cluster.box } : null;
  };
  const isFrame = (id) => clusters.some((c) => c.id === id);

  const descriptors = [];
  edges.forEach((edge, index) => {
    const sourceBox = boxOf(edge.from);
    const targetBox = boxOf(edge.to);
    if (!sourceBox || !targetBox) return;
    const stored = diagram.routes.get(edge) ?? { kind: "down" };
    const kind = isFrame(edge.to) || isFrame(edge.from) ? "side" : stored.kind;
    const sides = sidesFor(kind, sourceBox, targetBox);
    descriptors.push({
      edge,
      index,
      kind,
      stored,
      sourceBox,
      targetBox,
      exitSide: sides.exit,
      entrySide: sides.entry,
      exitFrac: 0.5,
      entryFrac: 0.5,
    });
  });

  // SLOT: tiap panah dapat titik sambung sendiri. Penting — panah KELUAR dan
  // panah MASUK di sisi yang sama harus ikut dibagi dalam satu deret slot.
  // Kalau dibagi terpisah, panah masuk dan panah keluar bisa mendarat di titik
  // yang sama, sehingga tampak seperti satu panah yang bercabang.
  const usage = new Map();
  const addUsage = (nodeId, side, role, d, lateral) => {
    const key = `${nodeId}|${side}`;
    if (!usage.has(key)) usage.set(key, []);
    usage.get(key).push({ role, d, lateral });
  };
  for (const d of descriptors) {
    addUsage(d.edge.from, d.exitSide, "exit", d, lateralOf(d.targetBox, d.exitSide));
    addUsage(d.edge.to, d.entrySide, "entry", d, lateralOf(d.sourceBox, d.entrySide));
  }
  for (const list of usage.values()) {
    list.sort((a, b) => a.lateral - b.lateral || a.d.index - b.d.index);
    const total = list.length;
    list.forEach((item, i) => {
      const frac = (i + 1) / (total + 1);
      if (item.role === "exit") item.d.exitFrac = frac;
      else item.d.entryFrac = frac;
    });
  }

  const finalRoutes = new Map();
  for (const d of descriptors) {
    const exitPoint = pointOnSide(d.sourceBox, d.exitSide, d.exitFrac);
    const entryPoint = pointOnSide(d.targetBox, d.entrySide, d.entryFrac);
    const { stored } = d;
    let points;

    if (d.kind === "down") {
      // Turun: jalan mendatar hanya di celah antar-baris, jalan tegak di
      // koridor kolom dummy (bebas node).
      const corridorXs = stored.corridorXs ?? [];
      const gaps = stored.gaps ?? [];
      const path = [exitPoint];
      for (let i = 0; i < gaps.length; i++) {
        const currentX = path[path.length - 1].x;
        const nextX = i < corridorXs.length ? corridorXs[i] : entryPoint.x;
        path.push({ x: currentX, y: gaps[i] });
        path.push({ x: nextX, y: gaps[i] });
      }
      path.push(entryPoint);
      points = tidy(path);
    } else if (d.kind === "up") {
      // Balik ke atas: keluar dari atas sumber → menyamping di celah → naik di
      // jalur luar kanan → menyamping lagi di celah atas tujuan → masuk dari atas.
      const [gapSource, gapTarget] = stored.gaps ?? [];
      const channel = stored.channel ?? entryPoint.x + 60;
      points = tidy([
        exitPoint,
        { x: exitPoint.x, y: gapSource },
        { x: channel, y: gapSource },
        { x: channel, y: gapTarget },
        { x: entryPoint.x, y: gapTarget },
        entryPoint,
      ]);
    } else if (d.kind === "across") {
      const channel = stored.channel ?? (exitPoint.x + entryPoint.x) / 2;
      const ySource =
        stored.gapSource ?? diagram.rowAbove.get(d.edge.from) ?? d.sourceBox.y - GAP_Y / 2;
      const yTarget =
        stored.gapTarget ?? diagram.rowAbove.get(d.edge.to) ?? d.targetBox.y - GAP_Y / 2;
      points = tidy([
        exitPoint,
        { x: exitPoint.x, y: ySource },
        { x: channel, y: ySource },
        { x: channel, y: yTarget },
        { x: entryPoint.x, y: yTarget },
        entryPoint,
      ]);
    } else if (d.kind === "flatDetour") {
      const gap = stored.gap ?? Math.max(d.sourceBox.y + d.sourceBox.height, d.targetBox.y + d.targetBox.height) + GAP_Y / 2;
      points = tidy([
        exitPoint,
        { x: exitPoint.x, y: gap },
        { x: entryPoint.x, y: gap },
        entryPoint,
      ]);
    } else if (d.kind === "flat" || d.kind === "right" || d.kind === "left" || d.kind === "side") {
      // Menyamping: tikungan tegak di tengah antara kedua kotak.
      const mid =
        d.exitSide === "right"
          ? (d.sourceBox.x + d.sourceBox.width + d.targetBox.x) / 2
          : (d.targetBox.x + d.targetBox.width + d.sourceBox.x) / 2;
      points = tidy([
        exitPoint,
        { x: mid, y: exitPoint.y },
        { x: mid, y: entryPoint.y },
        entryPoint,
      ]);
    } else {
      points = tidy([exitPoint, entryPoint]);
    }

    // Titik awal & titik akhir sudah ditentukan oleh port (exit/entry), jadi
    // tidak boleh ikut ditulis sebagai waypoint — kalau ikut, draw.io menambah
    // tikungan kecil tak perlu di ujung panah.
    const same = (a, b) => Math.round(a.x) === Math.round(b.x) && Math.round(a.y) === Math.round(b.y);
    while (points.length && same(points[0], exitPoint)) points.shift();
    while (points.length && same(points[points.length - 1], entryPoint)) points.pop();

    finalRoutes.set(d.edge, {
      kind: d.kind,
      points,
      exitSide: d.exitSide,
      entrySide: d.entrySide,
      exitFrac: d.exitFrac,
      entryFrac: d.entryFrac,
      exitPoint,
      entryPoint,
    });
  }

  diagram.finalRoutes = finalRoutes;
  return finalRoutes;
}

// Geser semua ke kuadran positif (dilakukan setelah rute dihitung).
function normalise(diagram) {
  const xs = [
    ...[...diagram.nodes.values()].map((n) => n.x),
    ...diagram.clusters.filter((c) => c.box).map((c) => c.box.x),
    ...[...diagram.finalRoutes.values()].flatMap((r) => r.points.map((p) => p.x)),
  ];
  const ys = [
    ...[...diagram.nodes.values()].map((n) => n.y),
    ...diagram.clusters.filter((c) => c.box).map((c) => c.box.y),
    ...[...diagram.finalRoutes.values()].flatMap((r) => r.points.map((p) => p.y)),
  ];
  const dx = MARGIN - Math.min(...xs);
  const dy = MARGIN - Math.min(...ys);

  for (const node of diagram.nodes.values()) {
    node.x = Math.round(node.x + dx);
    node.y = Math.round(node.y + dy);
  }
  for (const cluster of diagram.clusters) {
    if (cluster.box) {
      cluster.box.x = Math.round(cluster.box.x + dx);
      cluster.box.y = Math.round(cluster.box.y + dy);
    }
  }
  for (const route of diagram.finalRoutes.values()) {
    route.points = route.points.map((p) => ({ x: Math.round(p.x + dx), y: Math.round(p.y + dy) }));
    route.exitPoint = { x: Math.round(route.exitPoint.x + dx), y: Math.round(route.exitPoint.y + dy) };
    route.entryPoint = { x: Math.round(route.entryPoint.x + dx), y: Math.round(route.entryPoint.y + dy) };
  }
}

// ─── Emit XML ───────────────────────────────────────────────────────────────
function escapeValue(text) {
  const normalised = text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  return normalised
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "&#xa;");
}

const RED_LABEL = /^(40[0-9]|41[0-9]|50[0-9]|Tolak|Error|Gagal|Blokir)/i;

function vertexStyle(node, fills) {
  const label = node.label.trim();
  const forcedFill = fills.get(node.id);
  const isRed = forcedFill === "#fee2e2" || RED_LABEL.test(label);
  const isTerminal = /^(Mulai|Selesai|User buka)/i.test(label);

  if (node.shape === "decision") {
    return "rhombus;whiteSpace=wrap;html=1;fillColor=#fef9c3;strokeColor=#ca8a04;strokeWidth=1;";
  }
  if (node.shape === "cylinder") {
    return "shape=cylinder3;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#e0e7ff;strokeColor=#4f46e5;";
  }
  if (isTerminal) {
    return "ellipse;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#16a34a;";
  }
  if (isRed) {
    return "rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#fee2e2;strokeColor=#dc2626;";
  }
  return "rounded=1;arcSize=12;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#2563eb;";
}

function emitPage(title, diagram, pageId) {
  layout(diagram);
  buildRoutes(diagram);
  normalise(diagram);

  const cells = [];
  cells.push('<mxCell id="0" />');
  cells.push('<mxCell id="1" parent="0" />');

  for (const cluster of diagram.clusters) {
    if (!cluster.box) continue;
    const { x, y, width, height } = cluster.box;
    cells.push(
      `<mxCell id="cluster_${cluster.id}" value="${escapeValue(cluster.label)}" ` +
        `style="rounded=0;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#94a3b8;dashed=1;verticalAlign=top;fontStyle=1;fontSize=12;align=center;" ` +
        `vertex="1" parent="1"><mxGeometry x="${x}" y="${y}" width="${width}" height="${height}" as="geometry"/></mxCell>`,
    );
  }

  for (const node of diagram.nodes.values()) {
    cells.push(
      `<mxCell id="node_${node.id}" value="${escapeValue(node.label)}" ` +
        `style="${vertexStyle(node, diagram.fills)}" vertex="1" parent="1">` +
        `<mxGeometry x="${node.x}" y="${node.y}" width="${node.width}" height="${node.height}" as="geometry"/></mxCell>`,
    );
  }

  const cellOf = (id) =>
    diagram.nodes.has(id) ? `node_${id}` : diagram.clusters.some((c) => c.id === id) ? `cluster_${id}` : null;

  diagram.edges.forEach((edge, i) => {
    const route = diagram.finalRoutes.get(edge);
    if (!route) return;
    const source = cellOf(edge.from);
    const target = cellOf(edge.to);
    if (!source || !target) return;

    const { exitSide, entrySide, exitFrac, entryFrac } = route;
    const ex = exitSide === "left" ? 0 : exitSide === "right" ? 1 : exitFrac;
    const ey = exitSide === "bottom" ? 1 : exitSide === "top" ? 0 : exitFrac;
    const nx = entrySide === "left" ? 0 : entrySide === "right" ? 1 : entryFrac;
    const ny = entrySide === "bottom" ? 1 : entrySide === "top" ? 0 : entryFrac;
    const ports =
      `exitX=${round3(ex)};exitY=${round3(ey)};exitDx=0;exitDy=0;` +
      `entryX=${round3(nx)};entryY=${round3(ny)};entryDx=0;entryDy=0;`;

    const loop = route.kind === "up";
    const stroke = loop ? "#ea580c" : "#475569";
    const dashed = edge.dashed || loop ? "dashed=1;" : "";
    const label = edge.label ? escapeValue(edge.label) : "";
    // Buang titik berurutan yang identik: dua mxPoint dengan koordinat sama
    // membuat draw.io menggambar segmen panjang nol, yang tampak sebagai simpul
    // kecil di jalur panah.
    const waypoints = [];
    for (const p of route.points) {
      const last = waypoints[waypoints.length - 1];
      if (last && last.x === p.x && last.y === p.y) continue;
      waypoints.push(p);
    }
    const points = waypoints.length
      ? `<Array as="points">${waypoints
          .map((p) => `<mxPoint x="${p.x}" y="${p.y}"/>`)
          .join("")}</Array>`
      : "";

    cells.push(
      `<mxCell id="edge_${pageId}_${i}" value="${label}" ` +
        `style="edgeStyle=orthogonalEdgeStyle;rounded=0;html=1;endArrow=block;endFill=1;` +
        `strokeColor=${stroke};strokeWidth=1.2;${dashed}jumpStyle=arc;jumpSize=6;${ports}" ` +
        `edge="1" parent="1" source="${source}" target="${target}">` +
        `<mxGeometry relative="1" as="geometry">${points}</mxGeometry></mxCell>`,
    );
  });

  const nodeList = [...diagram.nodes.values()];
  const allX = [
    ...nodeList.map((n) => n.x + n.width),
    ...diagram.clusters.filter((c) => c.box).map((c) => c.box.x + c.box.width),
    ...[...diagram.finalRoutes.values()].flatMap((r) => r.points.map((p) => p.x)),
  ];
  const allY = [
    ...nodeList.map((n) => n.y + n.height),
    ...diagram.clusters.filter((c) => c.box).map((c) => c.box.y + c.box.height),
    ...[...diagram.finalRoutes.values()].flatMap((r) => r.points.map((p) => p.y)),
  ];
  const pageW = Math.max(...allX) + MARGIN;
  const pageH = Math.max(...allY) + MARGIN;

  return (
    `  <diagram id="${pageId}" name="${escapeValue(title)}">\n` +
    `    <mxGraphModel dx="1200" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" ` +
    `connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageW}" pageHeight="${pageH}" math="0" shadow="0">\n` +
    `      <root>\n        ${cells.join("\n        ")}\n      </root>\n` +
    `    </mxGraphModel>\n  </diagram>`
  );
}

// ─── Pemeriksaan ────────────────────────────────────────────────────────────
function assertWellFormed(xml) {
  const stack = [];
  const tagRe = /<(\/?)([A-Za-z][\w:.-]*)([^>]*?)(\/?)>/g;
  let match;
  while ((match = tagRe.exec(xml))) {
    const [, closing, name, attrs, selfClose] = match;
    if (attrs.includes("<") || attrs.includes(">")) continue;
    if (closing) {
      const open = stack.pop();
      if (open !== name) throw new Error(`Tag tidak cocok: </${name}> menutup <${open}>`);
    } else if (!selfClose) {
      stack.push(name);
    }
  }
  if (stack.length) throw new Error(`Tag belum ditutup: ${stack.join(", ")}`);
}

function overlapCount(nodes) {
  const list = [...nodes.values()];
  let count = 0;
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) {
        count++;
      }
    }
  }
  return count;
}

// Tidak boleh ada dua titik sambung yang bertumpuk di node yang sama — baik
// sesama panah keluar, sesama panah masuk, maupun campuran keduanya.
function duplicatePortCount(diagram) {
  const seen = new Set();
  let duplicates = 0;
  for (const [edge, route] of diagram.finalRoutes) {
    for (const key of [
      `${edge.from}|${route.exitSide}|${round3(route.exitFrac)}`,
      `${edge.to}|${route.entrySide}|${round3(route.entryFrac)}`,
    ]) {
      if (seen.has(key)) duplicates++;
      else seen.add(key);
    }
  }
  return duplicates;
}

// Periksa SELURUH RUAS garis (bukan hanya waypoint) terhadap kotak node.
// Frame cluster diabaikan kalau endpoint-nya memang ada di dalam frame itu.
function segmentHits(diagram) {
  const frames = diagram.clusters.filter((c) => c.box).map((c) => ({ id: c.id, ...c.box }));
  const nodes = [...diagram.nodes.values()].map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    width: n.width,
    height: n.height,
    cluster: n.cluster,
  }));

  const belongsToFrame = (id, frameId) => {
    const node = nodes.find((n) => n.id === id);
    if (node) return node.cluster === frameId;
    return id === frameId;
  };

  let hits = 0;
  for (const [edge, route] of diagram.finalRoutes) {
    const points = [route.exitPoint, ...route.points, route.entryPoint];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const x1 = Math.min(a.x, b.x) + 1;
      const x2 = Math.max(a.x, b.x) - 1;
      const y1 = Math.min(a.y, b.y) + 1;
      const y2 = Math.max(a.y, b.y) - 1;
      if (x1 > x2 && y1 > y2) continue;

      const boxes = [
        ...nodes.map((n) => ({ id: n.id, box: n, frame: false })),
        ...frames.map((f) => ({ id: f.id, box: f, frame: true })),
      ];
      for (const { id, box, frame } of boxes) {
        if (id === edge.from || id === edge.to) continue;
        if (frame && (belongsToFrame(edge.from, id) || belongsToFrame(edge.to, id))) continue;
        if (x2 < box.x || x1 > box.x + box.width || y2 < box.y || y1 > box.y + box.height) continue;
        hits++;
      }
    }
  }
  return hits;
}

// Panah "turun" harus benar-benar turun, panah "balik" harus benar-benar naik.
function directionErrors(diagram) {
  let errors = 0;
  for (const [, route] of diagram.finalRoutes) {
    if (route.kind === "down" && route.exitPoint.y >= route.entryPoint.y) errors++;
    if (route.kind === "up" && route.exitPoint.y <= route.entryPoint.y) errors++;
  }
  return errors;
}

// ─── Main ───────────────────────────────────────────────────────────────────
const markdown = readFileSync(resolve(INPUT), "utf8");
const diagrams = extractDiagrams(markdown);
if (!diagrams.length) throw new Error(`Tidak ada blok mermaid di ${INPUT}`);

const parsedDiagrams = diagrams.map((d, i) => ({
  ...d,
  parsed: parseDiagram(d.source),
  pageId: `page-${String(i + 1).padStart(2, "0")}`,
}));

const pages = parsedDiagrams.map((d) => emitPage(d.title, d.parsed, d.pageId));

const xml =
  `<mxfile host="app.diagrams.net" agent="LedgerFlow" version="24.7.17" type="device">\n` +
  `${pages.join("\n")}\n</mxfile>\n`;

assertWellFormed(xml);
writeFileSync(resolve(OUTPUT), xml, "utf8");

let overlapTotal = 0;
let duplicateTotal = 0;
let segmentTotal = 0;
let directionTotal = 0;
let loopTotal = 0;
for (const d of parsedDiagrams) {
  const overlaps = overlapCount(d.parsed.nodes);
  const duplicates = duplicatePortCount(d.parsed);
  const segments = segmentHits(d.parsed);
  const direction = directionErrors(d.parsed);
  const loops = [...d.parsed.finalRoutes.values()].filter((r) => r.kind === "up").length;
  overlapTotal += overlaps;
  duplicateTotal += duplicates;
  segmentTotal += segments;
  directionTotal += direction;
  loopTotal += loops;

  const flags = [];
  if (overlaps) flags.push(`⚠ node bertumpuk: ${overlaps}`);
  if (duplicates) flags.push(`⚠ port dobel: ${duplicates}`);
  if (segments) flags.push(`⚠ garis menembus node: ${segments}`);
  if (direction) flags.push(`⚠ arah panah salah: ${direction}`);

  console.log(
    `[${d.pageId}] ${d.title} — ${d.parsed.nodes.size} node, ${d.parsed.edges.length} panah, ` +
      `${loops} panah balik` +
      (flags.length ? `  ${flags.join(", ")}` : "  ✔ bersih"),
  );
}

console.log(
  `\n✔ ${parsedDiagrams.length} halaman → ${OUTPUT}` +
    `\n  node bertumpuk: ${overlapTotal}` +
    `\n  port dobel (panah berbagi titik sambung): ${duplicateTotal}` +
    `\n  ruas garis menembus node: ${segmentTotal}` +
    `\n  panah dengan arah terbalik: ${directionTotal}` +
    `\n  panah balik memutar: ${loopTotal}`,
);
