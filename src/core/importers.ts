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
  const headerParsed = Papa.parse<GenericRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader
  });
  if (headerParsed.errors.length > 0) {
    throw new Error(`CSV no legible: ${headerParsed.errors[0].message}`);
  }
  const headerMovements = rowsToMovements(headerParsed.data, "csv");
  if (headerMovements.length > 0) return headerMovements;

  const rowParsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true
  });
  return arrayRowsToMovements(rowParsed.data, "csv");
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
      const date = pick(normalized, [
        "fecha",
        "date",
        "f_operacion",
        "fecha_operacion",
        "fecha_de_operacion",
        "fecha_valor",
        "f_valor",
        "data",
        "dia"
      ]) || "";
      const description =
        pick(normalized, [
          "concepto",
          "concepto_movimiento",
          "descripcion",
          "descripcion_operacion",
          "description",
          "movimiento",
          "detalle",
          "comercio",
          "merchant",
          "beneficiario",
          "ordenante"
        ]) || "";
      const merchant = pick(normalized, ["comercio", "merchant", "beneficiario"]) || description;
      const amount = pickAmount(normalized);
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

function arrayRowsToMovements(rows: string[][], source: MovementSource): RawMovement[] {
  const movements: RawMovement[] = [];
  rows.forEach((row, index) => {
    const cells = row.map((cell) => String(cell ?? "").trim()).filter(Boolean);
    const dateIndex = cells.findIndex((cell) => parseDateValue(cell));
    const amountIndex = findAmountIndex(cells);
    if (dateIndex === -1 || amountIndex === -1) return;

    const description = cells
      .filter((_, cellIndex) => cellIndex !== dateIndex && cellIndex !== amountIndex)
      .join(" ")
      .trim();
    if (!description) return;
    movements.push({
      date: normalizeDate(cells[dateIndex], index),
      description,
      merchant: description,
      amount: parseAmount(cells[amountIndex]),
      source
    });
  });
  return movements;
}

function pickAmount(row: GenericRow): number {
  const directAmount = pick(row, [
    "importe",
    "importe_e",
    "importe_eur",
    "importe_euros",
    "amount",
    "valor",
    "cargo_abono",
    "euros",
    "saldo_movimiento"
  ]);
  if (directAmount) return parseAmount(directAmount);

  const debit = pick(row, ["cargo", "debe", "debito", "debit", "withdrawal", "salida"]);
  if (debit) return -Math.abs(parseAmount(debit));

  const credit = pick(row, ["abono", "haber", "credito", "credit", "deposit", "entrada"]);
  if (credit) return Math.abs(parseAmount(credit));

  return Number.NaN;
}

function parseManualLine(line: string, index: number, source: MovementSource): RawMovement | null {
  const amountMatch = line.match(/[-+]?\d{1,9}(?:[.,]\d{2})\s?€?$/);
  if (!amountMatch) return null;
  const amount = parseAmount(amountMatch[0]);
  const left = line.slice(0, amountMatch.index).trim();
  const dateMatch = left.match(/\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/);
  const date = normalizeDate(dateMatch?.[0] ?? "", index);
  const description = cleanDescription(left.replace(dateMatch?.[0] ?? "", "")) || cleanDescription(left);
  return { date, description, merchant: description, amount, source };
}

function cleanDescription(value: string): string {
  return value
    .replace(/^[\s;|,\t-]+/, "")
    .replace(/[\s;|,\t-]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
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
  const negative = /^\(.*\)$/.test(value) || /^\s*-/.test(value);
  const cleaned = value
    .replace(/[€\s()]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) return Number.NaN;
  return negative ? -Math.abs(parsed) : parsed;
}

function normalizeDate(value: string, fallbackIndex: number): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = parseDateValue(value);
  if (match) {
    const year = match[3] ? (match[3].length === 2 ? `20${match[3]}` : match[3]) : "2026";
    return `${year}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  return `2026-05-${String(Math.min(28, fallbackIndex + 1)).padStart(2, "0")}`;
}

function parseDateValue(value: string): RegExpMatchArray | null {
  return String(value).trim().match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?$/);
}

function findAmountIndex(cells: string[]): number {
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    if (!Number.isNaN(parseAmount(cells[index])) && /[+-]?\(?\d/.test(cells[index])) return index;
  }
  return -1;
}
