import { useState, useEffect } from "react";
import { TierLayout } from "../shared/TierLayout";
import {
  Calculator, Plus, Trash2, TrendingUp, HelpCircle, 
  ChevronDown, ChevronUp, Package, Save, Loader2, 
  CheckCheck, Sparkles, Layers, Download, Info
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────
type HPPType = "manufaktur" | "perdagangan" | "servis" | "fnb";

interface FnbVariant {
  id: string;
  name: string;
  baseQty: string;
  packagingCost: string;
  sellingPrice: string;
  competitorPrice: string;
  targetMargin: number;
}

interface HPPFnb {
  parentStock: string; 
  batchYield: string;
  yieldUnit: string;
  bahanBakuUtama: string; 
  bahanPelengkap: string;
  tenagaKerja: string;
  overheadDapur: string;
  variants: FnbVariant[];
}

interface HPPManufaktur { jumlahUnit: string; bahanBaku: string; bahanPendukung: string; kemasan: string; upahProduksi: string; bonusInsentif: string; listrikUtilitas: string; overheadLain: string; }
interface HPPPerdagangan { hargaBeli: string; jumlahUnit: string; diskon: string; ongkosKirim: string; biayaImport: string; biayaPenyimpanan: string; biayaLain: string; }
interface HPPServis { jumlahLayanan: string; upahStaff: string; komisi: string; material: string; peralatanDisposable: string; listrikUtilitas: string; biayaLain: string; }

type HPPData = HPPManufaktur | HPPPerdagangan | HPPServis | HPPFnb;

interface ProductItem {
  id: string;
  name: string;
  sku: string;
  hppType: HPPType;
  hppData: HPPData;
  sellingPrice: string;
  competitorPrice: string;
  dailyTarget: string;
  targetMargin: number;
}

// ─── Helpers ───────────────────────────────────────
const fmt = (v: string | number): string => {
  const n = String(v).replace(/\D/g, "");
  return n ? new Intl.NumberFormat("id-ID").format(parseInt(n)) : "";
};

const parseNum = (v: string | number | undefined | null): number => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/\D/g, "")) || 0;
};

const genId = () => Math.random().toString(36).substr(2, 9);
const formatRupiah = (value: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(value);

interface ExportRow {
  produk: string;
  kategori: string;
  varian: string;
  totalBiaya: number;
  hpp: number;
  hargaPasar: number;
  hargaJual: number;
  profit: number;
  margin: number;
  targetMargin: number;
}

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sanitizePdfText = (value: string | number) =>
  String(value).normalize("NFKD").replace(/[^\x20-\x7E]/g, "");

const escapePdfText = (value: string | number) =>
  sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const downloadFile = (fileName: string, mimeType: string, content: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = url;
  downloadAnchor.download = fileName;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
};

const buildExportRows = (items: ProductItem[]): ExportRow[] => {
  return items.flatMap((item, index) => {
    const productName = item.name || `Produk ${index + 1}`;

    if (item.hppType === "fnb") {
      const fnbD = item.hppData as HPPFnb;
      const { totalBiaya, baseCostPerUnit } = calcHPP("fnb", fnbD);

      return fnbD.variants.map((variant) => {
        const hpp = parseNum(variant.baseQty) * (baseCostPerUnit || 0) + parseNum(variant.packagingCost);
        const hargaJual = parseNum(variant.sellingPrice);
        const profit = hargaJual > hpp ? hargaJual - hpp : 0;
        const margin = hargaJual > 0 ? (profit / hargaJual) * 100 : 0;

        return {
          produk: productName,
          kategori: "F&B Kuliner",
          varian: variant.name || "Varian",
          totalBiaya,
          hpp,
          hargaPasar: parseNum(variant.competitorPrice),
          hargaJual,
          profit,
          margin,
          targetMargin: variant.targetMargin,
        };
      });
    }

    const { totalBiaya, hppPerUnit } = calcHPP(item.hppType, item.hppData);
    const hargaJual = parseNum(item.sellingPrice);
    const profit = hargaJual > hppPerUnit ? hargaJual - hppPerUnit : 0;
    const margin = hargaJual > 0 ? (profit / hargaJual) * 100 : 0;

    return [{
      produk: productName,
      kategori: item.hppType === "perdagangan" ? "Dagang" : item.hppType === "servis" ? "Jasa" : "Manufaktur",
      varian: "-",
      totalBiaya,
      hpp: hppPerUnit,
      hargaPasar: parseNum(item.competitorPrice),
      hargaJual,
      profit,
      margin,
      targetMargin: item.targetMargin,
    }];
  });
};

const buildExcelContent = (rows: ExportRow[], totals: { hpp: number; selling: number; profit: number }, avgMargin: number) => {
  const bodyRows = rows.map((row, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(row.produk)}</td>
      <td>${escapeHtml(row.kategori)}</td>
      <td>${escapeHtml(row.varian)}</td>
      <td>${Math.round(row.totalBiaya)}</td>
      <td>${Math.round(row.hpp)}</td>
      <td>${Math.round(row.hargaPasar)}</td>
      <td>${Math.round(row.hargaJual)}</td>
      <td>${Math.round(row.profit)}</td>
      <td>${row.margin.toFixed(1)}%</td>
      <td>${row.targetMargin}%</td>
    </tr>
  `).join("");

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          table { border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; }
          th { background: #0f766e; color: #ffffff; }
          .summary th { background: #0f172a; }
        </style>
      </head>
      <body>
        <table>
          <tr><th colspan="11">Laporan Kalkulator HPP Offline</th></tr>
          <tr>
            <th>No</th>
            <th>Produk</th>
            <th>Kategori</th>
            <th>Varian</th>
            <th>Total Biaya</th>
            <th>HPP</th>
            <th>Harga Pasar</th>
            <th>Harga Jual</th>
            <th>Profit</th>
            <th>Margin</th>
            <th>Target Margin</th>
          </tr>
          ${bodyRows}
        </table>
        <br />
        <table class="summary">
          <tr><th>Total Modal</th><th>Total Omzet</th><th>Total Profit</th><th>Rata Margin</th></tr>
          <tr>
            <td>${Math.round(totals.hpp)}</td>
            <td>${Math.round(totals.selling)}</td>
            <td>${Math.round(totals.profit)}</td>
            <td>${avgMargin}%</td>
          </tr>
        </table>
      </body>
    </html>
  `;
};

const wrapPdfLine = (text: string, maxLength = 105) => {
  const words = sanitizePdfText(text).split(" ");
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const nextLine = line ? `${line} ${word}` : word;
    if (nextLine.length > maxLength) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = nextLine;
    }
  });

  if (line) lines.push(line);
  return lines;
};

