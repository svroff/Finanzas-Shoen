import { useMemo, useState } from "react";
import { analyzeMovements, isInsidePeriod } from "../core/analytics";
import { classifyMovement } from "../core/classifier";
import { parseFile, parseManualText } from "../core/importers";
import { applyMovementPatch, buildDailySeries, filterMovements, type MovementFilters, type MovementPatch } from "../core/session";
import type { ClassifiedMovement, MovementCategory, RawMovement } from "../core/types";

const storageKey = "finance_tracking_v2_movements";

export type WorkspaceStep = "import" | "review" | "dashboard" | "report";

export interface ImportDraft {
  raw: RawMovement[];
  sourceName: string;
}

export function useFinanceWorkspace() {
  const [step, setStep] = useState<WorkspaceStep>("import");
  const [periodStart, setPeriodStart] = useState(currentMonthStart());
  const [periodEnd, setPeriodEnd] = useState(currentMonthEnd());
  const [rawText, setRawText] = useState("");
  const [draft, setDraft] = useState<ImportDraft | null>(null);
  const [initialMovements] = useState<ClassifiedMovement[]>(() => loadMovements());
  const [movements, setMovements] = useState<ClassifiedMovement[]>(initialMovements);
  const [message, setMessage] = useState(() =>
    initialMovements.length > 0
      ? `${initialMovements.length} movimientos cargados desde este navegador.`
      : "Carga CSV/Excel/PDF o pega movimientos. No hay datos de ejemplo."
  );
  const [filters, setFilters] = useState<MovementFilters>({ query: "", category: "all", reviewOnly: false });

  const analysis = useMemo(
    () =>
      analyzeMovements(movements, {
        periodStart,
        periodEnd,
        today: new Date().toISOString().slice(0, 10)
      }),
    [movements, periodEnd, periodStart]
  );

  const periodMovements = useMemo(
    () => movements.filter((movement) => isInsidePeriod(movement.date, { periodStart, periodEnd })),
    [movements, periodEnd, periodStart]
  );
  const visibleMovements = useMemo(() => filterMovements(periodMovements, filters), [filters, periodMovements]);
  const dailySeries = useMemo(() => buildDailySeries(periodMovements), [periodMovements]);

  async function importFile(file: File | undefined) {
    if (!file) return;
    setMessage(`Leyendo ${file.name}...`);
    try {
      const raw = await parseFile(file);
      setDraft({ raw, sourceName: file.name });
      setStep("review");
      setMessage(`${raw.length} movimientos detectados. Revisa antes de confirmar.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo leer el archivo.");
    }
  }

  function importText() {
    const raw = parseManualText(rawText);
    if (raw.length === 0) {
      setMessage("No he detectado movimientos en el texto pegado.");
      return;
    }
    setDraft({ raw, sourceName: "texto pegado" });
    setStep("review");
    setMessage(`${raw.length} movimientos detectados desde texto pegado.`);
  }

  function confirmDraft() {
    if (!draft) return;
    const classified = draft.raw.map(classifyMovement);
    setMovements(classified);
    window.localStorage.setItem(storageKey, JSON.stringify(classified));
    setDraft(null);
    setStep("dashboard");
    setMessage(`${classified.length} movimientos confirmados y clasificados.`);
  }

  function patchMovement(movementId: string, patch: MovementPatch) {
    const updated = applyMovementPatch(movements, movementId, patch);
    setMovements(updated);
    window.localStorage.setItem(storageKey, JSON.stringify(updated));
  }

  function clearAll() {
    setDraft(null);
    setMovements([]);
    setRawText("");
    window.localStorage.removeItem(storageKey);
    setStep("import");
    setMessage("Datos locales eliminados.");
  }

  function setCategoryFilter(category: MovementCategory | "all") {
    setFilters((current) => ({ ...current, category }));
  }

  return {
    analysis,
    clearAll,
    confirmDraft,
    dailySeries,
    draft,
    filters,
    importFile,
    importText,
    message,
    movements,
    patchMovement,
    periodEnd,
    periodStart,
    rawText,
    setCategoryFilter,
    setFilters,
    setPeriodEnd,
    setPeriodStart,
    setRawText,
    setStep,
    step,
    visibleMovements
  };
}

function loadMovements(): ClassifiedMovement[] {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as ClassifiedMovement[]) : [];
  } catch {
    return [];
  }
}

function currentMonthStart(): string {
  const now = new Date();
  return formatInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

function currentMonthEnd(): string {
  const now = new Date();
  return formatInputDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function formatInputDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
