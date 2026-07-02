import { useEffect, useMemo, useRef, useState } from "react";
import { TierLayout } from "../shared/TierLayout";
import {
  AlertCircle,
  Boxes,
  Calculator,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Download,
  Factory,
  HelpCircle,
  Loader2,
  Package,
  Plus,
  Save,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingUp,
  Utensils,
  Wrench,
  X,
} from "lucide-react";

type HPPType = "manufaktur" | "perdagangan" | "servis" | "fnb";
type UnitCategory = "mass" | "volume" | "count";

interface UnitDef {
  label: string;
  category: UnitCategory;
  toBase: number;
}

const UNITS: Record<string, UnitDef> = {
  kg: { label: "kg", category: "mass", toBase: 1000 },
  ons: { label: "ons", category: "mass", toBase: 100 },
  gram: { label: "gram", category: "mass", toBase: 1 },
  liter: { label: "liter", category: "volume", toBase: 1000 },
  gelas: { label: "gelas (250ml)", category: "volume", toBase: 250 },
  sendok_makan: { label: "sdm", category: "volume", toBase: 15 },
  sendok_teh: { label: "sdt", category: "volume", toBase: 5 },
  ml: { label: "ml", category: "volume", toBase: 1 },
  box: { label: "box", category: "count", toBase: 1 },
  dus: { label: "dus", category: "count", toBase: 1 },
  pack: { label: "pack", category: "count", toBase: 1 },
  karung: { label: "karung", category: "count", toBase: 1 },
  lusin: { label: "lusin", category: "count", toBase: 12 },
  pcs: { label: "pcs", category: "count", toBase: 1 },
  sachet: { label: "sachet", category: "count", toBase: 1 },
  botol: { label: "botol", category: "count", toBase: 1 },
  cup: { label: "cup", category: "count", toBase: 1 },
  butir: { label: "butir", category: "count", toBase: 1 },
  lembar: { label: "lembar", category: "count", toBase: 1 },
  meter: { label: "meter", category: "count", toBase: 1 },
};

const UNIT_GROUPS: { category: UnitCategory; label: string; keys: string[] }[] = [
  { category: "mass", label: "Berat", keys: ["kg", "ons", "gram"] },
  { category: "volume", label: "Volume", keys: ["liter", "gelas", "sendok_makan", "sendok_teh", "ml"] },
  { category: "count", label: "Kemasan & Jumlah", keys: ["box", "dus", "pack", "karung", "lusin", "pcs", "sachet", "botol", "cup", "butir", "lembar", "meter"] },
];

interface MaterialItem {
  id: string;
  name: string;
  hargaBeli: string;
  jumlahBeli: string;
  satuanBeli: string;
  pemakaian: string;
  satuanPakai: string;
}

interface ProductionData {
  category: string;
  outputQty: string;
  outputUnit: string;
  materials: MaterialItem[];
  laborCost: string;
  overheadCost: string;
  otherCost: string;
}

interface RetailData {
  productName: string;
  category: string;
  purchaseUnit: string;
  contentPerPurchase: string;
  sellingUnit: string;
  purchasePrice: string;
  initialStock: string;
  soldQty?: string;
  supplier: string;
  discount: string;
  shippingCost: string;
  otherCost: string;
}

type ServiceCostCategory = "material" | "labor" | "operational" | "depreciation" | "other";
type ServiceCalcMode = "per_service" | "per_project" | "hourly" | "per_minute" | "daily" | "monthly" | "asset_straight_line";
type DepreciationAllocation = "monthly" | "daily" | "per_service" | "per_project";

interface ServiceComponent {
  id: string;
  name: string;
  category: ServiceCostCategory;
  amount: string;
  quantity: string;
  unit: string;
  calcMode: ServiceCalcMode;
  allocationQty: string;
  residualValue: string;
  usefulLifeYears: string;
  depreciationAllocation: DepreciationAllocation;
}

interface ServiceData {
  serviceName: string;
  category: string;
  durationMode: "unit" | "time";
  durationHours: string;
  durationMinutes: string;
  serviceCount: string;
  components: ServiceComponent[];
}

interface FnbVariant {
  id: string;
  name: string;
  baseQty: string;
  packagingCost: string;
  sellingPrice: string;
  competitorPrice: string;
  targetMargin: number;
}

interface HPPFnb extends ProductionData {
  variants: FnbVariant[];
}

type HPPManufaktur = ProductionData;
type HPPServis = ServiceData;
type HPPPerdagangan = RetailData;
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

const HPP_STORAGE_KEY = "hpp_pro_drafts";
const genId = () => Math.random().toString(36).slice(2, 11);

const fmt = (v: string | number): string => {
  const n = String(v ?? "").replace(/\D/g, "");
  return n ? new Intl.NumberFormat("id-ID").format(parseInt(n, 10)) : "";
};

const parseNum = (v: string | number | undefined | null): number => {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  return parseFloat(String(v).replace(/\D/g, "")) || 0;
};

const formatRupiah = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Math.round(value || 0));

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sanitizePdfText = (value: string | number) => String(value).normalize("NFKD").replace(/[^\x20-\x7E]/g, "");
const escapePdfText = (value: string | number) => sanitizePdfText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const makeMaterial = (name = ""): MaterialItem => ({
  id: genId(),
  name,
  hargaBeli: "",
  jumlahBeli: "1",
  satuanBeli: "pcs",
  pemakaian: "",
  satuanPakai: "pcs",
});

const makeServiceComponent = (category: ServiceCostCategory = "material", name = ""): ServiceComponent => ({
  id: genId(),
  name,
  category,
  amount: "",
  quantity: "1",
  unit: category === "labor" ? "jam" : "layanan",
  calcMode: category === "labor" ? "hourly" : category === "depreciation" ? "asset_straight_line" : "per_service",
  allocationQty: "1",
  residualValue: "",
  usefulLifeYears: "5",
  depreciationAllocation: "per_service",
});

function defaultProductionData(category = ""): ProductionData {
  return {
    category,
    outputQty: "1",
    outputUnit: "pcs",
    materials: [makeMaterial()],
    laborCost: "",
    overheadCost: "",
    otherCost: "",
  };
}

function defaultServiceData(): ServiceData {
  return {
    serviceName: "",
    category: "Jasa",
    durationMode: "unit",
    durationHours: "1",
    durationMinutes: "60",
    serviceCount: "1",
    components: [
      makeServiceComponent("material", "Material habis pakai"),
      makeServiceComponent("labor", "Tenaga kerja"),
      makeServiceComponent("operational", "Operasional"),
      makeServiceComponent("depreciation", "Penyusutan aset"),
    ],
  };
}

function defaultHPPData(type: HPPType): HPPData {
  if (type === "perdagangan") {
    return {
      productName: "",
      category: "Retail",
      purchaseUnit: "box",
      contentPerPurchase: "1",
      sellingUnit: "pcs",
      purchasePrice: "",
      initialStock: "1",
      soldQty: "",
      supplier: "",
      discount: "",
      shippingCost: "",
      otherCost: "",
    };
  }

  if (type === "fnb") {
    return {
      ...defaultProductionData("Kuliner"),
      outputQty: "50",
      outputUnit: "pcs",
      materials: [
        { ...makeMaterial("Bahan utama"), satuanBeli: "kg", satuanPakai: "gram" },
        makeMaterial("Cup / kemasan"),
      ],
      variants: [{ id: genId(), name: "Varian Standar", baseQty: "1", packagingCost: "", sellingPrice: "", competitorPrice: "", targetMargin: 40 }],
    };
  }

  if (type === "servis") return defaultServiceData();
  return defaultProductionData("Produksi");
}