const buildPdfContent = (rows: ExportRow[], totals: { hpp: number; selling: number; profit: number }, avgMargin: number) => {
  const reportLines = [
    "Laporan Kalkulator HPP Offline",
    `Tanggal Export: ${new Date().toLocaleDateString("id-ID")}`,
    "",
    ...rows.flatMap((row, index) => [
      `${index + 1}. ${row.produk} | ${row.kategori}${row.varian !== "-" ? ` | ${row.varian}` : ""}`,
      `   HPP: ${formatRupiah(row.hpp)} | Harga Jual: ${formatRupiah(row.hargaJual)} | Profit: ${formatRupiah(row.profit)} | Margin: ${row.margin.toFixed(1)}%`,
      `   Total Biaya: ${formatRupiah(row.totalBiaya)} | Harga Pasar: ${formatRupiah(row.hargaPasar)} | Target Margin: ${row.targetMargin}%`,
      "",
    ]),
    "Ringkasan",
    `Total Modal: ${formatRupiah(totals.hpp)}`,
    `Total Omzet: ${formatRupiah(totals.selling)}`,
    `Total Profit: ${formatRupiah(totals.profit)}`,
    `Rata Margin: ${avgMargin}%`,
  ].flatMap((line) => wrapPdfLine(line));

  const linesPerPage = 52;
  const pages: string[][] = [];
  for (let i = 0; i < reportLines.length; i += linesPerPage) {
    pages.push(reportLines.slice(i, i + linesPerPage));
  }

  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 4 + index * 2);
  const contentIds = pages.map((_, index) => 5 + index * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, index) => {
    const pageId = pageIds[index];
    const contentId = contentIds[index];
    const stream = [
      "BT",
      "/F1 10 Tf",
      "14 TL",
      ...pageLines.map((line, lineIndex) => `1 0 0 1 40 ${800 - lineIndex * 14} Tm (${escapePdfText(line)}) Tj`),
      "ET",
    ].join("\n");

    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let i = 1; i < objects.length; i += 1) {
    if (!objects[i]) continue;
    offsets[i] = pdf.length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i] || 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return pdf;
};

function defaultHPPData(type: HPPType): HPPData {
  if (type === "fnb") return { parentStock: "100", batchYield: "50", yieldUnit: "pcs", bahanBakuUtama: "", bahanPelengkap: "", tenagaKerja: "", overheadDapur: "", variants: [{ id: genId(), name: "Varian Standar", baseQty: "1", packagingCost: "", sellingPrice: "", competitorPrice: "", targetMargin: 40 }] };
  if (type === "perdagangan") return { hargaBeli: "", jumlahUnit: "1", diskon: "", ongkosKirim: "", biayaImport: "", biayaPenyimpanan: "", biayaLain: "" };
  if (type === "servis") return { jumlahLayanan: "1", upahStaff: "", komisi: "", material: "", peralatanDisposable: "", listrikUtilitas: "", biayaLain: "" };
  return { jumlahUnit: "1", bahanBaku: "", bahanPendukung: "", kemasan: "", upahProduksi: "", bonusInsentif: "", listrikUtilitas: "", overheadLain: "" };
}

function calcHPP(type: HPPType, data: HPPData): { totalBiaya: number; hppPerUnit: number; baseCostPerUnit?: number } {
  if (type === "fnb") {
    const d = data as HPPFnb;
    const yieldAmt = parseNum(d.batchYield) || 1;
    const totalBatch = (parseNum(d.bahanBakuUtama) || 0) + parseNum(d.bahanPelengkap) + parseNum(d.tenagaKerja) + (parseNum(d.overheadDapur) || 0);
    return { totalBiaya: totalBatch, hppPerUnit: totalBatch / yieldAmt, baseCostPerUnit: totalBatch / yieldAmt };
  }
  if (type === "manufaktur") {
    const d = data as HPPManufaktur;
    const unit = parseNum(d.jumlahUnit) || 1;
    const total = parseNum(d.bahanBaku) + parseNum(d.bahanPendukung) + parseNum(d.kemasan) + parseNum(d.upahProduksi) + parseNum(d.bonusInsentif) + parseNum(d.listrikUtilitas) + parseNum(d.overheadLain);
    return { totalBiaya: total, hppPerUnit: Math.round(total / unit) };
  }
  if (type === "perdagangan") {
    const d = data as HPPPerdagangan;
    const unit = parseNum(d.jumlahUnit) || 1;
    const total = Math.max(0, parseNum(d.hargaBeli) * unit - parseNum(d.diskon) + parseNum(d.ongkosKirim) + parseNum(d.biayaImport) + parseNum(d.biayaPenyimpanan) + parseNum(d.biayaLain));
    return { totalBiaya: total, hppPerUnit: Math.round(total / unit) };
  }
  const d = data as HPPServis;
  const unit = parseNum(d.jumlahLayanan) || 1;
  const total = parseNum(d.upahStaff) + parseNum(d.komisi) + parseNum(d.material) + parseNum(d.peralatanDisposable) + parseNum(d.listrikUtilitas) + parseNum(d.biayaLain);
  return { totalBiaya: total, hppPerUnit: Math.round(total / unit) };
}

