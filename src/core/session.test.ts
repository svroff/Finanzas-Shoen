import { describe, expect, it } from "vitest";
import { applyMovementPatch, buildDailySeries, filterMovements } from "./session";
import { classifyMovement } from "./classifier";
import type { ClassifiedMovement } from "./types";

const movements: ClassifiedMovement[] = [
  classifyMovement({ date: "2026-05-01", description: "MERCADONA", amount: -45.5, source: "manual" }),
  classifyMovement({ date: "2026-05-02", description: "OPENAI", amount: -20, source: "manual" }),
  classifyMovement({ date: "2026-05-03", description: "AMAZON", amount: -60, source: "manual" }),
  classifyMovement({ date: "2026-05-04", description: "Sueldo", amount: 1800, source: "manual" })
];

describe("session helpers", () => {
  it("lets Sergi correct a movement category without changing other rows", () => {
    const updated = applyMovementPatch(movements, movements[2].id, {
      category: "Comida casa / supermercado",
      labels: ["OK"],
      reviewReason: "Confirmado por Sergi."
    });

    expect(updated[2].category).toBe("Comida casa / supermercado");
    expect(updated[2].labels).toEqual(["OK"]);
    expect(updated[0]).toBe(movements[0]);
  });

  it("filters by query, category and review-only mode", () => {
    expect(filterMovements(movements, { query: "open", category: "all", reviewOnly: false })).toHaveLength(1);
    expect(filterMovements(movements, { query: "", category: "Compras online / Amazon / gadgets", reviewOnly: false })).toHaveLength(1);
    expect(filterMovements(movements, { query: "", category: "all", reviewOnly: true }).map((movement) => movement.description)).toContain("AMAZON");
  });

  it("builds daily spending series from consumption movements only", () => {
    const series = buildDailySeries(movements);

    expect(series).toEqual([
      { date: "2026-05-01", amount: 45.5 },
      { date: "2026-05-02", amount: 20 },
      { date: "2026-05-03", amount: 60 }
    ]);
  });
});

