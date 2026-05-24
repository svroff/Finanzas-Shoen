import { describe, expect, it } from "vitest";
import { classifyMovement } from "./classifier";
import type { RawMovement } from "./types";

const movement = (description: string, amount: number): RawMovement => ({
  date: "2026-05-12",
  description,
  amount,
  source: "manual"
});

describe("classifyMovement", () => {
  it("separates IA tools from gaming and marks productive tools as revisable subscriptions", () => {
    const result = classifyMovement(movement("OPENAI CHATGPT PLUS", -106.74));

    expect(result.category).toBe("IA / herramientas / productividad / servidores");
    expect(result.type).toBe("DISCRECIONAL_PRODUCTIVO");
    expect(result.labels).toContain("SUSCRIPCION");
    expect(result.labels).toContain("REVISABLE");
  });

  it("marks Amazon as revisable without assuming it is bad", () => {
    const result = classifyMovement(movement("WWW.AMAZON.ES MARKETPLACE", -174));

    expect(result.category).toBe("Compras online / Amazon / gadgets");
    expect(result.type).toBe("REVISABLE");
    expect(result.labels).toContain("REVISABLE");
    expect(result.reviewReason).toContain("Amazon");
  });

  it("keeps emergency fund and investment outside real consumption", () => {
    const result = classifyMovement(movement("FONDO EMERGENCIA AHORROS Y PPI", -700));

    expect(result.category).toBe("Ahorro / inversión");
    expect(result.type).toBe("AHORRO");
    expect(result.labels).toContain("AHORRO");
    expect(result.countsAsConsumption).toBe(false);
  });

  it("recognizes compact savings labels extracted from bank PDFs", () => {
    const emergencyFund = classifyMovement(movement("TRANSFERENCIAS FONDOEMERGENCIA", -100));
    const investment = classifyMovement(movement("TRANSFERENCIAS AHORROSYPPI", -600));

    expect(emergencyFund.category).toBe("Ahorro / inversión");
    expect(emergencyFund.countsAsConsumption).toBe(false);
    expect(investment.category).toBe("Ahorro / inversión");
    expect(investment.countsAsConsumption).toBe(false);
  });
});
