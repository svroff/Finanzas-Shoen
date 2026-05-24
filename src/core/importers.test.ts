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

  it("deduplicates repeated PDF text overlays on the same visual row", () => {
    const lines = textItemsToLines([
      { str: "01/05/2026", transform: [1, 0, 0, 1, 20, 700] },
      { str: "MERCADONA", transform: [1, 0, 0, 1, 110, 700] },
      { str: "MERCADONA", transform: [1, 0, 0, 1, 110, 700] },
      { str: "45,50", transform: [1, 0, 0, 1, 420, 700] },
      { str: "45,50", transform: [1, 0, 0, 1, 420, 700] }
    ]);

    expect(lines).toEqual(["01/05/2026 MERCADONA 45,50"]);
  });

  it("merges stacked PDF fragments that belong to the same bank movement", () => {
    const lines = textItemsToLines([
      { str: "ADE", transform: [1, 0, 0, 1, 119, 462], width: 16.9 },
      { str: "UDO", transform: [1, 0, 0, 1, 135.8, 462], width: 18.2 },
      { str: "DE", transform: [1, 0, 0, 1, 155.9, 462], width: 11.1 },
      { str: "S", transform: [1, 0, 0, 1, 169.1, 462], width: 5.6 },
      { str: "ANIT", transform: [1, 0, 0, 1, 174.5, 462], width: 20 },
      { str: "A", transform: [1, 0, 0, 1, 193.8, 462], width: 5.8 },
      { str: "S", transform: [1, 0, 0, 1, 199.3, 462], width: 5.6 },
      { str: "01/04", transform: [1, 0, 0, 1, 26.6, 459], width: 23.4 },
      { str: "01/04", transform: [1, 0, 0, 1, 72, 459], width: 23.4 },
      { str: "-", transform: [1, 0, 0, 1, 418.4, 459], width: 2.9 },
      { str: "7", transform: [1, 0, 0, 1, 420.8, 459], width: 4.4 },
      { str: "5", transform: [1, 0, 0, 1, 425, 459], width: 4.7 },
      { str: ",", transform: [1, 0, 0, 1, 429.6, 459], width: 2.2 },
      { str: "7", transform: [1, 0, 0, 1, 431.3, 459], width: 4.4 },
      { str: "5", transform: [1, 0, 0, 1, 435.6, 459], width: 4.7 },
      { str: "1.", transform: [1, 0, 0, 1, 472.1, 459], width: 5.7 },
      { str: "42", transform: [1, 0, 0, 1, 477.4, 459], width: 9.7 },
      { str: "0", transform: [1, 0, 0, 1, 487, 459], width: 5.3 },
      { str: ",", transform: [1, 0, 0, 1, 491.9, 459], width: 2.2 },
      { str: "0", transform: [1, 0, 0, 1, 493.8, 459], width: 5.3 },
      { str: "3", transform: [1, 0, 0, 1, 499, 459], width: 4.8 },
      { str: "E", transform: [1, 0, 0, 1, 529.2, 459], width: 4.9 },
      { str: "UR", transform: [1, 0, 0, 1, 534, 459], width: 11.2 },
      { str: "S", transform: [1, 0, 0, 1, 202, 453], width: 5.6 },
      { str: "ANIT", transform: [1, 0, 0, 1, 207, 453], width: 20 },
      { str: "A", transform: [1, 0, 0, 1, 225, 453], width: 5.8 },
      { str: "S", transform: [1, 0, 0, 1, 230, 453], width: 5.6 }
    ]);

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("01/04 01/04 -75,75 1.420,03 EUR");
    expect(lines[0]).toContain("SANITAS");
  });

  it("uses the transaction amount instead of the trailing balance in PDF-like rows", () => {
    const movements = parseManualText("01/05/2026 02/05/2026 MERCADONA 45,50 1.234,56", "pdf");

    expect(movements).toEqual([
      {
        date: "2026-05-01",
        description: "MERCADONA",
        merchant: "MERCADONA",
        amount: -45.5,
        source: "pdf"
      }
    ]);
  });

  it("keeps probable PDF income rows positive when no explicit sign exists", () => {
    const movements = parseManualText("30/05/2026 30/05/2026 NOMINA EMPRESA 1.800,00 2.900,00", "pdf");

    expect(movements[0].description).toBe("NOMINA EMPRESA");
    expect(movements[0].amount).toBe(1800);
  });

  it("deduplicates identical movements produced by repeated PDF rows", () => {
    const movements = parseManualText("01/05/2026 MERCADONA 45,50\n01/05/2026 MERCADONA 45,50", "pdf");

    expect(movements).toHaveLength(1);
  });

  it("parses real-bank PDF rows with spaced digits, balance and stacked description", () => {
    const movements = parseManualText("ADEUDODESANITAS 01/04 01/04 -75,75 1.420,03 EUR SANITAS", "pdf");

    expect(movements).toEqual([
      {
        date: "2026-04-01",
        description: "ADEUDODESANITAS SANITAS",
        merchant: "ADEUDODESANITAS SANITAS",
        amount: -75.75,
        source: "pdf"
      }
    ]);
  });

  it("splits compact adjacent PDF dates before parsing bank rows", () => {
    const movements = parseManualText("ADEUDODESANITAS 01/0401/04 -75,75 1.420,03 EUR SANITAS", "pdf");

    expect(movements[0].date).toBe("2026-04-01");
    expect(movements[0].description).toBe("ADEUDODESANITAS SANITAS");
  });

  it("does not convert PDF opening or closing balances into movements", () => {
    expect(parseManualText("Saldoinicial: 1.495,78 EUR", "pdf")).toHaveLength(0);
    expect(parseManualText("Saldofindemes: 1.997,31 EUR", "pdf")).toHaveLength(0);
  });

  it("keeps compact PDF cashback rows positive", () => {
    const movements = parseManualText("CASHBACKPROMOCIÓNCOMERCIAL 02/0401/04 53,33 1.408,61 EUR PROMOCIONPLAN760", "pdf");

    expect(movements[0].date).toBe("2026-04-02");
    expect(movements[0].amount).toBe(53.33);
  });

  it("keeps used-good sale rows positive in bank PDFs", () => {
    const movements = parseManualText("TRANSFERENCIAS 20/0418/04 475,00 803,75 EUR ID173778 ORDER USEDGOOD", "pdf");

    expect(movements[0].date).toBe("2026-04-20");
    expect(movements[0].amount).toBe(475);
  });

  it("skips PDF financing information rows that are not account movements", () => {
    expect(parseManualText("17/04/2026 MASTFITNESS 300,48 120,00%", "pdf")).toHaveLength(0);
    expect(parseManualText("5/05/2026 CUOTAMENSUAL 25,04 0,00 25,04 275,44 11", "pdf")).toHaveLength(0);
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

  it("deduplicates identical CSV rows to avoid double-counting contaminated exports", () => {
    const movements = parseCsv("Fecha;Concepto;Importe\n01/05/2026;MERCADONA;-45,50\n01/05/2026;MERCADONA;-45,50");

    expect(movements).toHaveLength(1);
  });
});