function normalizeData(type: HPPType, data: HPPData): HPPData {
  if (type === "perdagangan") {
    const oldData = data as Partial<RetailData> & Record<string, string | undefined>;
    return {
      productName: oldData.productName || "",
      category: oldData.category || "Retail",
      purchaseUnit: oldData.purchaseUnit || "box",
      contentPerPurchase: oldData.contentPerPurchase || oldData.jumlahUnit || "1",
      sellingUnit: oldData.sellingUnit || "pcs",
      purchasePrice: oldData.purchasePrice || oldData.hargaBeli || "",
      initialStock: oldData.initialStock || "1",
      soldQty: oldData.soldQty || "",
      supplier: oldData.supplier || "",
      discount: oldData.discount || oldData.diskon || "",
      shippingCost: oldData.shippingCost || oldData.ongkosKirim || "",
      otherCost: oldData.otherCost || oldData.biayaLain || "",
    };
  }

  if (type === "servis") {
    const oldData = data as Partial<ServiceData> & Partial<ProductionData> & Record<string, string | undefined>;
    const fallbackComponents = [
      { category: "material" as ServiceCostCategory, name: "Bahan terpakai", amount: oldData.material },
      { category: "material" as ServiceCostCategory, name: "Alat sekali pakai", amount: oldData.peralatanDisposable },
      { category: "labor" as ServiceCostCategory, name: "Tenaga kerja", amount: oldData.upahStaff || oldData.laborCost },
      { category: "labor" as ServiceCostCategory, name: "Komisi", amount: oldData.komisi },
      { category: "operational" as ServiceCostCategory, name: "Listrik, air, utilitas", amount: oldData.listrikUtilitas || oldData.overheadCost },
      { category: "other" as ServiceCostCategory, name: "Biaya lainnya", amount: oldData.biayaLain || oldData.otherCost },
    ]
      .filter((component) => !!component.amount)
      .map((component) => ({ ...makeServiceComponent(component.category, component.name), amount: component.amount || "" }));

    return {
      serviceName: oldData.serviceName || "",
      category: oldData.category || "Jasa",
      durationMode: oldData.durationMode || "unit",
      durationHours: oldData.durationHours || "1",
      durationMinutes: oldData.durationMinutes || String((parseNum(oldData.durationHours) || 1) * 60),
      serviceCount: oldData.serviceCount || oldData.jumlahLayanan || oldData.outputQty || "1",
      components: oldData.components?.length ? oldData.components : fallbackComponents.length ? fallbackComponents : defaultServiceData().components,
    };
  }

  const oldData = data as Partial<ProductionData> & Record<string, string | undefined>;
  const fallbackMaterials = [
    ["Bahan utama", oldData.bahanBaku || oldData.material],
    ["Bahan pendukung", oldData.bahanPendukung],
    ["Kemasan", oldData.kemasan || oldData.peralatanDisposable],
  ]
    .filter(([, price]) => !!price)
    .map(([name, price]) => ({ ...makeMaterial(name || ""), hargaBeli: price || "", pemakaian: "1" }));

  const normalized: ProductionData = {
    category: oldData.category || (type === "fnb" ? "Kuliner" : "Produksi"),
    outputQty: oldData.outputQty || oldData.jumlahUnit || oldData.jumlahLayanan || oldData.batchYield || "1",
    outputUnit: oldData.outputUnit || oldData.yieldUnit || "pcs",
    materials: oldData.materials?.length ? oldData.materials : fallbackMaterials.length ? fallbackMaterials : [makeMaterial()],
    laborCost: oldData.laborCost || oldData.upahProduksi || oldData.upahStaff || oldData.tenagaKerja || "",
    overheadCost: oldData.overheadCost || oldData.listrikUtilitas || oldData.overheadDapur || "",
    otherCost: oldData.otherCost || oldData.overheadLain || oldData.biayaLain || "",
  };

  if (type === "fnb") {
    return {
      ...normalized,
      variants: ((data as Partial<HPPFnb>).variants?.length ? (data as Partial<HPPFnb>).variants : [{ id: genId(), name: "Varian Standar", baseQty: "1", packagingCost: "", sellingPrice: "", competitorPrice: "", targetMargin: 40 }]) as FnbVariant[],
    };
  }

  return normalized;
}

function calcMaterialCost(material: MaterialItem): { biaya: number; mismatch: boolean } {
  const beliUnit = UNITS[material.satuanBeli];
  const pakaiUnit = UNITS[material.satuanPakai];
  const hargaBeli = parseNum(material.hargaBeli);
  const jumlahBeli = parseNum(material.jumlahBeli) || 1;
  const pemakaian = parseNum(material.pemakaian);

  if (!beliUnit || !pakaiUnit || beliUnit.category !== pakaiUnit.category) {
    return { biaya: 0, mismatch: true };
  }

  const totalBeliBase = jumlahBeli * beliUnit.toBase;
  if (totalBeliBase <= 0 || hargaBeli <= 0 || pemakaian <= 0) return { biaya: 0, mismatch: false };

  return { biaya: (hargaBeli / totalBeliBase) * pemakaian * pakaiUnit.toBase, mismatch: false };
}

function calcRetail(data: RetailData) {
  const initialStock = parseNum(data.initialStock) || 0;
  const contentPerPurchase = parseNum(data.contentPerPurchase) || 1;
  const totalStockSellingUnit = initialStock * contentPerPurchase;
  const totalPurchaseCost = Math.max(
    0,
    parseNum(data.purchasePrice) * initialStock - parseNum(data.discount) + parseNum(data.shippingCost) + parseNum(data.otherCost),
  );
  const hppPerSellingUnit = totalStockSellingUnit > 0 ? totalPurchaseCost / totalStockSellingUnit : 0;

  return { totalPurchaseCost, totalStockSellingUnit, hppPerSellingUnit };
}

function calcProduction(data: ProductionData) {
  const materialTotal = data.materials.reduce((sum, material) => sum + calcMaterialCost(material).biaya, 0);
  const totalBiaya = materialTotal + parseNum(data.laborCost) + parseNum(data.overheadCost) + parseNum(data.otherCost);
  const outputQty = parseNum(data.outputQty) || 1;
  return { materialTotal, totalBiaya, hppPerUnit: totalBiaya / outputQty };
}

function calcServiceComponent(component: ServiceComponent, service: ServiceData): number {
  const amount = parseNum(component.amount);
  const quantity = parseNum(component.quantity) || 1;
  const serviceCount = parseNum(service.serviceCount) || 1;
  const durationHours = parseNum(service.durationHours) || 1;
  const allocationQty = parseNum(component.allocationQty) || serviceCount || 1;

  if (component.calcMode === "hourly") return amount * durationHours * quantity;
  if (component.calcMode === "per_project") return (amount * quantity) / serviceCount;
  if (component.calcMode === "daily" || component.calcMode === "monthly") return (amount * quantity) / allocationQty;
  if (component.calcMode === "asset_straight_line") {
    const usefulLifeYears = parseNum(component.usefulLifeYears) || 1;
    const depreciableValue = Math.max(0, amount - parseNum(component.residualValue));
    const annualDepreciation = depreciableValue / usefulLifeYears;

    if (component.depreciationAllocation === "monthly") return (annualDepreciation / 12) / allocationQty;
    if (component.depreciationAllocation === "daily") return (annualDepreciation / 365) / allocationQty;
    if (component.depreciationAllocation === "per_project") return annualDepreciation / allocationQty / serviceCount;
    return annualDepreciation / allocationQty;
  }

  return amount * quantity;
}