function getMarginStyle(margin: number) {
  if (margin >= 40) return { color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "✓ Sehat" };
  if (margin >= 20) return { color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "⚠ Cukup" };
  return { color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", label: "✗ Rendah" };
}

function Tooltip({ term, children }: { term: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center group/tooltip font-normal">
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }} className="ml-1 text-slate-400 hover:text-teal-600 transition-colors focus:outline-none">
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <span className={`fixed left-4 right-4 top-24 z-[9999] mx-auto max-w-[320px] bg-slate-800 text-white text-[11px] font-medium rounded-xl p-3 shadow-xl leading-relaxed pointer-events-none transition-all origin-top border border-slate-700 lg:absolute lg:left-6 lg:right-auto lg:top-1/2 lg:mx-0 lg:w-56 lg:max-w-none lg:-translate-y-1/2 lg:origin-left ${open ? "scale-100 opacity-100" : "scale-95 opacity-0 lg:group-hover/tooltip:scale-100 lg:group-hover/tooltip:opacity-100"}`}>
        <strong className="block text-teal-300 mb-1 capitalize text-xs">{term}</strong>
        {children}
      </span>
      {open && <span className="fixed inset-0 z-[9998] lg:hidden" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />}
    </span>
  );
}

function RpInput({ value, onChange, placeholder = "0", large = false }: { value: string; onChange: (v: string) => void; placeholder?: string; large?: boolean; }) {
  return (
    <div className={`flex items-center gap-1.5 border border-slate-300 rounded-lg px-3 bg-white focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/10 transition-all shadow-sm ${large ? "py-2.5" : "py-1.5"}`}>
      <span className={`text-slate-400 font-bold shrink-0 ${large ? "text-base" : "text-xs"}`}>Rp</span>
      <input type="text" inputMode="numeric" value={fmt(value)} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} placeholder={placeholder} className={`flex-1 bg-transparent focus:outline-none font-bold text-slate-900 placeholder-slate-300 ${large ? "text-xl" : "text-sm"}`} />
    </div>
  );
}

function HRow({ label, tip, value, onChange }: { label: string; tip?: string; value: string; onChange: (v: string) => void; }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0 group">
      <span className="text-[11px] text-slate-600 font-semibold flex items-center gap-1">
        {label} {tip && <Tooltip term={label}>{tip}</Tooltip>}
      </span>
      <div className="flex items-center gap-1 border border-transparent group-hover:border-slate-200 rounded-md bg-transparent group-hover:bg-white focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-500/10 focus-within:bg-white transition-all px-1.5 py-0.5">
        <span className="text-[10px] text-slate-400 font-bold">Rp</span>
        <input type="text" inputMode="numeric" value={fmt(value)} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} placeholder="0" className="w-16 sm:w-20 text-xs text-right font-bold focus:outline-none bg-transparent text-slate-900" />
      </div>
    </div>
  );
}

function HSectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-3 mb-1.5">{children}</p>;
}

function HPPManufakturForm({ d, set }: { d: HPPManufaktur; set: (k: keyof HPPManufaktur, v: string) => void }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between mb-3 p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
        <span className="text-[11px] font-bold text-slate-700 flex items-center">Jml Jadi (Hasil) <Tooltip term="Hasil Produksi">Berapa banyak barang jadi yang berhasil dibuat dalam 1 kali proses produksi (batch) ini.</Tooltip></span>
        <input type="text" inputMode="numeric" value={d.jumlahUnit} onChange={(e) => set("jumlahUnit", e.target.value.replace(/\D/g, ""))} placeholder="1" className="w-16 px-2 py-1 border border-slate-200 rounded-md text-xs font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-right transition-colors" />
      </div>
      <HSectionLabel>Bahan Pokok</HSectionLabel>
      <HRow label="Bahan utama" tip="Biaya bahan mentah inti (contoh: Kain untuk baju, Kayu untuk meja)." value={d.bahanBaku} onChange={(v) => set("bahanBaku", v)} />
      <HRow label="Bahan pendukung" tip="Aksesoris atau bumbu tambahan (contoh: Kancing, Benang, Lem)." value={d.bahanPendukung} onChange={(v) => set("bahanPendukung", v)} />
      <HRow label="Packaging / Kemasan" tip="Dus, plastik pelindung, bubble wrap, atau lakban." value={d.kemasan} onChange={(v) => set("kemasan", v)} />
      <HSectionLabel>Tenaga Kerja & Operasional</HSectionLabel>
      <HRow label="Upah yang kerja" tip="Total bayaran untuk tukang/pegawai yang mengerjakan 1 batch ini." value={d.upahProduksi} onChange={(v) => set("upahProduksi", v)} />
      <HRow label="Bonus / insentif" value={d.bonusInsentif} onChange={(v) => set("bonusInsentif", v)} />
      <HRow label="Listrik, Air, Mesin" tip="Biaya utilitas (overhead) yang terpakai untuk menjalankan alat produksi." value={d.listrikUtilitas} onChange={(v) => set("listrikUtilitas", v)} />
      <HRow label="Biaya tak terduga" value={d.overheadLain} onChange={(v) => set("overheadLain", v)} />
    </div>
  );
}

