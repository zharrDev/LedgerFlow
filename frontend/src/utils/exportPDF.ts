// ============================================================================
// LEDGERFLOW - Export PDF / CSV / Excel / Word Utility
// ============================================================================

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  exportOfficeExcel,
  exportOfficeWord,
  type OfficeExportDoc,
} from "./exportOffice";
import { formatCurrency } from "./currency";

// Format uang mengikuti mata uang aktif user (Settings → Regional).
const formatRupiah = (val: number): string => formatCurrency(val);

const today = (): string =>
  new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const periodLabel = (periodName: string) =>
  periodName?.trim() ? periodName : "Semua Periode (YTD)";

function applyFooters(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Dokumen digenerate otomatis oleh LedgerFlow", 14, pageHeight - 8);
    doc.text(`Halaman ${i} dari ${pageCount}`, pageWidth - 14, pageHeight - 8, {
      align: "right",
    });
  }
}

const tableBase = {
  styles: {
    fontSize: 9,
    cellPadding: 3.5,
    lineColor: [226, 232, 240] as [number, number, number],
    lineWidth: 0.2,
    textColor: [30, 41, 59] as [number, number, number],
    overflow: "linebreak" as const,
    valign: "middle" as const,
  },
  alternateRowStyles: {
    fillColor: [248, 250, 252] as [number, number, number],
  },
  margin: { left: 14, right: 14, bottom: 18 },
};

