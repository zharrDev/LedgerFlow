// scripts/crop-owl.mjs
// Crop padding transparan owl-mascot.webp dengan margin asimetris:
//   - bawah ketat  (kaki hampir menyentuh tepi bawah container)
//   - atas longgar (ruang idle float animation)
//   - kiri/kanan simetris, lalu canvas dipad jadi PERSEGI supaya
//     object-contain di container aspect-square tidak menghasilkan
//     letterbox baru.
// Setelah crop, mendeteksi ulang pusat lensa kacamata (connected-component
// pixel putih terang di setengah atas) dan mencetak posisi % siap-pakai
// untuk konstanta LEFT_EYE/RIGHT_EYE di OwlMascot.tsx.
//
// Pakai: node scripts/crop-owl.mjs   (dari root repo)

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const ASSET = path.join(ROOT, "frontend", "src", "assets", "owl-mascot.webp");
const TEMP_BACKUP = path.join(
  process.env.TEMP ?? ".",
  "opencode",
  "owl-mascot-original.webp",
);

const ALPHA_THRESHOLD = 10;
// Margin relatif terhadap dimensi bounding box konten
const MARGIN = { top: 0.07, bottom: 0.015, left: 0.05, right: 0.05 };

async function readRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  return { data, width: info.width, height: info.height, channels: info.channels };
}

function findBounds({ data, width, height, channels }) {
  let top = height,
    left = width,
    right = -1,
    bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * channels + channels - 1];
      if (a > ALPHA_THRESHOLD) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  return right === -1 ? null : { top, left, bottom, right };
}

/**
 * Deteksi lensa kacamata: connected-component (4-connectivity) pada pixel
 * putih terang (RGB>200, alpha>200), hanya di 60% atas gambar (area kepala).
 * Mengembalikan komponen terbesar per sisi kiri/kanan dari garis tengah.
 */
function findLenses({ data, width, height, channels }) {
  const limitY = Math.floor(height * 0.6);
  const isWhite = (x, y) => {
    const o = (y * width + x) * channels;
    return (
      data[o] > 200 && data[o + 1] > 200 && data[o + 2] > 200 && data[o + channels - 1] > 200
    );
  };

  const labels = new Int32Array(width * limitY).fill(-1);
  const components = [];
  const stack = [];
  let nextLabel = 0;

  for (let y = 0; y < limitY; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (labels[idx] !== -1 || !isWhite(x, y)) continue;
      // BFS/flood fill
      stack.length = 0;
      stack.push(idx);
      labels[idx] = nextLabel;
      let count = 0,
        sumX = 0,
        sumY = 0,
        minX = x,
        maxX = x,
        minY = y,
        maxY = y;
      while (stack.length > 0) {
        const cur = stack.pop();
        const cy = Math.floor(cur / width);
        const cx = cur % width;
        count++;
        sumX += cx;
        sumY += cy;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;
        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];
        for (const [nx, ny] of neighbors) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= limitY) continue;
          const nIdx = ny * width + nx;
          if (labels[nIdx] === -1 && isWhite(nx, ny)) {
            labels[nIdx] = nextLabel;
            stack.push(nIdx);
          }
        }
      }
      components.push({
        label: nextLabel,
        count,
        cx: sumX / count,
        cy: sumY / count,
        bboxW: maxX - minX + 1,
        bboxH: maxY - minY + 1,
      });
      nextLabel++;
    }
  }

  // Lensa = komponen putih besar; ambil terbesar di tiap sisi garis tengah
  const significant = components.filter((c) => c.count >= 150);
  const lefts = significant.filter((c) => c.cx < width / 2).sort((a, b) => b.count - a.count);
  const rights = significant.filter((c) => c.cx >= width / 2).sort((a, b) => b.count - a.count);
  return { left: lefts[0] ?? null, right: rights[0] ?? null, all: significant };
}