function calcService(data: ServiceData) {
  const categoryTotals: Record<ServiceCostCategory, number> = {
    material: 0,
    labor: 0,
    operational: 0,
    depreciation: 0,
    other: 0,
  };

  data.components.forEach((component) => {
    categoryTotals[component.category] += calcServiceComponent(component, data);
  });

  const hppPerUnit = Object.values(categoryTotals).reduce((sum, value) => sum + value, 0);
  const serviceCount = parseNum(data.serviceCount) || 1;
  return { categoryTotals, hppPerUnit, totalBiaya: hppPerUnit * serviceCount };
}

function calcHPP(type: HPPType, data: HPPData): { totalBiaya: number; hppPerUnit: number; baseCostPerUnit?: number; totalStock?: number } {
  const normalized = normalizeData(type, data);

  if (type === "perdagangan") {
    const retail = calcRetail(normalized as RetailData);
    return {
      totalBiaya: retail.totalPurchaseCost,
      hppPerUnit: retail.hppPerSellingUnit,
      totalStock: retail.totalStockSellingUnit,
    };
  }

  if (type === "servis") {
    const service = calcService(normalized as ServiceData);
    return { totalBiaya: service.totalBiaya, hppPerUnit: service.hppPerUnit, baseCostPerUnit: service.hppPerUnit };
  }

  const production = calcProduction(normalized as ProductionData);
  return { totalBiaya: production.totalBiaya, hppPerUnit: production.hppPerUnit, baseCostPerUnit: production.hppPerUnit };
}

