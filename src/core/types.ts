export type MovementSource = "csv" | "excel" | "pdf" | "manual";

export type MovementCategory =
  | "Ingresos"
  | "Ahorro / inversión"
  | "Salud / seguros / farmacia"
  | "Transporte"
  | "Comida casa / supermercado"
  | "Cafés / comidas fuera"
  | "IA / herramientas / productividad / servidores"
  | "Gaming / ocio digital"
  | "Compras online / Amazon / gadgets"
  | "Suscripciones entretenimiento"
  | "Impuestos / tasas / administración"
  | "Deuda / financiación / aplazamientos"
  | "Movimientos internos"
  | "Otros / sin clasificar";

export type MovementType =
  | "INGRESO"
  | "AHORRO"
  | "NECESARIO"
  | "DISCRECIONAL"
  | "DISCRECIONAL_PRODUCTIVO"
  | "DISCRECIONAL_OCIO"
  | "DISCRECIONAL_RECURRENTE"
  | "REVISABLE"
  | "CARGA_FUTURA"
  | "INTERNO"
  | "A_CONFIRMAR";

export type ReviewLabel =
  | "OK"
  | "REVISABLE"
  | "POSIBLE_IMPULSO"
  | "SUSCRIPCION"
  | "RECURRENTE"
  | "PUNTUAL"
  | "A_CONFIRMAR"
  | "CARGA_FUTURA"
  | "AHORRO"
  | "INGRESO";

export interface RawMovement {
  date: string;
  description: string;
  amount: number;
  merchant?: string;
  source: MovementSource;
}

export interface ClassifiedMovement extends RawMovement {
  id: string;
  safeDescription: string;
  safeMerchant: string;
  category: MovementCategory;
  type: MovementType;
  labels: ReviewLabel[];
  reviewReason: string;
  countsAsConsumption: boolean;
}

export interface CategorySummary {
  category: MovementCategory;
  amount: number;
  percentageOfConsumption: number;
  movementCount: number;
  averageTicket: number;
}

export interface LimitStatus {
  spent: number;
  limit: number;
  status: "dentro de rango" | "cerca del límite" | "superado";
}

export interface AnalysisPeriod {
  periodStart: string;
  periodEnd: string;
  today?: string;
}

export interface FinanceAnalysis {
  totalIncome: number;
  totalOutflows: number;
  totalSavings: number;
  internalTransfers: number;
  realConsumption: number;
  categorySummaries: CategorySummary[];
  topExpenses: ClassifiedMovement[];
  reviewableMovements: ClassifiedMovement[];
  subscriptions: ClassifiedMovement[];
  financing: ClassifiedMovement[];
  limitStatus: Record<string, LimitStatus>;
  projection: {
    elapsedDays: number;
    totalDays: number;
    realConsumptionAtPeriodEnd: number;
  };
}

