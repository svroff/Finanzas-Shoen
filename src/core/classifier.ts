import { sanitizeSensitiveText } from "./sanitizer";
import type { ClassifiedMovement, MovementCategory, MovementType, RawMovement, ReviewLabel } from "./types";

interface Rule {
  category: MovementCategory;
  type: MovementType;
  labels: ReviewLabel[];
  patterns: RegExp[];
  countsAsConsumption?: boolean;
  reviewReason?: string;
}

const rules: Rule[] = [
  {
    category: "Ahorro / inversión",
    type: "AHORRO",
    labels: ["AHORRO"],
    countsAsConsumption: false,
    patterns: [/FONDO EMERGENCIA/i, /AHORROS? Y PPI/i, /MYINVESTOR/i, /\bBTC\b/i, /\bORO\b/i, /INDEXAD/i]
  },
  {
    category: "Movimientos internos",
    type: "INTERNO",
    labels: ["OK"],
    countsAsConsumption: false,
    patterns: [/ENTRE MIS CUENTAS/i, /TRASPASO/i, /TRANSFERENCIA INTERNA/i]
  },
  {
    category: "Salud / seguros / farmacia",
    type: "NECESARIO",
    labels: ["OK"],
    patterns: [/SANITAS/i, /FARMAC/i, /FISIO/i, /PODOLOG/i, /RUN AND FIT/i]
  },
  {
    category: "Transporte",
    type: "NECESARIO",
    labels: ["OK"],
    patterns: [/T[\s-]?MOBILITAT/i, /PARKING/i, /GASOLIN/i, /MOTO TONI/i, /RENFE/i, /TMB/i]
  },
  {
    category: "Comida casa / supermercado",
    type: "NECESARIO",
    labels: ["OK"],
    patterns: [/MERCADONA/i, /BON ?AREA/i, /GUISSONA/i, /ALIMENTACION FRUTA/i, /SUPERMARKET/i, /\bSUMA\b/i, /LIDL/i, /CARREFOUR/i]
  },
  {
    category: "Cafés / comidas fuera",
    type: "DISCRECIONAL",
    labels: ["RECURRENTE"],
    patterns: [/MANDUCA/i, /STARBUCKS/i, /PALE RIDER/i, /KOMO POKE/i, /UMAMI/i, /LA CAPKE/i, /VIVARI/i, /LA INES BAR/i, /RESTAUR/i, /CAF(E|É)/i, /BAR\b/i]
  },
  {
    category: "IA / herramientas / productividad / servidores",
    type: "DISCRECIONAL_PRODUCTIVO",
    labels: ["SUSCRIPCION", "REVISABLE"],
    reviewReason: "Herramienta IA/tech: revisar duplicidad o valor aportado este mes.",
    patterns: [/OPENAI/i, /CHATGPT/i, /OPENROUTER/i, /CLAUDE/i, /ANTHROPIC/i, /STRIPE[- ]?Z\.?AI/i, /\bZ\.AI\b/i, /KIMI/i, /MINIMAX/i, /GROK/i, /CONTABO/i, /\bVPS\b/i, /GOOGLE ONE/i, /GITHUB COPILOT/i]
  },
  {
    category: "Gaming / ocio digital",
    type: "DISCRECIONAL_OCIO",
    labels: ["REVISABLE"],
    patterns: [/STEAM/i, /BATTLE\.?NET/i, /INSTANT GAMING/i, /ENEBA/i, /\bG2A\b/i, /KINGUIN/i, /NVIDIA/i, /GEFORCE/i]
  },
  {
    category: "Compras online / Amazon / gadgets",
    type: "REVISABLE",
    labels: ["REVISABLE", "POSIBLE_IMPULSO"],
    reviewReason: "Amazon/compras online: confirmar concepto con Sergi.",
    patterns: [/AMAZON/i, /PAYPAL/i, /GROVER/i, /MARKETPLACE/i]
  },
  {
    category: "Suscripciones entretenimiento",
    type: "DISCRECIONAL_RECURRENTE",
    labels: ["SUSCRIPCION", "RECURRENTE"],
    patterns: [/YOUTUBE ?PREMIUM/i, /SPOTI?FY/i, /PRIMEVIDEO/i, /NETFLIX/i, /\bHBO\b/i, /DISNEY/i, /ITUNES/i, /APPLE\.COM\/BILL/i]
  },
  {
    category: "Impuestos / tasas / administración",
    type: "NECESARIO",
    labels: ["OK"],
    patterns: [/\bAEAT\b/i, /MOD 791/i, /TASA/i, /MULTA/i, /CLEVER(EA|EA)/i]
  },
  {
    category: "Deuda / financiación / aplazamientos",
    type: "CARGA_FUTURA",
    labels: ["CARGA_FUTURA", "REVISABLE"],
    reviewReason: "Financiación o aplazamiento activo: reduce margen mensual futuro.",
    patterns: [/PAGO 3 PLAZOS/i, /FRACCIONAMIENTO/i, /CUOTA MENSUAL/i, /MAST FITNESS/i, /APLAZAD/i]
  }
];

export function classifyMovement(raw: RawMovement): ClassifiedMovement {
  const text = `${raw.merchant ?? ""} ${raw.description}`.trim();
  const safeDescription = sanitizeSensitiveText(raw.description);
  const safeMerchant = sanitizeSensitiveText(raw.merchant ?? guessMerchant(raw.description));

  if (raw.amount > 0) {
    return makeMovement(raw, safeDescription, safeMerchant, "Ingresos", "INGRESO", ["INGRESO"], false, "Ingreso o abono detectado.");
  }

  const matched = rules.find((rule) => rule.patterns.some((pattern) => pattern.test(text)));
  if (matched) {
    return makeMovement(
      raw,
      safeDescription,
      safeMerchant,
      matched.category,
      matched.type,
      matched.labels,
      matched.countsAsConsumption ?? true,
      matched.reviewReason ?? ""
    );
  }

  return makeMovement(
    raw,
    safeDescription,
    safeMerchant,
    "Otros / sin clasificar",
    "A_CONFIRMAR",
    ["A_CONFIRMAR", "REVISABLE"],
    true,
    "Comercio no identificado con seguridad."
  );
}

function makeMovement(
  raw: RawMovement,
  safeDescription: string,
  safeMerchant: string,
  category: MovementCategory,
  type: MovementType,
  labels: ReviewLabel[],
  countsAsConsumption: boolean,
  reviewReason: string
): ClassifiedMovement {
  return {
    ...raw,
    id: `${raw.date}-${raw.amount}-${raw.description}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    safeDescription,
    safeMerchant,
    category,
    type,
    labels,
    reviewReason,
    countsAsConsumption
  };
}

function guessMerchant(description: string): string {
  return description.split(/\s{2,}| - | \* /)[0]?.trim() || description.trim();
}