function createPDF(title: string, periodName: string): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");

  doc.setFillColor(37, 99, 235);
  doc.rect(0, 0, 210, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("LedgerFlow", 14, 14);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("Financial Platform", 14, 20);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(title, 14, 40);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Periode: ${periodLabel(periodName)}`, 14, 48);
  doc.text(`Dicetak: ${today()}`, 14, 54);

  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.6);
  doc.line(14, 58, 196, 58);

  return doc;
}

function lastTableY(doc: jsPDF, fallback: number) {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY
    ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 10
    : fallback;
}

// ─── Income Statement ────────────────────────────────────────────────

type IncomeData = {
  revenue: { accountCode: string; accountName: string; amount: number }[];
  expense: { accountCode: string; accountName: string; amount: number }[];
  totalRevenue: number;
  totalExpense: number;
  netIncome: number;
};

export function exportIncomeStatementPDF(
  data: IncomeData,
  periodName: string,
) {
  const doc = createPDF("Laporan Laba Rugi", periodName);
  let startY = 64;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(16, 185, 129);
  doc.text("PENDAPATAN (REVENUE)", 14, startY);
  startY += 4;

  if (data.revenue.length > 0) {
    autoTable(doc, {
      startY,
      head: [["Kode", "Nama Akun", "Jumlah"]],
      body: [
        ...data.revenue.map((item) => [
          item.accountCode,
          item.accountName,
          formatRupiah(item.amount),
        ]),
        [
          { content: "", styles: { fillColor: [236, 253, 245] } },
          {
            content: "Total Pendapatan",
            styles: { fontStyle: "bold", fillColor: [236, 253, 245] },
          },
          {
            content: formatRupiah(data.totalRevenue),
            styles: {
              fontStyle: "bold",
              fillColor: [236, 253, 245],
              halign: "right",
            },
          },
        ],
      ],
      theme: "grid",
      ...tableBase,
      headStyles: {
        fillColor: [16, 185, 129],
        textColor: 255,
        fontStyle: "bold",
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 28 },
        2: { halign: "right", cellWidth: 48 },
      },
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Tidak ada transaksi pendapatan", 14, startY + 6);
  }

  startY = lastTableY(doc, startY + 14);

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(239, 68, 68);
  doc.text("BEBAN (EXPENSE)", 14, startY);
  startY += 4;

  if (data.expense.length > 0) {
    autoTable(doc, {
      startY,
      head: [["Kode", "Nama Akun", "Jumlah"]],
      body: [
        ...data.expense.map((item) => [
          item.accountCode,
          item.accountName,
          formatRupiah(item.amount),
        ]),
        [
          { content: "", styles: { fillColor: [254, 242, 242] } },
          {
            content: "Total Beban",
            styles: { fontStyle: "bold", fillColor: [254, 242, 242] },
          },
          {
            content: formatRupiah(data.totalExpense),
            styles: {
              fontStyle: "bold",
              fillColor: [254, 242, 242],
              halign: "right",
            },
          },
        ],
      ],
      theme: "grid",
      ...tableBase,
      headStyles: {
        fillColor: [239, 68, 68],
        textColor: 255,
        fontStyle: "bold",
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 28 },
        2: { halign: "right", cellWidth: 48 },
      },
    });
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text("Tidak ada transaksi beban", 14, startY + 6);
  }

  startY = lastTableY(doc, startY + 14);

  const profit = data.netIncome >= 0;
  doc.setFillColor(profit ? 236 : 254, profit ? 253 : 242, profit ? 245 : 242);
  doc.roundedRect(14, startY, 182, 16, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(profit ? 5 : 185, profit ? 150 : 28, profit ? 105 : 28);
  doc.text(profit ? "LABA BERSIH" : "RUGI BERSIH", 20, startY + 10);
  doc.text(formatRupiah(data.netIncome), 188, startY + 10, { align: "right" });

  applyFooters(doc);
  doc.save(`LedgerFlow_LabaRugi_${periodName || "YTD"}.pdf`);
}

function buildIncomeOfficeDoc(
  data: IncomeData,
  periodName: string,
): OfficeExportDoc {
  return {
    title: "Laporan Laba Rugi",
    subtitle: "Ringkasan pendapatan, beban, dan laba/rugi bersih",
    meta: [
      { label: "Periode", value: periodLabel(periodName) },
      { label: "Dicetak", value: today() },
    ],
    sections: [
      {
        title: "Pendapatan (Revenue)",
        columns: [
          { key: "code", label: "Kode" },
          { key: "name", label: "Nama Akun" },
          { key: "amount", label: "Jumlah", align: "right" },
        ],
        rows: data.revenue.map((r) => ({
          code: r.accountCode,
          name: r.accountName,
          amount: formatRupiah(r.amount),
        })),
        footer: {
          code: "",
          name: "Total Pendapatan",
          amount: formatRupiah(data.totalRevenue),
        },
      },
      {
        title: "Beban (Expense)",
        columns: [
          { key: "code", label: "Kode" },
          { key: "name", label: "Nama Akun" },
          { key: "amount", label: "Jumlah", align: "right" },
        ],
        rows: data.expense.map((r) => ({
          code: r.accountCode,
          name: r.accountName,
          amount: formatRupiah(r.amount),
        })),
        footer: {
          code: "",
          name: "Total Beban",
          amount: formatRupiah(data.totalExpense),
        },
      },
      {
        title: "Ringkasan",
        columns: [
          { key: "label", label: "Keterangan" },
          { key: "amount", label: "Jumlah", align: "right" },
        ],
        rows: [
          {
            label: data.netIncome >= 0 ? "Laba Bersih" : "Rugi Bersih",
            amount: formatRupiah(data.netIncome),
          },
        ],
      },
    ],
  };
}

export function exportIncomeStatementExcel(
  data: IncomeData,
  periodName: string,
) {
  exportOfficeExcel(
    buildIncomeOfficeDoc(data, periodName),
    `LedgerFlow_LabaRugi_${periodName || "YTD"}`,
  );
}

export function exportIncomeStatementWord(
  data: IncomeData,
  periodName: string,
) {
  exportOfficeWord(
    buildIncomeOfficeDoc(data, periodName),
    `LedgerFlow_LabaRugi_${periodName || "YTD"}`,
  );
}

// ─── Balance Sheet ───────────────────────────────────────────────────

type BalanceSheetData = {
  assets: { accountCode: string; accountName: string; balance: number }[];
  liabilities: {
    accountCode: string;
    accountName: string;
    balance: number;
  }[];
  equity: { accountCode: string; accountName: string; balance: number }[];
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
};

export function exportBalanceSheetPDF(
  data: BalanceSheetData,
  periodName: string,
) {
  const doc = createPDF("Neraca (Balance Sheet)", periodName);
  let startY = 64;

  const renderSection = (
    title: string,
    items: { accountCode: string; accountName: string; balance: number }[],
    total: number,
    color: [number, number, number],
    bgColor: [number, number, number],
  ) => {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(title, 14, startY);
    startY += 4;

    if (items.length > 0) {
      autoTable(doc, {
        startY,
        head: [["Kode", "Nama Akun", "Saldo"]],
        body: [
          ...items.map((item) => [
            item.accountCode,
            item.accountName,
            formatRupiah(item.balance),
          ]),
          [
            { content: "", styles: { fillColor: bgColor } },
            {
              content: `Total ${title}`,
              styles: { fontStyle: "bold", fillColor: bgColor },
            },
            {
              content: formatRupiah(total),
              styles: {
                fontStyle: "bold",
                fillColor: bgColor,
                halign: "right",
              },
            },
          ],
        ],
        theme: "grid",
        ...tableBase,
        headStyles: {
          fillColor: color,
          textColor: 255,
          fontStyle: "bold",
          cellPadding: 4,
        },
        columnStyles: {
          0: { cellWidth: 28 },
          2: { halign: "right", cellWidth: 48 },
        },
      });
      startY = lastTableY(doc, startY + 10);
    } else {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Tidak ada data ${title.toLowerCase()}`, 14, startY + 6);
      startY += 14;
    }
  };

  renderSection(
    "ASET",
    data.assets,
    data.total_assets,
    [6, 182, 212],
    [236, 254, 255],
  );
  renderSection(
    "KEWAJIBAN",
    data.liabilities,
    data.total_liabilities,
    [245, 158, 11],
    [255, 251, 235],
  );
  renderSection(
    "EKUITAS",
    data.equity,
    data.total_equity,
    [168, 85, 247],
    [250, 245, 255],
  );

  const balanced = data.is_balanced;
  const boxH = 22;
  if (startY + boxH > 270) {
    doc.addPage();
    startY = 20;
  }
  doc.setFillColor(
    balanced ? 236 : 254,
    balanced ? 253 : 242,
    balanced ? 245 : 242,
  );
  doc.roundedRect(14, startY, 182, boxH, 3, 3, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    balanced ? 5 : 185,
    balanced ? 150 : 28,
    balanced ? 105 : 28,
  );
  doc.text(
    balanced ? "Neraca Seimbang (Balanced)" : "Neraca Tidak Seimbang",
    20,
    startY + 8,
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Aset ${formatRupiah(data.total_assets)}  =  Kewajiban + Ekuitas ${formatRupiah(data.total_liabilities + data.total_equity)}`,
    20,
    startY + 16,
  );

  applyFooters(doc);
  doc.save(`LedgerFlow_Neraca_${periodName || "YTD"}.pdf`);
}

function buildBalanceOfficeDoc(
  data: BalanceSheetData,
  periodName: string,
): OfficeExportDoc {
  const cols = [
    { key: "code", label: "Kode" },
    { key: "name", label: "Nama Akun" },
    { key: "amount", label: "Saldo", align: "right" as const },
  ];
  const mapRows = (
    items: { accountCode: string; accountName: string; balance: number }[],
  ) =>
    items.map((i) => ({
      code: i.accountCode,
      name: i.accountName,
      amount: formatRupiah(i.balance),
    }));

  return {
    title: "Neraca (Balance Sheet)",
    subtitle: "Posisi aset, kewajiban, dan ekuitas",
    meta: [
      { label: "Periode", value: periodLabel(periodName) },
      { label: "Dicetak", value: today() },
      {
        label: "Status",
        value: data.is_balanced ? "Seimbang" : "Tidak seimbang",
      },
    ],
    sections: [
      {
        title: "Aset",
        columns: cols,
        rows: mapRows(data.assets),
        footer: {
          code: "",
          name: "Total Aset",
          amount: formatRupiah(data.total_assets),
        },
      },
      {
        title: "Kewajiban",
        columns: cols,
        rows: mapRows(data.liabilities),
        footer: {
          code: "",
          name: "Total Kewajiban",
          amount: formatRupiah(data.total_liabilities),
        },
      },
      {
        title: "Ekuitas",
        columns: cols,
        rows: mapRows(data.equity),
        footer: {
          code: "",
          name: "Total Ekuitas",
          amount: formatRupiah(data.total_equity),
        },
      },
    ],
    notes: [
      `Aset: ${formatRupiah(data.total_assets)}`,
      `Kewajiban + Ekuitas: ${formatRupiah(data.total_liabilities + data.total_equity)}`,
    ],
  };
}

export function exportBalanceSheetExcel(
  data: BalanceSheetData,
  periodName: string,
) {
  exportOfficeExcel(
    buildBalanceOfficeDoc(data, periodName),
    `LedgerFlow_Neraca_${periodName || "YTD"}`,
  );
}

export function exportBalanceSheetWord(
  data: BalanceSheetData,
  periodName: string,
) {
  exportOfficeWord(
    buildBalanceOfficeDoc(data, periodName),
    `LedgerFlow_Neraca_${periodName || "YTD"}`,
  );
}

// ─── Chart of Accounts ───────────────────────────────────────────────

type AccountExport = {
  code: string;
  name: string;
  type: string;
  normalBalance?: string;
  isActive: boolean;
};

const TYPE_LABELS: Record<string, string> = {
  ASSET: "Aset",
  LIABILITY: "Kewajiban",
  EQUITY: "Ekuitas",
  REVENUE: "Pendapatan",
  EXPENSE: "Beban",
};

export function exportChartOfAccountsPDF(accounts: AccountExport[]) {
  const doc = createPDF("Chart of Accounts", "");
  let startY = 64;

  const total = accounts.length;
  const active = accounts.filter((a) => a.isActive).length;
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Total: ${total} akun  |  Aktif: ${active}  |  Nonaktif: ${total - active}`,
    14,
    startY,
  );
  startY += 8;

  const types = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
  const typeColors: Record<string, [number, number, number]> = {
    ASSET: [6, 182, 212],
    LIABILITY: [245, 158, 11],
    EQUITY: [168, 85, 247],
    REVENUE: [16, 185, 129],
    EXPENSE: [239, 68, 68],
  };

  for (const type of types) {
    const typeAccounts = accounts.filter((a) => a.type.toUpperCase() === type);
    if (typeAccounts.length === 0) continue;

    const color = typeColors[type] || [100, 100, 100];

    if (startY > 250) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(
      `${TYPE_LABELS[type] || type} (${typeAccounts.length})`,
      14,
      startY,
    );
    startY += 4;

    autoTable(doc, {
      startY,
      head: [["Kode", "Nama Akun", "Tipe", "Status"]],
      body: typeAccounts.map((a) => [
        a.code,
        a.name,
        TYPE_LABELS[a.type.toUpperCase()] || a.type,
        a.isActive ? "Aktif" : "Nonaktif",
      ]),
      theme: "grid",
      ...tableBase,
      headStyles: {
        fillColor: color,
        textColor: 255,
        fontStyle: "bold",
        cellPadding: 4,
      },
      columnStyles: {
        0: { cellWidth: 26 },
        2: { cellWidth: 32 },
        3: { cellWidth: 26, halign: "center" },
      },
    });

    startY = lastTableY(doc, startY + 8) - 2;
  }

  applyFooters(doc);
  doc.save("LedgerFlow_ChartOfAccounts.pdf");
}

