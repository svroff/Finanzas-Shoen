import Papa from "papaparse";
import { readSheet, type Row } from "read-excel-file/browser";
import type { MovementSource, RawMovement } from "./types";

type GenericRow = Record<string, unknown>;
type TextItemLike = {
  str: string;
  transform?: number[];
  width?: number;
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
  if (headerMovements.length > 0) return dedupeMovements(headerMovements);

  const rowParsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true
  });
  return dedupeMovements(arrayRowsToMovements(rowParsed.data, "csv"));
}

export async function parseExcel(file: File): Promise<RawMovement[]> {
  const rows = await readSheet(file);
  const [headers, ...dataRows] = rows;
  const normalizedHeaders = headers.map((header: Row[number]) => normalizeHeader(String(header ?? "")));
  const objects = dataRows.map((row: Row) =>
    Object.fromEntries(row.map((value: Row[number], index: number) => [normalizedHeaders[index] ?? `col_${index}`, value ?? ""]))
  );
  return dedupeMovements(rowsToMovements(objects, "excel"));
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
      "str" in item ? [{ str: item.str, transform: "transform" in item ? [...item.transform] : undefined, width: "width" in item ? item.width : undefined }] : []
    );
    lines.push(...textItemsToLines(textItems));
  }

  return parseManualText(lines.join("\n"), "pdf");
}

export function parseManualText(text: string, source: MovementSource = "manual"): RawMovement[] {
  const movements = splitPotentialMovementRows(text)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => parseManualLine(line, index, source))
    .filter((movement): movement is RawMovement => Boolean(movement));
  return dedupeMovements(movements);
}

export function textItemsToLines(items: TextItemLike[]): string[] {
  const rows = new Map<number, TextItemLike[]>();
  for (const item of items) {
    const y = item.transform?.[5] ?? 0;
    const rowKey = Math.round(y / 3) * 3;
    rows.set(rowKey, [...(rows.get(rowKey) ?? []), item]);
  }

  return clusterPdfRows([...rows.entries()].sort(([a], [b]) => b - a))
    .map((cluster) => cluster.map(([, rowItems]) => buildPdfRowText(rowItems)).filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim())
    .filter(Boolean);
}

function clusterPdfRows(rows: Array<[number, TextItemLike[]]>): Array<Array<[number, TextItemLike[]]>> {
  const clusters: Array<Array<[number, TextItemLike[]]>> = [];
  for (const row of rows) {
    const current = clusters[clusters.length - 1];
    const previousY = current?.[current.length - 1]?.[0];
    if (current && previousY !== undefined && Math.abs(previousY - row[0]) <= 9) {
      current.push(row);
    } else {
      clusters.push([row]);
    }
  }
  return clusters;
}