function report(tag, img, lenses) {
  console.log(`\n── ${tag} (${img.width}x${img.height}) ──`);
  const b = findBounds(img);
  if (b) {
    const bw = b.right - b.left + 1;
    const bh = b.bottom - b.top + 1;
    console.log(
      `bbox konten: x ${b.left}–${b.right} (${((b.left / img.width) * 100).toFixed(1)}%–${((b.right / img.width) * 100).toFixed(1)}%), ` +
        `y ${b.top}–${b.bottom} (${((b.top / img.height) * 100).toFixed(1)}%–${((b.bottom / img.height) * 100).toFixed(1)}%), ` +
        `ukuran ${bw}x${bh}`,
    );
    console.log(
      `padding transparan: atas ${((b.top / img.height) * 100).toFixed(1)}%, bawah ${(((img.height - 1 - b.bottom) / img.height) * 100).toFixed(1)}%`,
    );
  }
  for (const side of ["left", "right"]) {
    const c = lenses[side];
    if (!c) {
      console.log(`lensa ${side}: TIDAK TERDETEKSI`);
      continue;
    }
    const px = ((c.cx / img.width) * 100).toFixed(2);
    const py = ((c.cy / img.height) * 100).toFixed(2);
    const diamPct = (((c.bboxW + c.bboxH) / 2 / img.width) * 100).toFixed(2);
    console.log(
      `lensa ${side}: pusat (${px}%, ${py}%) — diameter ~${diamPct}% lebar container (${c.count}px, bbox ${c.bboxW}x${c.bboxH})`,
    );
  }
  return lenses;
}

// ═══════════════ MAIN ═══════════════
console.log(`Asset: ${ASSET}`);
if (fs.existsSync(TEMP_BACKUP)) {
  console.log(`Backup sudah ada: ${TEMP_BACKUP}`);
} else {
  fs.copyFileSync(ASSET, TEMP_BACKUP);
  console.log(`Backup dibuat: ${TEMP_BACKUP}`);
}

const original = await readRaw(ASSET);
report("ORIGINAL", original, findLenses(original));

// Hitung region crop dengan margin asimetris
const b = findBounds(original);
if (!b) throw new Error("Gambar sepenuhnya transparan?");
const bw = b.right - b.left + 1;
const bh = b.bottom - b.top + 1;

let cLeft = Math.max(0, b.left - Math.round(bw * MARGIN.left));
let cTop = Math.max(0, b.top - Math.round(bh * MARGIN.top));
let cRight = Math.min(original.width - 1, b.right + Math.round(bw * MARGIN.right));
let cBottom = Math.min(original.height - 1, b.bottom + Math.round(bh * MARGIN.bottom));
let cw = cRight - cLeft + 1;
let ch = cBottom - cTop + 1;

// Pad horizontal agar persegi (object-contain di aspect-square tanpa letterbox)
let padLeft = 0;
let padRight = 0;
if (cw < ch) {
  const pad = ch - cw;
  padLeft = Math.floor(pad / 2);
  padRight = pad - padLeft;
} else if (ch < cw) {
  // Konten lebih lebar dari tinggi (tak terduga) — pad vertikal simetris
  const pad = cw - ch;
  cTop = Math.max(0, cTop - Math.floor(pad / 2));
  ch = Math.min(original.height - cTop, ch + pad);
  cw = Math.min(cw, original.width - cLeft);
}

console.log(
  `\nCrop region: left=${cLeft}, top=${cTop}, ${cw}x${ch}` +
    (padLeft || padRight ? `, extend L+${padLeft}/R+${padRight} → persegi ${cw + padLeft + padRight}x${ch}` : ""),
);

await sharp(ASSET)
  .extract({ left: cLeft, top: cTop, width: cw, height: ch })
  .extend({
    left: padLeft,
    right: padRight,
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .webp({ quality: 90 })
  .toFile(ASSET + ".tmp");

fs.renameSync(ASSET + ".tmp", ASSET);
console.log("Tersimpan (WebP q90).");

const cropped = await readRaw(ASSET);
const lensesCropped = findLenses(cropped);
report("CROPPED", cropped, lensesCropped);

// Rekomendasi parameter pupil
for (const side of ["left", "right"]) {
  const c = lensesCropped[side];
  if (!c) continue;
  const lensRadiusPct = ((c.bboxW + c.bboxH) / 2 / 2 / cropped.width) * 100;
  console.log(
    `${side}: radius lensa ~${lensRadiusPct.toFixed(2)}% → syarat MAX_TRAVEL_RATIO*100 + PUPIL_SIZE/2 ≤ ${(lensRadiusPct * 0.9).toFixed(2)}%`,
  );
}
console.log("\nSelesai.");