export function exportChartOfAccountsCSV(accounts: AccountExport[]) {
  const headers = ["Kode", "Nama Akun", "Tipe", "Normal Balance", "Status"];
  const rows = accounts.map((a) => [
    a.code,
    `"${a.name.replace(/"/g, '""')}"`,
    a.type,
    a.normalBalance || "",
    a.isActive ? "Active" : "Inactive",
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
    "\n",
  );
  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "LedgerFlow_ChartOfAccounts.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function buildCoAOfficeDoc(accounts: AccountExport[]): OfficeExportDoc {
  const types = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
  const cols = [
    { key: "code", label: "Kode" },
    { key: "name", label: "Nama Akun" },
    { key: "type", label: "Tipe" },
    { key: "normal", label: "Normal Balance" },
    { key: "status", label: "Status" },
  ];

  return {
    title: "Chart of Accounts",
    subtitle: "Daftar akun perusahaan",
    meta: [
      { label: "Total akun", value: String(accounts.length) },
      {
        label: "Aktif",
        value: String(accounts.filter((a) => a.isActive).length),
      },
      { label: "Dicetak", value: today() },
    ],
    sections: types
      .map((type) => {
        const rows = accounts.filter((a) => a.type.toUpperCase() === type);
        if (!rows.length) return null;
        return {
          title: `${TYPE_LABELS[type] || type} (${rows.length})`,
          columns: cols,
          rows: rows.map((a) => ({
            code: a.code,
            name: a.name,
            type: TYPE_LABELS[a.type.toUpperCase()] || a.type,
            normal: a.normalBalance || "-",
            status: a.isActive ? "Aktif" : "Nonaktif",
          })),
        };
      })
      .filter(Boolean) as OfficeExportDoc["sections"],
  };
}

export function exportChartOfAccountsExcel(accounts: AccountExport[]) {
  exportOfficeExcel(buildCoAOfficeDoc(accounts), "LedgerFlow_ChartOfAccounts");
}

export function exportChartOfAccountsWord(accounts: AccountExport[]) {
  exportOfficeWord(buildCoAOfficeDoc(accounts), "LedgerFlow_ChartOfAccounts");
}

export interface ImportedAccount {
  code: string;
  name: string;
  type: string;
  normalBalance: string;
}

export function parseAccountsCSV(csvText: string): {
  accounts: ImportedAccount[];
  errors: string[];
} {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    return {
      accounts: [],
      errors: ["File CSV kosong atau hanya berisi header"],
    };
  }

  const dataLines = lines.slice(1);
  const accounts: ImportedAccount[] = [];
  const errors: string[] = [];

  const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i];
    const cols =
      line
        .match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)
        ?.map((c) => c.replace(/^"|"$/g, "").replace(/""/g, '"').trim()) || [];

    if (cols.length < 3) {
      errors.push(
        `Baris ${i + 2}: Kolom tidak lengkap (butuh minimal: Kode, Nama, Tipe)`,
      );
      continue;
    }

    const code = cols[0];
    const name = cols[1];
    const type = cols[2]?.toUpperCase();
    const normalBalance =
      cols[3]?.toUpperCase() ||
      (["ASSET", "EXPENSE"].includes(type) ? "DEBIT" : "CREDIT");

    if (!code || !name) {
      errors.push(`Baris ${i + 2}: Kode atau nama kosong`);
      continue;
    }

    if (!validTypes.includes(type)) {
      errors.push(
        `Baris ${i + 2}: Tipe "${cols[2]}" tidak valid (gunakan: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE)`,
      );
      continue;
    }

    accounts.push({ code, name, type, normalBalance });
  }

  return { accounts, errors };
}