function buildPdfRowText(rowItems: TextItemLike[]): string {
  const sorted = dedupeTextItems(rowItems).sort((a, b) => (a.transform?.[4] ?? 0) - (b.transform?.[4] ?? 0));
  if (sorted.every((item) => item.width === undefined)) {
    return sorted
      .map((item) => item.str.trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  return sorted.reduce((line, item, index) => {
    const text = item.str.trim();
    if (!text) return line;
    if (index === 0 || !line) return text;
    const previous = sorted[index - 1];
    const previousEnd = (previous.transform?.[4] ?? 0) + (previous.width ?? 0);
    const gap = (item.transform?.[4] ?? 0) - previousEnd;
    return `${line}${gap <= 3 ? "" : " "}${text}`;
  }, "");
}

function splitPotentialMovementRows(text: string): string {
  const dateAhead = /\s+(?=\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\s)/g;
  return text.replace(dateAhead, (separator, offset) => {
    const lastBreak = Math.max(text.lastIndexOf("\n", offset), text.lastIndexOf("\r", offset));
    const currentRowSoFar = text.slice(lastBreak + 1, offset);
    return amountPattern().test(currentRowSoFar) ? "\n" : separator;
  });
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
  const normalizedLine = source === "pdf" ? normalizePdfLineForParsing(line) : line;
  const amountMatches = findAmounts(normalizedLine);
  if (amountMatches.length === 0) return null;
  if (source === "pdf" && isPdfInformationalFinanceRow(normalizedLine, amountMatches)) return null;
  const dateMatches = findDates(normalizedLine);
  if (source === "pdf" && dateMatches.length === 0) return null;
  const date = normalizeDate(dateMatches[0]?.text ?? "", index);
  const transactionAmount = chooseTransactionAmount(amountMatches, source);
  const description = buildDescription(normalizedLine, dateMatches, amountMatches);
  const unsignedAmount = Math.abs(parseAmount(transactionAmount.text));
  const amount = inferSignedAmount(transactionAmount.text, unsignedAmount, description, source);
  return { date, description, merchant: description, amount, source };
}

function normalizePdfLineForParsing(line: string): string {
  return line.replace(/(\d{1,2}\/\d{2})(?=\d{1,2}\/\d{2})/g, "$1 ");
}

function isPdfInformationalFinanceRow(line: string, amounts: Array<{ text: string; index: number }>): boolean {
  const compact = line.replace(/\s+/g, "").toUpperCase();
  if (/%/.test(line) && /(MASTFITNESS|FINANCI|INTERES|TIN|TAE)/.test(compact)) return true;
  return amounts.length >= 3 && /(CUOTAMENSUAL|COMISIONPOR|MASTFITNESS|PENDIENTE|DEUDA|FINANCI)/.test(compact);
}

function dedupeTextItems(items: TextItemLike[]): TextItemLike[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const text = item.str.trim();
    const x = Math.round(item.transform?.[4] ?? 0);
    const y = Math.round(item.transform?.[5] ?? 0);
    const key = `${x}|${y}|${text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeMovements(movements: RawMovement[]): RawMovement[] {
  const seen = new Set<string>();
  return movements.filter((movement) => {
    const key = `${movement.date}|${movement.description.toUpperCase()}|${movement.amount.toFixed(2)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function amountPattern(): RegExp {
  return /[-+]?(?:\d{1,3}(?:\.\d{3})+|\d{1,9})(?:[.,]\d{2})\s?€?/g;
}

function findAmounts(line: string): Array<{ text: string; index: number }> {
  return [...line.matchAll(amountPattern())].map((match) => ({ text: match[0], index: match.index ?? 0 }));
}

function findDates(line: string): Array<{ text: string; index: number }> {
  return [...line.matchAll(/\b(\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?|\d{4}-\d{2}-\d{2})\b/g)].map((match) => ({
    text: match[0],
    index: match.index ?? 0
  }));
}

function chooseTransactionAmount(amounts: Array<{ text: string; index: number }>, source: MovementSource): { text: string; index: number } {
  const signed = amounts.find((amount) => /^[+-]/.test(amount.text.trim()));
  if (signed) return signed;
  return source === "pdf" && amounts.length > 1 ? amounts[0] : amounts[amounts.length - 1];
}

function buildDescription(line: string, dates: Array<{ text: string; index: number }>, amounts: Array<{ text: string; index: number }>): string {
  const removable = [...dates, ...amounts].sort((a, b) => b.index - a.index);
  const cleaned = removable.reduce((current, token) => current.slice(0, token.index) + current.slice(token.index + token.text.length), line);
  return cleanDescription(cleaned);
}

function inferSignedAmount(rawAmount: string, unsignedAmount: number, description: string, source: MovementSource): number {
  if (/^\s*-/.test(rawAmount)) return -unsignedAmount;
  if (/^\s*\+/.test(rawAmount)) return unsignedAmount;
  if (source !== "pdf") return parseAmount(rawAmount);
  return looksLikeIncome(description) ? unsignedAmount : -unsignedAmount;
}

function looksLikeIncome(description: string): boolean {
  return /(nomina|nómina|sueldo|bizum\s?recibido|abono|devolucion|devolución|cashback|venta|used\s?good|ingreso|transferencia\s?recibida)/i.test(description);
}

function cleanDescription(value: string): string {
  return value
    .replace(/\bE\s*UR\b|\bEUR\b/gi, " ")
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
