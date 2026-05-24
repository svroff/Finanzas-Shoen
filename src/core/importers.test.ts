import { describe, expect, it } from "vitest";
import { parseManualText, textItemsToLines } from "./importers";

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
});