export function downloadImportTemplate() {
  const template = `Kode,Nama Akun,Tipe,Normal Balance
1000,Kas,ASSET,DEBIT
1100,Bank BCA,ASSET,DEBIT
1200,Piutang Usaha,ASSET,DEBIT
2000,Utang Usaha,LIABILITY,CREDIT
3000,Modal Pemilik,EQUITY,CREDIT
4000,Pendapatan Jasa,REVENUE,CREDIT
5000,Beban Gaji,EXPENSE,DEBIT
5100,Beban Sewa,EXPENSE,DEBIT`;

  const blob = new Blob(["\uFEFF" + template], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "LedgerFlow_Import_Template.csv";
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Cash Flow ───────────────────────────────────────────────────────

type CashFlowData = {
  operating: {
    description: string;
    items: { label?: string; accountName?: string; amount: number }[];
    subtotal: number;
  };
  investing: {
    description: string;
    items: { label?: string; accountName?: string; amount: number }[];
    subtotal: number;
  };
  financing: {
    description: string;
    items: { label?: string; accountName?: string; amount: number }[];
    subtotal: number;
  };
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
};

export function exportCashFlowPDF(data: CashFlowData, periodName: string) {
  const doc = createPDF("Laporan Arus Kas", periodName);
  let startY = 64;

  const renderCashSection = (
    title: string,
    description: string,
    items: { label?: string; accountName?: string; amount: number }[],
    subtotal: number,
    color: [number, number, number],
  ) => {
    if (startY > 240) {
      doc.addPage();
      startY = 20;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...color);
    doc.text(title, 14, startY);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120);
    doc.text(description, 14, startY + 5);
    startY += 9;

    const bodyRows: (
      | string
      | { content: string; styles: Record<string, unknown> }
    )[][] = items.map((item) => [
      item.label || item.accountName || "-",
      formatRupiah(item.amount),
    ]);

    bodyRows.push([
      {
        content: `Subtotal ${title}`,
        styles: { fontStyle: "bold", fillColor: [241, 245, 249] },
      },
      {
        content: formatRupiah(subtotal),
        styles: {
          fontStyle: "bold",
          halign: "right",
          fillColor: [241, 245, 249],
        },
      },
    ]);

    autoTable(doc, {
      startY,
      head: [["Keterangan", "Jumlah"]],
      body: bodyRows as never,
      theme: "grid",
      ...tableBase,
      headStyles: {
        fillColor: color,
        textColor: 255,
        fontStyle: "bold",
        cellPadding: 4,
      },
      columnStyles: {
        1: { halign: "right", cellWidth: 55 },
      },
    });

    startY = lastTableY(doc, startY + 8);
  };

  renderCashSection(
    "OPERASI",
    data.operating.description,
    data.operating.items,
    data.operating.subtotal,
    [16, 185, 129],
  );
  renderCashSection(
    "INVESTASI",
    data.investing.description,
    data.investing.items,
    data.investing.subtotal,
    [59, 130, 246],
  );
  renderCashSection(
    "PENDANAAN",
    data.financing.description,
    data.financing.items,
    data.financing.subtotal,
    [168, 85, 247],
  );

  autoTable(doc, {
    startY: startY + 2,
    head: [["Ringkasan Kas", "Jumlah"]],
    body: [
      ["Saldo Kas Awal", formatRupiah(data.beginningCash)],
      ["Perubahan Kas Bersih", formatRupiah(data.netCashFlow)],
      ["Saldo Kas Akhir", formatRupiah(data.endingCash)],
    ],
    theme: "grid",
    ...tableBase,
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: 255,
      fontStyle: "bold",
      cellPadding: 4,
    },
    columnStyles: {
      1: { halign: "right", cellWidth: 55 },
    },
    bodyStyles: { fontStyle: "bold" },
  });

  applyFooters(doc);
  doc.save(`LedgerFlow_ArusKas_${periodName || "YTD"}.pdf`);
}

