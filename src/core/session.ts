import type { ClassifiedMovement, MovementCategory, ReviewLabel } from "./types";

export interface MovementFilters {
  query: string;
  category: MovementCategory | "all";
  reviewOnly: boolean;
}

export interface MovementPatch {
  category?: MovementCategory;
  labels?: ReviewLabel[];
  reviewReason?: string;
}

export interface DailyPoint {
  date: string;
  amount: number;
}

export function applyMovementPatch(
  movements: ClassifiedMovement[],
  movementId: string,
  patch: MovementPatch
): ClassifiedMovement[] {
  return movements.map((movement) =>
    movement.id === movementId
      ? {
          ...movement,
          ...patch
        }
      : movement
  );
}

export function filterMovements(movements: ClassifiedMovement[], filters: MovementFilters): ClassifiedMovement[] {
  const query = filters.query.trim().toLowerCase();
  return movements.filter((movement) => {
    const matchesQuery =
      !query ||
      movement.safeDescription.toLowerCase().includes(query) ||
      movement.safeMerchant.toLowerCase().includes(query) ||
      movement.category.toLowerCase().includes(query);
    const matchesCategory = filters.category === "all" || movement.category === filters.category;
    const matchesReview =
      !filters.reviewOnly || movement.labels.includes("REVISABLE") || movement.labels.includes("A_CONFIRMAR");
    return matchesQuery && matchesCategory && matchesReview;
  });
}

export function buildDailySeries(movements: ClassifiedMovement[]): DailyPoint[] {
  const byDate = new Map<string, number>();
  for (const movement of movements) {
    if (!movement.countsAsConsumption || movement.amount >= 0) continue;
    byDate.set(movement.date, round((byDate.get(movement.date) ?? 0) + Math.abs(movement.amount)));
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({ date, amount }));
}

function round(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
