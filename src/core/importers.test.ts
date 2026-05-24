import { describe, expect, it } from "vitest";
import { parseCsv, parseManualText, textItemsToLines } from "./importers";

describe("PDF/text import helpers", () => {
  it("keeps PDF text items on separate visual rows before parsing movements", () => {
    const lines = textItemsToLines([
      { str: "01/05", transform: [1, 0, 0, 1, 20, 700] },
      { str: "MERCADONA", transform: [1, 0, 0, 1, 80, 700] },
      { str: "-45,50", transform: [1, 0, 0, 1, 420, 700] },
      { str: "02/05", transform: [1, 0, 0, 1, 20, 684] },
      { str: "OPENAI", transform: [1, 0, 0, 1, 80, 684] },
      { str: "-20,00", transform: [1, 0, 0, 1, 420, 684] }
    ]);

    expect(lines).toEqual(["01/05 MERCADONA -45,50", "02/05 OPENAI -20,00"]);
    expect(parseManualText(lines.join("\n"), "pdf")).toHaveLength(2);
  });

  it("splits PDF-like text when several dated movements arrive in one line", () => {
    const movements = parseManualText("01/05 MERCADONA -45,50 02/05 OPENAI -20,00", "pdf");

    expect(movements).toHaveLength(2);
    expect(movements[0].description).toBe("MERCADONA");
    expect(movements[1].description).toBe("OPENAI");
  });

  it("cleans semicolon separators from pasted bank-like rows", () => {
    const movements = parseManualText("01/05/2026;MERCADONA;-45,50\n02/05/2026;OPENAI;-20,00");

    expect(movements.map((movement) => movement.description)).toEqual(["MERCADONA", "OPENAI"]);
  });
});

describe("CSV import", () => {
  it("parses semicolon-separated bank CSV with Spanish headers", () => {
    const movements = parseCsv("Fecha operación;Concepto;Importe (€)\n01/05/2026;MERCADONA;-45,50\n02/05/2026;Nómina;1800,00");

    expect(movements).toEqual([
      {
        date: "2026-05-01",
        description: "MERCADONA",
        merchant: "MERCADONA",
        amount: -45.5,
        source: "csv"
      },
      {
        date: "2026-05-02",
        description: "Nómina",
        merchant: "Nómina",
        amount: 1800,
        source: "csv"
      }
    ]);
  });

  it("parses bank CSVs that split charges and deposits into debit and credit columns", () => {
    const movements = parseCsv("Fecha;Descripción;Cargo;Abono\n01/05/2026;STARBUCKS;4,20;\n02/05/2026;Bizum recibido;;25,00");

    expect(movements.map((movement) => movement.amount)).toEqual([-4.2, 25]);
  });

  it("parses headerless rows when they contain date, description and amount", () => {
    const movements = parseCsv("01/05/2026;MERCADONA;-45,50\n02/05/2026;OPENAI;-20,00");

    expect(movements).toHaveLength(2);
    expect(movements[0].description).toBe("MERCADONA");
  });
});