function HPPPerdaganganForm({ d, set }: { d: HPPPerdagangan; set: (k: keyof HPPPerdagangan, v: string) => void }) {
  return (
    <div className="space-y-0.5">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1 uppercase mb-1">Harga Beli / Unit <Tooltip term="Harga Beli Satuan">Harga beli untuk 1 unit barang dari supplier atau toko tempat kamu mengambil stok.</Tooltip></p>
          <div className="flex items-center gap-1"><span className="text-[10px] text-slate-400 font-bold">Rp</span><input type="text" inputMode="numeric" value={fmt(d.hargaBeli)} onChange={(e) => set("hargaBeli", e.target.value.replace(/\D/g, ""))} placeholder="0" className="w-full text-xs font-bold focus:outline-none bg-transparent text-slate-900" /></div>
        </div>
        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[9px] font-bold text-slate-500 flex items-center gap-1 uppercase mb-1">Jumlah Unit <Tooltip term="Jumlah Unit">Total barang yang kamu beli dalam satu transaksi atau satu kali stok masuk.</Tooltip></p>
          <input type="text" inputMode="numeric" value={d.jumlahUnit} onChange={(e) => set("jumlahUnit", e.target.value.replace(/\D/g, ""))} placeholder="1" className="w-full text-xs font-bold bg-transparent focus:outline-none text-slate-900" />
        </div>
      </div>
      <HSectionLabel>Biaya Tambahan</HSectionLabel>
      <HRow label="Diskon supplier" tip="Potongan harga dari supplier (Akan mengurangi total modal kamu)." value={d.diskon} onChange={(v) => set("diskon", v)} />
      <HRow label="Ongkos kirim" tip="Biaya kargo atau ekspedisi untuk mendatangkan barang tersebut." value={d.ongkosKirim} onChange={(v) => set("ongkosKirim", v)} />
      <HRow label="Bea impor / pajak" value={d.biayaImport} onChange={(v) => set("biayaImport", v)} />
      <HRow label="Biaya simpan (Gudang)" tip="Biaya kebersihan atau sewa rak untuk menyimpan barang dagangan." value={d.biayaPenyimpanan} onChange={(v) => set("biayaPenyimpanan", v)} />
      <HRow label="Biaya lainnya" tip="Contoh: Biaya admin aplikasi marketplace." value={d.biayaLain} onChange={(v) => set("biayaLain", v)} />
    </div>
  );
}

function HPPServisForm({ d, set }: { d: HPPServis; set: (k: keyof HPPServis, v: string) => void }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between mb-3 p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
        <span className="text-[11px] font-bold text-slate-700 flex items-center">Jml Layanan (Sesi) <Tooltip term="Sesi Pekerjaan">Berapa kali jasa ini dikerjakan dalam estimasi modal ini (Misal: 1 untuk satu kali cuci AC).</Tooltip></span>
        <input type="text" inputMode="numeric" value={d.jumlahLayanan} onChange={(e) => set("jumlahLayanan", e.target.value.replace(/\D/g, ""))} placeholder="1" className="w-16 px-2 py-1 border border-slate-200 rounded-md text-xs font-bold bg-slate-50 focus:bg-white focus:outline-none focus:border-teal-500 text-right transition-colors" /></div>
      <HSectionLabel>Biaya Tenaga Kerja & Material</HSectionLabel>
      <HRow label="Upah staff/teknisi" tip="Bayaran untuk orang yang mengerjakan jasa ini." value={d.upahStaff} onChange={(v) => set("upahStaff", v)} />
      <HRow label="Komisi" tip="Persentase atau tip khusus yang dibagikan ke pekerja." value={d.komisi} onChange={(v) => set("komisi", v)} />
      <HRow label="Bahan terpakai" tip="Material yang habis dipakai untuk mengerjakan 1 jasa (Contoh: Sabun/Shampoo untuk cuci motor)." value={d.material} onChange={(v) => set("material", v)} />
      <HRow label="Alat sekali pakai" tip="Barang yang langsung dibuang (Contoh: Sarung tangan, tisu, pisau cukur)." value={d.peralatanDisposable} onChange={(v) => set("peralatanDisposable", v)} />
      <HRow label="Listrik, air, utilitas" value={d.listrikUtilitas} onChange={(v) => set("listrikUtilitas", v)} />
      <HRow label="Biaya sewa / lainnya" value={d.biayaLain} onChange={(v) => set("biayaLain", v)} />
    </div>
  );
}

function HPPFnbBaseForm({ d, set, baseCostPerUnit }: any) {
  return (
    <div className="bg-amber-50/50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden space-y-4">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-amber-600" /> Stok Panci Utama <Tooltip term="Sistem Stok Panci">Di bisnis kuliner, lebih mudah menghitung modal untuk 1 panci besar/resep penuh, lalu membaginya menjadi beberapa porsi jual nanti.</Tooltip>
        </h4>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-2.5 bg-white p-3 sm:p-3.5 rounded-xl border border-amber-100 shadow-sm">
        <div>
          <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">Stok Awal</label>
          <input type="text" inputMode="numeric" value={fmt(d.parentStock || "100")} onChange={(e) => set("parentStock", e.target.value.replace(/\D/g, ""))} placeholder="100" className="w-full text-xs sm:text-sm font-black text-slate-900 focus:outline-none" />
        </div>
        <div>
          <label className="text-[9px] font-extrabold text-slate-400 flex items-center gap-1 uppercase mb-1">Hasil Batch <Tooltip term="Hasil Porsi">Satu resep/panci ini jadinya menghasilkan berapa porsi atau berapa gram?</Tooltip></label>
          <input type="text" inputMode="numeric" value={d.batchYield} onChange={(e) => set("batchYield", e.target.value.replace(/\D/g, ""))} placeholder="50" className="w-full text-xs sm:text-sm font-black text-slate-900 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[9px] font-extrabold text-slate-400 uppercase mb-1">Satuan</label>
          <input type="text" value={d.yieldUnit} onChange={(e) => set("yieldUnit", e.target.value)} placeholder="pcs" className="w-full text-xs sm:text-sm font-black text-slate-900 focus:outline-none" />
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 border border-slate-200/80 space-y-4 shadow-sm">
        <div>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-2">1. Komponen Bahan Panci</h5>
          <HRow label="Bahan Baku Utama" tip="Daging, beras, tepung, biji kopi, dll untuk 1 resep penuh." value={d.bahanBakuUtama || ""} onChange={(v) => set("bahanBakuUtama", v)} />
          <HRow label="Bahan Tambahan" tip="Bumbu penyedap, gula, garam, minyak goreng." value={d.bahanPelengkap || ""} onChange={(v) => set("bahanPelengkap", v)} />
        </div>
        <div>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-1.5 mb-2 mt-2">2. Operasional Dapur</h5>
          <HRow label="Upah Tenaga Masak" tip="Bayaran koki/asisten khusus untuk memasak 1 batch resep ini." value={d.tenagaKerja} onChange={(v) => set("tenagaKerja", v)} />
          <HRow label="Overhead Dapur" tip="Estimasi Gas LPG, Air, dan Listrik yang tersedot untuk masak 1 panci ini." value={d.overheadDapur || ""} onChange={(v) => set("overheadDapur", v)} />
        </div>
      </div>
      <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl flex items-center justify-between shadow-md">
        <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Modal Dasar / {d.yieldUnit || "unit"}</span>
        <span className="text-sm sm:text-base font-black">Rp {Math.round(baseCostPerUnit).toLocaleString("id-ID")}</span>
      </div>
    </div>
  );
}

