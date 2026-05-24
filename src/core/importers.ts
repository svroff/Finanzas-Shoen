import Papa from "papaparse";
import { readSheet, type Row } from "read-excel-file/browser";
import type { MovementSource, RawMovement } from "./types";

type GenericRow = Record<string, unknown>;
type TextItemLike = {
  str: string;
  transform?: number[];
};

export async function parseFile(file: File): Promise<RawMovement[]> {
  const name = file.name.toLowerCase();
  const movements = name.endsWith(".csv")
    ? parseCsv(await file.text())
    : name.endsWith(".xlsx") || name.endsWith(".xls")
      ? await parseExcel(file)
      : name.endsWith(".pdf")
        ? await parsePdf(file)
        : null;
  if (!movements) {
    throw new Error("Formato no soportado. Usa CSV, Excel, PDF o texto pegado.");
  }
  if (movements.length === 0) {
    throw new Error("No he podido detectar movimientos en el archivo. Si el PDF es del banco, prueba con CSV/Excel o pega algunas líneas para ajustar el importador.");
  }
  return movements;
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
    const textItems = content.items.flatMap((item) =>
      "str" in item ? [{ str: item.str, transform: "transform" in item ? [...item.transform] : undefined }] : []
    );
    lines.push(...textItemsToLines(textItems));
  }

  return parseManualText(lines.join("\n"), "pdf");
}

export function parseManualText(text: string, source: MovementSource = "manual"): RawMovement[] {
  return splitPotentialMovementRows(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseManualLine(line, index, source))
    .filter((movement): movement is RawMovement => Boolean(movement));
}

export function textItemsToLines(items: TextItemLike[]): string[] {
  const rows = new Map<number, TextItemLike[]>();
  for (const item of items) {
    const y = item.transform?.[5] ?? 0;
    const rowKey = Math.round(y / 3) * 3;
    rows.set(rowKey, [...(rows.get(rowKey) ?? []), item]);
  }

  return [...rows.entries()]
    .sort(([a], [b]) => b - a)
    .map(([, rowItems]) =>
      rowItems
        .sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0))
        .map((item) => item.str.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter(Boolean);
}

function splitPotentialMovementRows(text: string): string {
  return text.replace(/\s+(?=\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s)/g, "\n");
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
  const amountMatch = line.match(/[-+]?\d{1,9}(?:[.,]\d{2})\s?€?$/);
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
