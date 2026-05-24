import { compareWithApril } from "./analytics";
import type { ClassifiedMovement, FinanceAnalysis } from "./types";

const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function formatEuro(value: number): string {
  return euro.format(value);
}

export function buildObjectiveReading(analysis: FinanceAnalysis): string[] {
  const statuses = analysis.limitStatus;
  const alerts = Object.entries(statuses)
    .filter(([, status]) => status.status !== "dentro de rango")
    .map(([name, status]) => `${name}: ${formatEuro(status.spent)}. Estado: ${status.status}.`);

  if (analysis.reviewableMovements.length > 0) {
    alerts.push(`Hay ${analysis.reviewableMovements.length} movimientos revisables o a confirmar.`);
  }

  return alerts.length > 0 ? alerts : ["El periodo no muestra alertas relevantes contra los límites definidos."];
}

export function buildComparisonLines(analysis: FinanceAnalysis): string[] {
  return analysis.categorySummaries
    .filter((summary) =>
      [
        "Cafés / comidas fuera",
        "IA / herramientas / productividad / servidores",
        "Gaming / ocio digital",
        "Compras online / Amazon / gadgets",
        "Otros / sin clasificar"
      ].includes(summary.category)
    )
    .map((summary) => `${summary.category}: ${compareWithApril(summary.category, summary.amount)} frente a abril.`);
}

export function reviewReason(movement: ClassifiedMovement): string {
  if (movement.reviewReason) return movement.reviewReason;
  if (Math.abs(movement.amount) >= 100) return "Importe alto para revisión.";
  if (movement.labels.includes("SUSCRIPCION")) return "Posible recurrencia.";
  return "Conviene confirmar con Sergi.";
}

