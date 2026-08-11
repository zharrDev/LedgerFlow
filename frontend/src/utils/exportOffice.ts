/** Unduh file dari Blob di browser */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface ExportColumn {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
}

export interface ExportTableSection {
  title?: string;
  columns: ExportColumn[];
  rows: Record<string, string | number>[];
  /** Baris ringkasan di bawah tabel (opsional) */
  footer?: Record<string, string | number>;
}

export interface OfficeExportDoc {
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  sections: ExportTableSection[];
  notes?: string[];
}

function buildMetaRows(meta?: { label: string; value: string }[]) {
  if (!meta?.length) return "";
  return meta
    .map(
      (m) =>
        `<tr><td style="padding:2px 0;color:#666;width:120px;">${escapeHtml(m.label)}</td><td style="padding:2px 0;font-weight:600;">${escapeHtml(m.value)}</td></tr>`,
    )
    .join("");
}

function buildSectionHtml(section: ExportTableSection): string {
  const head = section.columns
    .map(
      (c) =>
        `<th style="background:#2563eb;color:#fff;text-align:${c.align || "left"};padding:8px 10px;border:1px solid #1d4ed8;font-size:12px;">${escapeHtml(c.label)}</th>`,
    )
    .join("");

  const body = section.rows
    .map((row, idx) => {
      const bg = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      const cells = section.columns
        .map((c) => {
          const val = row[c.key] ?? "";
          return `<td style="padding:7px 10px;border:1px solid #e2e8f0;text-align:${c.align || "left"};background:${bg};font-size:12px;white-space:nowrap;">${escapeHtml(String(val))}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  const footer = section.footer
    ? `<tr>${section.columns
        .map((c) => {
          const val = section.footer?.[c.key] ?? "";
          return `<td style="padding:8px 10px;border:1px solid #cbd5e1;background:#eff6ff;font-weight:700;text-align:${c.align || "left"};font-size:12px;">${escapeHtml(String(val))}</td>`;
        })
        .join("")}</tr>`
    : "";

  const title = section.title
    ? `<h2 style="margin:18px 0 8px;font-size:14px;color:#0f172a;">${escapeHtml(section.title)}</h2>`
    : "";

  return `${title}<table style="border-collapse:collapse;width:100%;margin-bottom:8px;"><thead><tr>${head}</tr></thead><tbody>${body}${footer}</tbody></table>`;
}

function buildDocumentHtml(doc: OfficeExportDoc): string {
  const notes = (doc.notes || [])
    .map((n) => `<li style="margin:2px 0;">${escapeHtml(n)}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(doc.title)}</title>
</head>
<body style="font-family:Calibri,Arial,Helvetica,sans-serif;color:#0f172a;margin:24px;">
  <div style="border-bottom:3px solid #2563eb;padding-bottom:12px;margin-bottom:16px;">
    <div style="font-size:20px;font-weight:700;color:#2563eb;">LedgerFlow</div>
    <div style="font-size:11px;color:#64748b;letter-spacing:0.08em;text-transform:uppercase;">Financial Platform</div>
  </div>
  <h1 style="margin:0 0 8px;font-size:18px;">${escapeHtml(doc.title)}</h1>
  ${doc.subtitle ? `<p style="margin:0 0 10px;color:#64748b;font-size:12px;">${escapeHtml(doc.subtitle)}</p>` : ""}
  <table style="margin-bottom:16px;font-size:12px;">${buildMetaRows(doc.meta)}</table>
  ${doc.sections.map(buildSectionHtml).join("")}
  ${notes ? `<div style="margin-top:20px;"><p style="font-size:12px;font-weight:600;margin:0 0 6px;">Catatan</p><ul style="margin:0;padding-left:18px;font-size:12px;color:#475569;">${notes}</ul></div>` : ""}
  <p style="margin-top:28px;font-size:10px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;">
    Digenerate otomatis oleh LedgerFlow · ${escapeHtml(new Date().toLocaleString("id-ID"))}
  </p>
</body>
</html>`;
}

/** Excel-compatible (.xls via HTML table) — rapi, kolom sejajar, buka di Excel/Google Sheets */
export function exportOfficeExcel(doc: OfficeExportDoc, filename: string) {
  const html = buildDocumentHtml(doc);
  const blob = new Blob(["\uFEFF" + html], {
    type: "application/vnd.ms-excel;charset=utf-8;",
  });
  const name = filename.endsWith(".xls") ? filename : `${filename}.xls`;
  downloadBlob(blob, name);
}

/** Word-compatible (.doc via HTML) — layout dokumen rapi */
export function exportOfficeWord(doc: OfficeExportDoc, filename: string) {
  const html = buildDocumentHtml(doc);
  const blob = new Blob(["\uFEFF" + html], {
    type: "application/msword;charset=utf-8;",
  });
  const name = filename.endsWith(".doc") ? filename : `${filename}.doc`;
  downloadBlob(blob, name);
}