function buildCashOfficeDoc(
  data: CashFlowData,
  periodName: string,
): OfficeExportDoc {
  const section = (
    title: string,
    items: { label?: string; accountName?: string; amount: number }[],
    subtotal: number,
  ) => ({
    title,
    columns: [
      { key: "label", label: "Keterangan" },
      { key: "amount", label: "Jumlah", align: "right" as const },
    ],
    rows: items.map((i) => ({
      label: i.label || i.accountName || "-",
      amount: formatRupiah(i.amount),
    })),
    footer: {
      label: `Subtotal ${title}`,
      amount: formatRupiah(subtotal),
    },
  });

  return {
    title: "Laporan Arus Kas",
    subtitle: "Arus kas operasi, investasi, dan pendanaan",
    meta: [
      { label: "Periode", value: periodLabel(periodName) },
      { label: "Dicetak", value: today() },
    ],
    sections: [
      section("Operasi", data.operating.items, data.operating.subtotal),
      section("Investasi", data.investing.items, data.investing.subtotal),
      section("Pendanaan", data.financing.items, data.financing.subtotal),
      {
        title: "Ringkasan Kas",
        columns: [
          { key: "label", label: "Keterangan" },
          { key: "amount", label: "Jumlah", align: "right" },
        ],
        rows: [
          { label: "Saldo Kas Awal", amount: formatRupiah(data.beginningCash) },
          {
            label: "Perubahan Kas Bersih",
            amount: formatRupiah(data.netCashFlow),
          },
          { label: "Saldo Kas Akhir", amount: formatRupiah(data.endingCash) },
        ],
      },
    ],
  };
}

export function exportCashFlowExcel(data: CashFlowData, periodName: string) {
  exportOfficeExcel(
    buildCashOfficeDoc(data, periodName),
    `LedgerFlow_ArusKas_${periodName || "YTD"}`,
  );
}

export function exportCashFlowWord(data: CashFlowData, periodName: string) {
  exportOfficeWord(
    buildCashOfficeDoc(data, periodName),
    `LedgerFlow_ArusKas_${periodName || "YTD"}`,
  );
}
