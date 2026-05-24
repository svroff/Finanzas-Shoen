import { describe, expect, it } from "vitest";
import { analyzeMovements } from "./analytics";
import { classifyMovement } from "./classifier";
import type { RawMovement } from "./types";

const raw: RawMovement[] = [
  { date: "2026-05-01", description: "Sueldo", amount: 2500, source: "manual" },
  { date: "2026-05-02", description: "FONDO EMERGENCIA", amount: -100, source: "manual" },
  { date: "2026-05-03", description: "MERCADONA", amount: -45.5, source: "manual" },
  { date: "2026-05-04", description: "OPENAI", amount: -106.74, source: "manual" },
  { date: "2026-05-05", description: "AMAZON", amount: -174, source: "manual" },
  { date: "2026-05-06", description: "TRANSFERENCIA ENTRE MIS CUENTAS", amount: -300, source: "manual" }
];

describe("analyzeMovements", () => {
  it("subtracts savings and internal transfers from real consumption", () => {
    const analysis = analyzeMovements(raw.map(classifyMovement), {
      periodStart: "2026-05-01",
      periodEnd: "2026-05-31",
      today: "2026-05-15"
    });

    expect(analysis.totalIncome).toBe(2500);
    expect(analysis.totalOutflows).toBe(726.24);
    expect(analysis.totalSavings).toBe(100);
    expect(analysis.internalTransfers).toBe(300);
    expect(analysis.realConsumption).toBe(326.24);
    expect(analysis.categorySummaries.map((summary) => summary.category)).not.toContain("Ahorro / inversión");
    expect(analysis.limitStatus["Amazon / compras online revisables"].status).toBe("superado");
    expect(analysis.projection.realConsumptionAtPeriodEnd).toBeGreaterThan(650);
  });

  it("only analyzes movements inside the selected period", () => {
    const mixedMonths: RawMovement[] = [
      { date: "2026-04-06", description: "AHORROS Y PPI", amount: -600, source: "manual" },
      { date: "2026-05-04", description: "AHORROS Y PPI", amount: -600, source: "manual" },
      { date: "2026-04-08", description: "AMAZON", amount: -174, source: "manual" },
      { date: "2026-05-08", description: "AMAZON", amount: -90, source: "manual" }
    ];

    const april = analyzeMovements(mixedMonths.map(classifyMovement), {
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      today: "2026-04-30"
    });

    expect(april.totalOutflows).toBe(774);
    expect(april.totalSavings).toBe(600);
    expect(april.realConsumption).toBe(174);
    expect(april.topExpenses.map((movement) => movement.date)).toEqual(["2026-04-06", "2026-04-08"]);
  });
});