function getMarginStyle(margin: number) {
  if (margin >= 40) return { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", label: "Sehat" };
  if (margin >= 20) return { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "Cukup" };
  return { color: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", label: "Risiko" };
}

function downloadFile(fileName: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = url;
  downloadAnchor.download = fileName;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  URL.revokeObjectURL(url);
}

function buildExportRows(items: ProductItem[]): ExportRow[] {
  return items.flatMap((item, index) => {
    const productName = item.name || `Produk ${index + 1}`;

    if (item.hppType === "fnb") {
      const fnbData = normalizeData("fnb", item.hppData) as HPPFnb;
      const { totalBiaya, baseCostPerUnit } = calcHPP("fnb", fnbData);
      return fnbData.variants.map((variant) => {
        const hpp = parseNum(variant.baseQty) * (baseCostPerUnit || 0) + parseNum(variant.packagingCost);
        const hargaJual = parseNum(variant.sellingPrice);
        const profit = hargaJual > hpp ? hargaJual - hpp : 0;
        return {
          produk: productName,
          kategori: "F&B Kuliner",
          varian: variant.name || "Varian",
          totalBiaya,
          hpp,
          hargaPasar: parseNum(variant.competitorPrice),
          hargaJual,
          profit,
          margin: hargaJual > 0 ? (profit / hargaJual) * 100 : 0,
          targetMargin: variant.targetMargin,
        };
      });
    }

    const { totalBiaya, hppPerUnit } = calcHPP(item.hppType, item.hppData);
    const hargaJual = parseNum(item.sellingPrice);
    const profit = hargaJual > hppPerUnit ? hargaJual - hppPerUnit : 0;
    return [{
      produk: productName,
      kategori: item.hppType === "perdagangan" ? "Retail / Dagang" : item.hppType === "servis" ? "Jasa" : "Produksi",
      varian: "-",
      totalBiaya,
      hpp: hppPerUnit,
      hargaPasar: parseNum(item.competitorPrice),
      hargaJual,
      profit,
      margin: hargaJual > 0 ? (profit / hargaJual) * 100 : 0,
      targetMargin: item.targetMargin,
    }];
  });
}

function buildExcelContent(rows: ExportRow[], totals: { hpp: number; selling: number; profit: number }, avgMargin: number) {
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
            <th>No</th><th>Produk</th><th>Kategori</th><th>Varian</th><th>Total Biaya</th><th>HPP</th>
            <th>Harga Pasar</th><th>Harga Jual</th><th>Profit</th><th>Margin</th><th>Target Margin</th>
          </tr>
          ${bodyRows}
        </table>
        <br />
        <table class="summary">
          <tr><th>Total Modal</th><th>Total Omzet</th><th>Total Profit</th><th>Rata Margin</th></tr>
          <tr><td>${Math.round(totals.hpp)}</td><td>${Math.round(totals.selling)}</td><td>${Math.round(totals.profit)}</td><td>${avgMargin}%</td></tr>
        </table>
      </body>
    </html>
  `;
}

function wrapPdfLine(text: string, maxLength = 105) {
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
}

function buildPdfContent(rows: ExportRow[], totals: { hpp: number; selling: number; profit: number }, avgMargin: number) {
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
  for (let i = 0; i < reportLines.length; i += linesPerPage) pages.push(reportLines.slice(i, i + linesPerPage));

  const objects: string[] = [];
  const pageIds = pages.map((_, index) => 4 + index * 2);
  const contentIds = pages.map((_, index) => 5 + index * 2);
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  pages.forEach((pageLines, index) => {
    const stream = ["BT", "/F1 10 Tf", "14 TL", ...pageLines.map((line, lineIndex) => `1 0 0 1 40 ${800 - lineIndex * 14} Tm (${escapePdfText(line)}) Tj`), "ET"].join("\n");
    objects[pageIds[index]] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentIds[index]} 0 R >>`;
    objects[contentIds[index]] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
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
  for (let i = 1; i < objects.length; i += 1) pdf += `${String(offsets[i] || 0).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function Tooltip({ term, children }: { term: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const closeTooltip = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setOpen(false);
  };

  return (
    <span className="relative inline-flex items-center font-normal">
      <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }} className="ml-1 text-slate-400 hover:text-teal-600 transition-colors focus:outline-none">
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && <button type="button" aria-label="Tutup tooltip" className="fixed inset-0 z-[9998] cursor-default bg-transparent" onClick={closeTooltip} />}
      <span className={`fixed left-4 right-4 top-24 z-[9999] mx-auto max-w-[320px] rounded-2xl border border-slate-700 bg-slate-900 p-3 pr-9 text-[11px] font-medium leading-relaxed text-white shadow-2xl transition-all lg:absolute lg:left-6 lg:right-auto lg:top-1/2 lg:mx-0 lg:w-60 lg:-translate-y-1/2 ${open ? "scale-100 opacity-100" : "pointer-events-none scale-95 opacity-0"}`}>
        <button type="button" aria-label="Tutup tooltip" onClick={closeTooltip} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-slate-300 hover:bg-white/10 hover:text-white">
          <X className="h-3.5 w-3.5" />
        </button>
        <strong className="mb-1 block text-xs capitalize text-teal-300">{term}</strong>
        <span>{children}</span>
      </span>
    </span>
  );
}

function Field({ label, children, tip, error }: { label: string; children: React.ReactNode; tip?: string; error?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center text-[11px] font-black uppercase tracking-wide text-slate-500">
        {label}
        {tip && <Tooltip term={label}>{tip}</Tooltip>}
      </span>
      {children}
      {error && <span className="flex items-center gap-1 text-[11px] font-bold text-rose-600"><AlertCircle className="h-3.5 w-3.5" />{error}</span>}
    </label>
  );
}

function TextInput({ value, onChange, placeholder = "", inputMode = "text" }: { value: string; onChange: (value: string) => void; placeholder?: string; inputMode?: "text" | "numeric" }) {
  return (
    <input
      type="text"
      inputMode={inputMode}
      value={inputMode === "numeric" ? fmt(value) : value}
      onChange={(e) => onChange(inputMode === "numeric" ? e.target.value.replace(/\D/g, "") : e.target.value)}
      placeholder={placeholder}
      className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10"
    />
  );
}

function RpInput({ value, onChange, placeholder = "0" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm transition focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10">
      <span className="shrink-0 text-xs font-black text-slate-400">Rp</span>
      <input type="text" inputMode="numeric" value={fmt(value)} onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))} placeholder={placeholder} className="w-full bg-transparent text-sm font-black text-slate-900 outline-none placeholder:text-slate-300" />
    </div>
  );
}

function UnitSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">
      {UNIT_GROUPS.map((group) => (
        <optgroup key={group.category} label={group.label}>
          {group.keys.map((key) => <option key={key} value={key}>{UNITS[key].label}</option>)}
        </optgroup>
      ))}
    </select>
  );
}

function MetricCard({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "teal" | "amber" | "rose" | "emerald" }) {
  const tones = {
    slate: "bg-white border-slate-200 text-slate-900",
    teal: "bg-teal-50 border-teal-200 text-teal-950",
    amber: "bg-amber-50 border-amber-200 text-amber-950",
    rose: "bg-rose-50 border-rose-200 text-rose-950",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-950",
  };
  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-[10px] font-black uppercase tracking-wider opacity-60">{label}</p>
      <p className="mt-1 break-words text-lg font-black">{value}</p>
    </div>
  );
}

function MaterialRow({ material, index, onUpdate, onRemove, canRemove }: { material: MaterialItem; index: number; onUpdate: (id: string, field: keyof MaterialItem, value: string) => void; onRemove: (id: string) => void; canRemove: boolean }) {
  const { biaya, mismatch } = calcMaterialCost(material);
  return (
    <div className={`rounded-3xl border bg-white p-4 shadow-sm transition ${mismatch ? "border-rose-200 ring-4 ring-rose-50" : "border-slate-200"}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xs font-black text-slate-600">{index + 1}</span>
        <input value={material.name} onChange={(e) => onUpdate(material.id, "name", e.target.value)} placeholder="Nama bahan, contoh: gula / cup / label" className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black text-slate-900 outline-none focus:border-teal-500 focus:bg-white" />
        {canRemove && <button type="button" onClick={() => onRemove(material.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-5 w-5" /></button>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Harga Beli"><RpInput value={material.hargaBeli} onChange={(v) => onUpdate(material.id, "hargaBeli", v)} /></Field>
        <Field label="Jumlah Beli"><TextInput inputMode="numeric" value={material.jumlahBeli} onChange={(v) => onUpdate(material.id, "jumlahBeli", v)} placeholder="1" /></Field>
        <Field label="Satuan Beli"><UnitSelect value={material.satuanBeli} onChange={(v) => onUpdate(material.id, "satuanBeli", v)} /></Field>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Pemakaian per Produk"><TextInput inputMode="numeric" value={material.pemakaian} onChange={(v) => onUpdate(material.id, "pemakaian", v)} placeholder="0" /></Field>
        <Field label="Satuan Pakai"><UnitSelect value={material.satuanPakai} onChange={(v) => onUpdate(material.id, "satuanPakai", v)} /></Field>
        <div className={`rounded-2xl border p-3 ${mismatch ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"}`}>
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Biaya bahan</p>
          <p className={`mt-1 text-base font-black ${mismatch ? "text-rose-700" : "text-emerald-800"}`}>{mismatch ? "Satuan beda" : formatRupiah(biaya)}</p>
        </div>
      </div>

      {mismatch && (
        <p className="mt-3 rounded-2xl bg-rose-50 px-3 py-2 text-xs font-bold leading-relaxed text-rose-700">
          Satuan beli dan satuan pakai harus sejenis, misalnya kg ke gram, liter ke ml, atau box ke pcs.
        </p>
      )}
    </div>
  );
}

function ProductionForm({ type, data, setData }: { type: HPPType; data: ProductionData | HPPFnb; setData: (data: ProductionData | HPPFnb) => void }) {
  const production = calcProduction(data);
  const title = type === "servis" ? "Komponen Biaya Jasa" : type === "fnb" ? "Resep dan Bahan Kuliner" : "Bahan Produksi";

  const updateMaterial = (id: string, field: keyof MaterialItem, value: string) => {
    setData({ ...data, materials: data.materials.map((material) => material.id === id ? { ...material, [field]: value } : material) });
  };

  const removeMaterial = (id: string) => {
    setData({ ...data, materials: data.materials.filter((material) => material.id !== id) });
  };

  const addMaterial = () => {
    setData({ ...data, materials: [...data.materials, makeMaterial()] });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-teal-100 bg-teal-50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm">
            {type === "servis" ? <Wrench className="h-5 w-5" /> : type === "fnb" ? <Utensils className="h-5 w-5" /> : <Factory className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-950">{title}</h3>
            <p className="text-xs font-semibold text-slate-600">Tambahkan semua bahan dan komponen biaya satu per satu.</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Kategori"><TextInput value={data.category} onChange={(v) => setData({ ...data, category: v })} placeholder="Bakery, fashion, laundry" /></Field>
          <Field label="Hasil Jadi"><TextInput inputMode="numeric" value={data.outputQty} onChange={(v) => setData({ ...data, outputQty: v })} placeholder="1" /></Field>
          <Field label="Satuan Hasil"><TextInput value={data.outputUnit} onChange={(v) => setData({ ...data, outputUnit: v })} placeholder="pcs / porsi / layanan" /></Field>
        </div>
      </div>

      <div className="space-y-3">
        {data.materials.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-6 text-center">
            <Boxes className="mx-auto h-9 w-9 text-slate-300" />
            <p className="mt-2 text-sm font-black text-slate-700">Belum ada bahan</p>
            <p className="text-xs font-semibold text-slate-500">Mulai dari bahan utama, lalu tambah kemasan, label, dan biaya habis pakai.</p>
          </div>
        ) : data.materials.map((material, index) => (
          <MaterialRow key={material.id} material={material} index={index} onUpdate={updateMaterial} onRemove={removeMaterial} canRemove={data.materials.length > 1} />
        ))}
        <button type="button" onClick={addMaterial} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-teal-300 bg-teal-50 text-sm font-black text-teal-700 transition hover:bg-teal-100">
          <Plus className="h-5 w-5" /> Tambah Bahan
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Tenaga Kerja"><RpInput value={data.laborCost} onChange={(v) => setData({ ...data, laborCost: v })} /></Field>
        <Field label="Overhead"><RpInput value={data.overheadCost} onChange={(v) => setData({ ...data, overheadCost: v })} /></Field>
        <Field label="Biaya Lain"><RpInput value={data.otherCost} onChange={(v) => setData({ ...data, otherCost: v })} /></Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard label="Total Bahan" value={formatRupiah(production.materialTotal)} />
        <MetricCard label="Total Produksi" value={formatRupiah(production.totalBiaya)} tone="teal" />
        <MetricCard label={`HPP / ${data.outputUnit || "unit"}`} value={formatRupiah(production.hppPerUnit)} tone="emerald" />
      </div>
    </div>
  );
}

function RetailForm({ data, setData }: { data: RetailData; setData: (data: RetailData) => void }) {
  const retail = calcRetail(data);
  const contentError = parseNum(data.contentPerPurchase) <= 0 ? "Isi per satuan harus lebih dari 0." : "";

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-teal-100 bg-teal-50 p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm"><ShoppingBag className="h-5 w-5" /></div>
          <div>
            <h3 className="text-sm font-black text-slate-950">Retail dengan Konversi Satuan</h3>
            <p className="text-xs font-semibold text-slate-600">Contoh: beli 1 box isi 40 pcs, dijual per pcs.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Nama Barang"><TextInput value={data.productName} onChange={(v) => setData({ ...data, productName: v })} placeholder="Mie instan" /></Field>
        <Field label="Kategori"><TextInput value={data.category} onChange={(v) => setData({ ...data, category: v })} placeholder="Sembako, minuman, kosmetik" /></Field>
        <Field label="Satuan Pembelian"><UnitSelect value={data.purchaseUnit} onChange={(v) => setData({ ...data, purchaseUnit: v })} /></Field>
        <Field label="Isi per Satuan Pembelian" error={contentError}><TextInput inputMode="numeric" value={data.contentPerPurchase} onChange={(v) => setData({ ...data, contentPerPurchase: v })} placeholder="40" /></Field>
        <Field label="Satuan Penjualan"><UnitSelect value={data.sellingUnit} onChange={(v) => setData({ ...data, sellingUnit: v })} /></Field>
        <Field label="Harga Beli per Satuan"><RpInput value={data.purchasePrice} onChange={(v) => setData({ ...data, purchasePrice: v })} /></Field>
        <Field label="Stok Awal" tip={`Jumlah ${UNITS[data.purchaseUnit]?.label || data.purchaseUnit} yang baru dibeli.`}><TextInput inputMode="numeric" value={data.initialStock} onChange={(v) => setData({ ...data, initialStock: v })} placeholder="10" /></Field>
        <Field label="Supplier Opsional"><TextInput value={data.supplier} onChange={(v) => setData({ ...data, supplier: v })} placeholder="Nama supplier" /></Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Diskon"><RpInput value={data.discount} onChange={(v) => setData({ ...data, discount: v })} /></Field>
        <Field label="Ongkos Kirim"><RpInput value={data.shippingCost} onChange={(v) => setData({ ...data, shippingCost: v })} /></Field>
        <Field label="Biaya Lain"><RpInput value={data.otherCost} onChange={(v) => setData({ ...data, otherCost: v })} /></Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard label={`HPP / ${UNITS[data.sellingUnit]?.label || "satuan jual"}`} value={formatRupiah(retail.hppPerSellingUnit)} tone="emerald" />
        <MetricCard label="Stok Siap Jual" value={`${retail.totalStockSellingUnit.toLocaleString("id-ID")} ${UNITS[data.sellingUnit]?.label || data.sellingUnit}`} tone="teal" />
      </div>
    </div>
  );
}

const SERVICE_CATEGORY_META: Record<ServiceCostCategory, { label: string; tone: "slate" | "teal" | "amber" | "rose" | "emerald" }> = {
  material: { label: "Material", tone: "emerald" },
  labor: { label: "Tenaga Kerja", tone: "teal" },
  operational: { label: "Operasional", tone: "amber" },
  depreciation: { label: "Penyusutan", tone: "slate" },
  other: { label: "Biaya Lain", tone: "rose" },
};

const SERVICE_CALC_LABELS: Record<ServiceCalcMode, string> = {
  per_service: "Per layanan",
  per_project: "Per proyek",
  hourly: "Tarif per jam",
  per_minute: "Tarif per menit",
  daily: "Biaya harian dialokasikan",
  monthly: "Biaya bulanan dialokasikan",
  asset_straight_line: "Penyusutan garis lurus",
};

const DEPRECIATION_LABELS: Record<DepreciationAllocation, string> = {
  monthly: "Alokasi per bulan",
  daily: "Alokasi per hari",
  per_service: "Alokasi per layanan",
  per_project: "Alokasi per proyek",
};

function SelectInput<T extends string>({ value, onChange, options }: { value: T; onChange: (value: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as T)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10">
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function ServiceComponentCard({ component, index, service, onUpdate, onRemove, canRemove }: {
  component: ServiceComponent;
  index: number;
  service: ServiceData;
  onUpdate: (id: string, field: keyof ServiceComponent, value: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const cost = calcServiceComponent(component, service);
  const isDepreciation = component.category === "depreciation" || component.calcMode === "asset_straight_line";
  const meta = SERVICE_CATEGORY_META[component.category];

  const handleCategoryChange = (category: ServiceCostCategory) => {
    onUpdate(component.id, "category", category);
    if (category === "labor") onUpdate(component.id, "calcMode", "hourly");
    if (category === "depreciation") onUpdate(component.id, "calcMode", "asset_straight_line");
    if (category === "material" || category === "other") onUpdate(component.id, "calcMode", "per_service");
    if (category === "operational") onUpdate(component.id, "calcMode", "monthly");
  };

  return (
    <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/70 p-3">
        <div className="flex items-start gap-2">
          <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white text-xs font-black text-slate-600 shadow-sm">{index + 1}</span>
          <div className="min-w-0 flex-1">
            <input value={component.name} onChange={(e) => onUpdate(component.id, "name", e.target.value)} placeholder="Nama biaya, contoh: internet / editor / laptop" className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-black text-slate-900 outline-none focus:border-teal-500" />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-teal-700">{meta.label}</span>
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black text-slate-500 shadow-sm">{SERVICE_CALC_LABELS[component.calcMode]}</span>
              <span className="ml-auto rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700">{formatRupiah(cost)}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <button type="button" onClick={() => setExpanded((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-500 hover:bg-white" aria-label={expanded ? "Tutup detail komponen" : "Buka detail komponen"}>
              {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
            {canRemove && <button type="button" onClick={() => onRemove(component.id)} className="flex h-10 w-10 items-center justify-center rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-5 w-5" /></button>}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Jenis Komponen">
              <SelectInput<ServiceCostCategory>
                value={component.category}
                onChange={handleCategoryChange}
                options={(Object.keys(SERVICE_CATEGORY_META) as ServiceCostCategory[]).map((key) => ({ value: key, label: SERVICE_CATEGORY_META[key].label }))}
              />
            </Field>
            <Field label="Cara Perhitungan">
              <SelectInput<ServiceCalcMode>
                value={component.calcMode}
                onChange={(value) => onUpdate(component.id, "calcMode", value)}
                options={(Object.keys(SERVICE_CALC_LABELS) as ServiceCalcMode[]).map((key) => ({ value: key, label: SERVICE_CALC_LABELS[key] }))}
              />
            </Field>
            <Field label={isDepreciation ? "Harga Perolehan Aset" : "Nilai Biaya"}>
              <RpInput value={component.amount} onChange={(value) => onUpdate(component.id, "amount", value)} />
            </Field>
          </div>

          {isDepreciation ? (
            <div className="rounded-3xl border border-slate-100 bg-slate-50 p-3">
              <p className="mb-3 text-[10px] font-black uppercase tracking-wider text-slate-500">Detail Penyusutan Aset</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <Field label="Nilai Residu"><RpInput value={component.residualValue} onChange={(value) => onUpdate(component.id, "residualValue", value)} /></Field>
                <Field label="Umur Ekonomis (tahun)"><TextInput inputMode="numeric" value={component.usefulLifeYears} onChange={(value) => onUpdate(component.id, "usefulLifeYears", value)} placeholder="5" /></Field>
                <Field label="Alokasi Penyusutan">
                  <SelectInput<DepreciationAllocation>
                    value={component.depreciationAllocation}
                    onChange={(value) => onUpdate(component.id, "depreciationAllocation", value)}
                    options={(Object.keys(DEPRECIATION_LABELS) as DepreciationAllocation[]).map((key) => ({ value: key, label: DEPRECIATION_LABELS[key] }))}
                  />
                </Field>
                <Field label="Pembagi Alokasi" tip="Contoh: jumlah layanan per bulan, jumlah hari aktif, jumlah project, atau total layanan selama umur aset."><TextInput inputMode="numeric" value={component.allocationQty} onChange={(value) => onUpdate(component.id, "allocationQty", value)} placeholder="1" /></Field>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Jumlah / Orang / Kali"><TextInput inputMode="numeric" value={component.quantity} onChange={(value) => onUpdate(component.id, "quantity", value)} placeholder="1" /></Field>
              <Field label="Satuan"><TextInput value={component.unit} onChange={(value) => onUpdate(component.id, "unit", value)} placeholder="jam / layanan / bulan" /></Field>
              {(component.calcMode === "daily" || component.calcMode === "monthly") && (
                <Field label="Dibagi Jumlah Layanan" tip="Misalnya internet Rp400.000/bulan dibagi 40 layanan per bulan."><TextInput inputMode="numeric" value={component.allocationQty} onChange={(value) => onUpdate(component.id, "allocationQty", value)} placeholder="40" /></Field>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-teal-100 bg-teal-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-teal-700">Biaya / layanan</p>
            <p className="text-base font-black text-teal-950">{formatRupiah(cost)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceForm({ data, setData }: { data: ServiceData; setData: (data: ServiceData) => void }) {
  const service = calcService(data);
  const activeComponents = data.components.filter((component) => calcServiceComponent(component, data) > 0).length;

  const updateComponent = (id: string, field: keyof ServiceComponent, value: string) => {
    setData({ ...data, components: data.components.map((component) => component.id === id ? { ...component, [field]: value } : component) });
  };

  const addComponent = (category: ServiceCostCategory = "material") => {
    setData({ ...data, components: [...data.components, makeServiceComponent(category)] });
  };

  const removeComponent = (id: string) => {
    setData({ ...data, components: data.components.filter((component) => component.id !== id) });
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[28px] border border-teal-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-teal-600 via-teal-600 to-emerald-500 p-4 text-white">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-white shadow-sm ring-1 ring-white/20"><Wrench className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black">HPP Jasa / Cost of Service</h3>
              <p className="mt-0.5 text-xs font-semibold text-teal-50">Cocok untuk bengkel, salon, laundry, servis, sampai jasa per jam atau per menit.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/15">
              <p className="text-[9px] font-black uppercase tracking-wider text-teal-50">HPP / layanan</p>
              <p className="mt-1 text-lg font-black">{formatRupiah(service.hppPerUnit)}</p>
            </div>
            <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/15">
              <p className="text-[9px] font-black uppercase tracking-wider text-teal-50">Komponen aktif</p>
              <p className="mt-1 text-lg font-black">{activeComponents}/{data.components.length}</p>
            </div>
          </div>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nama Layanan"><TextInput value={data.serviceName} onChange={(value) => setData({ ...data, serviceName: value })} placeholder="Servis motor / Potong rambut / Cuci sepatu" /></Field>
            <Field label="Kategori Jasa"><TextInput value={data.category} onChange={(value) => setData({ ...data, category: value })} placeholder="Bengkel, salon, laundry, freelance" /></Field>
          </div>

          <div className="rounded-[24px] border border-slate-100 bg-slate-50 p-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setData({ ...data, durationMode: "unit" })} className={`min-h-12 rounded-2xl text-xs font-black transition ${data.durationMode !== "time" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}>Per layanan / unit</button>
              <button type="button" onClick={() => setData({ ...data, durationMode: "time" })} className={`min-h-12 rounded-2xl text-xs font-black transition ${data.durationMode === "time" ? "bg-white text-teal-700 shadow-sm" : "text-slate-500"}`}>Pakai durasi</button>
            </div>
          </div>

          {data.durationMode === "time" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Durasi (jam)"><TextInput inputMode="numeric" value={data.durationHours} onChange={(value) => setData({ ...data, durationHours: value, durationMinutes: String((parseNum(value) || 0) * 60) })} placeholder="1" /></Field>
              <Field label="Durasi (menit)"><TextInput inputMode="numeric" value={data.durationMinutes} onChange={(value) => setData({ ...data, durationMinutes: value, durationHours: String(Math.ceil((parseNum(value) || 0) / 60)) })} placeholder="60" /></Field>
              <Field label="Jumlah Layanan/Project"><TextInput inputMode="numeric" value={data.serviceCount} onChange={(value) => setData({ ...data, serviceCount: value })} placeholder="1" /></Field>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Jumlah Layanan/Unit" tip="Untuk servis, bengkel, laundry, atau pekerjaan yang dihitung per item. Contoh: 1 motor, 5 pasang sepatu, 20 order."><TextInput inputMode="numeric" value={data.serviceCount} onChange={(value) => setData({ ...data, serviceCount: value })} placeholder="1" /></Field>
              <div className="rounded-3xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-[10px] font-black uppercase tracking-wider text-teal-700">Mode aktif</p>
                <p className="mt-1 text-sm font-black text-teal-950">Biaya dihitung per layanan tanpa wajib isi jam/menit.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-black text-slate-900">Ringkasan Biaya</h4>
            <p className="text-xs font-semibold text-slate-500">Total komponen per layanan.</p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-700">{formatRupiah(service.hppPerUnit)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(Object.keys(SERVICE_CATEGORY_META) as ServiceCostCategory[]).map((key) => (
          <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">{SERVICE_CATEGORY_META[key].label}</p>
            <p className="mt-1 truncate text-sm font-black text-slate-900">{formatRupiah(service.categoryTotals[key])}</p>
          </div>
        ))}
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mb-3">
          <h4 className="text-sm font-black text-slate-900">Tambah Komponen</h4>
          <p className="text-xs font-semibold text-slate-500">Pilih jenis biaya yang ingin ditambahkan.</p>
        </div>
        <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
          {(Object.keys(SERVICE_CATEGORY_META) as ServiceCostCategory[]).map((key) => (
            <button key={key} type="button" onClick={() => addComponent(key)} className="flex min-h-11 shrink-0 items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700">
              <Plus className="h-4 w-4" /> {SERVICE_CATEGORY_META[key].label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h4 className="text-sm font-black text-slate-900">Komponen Biaya</h4>
          <p className="text-xs font-semibold text-slate-500">Tap kartu untuk buka detail perhitungan.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">{data.components.length} item</span>
      </div>

      <div className="space-y-3">
        {data.components.map((component, index) => (
          <ServiceComponentCard key={component.id} component={component} index={index} service={data} onUpdate={updateComponent} onRemove={removeComponent} canRemove={data.components.length > 1} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard label="Total HPP per Layanan" value={formatRupiah(service.hppPerUnit)} tone="emerald" />
        <MetricCard label="Total HPP Semua Layanan" value={formatRupiah(service.totalBiaya)} tone="teal" />
      </div>
    </div>
  );
}

function FnbVariants({ data, baseCostPerUnit, setData }: { data: HPPFnb; baseCostPerUnit: number; setData: (data: HPPFnb) => void }) {
  const updateVariant = (id: string, field: keyof FnbVariant, value: string | number) => {
    setData({ ...data, variants: data.variants.map((variant) => variant.id === id ? { ...variant, [field]: value } : variant) });
  };

  const addVariant = () => {
    setData({ ...data, variants: [...data.variants, { id: genId(), name: `Varian ${data.variants.length + 1}`, baseQty: "1", packagingCost: "", sellingPrice: "", competitorPrice: "", targetMargin: 40 }] });
  };

  const removeVariant = (id: string) => {
    setData({ ...data, variants: data.variants.filter((variant) => variant.id !== id) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900">Varian Jual</h3>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">Modal dasar {formatRupiah(baseCostPerUnit)}</span>
      </div>
      {data.variants.map((variant) => {
        const hpp = parseNum(variant.baseQty) * baseCostPerUnit + parseNum(variant.packagingCost);
        const price = parseNum(variant.sellingPrice);
        const margin = price > 0 ? ((price - hpp) / price) * 100 : 0;
        const suggested = hpp > 0 ? Math.ceil(hpp / (1 - variant.targetMargin / 100) / 500) * 500 : 0;
        const style = getMarginStyle(margin);

        return (
          <div key={variant.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <input value={variant.name} onChange={(e) => updateVariant(variant.id, "name", e.target.value)} className="min-h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-black outline-none focus:border-teal-500 focus:bg-white" />
              {data.variants.length > 1 && <button type="button" onClick={() => removeVariant(variant.id)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-5 w-5" /></button>}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Porsi dari Stok"><TextInput inputMode="numeric" value={variant.baseQty} onChange={(v) => updateVariant(variant.id, "baseQty", v)} placeholder="1" /></Field>
              <Field label="Kemasan Khusus"><RpInput value={variant.packagingCost} onChange={(v) => updateVariant(variant.id, "packagingCost", v)} /></Field>
              <Field label="Harga Pasar"><RpInput value={variant.competitorPrice} onChange={(v) => updateVariant(variant.id, "competitorPrice", v)} /></Field>
              <Field label="Harga Jual"><RpInput value={variant.sellingPrice} onChange={(v) => updateVariant(variant.id, "sellingPrice", v)} /></Field>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-black uppercase text-slate-500">Target Margin</span>
                <span className="text-sm font-black text-teal-700">{variant.targetMargin}%</span>
              </div>
              <input type="range" min={5} max={80} step={5} value={variant.targetMargin} onChange={(e) => updateVariant(variant.id, "targetMargin", parseInt(e.target.value, 10))} className="h-2 w-full accent-teal-600" />
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <MetricCard label="HPP Varian" value={formatRupiah(hpp)} />
              <MetricCard label="Saran Harga" value={formatRupiah(suggested)} tone="teal" />
              <div className={`rounded-3xl border p-4 shadow-sm ${style.bg} ${style.border} ${style.color}`}>
                <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Margin</p>
                <p className="mt-1 text-lg font-black">{Math.round(margin)}% {style.label}</p>
              </div>
            </div>
          </div>
        );
      })}
      <button type="button" onClick={addVariant} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-teal-300 bg-teal-50 text-sm font-black text-teal-700 transition hover:bg-teal-100">
        <Plus className="h-5 w-5" /> Tambah Varian Jual
      </button>
    </div>
  );
}

function ProductCard({ item, index, onUpdate, onRemove, showRemove }: { item: ProductItem; index: number; onUpdate: (field: keyof ProductItem, value: ProductItem[keyof ProductItem]) => void; onRemove: () => void; showRemove: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const normalizedData = useMemo(() => normalizeData(item.hppType, item.hppData), [item.hppType, item.hppData]);
  const { totalBiaya, hppPerUnit, baseCostPerUnit, totalStock } = calcHPP(item.hppType, normalizedData);
  const price = parseNum(item.sellingPrice);
  const profit = price > hppPerUnit ? price - hppPerUnit : 0;
  const margin = price > 0 ? (profit / price) * 100 : 0;
  const suggested = hppPerUnit > 0
    ? Math.ceil((item.hppType === "servis" ? hppPerUnit * (1 + item.targetMargin / 100) : hppPerUnit / (1 - item.targetMargin / 100)) / 500) * 500
    : 0;
  const marginStyle = getMarginStyle(margin);

  const typeOptions = [
    { value: "perdagangan" as HPPType, label: "Retail", icon: ShoppingBag },
    { value: "manufaktur" as HPPType, label: "Produksi", icon: Factory },
    { value: "fnb" as HPPType, label: "Kuliner", icon: Utensils },
    { value: "servis" as HPPType, label: "Jasa", icon: Wrench },
  ];

  const updateType = (type: HPPType) => {
    onUpdate("hppType", type);
    onUpdate("hppData", defaultHPPData(type));
  };

  return (
    <article className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="bg-gradient-to-r from-slate-50 to-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-teal-600 text-sm font-black text-white shadow-sm">{index + 1}</div>
          <div className="min-w-0 flex-1">
            <input value={item.name} onChange={(e) => onUpdate("name", e.target.value)} placeholder={`Nama produk ${index + 1}`} className="min-h-12 w-full rounded-2xl border border-transparent bg-transparent text-base font-black text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-200 focus:bg-white focus:px-3" />
            <p className="truncate text-xs font-semibold text-slate-500">{item.hppType === "perdagangan" ? "Retail / dagang dengan stok satuan jual" : "Perhitungan bahan rinci dan dinamis"}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button type="button" onClick={() => setCollapsed((v) => !v)} className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-500 hover:bg-slate-100">{collapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}</button>
            {showRemove && <button type="button" onClick={onRemove} className="flex h-11 w-11 items-center justify-center rounded-2xl text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-5 w-5" /></button>}
          </div>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-5 p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {typeOptions.map(({ value, label, icon: Icon }) => (
              <button key={value} type="button" onClick={() => updateType(value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-black transition ${item.hppType === value ? "border-teal-500 bg-teal-600 text-white shadow-md shadow-teal-600/20" : "border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-200 hover:bg-teal-50"}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>

          {item.hppType === "perdagangan" ? (
            <RetailForm data={normalizedData as RetailData} setData={(data) => onUpdate("hppData", data)} />
          ) : item.hppType === "servis" ? (
            <ServiceForm data={normalizedData as ServiceData} setData={(data) => onUpdate("hppData", data)} />
          ) : (
            <>
              <ProductionForm type={item.hppType} data={normalizedData as ProductionData | HPPFnb} setData={(data) => onUpdate("hppData", data)} />
              {item.hppType === "fnb" && <FnbVariants data={normalizedData as HPPFnb} baseCostPerUnit={baseCostPerUnit || 0} setData={(data) => onUpdate("hppData", data)} />}
            </>
          )}

          {item.hppType !== "fnb" && (
            <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Harga Pasar"><RpInput value={item.competitorPrice} onChange={(v) => onUpdate("competitorPrice", v)} /></Field>
                <Field label="Harga Jual Final"><RpInput value={item.sellingPrice} onChange={(v) => onUpdate("sellingPrice", v)} /></Field>
              </div>
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase text-slate-500">Target Margin</span>
                  <span className="text-sm font-black text-teal-700">{item.targetMargin}%</span>
                </div>
                <input type="range" min={5} max={80} step={5} value={item.targetMargin} onChange={(e) => onUpdate("targetMargin", parseInt(e.target.value, 10))} className="h-2 w-full accent-teal-600" />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <MetricCard label="Total Modal" value={formatRupiah(totalBiaya)} />
                <MetricCard label="HPP / Unit Jual" value={formatRupiah(hppPerUnit)} tone="emerald" />
                <MetricCard label="Saran Harga" value={formatRupiah(suggested)} tone="teal" />
                <div className={`rounded-3xl border p-4 shadow-sm ${marginStyle.bg} ${marginStyle.border} ${marginStyle.color}`}>
                  <p className="text-[10px] font-black uppercase tracking-wider opacity-70">Margin</p>
                  <p className="mt-1 text-lg font-black">{Math.round(margin)}% {marginStyle.label}</p>
                </div>
              </div>
              {item.hppType === "perdagangan" && (
                <div className="mt-3 rounded-2xl bg-white px-4 py-3 text-xs font-bold text-slate-600">
                  Stok siap jual: {(totalStock || 0).toLocaleString("id-ID")} satuan jual. HPP tetap dihitung dari harga beli per kemasan dibagi isi per kemasan.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <TierLayout>
      <main className="mx-auto min-h-screen max-w-5xl bg-slate-50 p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-[28px] bg-slate-200" />
          <div className="h-48 rounded-[28px] bg-slate-200" />
          <div className="h-64 rounded-[28px] bg-slate-200" />
        </div>
      </main>
    </TierLayout>
  );
}

export function HPPCalculator() {
  const makeProduct = (): ProductItem => ({
    id: genId(),
    name: "",
    sku: "",
    hppType: "perdagangan",
    hppData: defaultHPPData("perdagangan"),
    sellingPrice: "",
    competitorPrice: "",
    dailyTarget: "",
    targetMargin: 40,
  });

  const [items, setItems] = useState<ProductItem[]>([makeProduct()]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const hasLoadedDraft = useRef(false);

  useEffect(() => {
    const savedData = sessionStorage.getItem(HPP_STORAGE_KEY) || localStorage.getItem(HPP_STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData) as ProductItem[];
        setItems(parsed.length ? parsed.map((item) => ({ ...item, hppData: normalizeData(item.hppType, item.hppData) })) : [makeProduct()]);
      } catch (error) {
        console.error(error);
      }
    }
    hasLoadedDraft.current = true;
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft.current || isLoading) return;
    const draft = JSON.stringify(items);
    sessionStorage.setItem(HPP_STORAGE_KEY, draft);
    localStorage.setItem(HPP_STORAGE_KEY, draft);
  }, [items, isLoading]);

  const rows = useMemo(() => buildExportRows(items), [items]);
  const totals = useMemo(() => rows.reduce((acc, row) => {
    acc.hpp += row.hpp;
    acc.selling += row.hargaJual;
    acc.profit += row.profit;
    return acc;
  }, { hpp: 0, selling: 0, profit: 0 }), [rows]);
  const avgMargin = totals.selling > 0 ? parseFloat(((totals.profit / totals.selling) * 100).toFixed(1)) : 0;

  const updateItem = (id: string, field: keyof ProductItem, value: ProductItem[keyof ProductItem]) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.length > 1 ? prev.filter((item) => item.id !== id) : prev);
  };

  const addProduct = () => {
    setItems((prev) => [...prev, makeProduct()]);
    window.setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
  };

  const handleSaveToLocal = () => {
    setIsSaving(true);
    setSaveSuccess(false);
    window.setTimeout(() => {
      const draft = JSON.stringify(items);
      sessionStorage.setItem(HPP_STORAGE_KEY, draft);
      localStorage.setItem(HPP_STORAGE_KEY, draft);
      setSaveSuccess(true);
      setIsSaving(false);
      window.setTimeout(() => setSaveSuccess(false), 2200);
    }, 350);
  };

  const handleExportData = () => {
    const timestamp = Date.now();
    downloadFile(`HPP_Pro_Laporan_${timestamp}.xls`, "application/vnd.ms-excel;charset=utf-8", buildExcelContent(rows, totals, avgMargin));
    downloadFile(`HPP_Pro_Laporan_${timestamp}.pdf`, "application/pdf;charset=utf-8", buildPdfContent(rows, totals, avgMargin));
  };

  if (isLoading) return <LoadingSkeleton />;

  return (
    <TierLayout>
      <main className="mx-auto min-h-screen max-w-5xl overflow-x-hidden bg-slate-50 px-4 pb-32 pt-4 font-sans text-slate-900 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 -mx-4 border-b border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-teal-600 text-white shadow-md shadow-teal-600/20"><Calculator className="h-6 w-6" /></div>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-black tracking-tight text-slate-950 sm:text-xl">Kalkulator HPP UMKM</h1>
              <p className="truncate text-xs font-semibold text-slate-500">Retail, produksi, kuliner, fashion, jasa, dan dagang.</p>
            </div>
            <button type="button" onClick={handleExportData} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:text-teal-700" aria-label="Export laporan">
              <Download className="h-5 w-5" />
            </button>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricCard label="Total Modal" value={formatRupiah(totals.hpp)} />
          <MetricCard label="Total Omzet" value={formatRupiah(totals.selling)} tone="teal" />
          <MetricCard label="Rata Margin" value={`${avgMargin}%`} tone={avgMargin >= 40 ? "emerald" : avgMargin >= 20 ? "amber" : "rose"} />
        </section>

        <section className="mt-4 overflow-hidden rounded-[28px] border border-sky-200 bg-sky-50 shadow-sm">
          <button type="button" onClick={() => setShowGuide((v) => !v)} className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left">
            <div>
              <h2 className="text-sm font-black text-sky-950">Alur cepat input HPP</h2>
              <p className="text-xs font-semibold text-sky-700">Tambah produk, masukkan bahan atau stok, lalu hitung otomatis.</p>
            </div>
            {showGuide ? <ChevronUp className="h-5 w-5 text-sky-700" /> : <ChevronDown className="h-5 w-5 text-sky-700" />}
          </button>
          {showGuide && (
            <div className="grid gap-3 border-t border-sky-200 p-4 text-xs font-semibold leading-relaxed text-slate-700 sm:grid-cols-2">
              <p><strong className="text-sky-800">Retail:</strong> beli box/dus/pack, tentukan isi, stok otomatis dikonversi ke satuan jual.</p>
              <p><strong className="text-sky-800">Produksi:</strong> masukkan semua bahan, kemasan, label, tenaga kerja, dan overhead satu per satu.</p>
              <p><strong className="text-sky-800">Kuliner:</strong> hitung resep penuh, lalu buat varian porsi jual tanpa pindah halaman.</p>
              <p><strong className="text-sky-800">Jasa:</strong> cocok untuk laundry, percetakan, salon, servis, dan biaya material habis pakai.</p>
            </div>
          )}
        </section>

        <section className="mt-5 space-y-4">
          {items.length === 0 ? (
            <div className="rounded-[28px] border-2 border-dashed border-slate-200 bg-white p-8 text-center">
              <Package className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-base font-black text-slate-800">Belum ada produk</p>
              <p className="text-sm font-semibold text-slate-500">Tekan tombol tambah untuk mulai menghitung HPP.</p>
            </div>
          ) : items.map((item, idx) => (
            <ProductCard
              key={item.id}
              item={item}
              index={idx}
              showRemove={items.length > 1}
              onRemove={() => removeItem(item.id)}
              onUpdate={(field, value) => updateItem(item.id, field, value)}
            />
          ))}
        </section>

        <button type="button" onClick={addProduct} className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white shadow-2xl shadow-slate-900/30 transition hover:scale-105 sm:right-8" aria-label="Tambah produk">
          <Plus className="h-6 w-6" />
        </button>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-4 shadow-2xl backdrop-blur">
          <div className="mx-auto flex max-w-5xl gap-3">
            <button type="button" onClick={addProduct} className="hidden min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-700 shadow-sm sm:flex">
              <Plus className="h-5 w-5" /> Produk
            </button>
            <button type="button" onClick={handleSaveToLocal} disabled={isSaving} className={`flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl px-5 text-sm font-black text-white shadow-lg transition ${saveSuccess ? "bg-emerald-600 shadow-emerald-600/20" : "bg-teal-600 shadow-teal-600/20 hover:bg-teal-500"}`}>
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : saveSuccess ? <CheckCheck className="h-5 w-5 animate-bounce" /> : <Save className="h-5 w-5" />}
              {saveSuccess ? "Tersimpan" : "Simpan Draft"}
            </button>
            <button type="button" onClick={handleExportData} className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 shadow-sm">
              <Download className="h-5 w-5" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-3xl bg-white p-4 text-xs font-semibold text-slate-500 shadow-sm">
          <Sparkles className="h-4 w-4 shrink-0 text-teal-600" />
          <span>Semua data disimpan di browser perangkat ini dan perhitungan berjalan offline.</span>
          <TrendingUp className="ml-auto h-4 w-4 shrink-0 text-slate-300" />
        </div>
      </main>
    </TierLayout>
  );
}


