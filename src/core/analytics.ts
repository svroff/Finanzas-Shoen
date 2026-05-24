import type { AnalysisPeriod, CategorySummary, ClassifiedMovement, FinanceAnalysis, LimitStatus } from "./types";

export const monthlyLimits: Record<string, number> = {
  "Cafés / comidas fuera": 60,
  "IA / herramientas / productividad": 120,
  "Gaming / ocio digital": 50,
  "Amazon / compras online revisables": 100,
  "Suscripciones entretenimiento": 40,
  "Otros / sin clasificar": 50
};

const aprilBaseline: Record<string, number> = {
  "Cafés / comidas fuera": 83,
  "IA / herramientas / productividad / servidores": 172,
  "Gaming / ocio digital": 93,
  "Compras online / Amazon / gadgets": 279,
  "Otros / sin clasificar": 85
};

export function analyzeMovements(movements: ClassifiedMovement[], period: AnalysisPeriod): FinanceAnalysis {
  const totalIncome = round(sum(movements.filter((m) => m.amount > 0).map((m) => m.amount)));
  const outflows = movements.filter((m) => m.amount < 0);
  const totalOutflows = round(sum(outflows.map((m) => Math.abs(m.amount))));
  const totalSavings = round(sum(outflows.filter((m) => m.type === "AHORRO").map((m) => Math.abs(m.amount))));
  const internalTransfers = round(sum(outflows.filter((m) => m.type === "INTERNO").map((m) => Math.abs(m.amount))));
  const realConsumption = round(sum(outflows.filter((m) => m.countsAsConsumption).map((m) => Math.abs(m.amount))));
  const categorySummaries = summarizeCategories(outflows, realConsumption);
  const limitStatus = buildLimitStatus(categorySummaries);
  const projection = buildProjection(realConsumption, period);

  return {
    totalIncome,
    totalOutflows,
    totalSavings,
    internalTransfers,
    realConsumption,
    categorySummaries,
    topExpenses: [...outflows].sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 10),
    reviewableMovements: outflows.filter((m) => m.labels.includes("REVISABLE") || m.labels.includes("A_CONFIRMAR")),
    subscriptions: outflows.filter((m) => m.labels.includes("SUSCRIPCION")),
    financing: outflows.filter((m) => m.labels.includes("CARGA_FUTURA")),
    limitStatus,
    projection
  };
}

export function compareWithApril(category: string, current: number): "mejor" | "peor" | "similar" | "sin base" {
  const baseline = aprilBaseline[category];
  if (baseline === undefined) return "sin base";
  const diff = current - baseline;
  if (Math.abs(diff) <= Math.max(10, baseline * 0.1)) return "similar";
  return diff < 0 ? "mejor" : "peor";
}

function summarizeCategories(outflows: ClassifiedMovement[], realConsumption: number): CategorySummary[] {
  const grouped = new Map<string, ClassifiedMovement[]>();
  for (const movement of outflows) {
    if (!movement.countsAsConsumption) continue;
    grouped.set(movement.category, [...(grouped.get(movement.category) ?? []), movement]);
  }

  return [...grouped.entries()]
    .map(([category, items]) => {
      const amount = round(sum(items.map((m) => Math.abs(m.amount))));
      return {
        category: category as CategorySummary["category"],
        amount,
        percentageOfConsumption: realConsumption > 0 ? round((amount / realConsumption) * 100) : 0,
        movementCount: items.length,
        averageTicket: items.length ? round(amount / items.length) : 0
      };
    })
    .sort((a, b) => b.amount - a.amount);
}

function buildLimitStatus(summaries: CategorySummary[]): Record<string, LimitStatus> {
  const byCategory = new Map(summaries.map((summary) => [summary.category, summary.amount]));
  const spent: Record<string, number> = {
    "Cafés / comidas fuera": byCategory.get("Cafés / comidas fuera") ?? 0,
    "IA / herramientas / productividad": byCategory.get("IA / herramientas / productividad / servidores") ?? 0,
    "Gaming / ocio digital": byCategory.get("Gaming / ocio digital") ?? 0,
    "Amazon / compras online revisables": byCategory.get("Compras online / Amazon / gadgets") ?? 0,
    "Suscripciones entretenimiento": byCategory.get("Suscripciones entretenimiento") ?? 0,
    "Otros / sin clasificar": byCategory.get("Otros / sin clasificar") ?? 0
  };

  return Object.fromEntries(
    Object.entries(monthlyLimits).map(([name, limit]) => [
      name,
      {
        spent: round(spent[name] ?? 0),
        limit,
        status: statusFor(spent[name] ?? 0, limit)
      }
    ])
  );
}

function statusFor(spent: number, limit: number): LimitStatus["status"] {
  if (spent > limit) return "superado";
  if (spent >= limit * 0.8) return "cerca del límite";
  return "dentro de rango";
}

function buildProjection(realConsumption: number, period: AnalysisPeriod) {
  const start = new Date(`${period.periodStart}T00:00:00`);
  const end = new Date(`${period.periodEnd}T00:00:00`);
  const today = new Date(`${period.today ?? period.periodEnd}T00:00:00`);
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const elapsedDays = Math.min(totalDays, Math.max(1, Math.round((today.getTime() - start.getTime()) / 86400000) + 1));
  return {
    elapsedDays,
    totalDays,
    realConsumptionAtPeriodEnd: round((realConsumption / elapsedDays) * totalDays)
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
