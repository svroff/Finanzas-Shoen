import Papa from "papaparse";
import { readSheet, type Row } from "read-excel-file/browser";
import type { MovementSource, RawMovement } from "./types";

type GenericRow = Record<string, unknown>;

export async function parseFile(file: File): Promise<RawMovement[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return parseCsv(await file.text());
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return parseExcel(file);
  if (name.endsWith(".pdf")) return parsePdf(file);
  throw new Error("Formato no soportado. Usa CSV, Excel, PDF o texto pegado.");
}

export function parseCsv(text: string): RawMovement[] {
  const parsed = Papa.parse<GenericRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader
  });
  if (parsed.errors.length > 0) {
    throw new Error(`CSV no legible: ${parsed.errors[0].message}`);
  }
  return rowsToMovements(parsed.data, "csv");
}

export async function parseExcel(file: File): Promise<RawMovement[]> {
  const rows = await readSheet(file);
  const [headers, ...dataRows] = rows;
  const normalizedHeaders = headers.map((header: Row[number]) => normalizeHeader(String(header ?? "")));
  const objects = dataRows.map((row: Row) =>
    Object.fromEntries(row.map((value: Row[number], index: number) => [normalizedHeaders[index] ?? `col_${index}`, value ?? ""]))
  );
  return rowsToMovements(objects, "excel");
}

export async function parsePdf(file: File): Promise<RawMovement[]> {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const lines: string[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    lines.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }

  return parseManualText(lines.join("\n"), "pdf");
}

export function parseManualText(text: string, source: MovementSource = "manual"): RawMovement[] {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseManualLine(line, index, source))
    .filter((movement): movement is RawMovement => Boolean(movement));
}

function rowsToMovements(rows: GenericRow[], source: MovementSource): RawMovement[] {
  const movements: RawMovement[] = [];
  rows.forEach((row, index) => {
      const normalized = normalizeRowKeys(row);
      const date = pick(normalized, ["fecha", "date", "f_operacion", "fecha_operacion"]) || "";
      const description =
        pick(normalized, ["concepto", "descripcion", "description", "movimiento", "comercio", "merchant"]) || "";
      const merchant = pick(normalized, ["comercio", "merchant", "beneficiario"]) || description;
      const amountRaw = pick(normalized, ["importe", "amount", "valor", "cargo_abono", "euros"]) || "";
      const amount = parseAmount(amountRaw);
      if (!description || Number.isNaN(amount)) return;
      movements.push({
        date: normalizeDate(date, index),
        description,
        merchant,
        amount,
        source
      });
    });
  return movements;
}

function parseManualLine(line: string, index: number, source: MovementSource): RawMovement | null {
  const amountMatch = line.match(/[-+]?\d{1,5}(?:[.,]\d{2})\s?€?$/);
  if (!amountMatch) return null;
  const amount = parseAmount(amountMatch[0]);
  const left = line.slice(0, amountMatch.index).trim();
  const dateMatch = left.match(/\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/);
  const date = normalizeDate(dateMatch?.[0] ?? "", index);
  const description = left.replace(dateMatch?.[0] ?? "", "").trim() || left;
  return { date, description, merchant: description, amount, source };
}

function normalizeRowKeys(row: GenericRow): GenericRow {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));
}

function normalizeHeader(header: string): string {
  return header
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function pick(row: GenericRow, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

function parseAmount(value: string): number {
  const cleaned = value
    .replace(/[€\s]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  return Number(cleaned);
}

function normalizeDate(value: string, fallbackIndex: number): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
  if (match) {
    const year = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : "2026";
    return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  return `2026-05-${String(Math.min(28, fallbackIndex + 1)).padStart(2, "0")}`;
}