function FnbVariantCard({ v, baseCostPerUnit, onUpdateVariant, onRemoveVariant, showRemove }: any) {
  const [collapsed, setCollapsed] = useState(true); 
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const varHpp = parseNum(v.baseQty) * baseCostPerUnit + parseNum(v.packagingCost);
  const vPrice = parseNum(v.sellingPrice);
  const vMargin = varHpp > 0 && vPrice > 0 ? Math.round(((vPrice - varHpp) / vPrice) * 100) : 0;
  const vSug = varHpp > 0 ? Math.ceil(varHpp / (1 - v.targetMargin / 100) / 500) * 500 : 0;
  const vMs = getMarginStyle(vMargin);

  const handleVarAI = () => {
    if (varHpp <= 0) return alert("Isi Modal Varian dahulu!");
    setIsAiLoading(true);
    setTimeout(() => {
      const est = Math.round((varHpp * 2.3) / 500) * 500;
      onUpdateVariant(v.id, "competitorPrice", est.toString());
      setIsAiLoading(false);
    }, 600);
  };

  return (
    <div className={`bg-white border transition-all rounded-2xl shadow-sm mb-3 overflow-hidden ${collapsed ? 'border-slate-200/90' : 'border-teal-400 ring-2 ring-teal-500/10'}`}>
      <div className="flex items-center justify-between p-3.5 bg-slate-50/90 cursor-pointer border-b border-slate-100" onClick={() => setCollapsed(!collapsed)}>
        <div className="flex items-center gap-2.5 flex-1 pr-2">
          <Layers className="w-4 h-4 text-teal-600 shrink-0" />
          <input type="text" value={v.name} onChange={(e) => onUpdateVariant(v.id, "name", e.target.value)} onClick={(e) => e.stopPropagation()} className="text-xs sm:text-sm font-black text-slate-900 bg-transparent focus:outline-none w-full max-w-[180px]" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-extrabold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-lg">Jual: {fmt(v.sellingPrice || "0")}</span>
          {showRemove && <button type="button" onClick={(e) => { e.stopPropagation(); onRemoveVariant(v.id); }} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 sm:p-5 space-y-4 bg-white">
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
            <div>
              <label className="text-[9px] font-extrabold text-slate-500 flex items-center gap-1 uppercase mb-1">Porsi Jual <Tooltip term="Konsumsi Stok">Berapa sendok/gram/porsi yang diambil dari stok panci utama untuk menyajikan 1 varian ini?</Tooltip></label>
              <input type="text" inputMode="numeric" value={v.baseQty} onChange={(e) => onUpdateVariant(v.id, "baseQty", e.target.value.replace(/\D/g, ""))} className="w-full text-xs font-black bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none" />
            </div>
            <div>
              <label className="text-[9px] font-extrabold text-slate-500 flex items-center gap-1 uppercase mb-1">Kemasan Khusus <Tooltip term="Biaya Kemasan">Harga modal cup, sedotan, plastik, paperbowl, dll khusus untuk ukuran varian ini.</Tooltip></label>
              <input type="text" inputMode="numeric" value={fmt(v.packagingCost)} onChange={(e) => onUpdateVariant(v.id, "packagingCost", e.target.value.replace(/\D/g, ""))} className="w-full text-xs font-black bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none text-right" />
            </div>
          </div>

          <div className="flex justify-between items-center bg-teal-50/80 p-3 rounded-xl border border-teal-100">
            <span className="text-[10px] font-black text-teal-900 uppercase">Total HPP Varian Ini:</span>
            <span className="text-base font-black text-teal-950">Rp {Math.round(varHpp).toLocaleString("id-ID")}</span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-[9px] font-bold text-slate-500 flex items-center gap-1 uppercase">Target Margin <Tooltip term="Target Margin">Persentase keuntungan bersih yang ingin kamu dapatkan dari penjualan varian ini.</Tooltip></label>
                <span className="text-xs font-black text-teal-600">{v.targetMargin}%</span>
              </div>
              <input type="range" min={5} max={80} step={5} value={v.targetMargin} onChange={(e) => onUpdateVariant(v.id, "targetMargin", parseInt(e.target.value))} className="w-full h-1.5 accent-teal-600" />
            </div>

            {vSug > 0 && (
              <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl">
                <div><p className="text-[9px] text-teal-400 font-bold uppercase">Saran Harga Jual</p><p className="text-sm font-black">Rp {vSug.toLocaleString("id-ID")}</p></div>
                <button type="button" onClick={() => onUpdateVariant(v.id, "sellingPrice", vSug.toString())} className="px-3 py-1.5 bg-teal-500 text-slate-900 text-[10px] font-black rounded-lg">Pakai</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[9px] font-bold text-slate-400 flex items-center gap-1 uppercase">Harga Pasar <Tooltip term="Harga Pasaran">Rata-rata harga jual kompetitor di sekitarmu.</Tooltip></label>
                  <button type="button" onClick={handleVarAI} disabled={isAiLoading} className="flex items-center gap-1 bg-violet-50 text-violet-700 px-2 py-0.5 rounded-lg text-[10px] font-black">
                    {isAiLoading ? "..." : <Sparkles className="w-2.5 h-2.5" />} AI
                  </button>
                </div>
                <RpInput value={v.competitorPrice} onChange={(val) => onUpdateVariant(v.id, "competitorPrice", val)} />
              </div>
              <div>
                <label className="block text-[9px] font-black text-teal-600 uppercase mb-1">Harga Jual Final</label>
                <RpInput value={v.sellingPrice} onChange={(val) => onUpdateVariant(v.id, "sellingPrice", val)} />
              </div>
            </div>

            {vPrice > 0 && varHpp > 0 && (
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${vMs.bg} ${vMs.color}`}>{vMargin}% {vMs.label}</span>
                <span className="text-xs font-bold text-slate-500">+Rp {(vPrice - varHpp).toLocaleString("id-ID")} Profit</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ item, index, onUpdate, onRemove, showRemove }: any) {
  const [collapsed, setCollapsed] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { hppPerUnit, baseCostPerUnit } = calcHPP(item.hppType, item.hppData);
  const suggested = hppPerUnit > 0 ? Math.ceil(hppPerUnit / (1 - item.targetMargin / 100) / 500) * 500 : 0;

  const setHPP = (k: string, v: string) => onUpdate("hppData", { ...item.hppData, [k]: v });

  const handleUpdateVariant = (vId: string, field: string, val: any) => {
    const fnbD = item.hppData as HPPFnb;
    onUpdate("hppData", { ...fnbD, variants: fnbD.variants.map((v) => v.id === vId ? { ...v, [field]: val } : v) });
  };
  const handleAddVariant = () => {
    const fnbD = item.hppData as HPPFnb;
    onUpdate("hppData", { ...fnbD, variants: [...fnbD.variants, { id: genId(), name: `Varian ${fnbD.variants.length + 1}`, baseQty: "1", packagingCost: "", sellingPrice: "", competitorPrice: "", targetMargin: 40 }] });
  };
  const handleRemoveVariant = (vId: string) => {
    const fnbD = item.hppData as HPPFnb;
    onUpdate("hppData", { ...fnbD, variants: fnbD.variants.filter((v) => v.id !== vId) });
  };

  const handleStandardAI = () => {
    if (hppPerUnit <= 0) return alert("Lengkapi data modal dahulu!");
    setIsAiLoading(true);
    setTimeout(() => {
      const mult = item.hppType === "manufaktur" ? 2.0 : 1.5;
      const est = Math.round((hppPerUnit * mult) / 500) * 500;
      onUpdate("competitorPrice", est.toString());
      setIsAiLoading(false);
    }, 600);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 bg-slate-100/80 border-b border-slate-200/60">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-white border flex items-center justify-center font-black text-teal-700 text-sm">{index + 1}</div>
          <input type="text" value={item.name} onChange={(e) => onUpdate("name", e.target.value)} placeholder={`Ketik Nama Produk ${index + 1}...`} className="text-base sm:text-lg font-black bg-transparent focus:outline-none w-full max-w-md text-slate-900" />
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCollapsed(!collapsed)} className="p-2 text-slate-400 hover:text-slate-700">{collapsed ? <ChevronDown className="w-5 h-5"/> : <ChevronUp className="w-5 h-5"/>}</button>
          {showRemove && <button type="button" onClick={onRemove} className="p-2 text-slate-400 hover:text-rose-600"><Trash2 className="w-5 h-5"/></button>}
        </div>
      </div>

      {!collapsed && (
        <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 bg-white">
          <div className="lg:col-span-5 space-y-5">
            {/* 🚀 FIX: Sekarang tombol F&B sudah masuk ke daftar pill kategori biar bisa dipilih */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl">
              {[
                { value: "manufaktur", label: "Manufaktur" },
                { value: "perdagangan", label: "Dagang" },
                { value: "servis", label: "Jasa" },
                { value: "fnb", label: "F&B Kuliner" }
              ].map(t => (
                <button 
                  key={t.value} 
                  type="button" 
                  onClick={() => { onUpdate("hppType", t.value); onUpdate("hppData", defaultHPPData(t.value as any)); }} 
                  className={`flex-1 min-w-[70px] py-2 rounded-lg text-[11px] font-bold capitalize transition-all ${item.hppType === t.value ? 'bg-white text-teal-700 shadow-sm font-black' : 'text-slate-500'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-slate-50/60 p-4 sm:p-5 rounded-2xl border border-slate-100 space-y-4">
              {item.hppType === "fnb" && <HPPFnbBaseForm d={item.hppData as HPPFnb} set={setHPP} baseCostPerUnit={baseCostPerUnit} />}
              {item.hppType === "manufaktur" && <HPPManufakturForm d={item.hppData as HPPManufaktur} set={setHPP} />}
              {item.hppType === "perdagangan" && <HPPPerdaganganForm d={item.hppData as HPPPerdagangan} set={setHPP} />}
              {item.hppType === "servis" && <HPPServisForm d={item.hppData as HPPServis} set={setHPP} />}
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4 lg:border-l lg:border-slate-100 lg:pl-6">
            {item.hppType === "fnb" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-black text-sm text-slate-900 flex items-center gap-2"><Layers className="w-4 h-4 text-teal-600"/> Varian Porsi Jual</h4>
                </div>
                <div className="space-y-3">
                  {(item.hppData as HPPFnb).variants.map((v: FnbVariant) => (
                    <FnbVariantCard key={v.id} v={v} baseCostPerUnit={baseCostPerUnit} onUpdateVariant={handleUpdateVariant} onRemoveVariant={handleRemoveVariant} showRemove={(item.hppData as HPPFnb).variants.length > 1} />
                  ))}
                </div>
                <button type="button" onClick={handleAddVariant} className="w-full py-3 bg-teal-50 border-2 border-dashed border-teal-300 text-teal-700 font-black rounded-2xl text-xs flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4"/> Tambah Varian Jual
                </button>
              </div>
            ) : (
              <div className="bg-slate-50/60 p-4 sm:p-6 rounded-2xl border border-slate-100 space-y-5">
                 <div className="flex justify-between items-center">
                   <span className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase">HPP Bersih / Unit <Tooltip term="Harga Pokok Penjualan">Ini adalah total modal murni (titik impas) untuk 1 buah produkmu. Jika dijual di bawah harga ini, kamu rugi.</Tooltip></span>
                   <span className="text-xl sm:text-2xl font-black text-teal-600">Rp {hppPerUnit.toLocaleString("id-ID")}</span>
                 </div>
                 <div>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">Target Margin <Tooltip term="Target Margin">Persentase keuntungan bersih yang ingin kamu raih dari 1 penjualan ini.</Tooltip></label>
                    <span className="text-sm font-black text-teal-600">{item.targetMargin}%</span>
                  </div>
                  <input type="range" min={5} max={80} step={5} value={item.targetMargin} onChange={(e) => onUpdate("targetMargin", parseInt(e.target.value))} className="w-full h-1.5 accent-teal-600" />
                </div>

                {suggested > 0 && (
                  <div className="flex items-center justify-between p-3 bg-teal-50 border border-teal-100 rounded-xl">
                    <div><p className="text-[9px] text-teal-700 font-bold uppercase">Saran Harga Jual</p><p className="text-sm font-black text-teal-900">Rp {suggested.toLocaleString("id-ID")}</p></div>
                    <button type="button" onClick={() => onUpdate("sellingPrice", suggested.toString())} className="px-3 py-1.5 bg-white border text-teal-700 text-[10px] font-extrabold rounded-md shadow-sm">Gunakan</button>
                  </div>
                )}

                 <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1 uppercase">Harga Pasar <Tooltip term="Harga Pasaran">Harga pesaing/rata-rata orang jualan produk sejenis.</Tooltip></label>
                      <button type="button" onClick={handleStandardAI} disabled={isAiLoading} className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-md text-[9px] font-extrabold">{isAiLoading ? "..." : "AI"}</button>
                    </div>
                    <RpInput value={item.competitorPrice || ""} onChange={(v) => onUpdate("competitorPrice", v)} />
                  </div>
                  <div><label className="block text-[10px] font-bold text-teal-600 uppercase mb-1.5">Harga Jual Kamu</label><RpInput value={item.sellingPrice} onChange={(v) => onUpdate("sellingPrice", v)} /></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function HPPCalculator() {
  const defaultType = "manufaktur";
  const makeProduct = (): ProductItem => ({ id: genId(), name: "", sku: "", hppType: defaultType, hppData: defaultHPPData(defaultType), sellingPrice: "", competitorPrice: "", dailyTarget: "", targetMargin: 40 });
  
  const [items, setItems] = useState<ProductItem[]>([makeProduct()]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false); 

  useEffect(() => {
    const localData = localStorage.getItem("hpp_pro_drafts");
    if (localData) {
      try { setItems(JSON.parse(localData)); } catch (e) { console.error(e); }
    }
    setIsLoading(false);
  }, []);

  const updateItem = (id: string, field: string, value: any) => setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  const removeItem = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id));

  const handleSaveToLocal = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    setTimeout(() => {
      localStorage.setItem("hpp_pro_drafts", JSON.stringify(items));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      setIsSaving(false);
    }, 400);
  };

  const handleExportData = () => {
    const rows = buildExportRows(items);
    const timestamp = Date.now();

    downloadFile(
      `HPP_Pro_Laporan_${timestamp}.xls`,
      "application/vnd.ms-excel;charset=utf-8",
      buildExcelContent(rows, totals, avgMargin)
    );

    downloadFile(
      `HPP_Pro_Laporan_${timestamp}.pdf`,
      "application/pdf;charset=utf-8",
      buildPdfContent(rows, totals, avgMargin)
    );
  };

  const totals = items.reduce((acc, item) => {
    if (item.hppType === "fnb") {
      const fnbD = item.hppData as HPPFnb;
      const { baseCostPerUnit } = calcHPP("fnb", fnbD);
      fnbD.variants.forEach((v) => {
        const varHpp = parseNum(v.baseQty) * (baseCostPerUnit || 0) + parseNum(v.packagingCost);
        const vPrice = parseNum(v.sellingPrice);
        acc.hpp += varHpp; acc.selling += vPrice; acc.profit += vPrice > varHpp ? vPrice - varHpp : 0;
      });
      return acc;
    }
    const { hppPerUnit } = calcHPP(item.hppType, item.hppData);
    const price = parseNum(item.sellingPrice);
    acc.hpp += hppPerUnit; acc.selling += price; acc.profit += price > hppPerUnit ? price - hppPerUnit : 0;
    return acc;
  }, { hpp: 0, selling: 0, profit: 0 });

  const avgMargin = totals.selling > 0 ? parseFloat(((totals.profit / totals.selling) * 100).toFixed(1)) : 0;

  if (isLoading) return <div className="min-h-screen bg-slate-50 flex justify-center items-center"><Loader2 className="w-10 h-10 animate-spin text-teal-600"/></div>;

  return (
    <TierLayout>
      <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto font-sans text-slate-900 bg-slate-50 min-h-screen space-y-6">
        
        {/* Atas UI Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-teal-600 text-white shadow-md"><Calculator className="w-6 h-6"/></div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">Kalkulator HPP Offline</h1>
              <p className="text-xs font-medium text-slate-500">Data otomatis tersimpan aman di internal handphone kamu.</p>
            </div>
          </div>
          
          <button type="button" onClick={handleExportData} className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-colors text-slate-700">
            <Download className="w-4 h-4 text-slate-500"/> Eksport File (.pdf/.xls)
          </button>
        </div>

        {/* Banner Instruksi */}
        <div className="bg-sky-50/80 border border-sky-200 rounded-2xl p-4 sm:p-5 text-sky-900 shadow-sm relative overflow-hidden transition-all duration-300">
          <div className="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
          
          <button 
            type="button" 
            onClick={() => setShowGuide(!showGuide)}
            className="w-full flex items-center justify-between text-left focus:outline-none"
          >
            <h3 className="font-black text-sm flex items-center gap-2">
              <Info className="w-5 h-5 text-sky-600"/> 
              Panduan Pilih Kategori Bisnismu
            </h3>
            <span className="p-1 text-sky-500 hover:text-sky-700 hover:bg-sky-100 rounded-lg transition-colors">
              {showGuide ? <ChevronUp className="w-5 h-5"/> : <ChevronDown className="w-5 h-5"/>}
            </span>
          </button>

          {showGuide && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm leading-relaxed mt-4">
              <div className="bg-white/60 p-3 rounded-xl border border-sky-100">
                <strong className="text-sky-700 block mb-0.5">⚙️ Manufaktur & Produksi</strong>
                <p className="text-slate-600">Beli bahan mentah untuk dijadikan barang jadi. <br/><em>Contoh: Jahit baju, kerajinan tas, pabrik sablon.</em></p>
              </div>
              <div className="bg-white/60 p-3 rounded-xl border border-sky-100">
                <strong className="text-sky-700 block mb-0.5">📦 Perdagangan (Retail/Reseller)</strong>
                <p className="text-slate-600">Beli barang sudah jadi, dan dijual lagi tanpa diubah bentuknya. <br/><em>Contoh: Toko kelontong, thrift shop, dropshipper.</em></p>
              </div>
              <div className="bg-white/60 p-3 rounded-xl border border-sky-100">
                <strong className="text-sky-700 block mb-0.5">🛠️ Servis (Jasa)</strong>
                <p className="text-slate-600">Menjual keahlian, waktu, atau layanan kepada orang lain. <br/><em>Contoh: Cuci motor, desain grafis, potong rambut.</em></p>
              </div>
              <div className="bg-white/60 p-3 rounded-xl border border-sky-100">
                <strong className="text-sky-700 block mb-0.5">🍳 F&B (Kuliner / Makanan)</strong>
                <p className="text-slate-600">Pakai sistem <b>Stok Induk Panci</b>. Menghitung modal 1 resep penuh untuk dibagi ke banyak porsi jual. <br/><em>Contoh: Kedai kopi, katering, warung bakso.</em></p>
              </div>
            </div>
          )}
        </div>

        {/* List Form Card */}
        <div className="space-y-6">
          {items.map((item, idx) => (
            <ProductCard key={item.id} item={item} index={idx} showRemove={items.length > 1} onRemove={() => removeItem(item.id)} onUpdate={(field: any, value: any) => updateItem(item.id, field, value)} />
          ))}
          
          {/* Tombol Kontrol Bawah */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button type="button" onClick={() => setItems((prev) => [...prev, makeProduct()])} className="flex-1 py-3.5 border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl font-black text-xs text-slate-600 hover:text-teal-700 transition-all flex items-center justify-center gap-2">
              <Plus className="w-4 h-4"/> Tambah Baris Produk Baru
            </button>
            <button type="button" onClick={handleSaveToLocal} disabled={isSaving} className={`flex-1 py-3.5 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-md transition-all flex items-center justify-center gap-2 ${saveSuccess ? 'bg-emerald-600' : 'bg-teal-600 hover:bg-teal-500'}`}>
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : saveSuccess ? <CheckCheck className="w-4 h-4" /> : <Save className="w-4 h-4" />} 
              {saveSuccess ? "Tersimpan di Memori HP" : "Simpan Draft Sekarang"}
            </button>
          </div>

          {/* Ringkasan Finansial Bawah */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
            <h3 className="text-xs font-black text-slate-900 flex items-center gap-2 border-b pb-3 mb-4">
              <TrendingUp className="w-4 h-4 text-teal-600" /> Estimasi Margin Bisnis Kamu
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-50 rounded-xl p-4"><p className="text-[9px] text-slate-400 uppercase font-extrabold mb-0.5">Total Modal</p><p className="text-base font-black text-slate-800">{formatRupiah(totals.hpp)}</p></div>
              <div className="bg-slate-50 rounded-xl p-4"><p className="text-[9px] text-slate-400 uppercase font-extrabold mb-0.5">Total Omzet</p><p className="text-base font-black text-slate-900">{formatRupiah(totals.selling)}</p></div>
              <div className={`rounded-xl p-4 border flex items-center justify-between ${avgMargin >= 40 ? "bg-emerald-50 border-emerald-200 text-emerald-900" : avgMargin >= 20 ? "bg-amber-50 border-amber-200 text-amber-900" : "bg-rose-50 border-rose-200 text-rose-900"}`}>
                <div><p className="text-[9px] uppercase font-extrabold opacity-60">Rata Margin</p><p className="text-2xl font-black">{avgMargin}%</p></div>
                <span className="text-[10px] font-black uppercase">{avgMargin >= 40 ? "Sehat" : avgMargin >= 20 ? "Cukup" : "Risiko"}</span>
              </div>
            </div>
          </div>

        </div>
      </main>
    </TierLayout>
  );
}
