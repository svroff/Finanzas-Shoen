import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  FileUp,
  Lock,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UploadCloud,
  WalletCards
} from "lucide-react";
import { useMemo, useState } from "react";
import { analyzeMovements } from "./core/analytics";
import { classifyMovement } from "./core/classifier";
import { parseFile, parseManualText } from "./core/importers";
import { buildComparisonLines, buildObjectiveReading, formatEuro, reviewReason } from "./core/report";
import type { CategorySummary, ClassifiedMovement, RawMovement } from "./core/types";

const storageKey = "finance_tracking_v1_movements";

export function App() {
  const [rawText, setRawText] = useState("");
  const [movements, setMovements] = useState<ClassifiedMovement[]>(() => loadMovements());
  const [periodStart, setPeriodStart] = useState(currentMonthStart());
  const [periodEnd, setPeriodEnd] = useState(currentMonthEnd());
  const [message, setMessage] = useState("Sin movimientos importados. Importa CSV/Excel/PDF o pega movimientos para empezar.");

  const analysis = useMemo(
    () =>
      analyzeMovements(movements, {
        periodStart,
        periodEnd,
        today: new Date().toISOString().slice(0, 10)
      }),
    [movements, periodEnd, periodStart]
  );
  const periodLabel = `${formatDate(periodStart)} - ${formatDate(periodEnd)}`;
  const reviewCount = analysis.reviewableMovements.length;
  const topFocus = Object.entries(analysis.limitStatus).filter(([, status]) => status.status !== "dentro de rango");
  const hasMovements = movements.length > 0;
  const totalLimitSpent = Object.values(analysis.limitStatus).reduce((total, status) => total + status.spent, 0);

  function importRaw(raw: RawMovement[]) {
    if (raw.length === 0) {
      setMessage("No he detectado movimientos. Revisa el formato o prueba con CSV/Excel, que son más fiables que PDF.");
      return;
    }
    const classified = raw.map(classifyMovement);
    setMovements(classified);
    window.localStorage.setItem(storageKey, JSON.stringify(classified));
    setMessage(`${classified.length} movimientos importados y clasificados.`);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setMessage(`Leyendo ${file.name}...`);
    try {
      importRaw(await parseFile(file));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo leer el archivo.");
    }
  }

  function clearData() {
    setMovements([]);
    window.localStorage.removeItem(storageKey);
    setMessage("Datos locales eliminados.");
  }

  return (
    <main className="shell">
      <header className="hero">
        <div className="heroCopy">
          <p className="eyebrow">Nexus · operador financiero local</p>
          <h1>Finanzas Shoen</h1>
          <p className="heroText">
            Control mensual frío y privado: importar, limpiar, clasificar y detectar focos revisables sin tomar decisiones por Sergi.
          </p>
          <div className="heroMeta">
            <span>
              <CalendarDays size={16} />
              {periodLabel}
            </span>
            <span>
              <ShieldCheck size={16} />
              local-first
            </span>
            <span>
              <Lock size={16} />
              datos sensibles enmascarados
            </span>
          </div>
        </div>
        <div className="monthCard">
          <span className="monthLabel">Consumo real</span>
          <strong>{formatEuro(analysis.realConsumption)}</strong>
          <p>{hasMovements ? `Proyección: ${formatEuro(analysis.projection.realConsumptionAtPeriodEnd)}` : "Esperando movimientos reales"}</p>
          <div className="monthSignal">
            {!hasMovements ? <UploadCloud size={18} /> : topFocus.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            {!hasMovements ? "Sin datos importados" : topFocus.length > 0 ? `${topFocus.length} focos activos` : "Sin alertas relevantes"}
          </div>
        </div>
      </header>

      <section className="workspace">
        <aside className="importPanel">
          <div className="importHeader">
            <div>
              <p className="sectionKicker">Entrada</p>
              <h2>Movimientos</h2>
            </div>
            <span className="sourceBadge">CSV preferente</span>
          </div>

          <label className="fileButton">
            <FileUp size={18} />
            <span>Importar CSV / Excel / PDF</span>
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>

          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={"Pega movimientos reales aquí, por ejemplo:\n01/05 Comercio -12,90\n02/05 Nómina 1800,00"}
            spellCheck={false}
          />
          <div className="dateGrid">
            <label>
              Inicio
              <input value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} type="date" />
            </label>
            <label>
              Fin
              <input value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} type="date" />
            </label>
          </div>
          <div className="actionGrid">
            <button className="primaryAction" onClick={() => importRaw(parseManualText(rawText))}>
              <RefreshCw size={18} />
              Clasificar texto
            </button>
            <button onClick={() => window.localStorage.setItem(storageKey, JSON.stringify(movements))}>
              <Save size={18} />
              Guardar
            </button>
            <button className="danger" onClick={clearData}>
              <Trash2 size={18} />
              Vaciar
            </button>
          </div>
          <p className="status">{message}</p>
        </aside>

        <section className="dashboard">
          {!hasMovements ? (
            <section className="emptyState">
              <UploadCloud size={34} />
              <div>
                <p className="sectionKicker">Inicio limpio</p>
                <h2>Sin movimientos importados</h2>
                <p>
                  La app no calcula ingresos, ahorro, gastos ni alertas hasta que cargues movimientos reales. CSV o Excel tienen prioridad;
                  PDF y texto pegado quedan como apoyo.
                </p>
              </div>
            </section>
          ) : null}

          <div className="kpis">
            <Metric label="Ingresos" value={formatEuro(analysis.totalIncome)} tone="income" />
            <Metric label="Salidas" value={formatEuro(analysis.totalOutflows)} tone="outflow" />
            <Metric label="Ahorro/inversión" value={formatEuro(analysis.totalSavings)} tone="saving" />
            <Metric label="Revisables" value={String(reviewCount)} tone="review" />
          </div>

          <section className="focusBand">
            <div className="panelHeader">
              <div>
                <p className="sectionKicker">Control mensual</p>
                <h2>Estado por límites</h2>
              </div>
              <BarChart3 size={22} />
            </div>
            <div className="limitGrid">
              {Object.entries(analysis.limitStatus).map(([name, status]) => (
                <div className="limitItem" key={name}>
                  <div className="limitTop">
                    <strong>{name}</strong>
                    <em className={status.status.replace(/\s/g, "-")}>{status.status}</em>
                  </div>
                  <span>{formatEuro(status.spent)} de {formatEuro(status.limit)}</span>
                  <div className="progressTrack">
                    <div className="progressBar" style={{ width: `${Math.min(100, (status.spent / status.limit) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="visualGrid">
            <section className="chartPanel">
              <div className="panelHeader">
                <div>
                  <p className="sectionKicker">Visual</p>
                  <h2>Distribución del consumo</h2>
                </div>
              </div>
              <DonutChart summaries={analysis.categorySummaries} hasMovements={hasMovements} />
            </section>
            <section className="chartPanel">
              <div className="panelHeader">
                <div>
                  <p className="sectionKicker">Visual</p>
                  <h2>Focos frente a límite</h2>
                </div>
              </div>
              <LimitBars statuses={analysis.limitStatus} hasMovements={hasMovements && totalLimitSpent > 0} />
            </section>
          </section>

          <section className="report">
            <div className="panelHeader">
              <div>
                <p className="sectionKicker">Lectura objetiva</p>
                <h2>Focos visibles</h2>
              </div>
              <AlertTriangle size={22} />
            </div>
            <div className="insightList">
              {buildObjectiveReading(analysis).map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>Ritmo estimado de cierre: {formatEuro(analysis.projection.realConsumptionAtPeriodEnd)}.</p>
              {buildComparisonLines(analysis).map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </section>

          <section className="splitPanels">
            <TablePanel title="Gasto por categorías">
              <table>
                <thead>
                  <tr>
                    <th>Categoría</th>
                    <th>Importe</th>
                    <th>% consumo</th>
                    <th>Nº</th>
                    <th>Ticket</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.categorySummaries.map((summary) => (
                    <tr key={summary.category}>
                      <td>{summary.category}</td>
                      <td className="money">{formatEuro(summary.amount)}</td>
                      <td>{summary.percentageOfConsumption}%</td>
                      <td>{summary.movementCount}</td>
                      <td className="money">{formatEuro(summary.averageTicket)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablePanel>

            <TablePanel title="Movimientos revisables">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Comercio</th>
                    <th>Importe</th>
                    <th>Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.reviewableMovements.slice(0, 10).map((movement) => (
                    <tr key={movement.id}>
                      <td>{movement.date}</td>
                      <td>{movement.safeMerchant}</td>
                      <td className="money">{formatEuro(Math.abs(movement.amount))}</td>
                      <td>{reviewReason(movement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablePanel>
          </section>

          <TablePanel title="Movimientos clasificados">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto seguro</th>
                  <th>Categoría</th>
                  <th>Etiqueta</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>{movement.date}</td>
                    <td>{movement.safeDescription}</td>
                    <td>{movement.category}</td>
                    <td>
                      <span className="labelPill">{movement.labels.join(" / ")}</span>
                    </td>
                    <td className="money">{formatEuro(movement.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablePanel>
        </section>
      </section>
    </main>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "income" | "outflow" | "saving" | "review" }) {
  return (
    <div className={`metric ${tone}`}>
      <WalletCards size={20} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TablePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="tablePanel">
      <div className="panelHeader">
        <div>
          <p className="sectionKicker">Detalle</p>
          <h2>{title}</h2>
        </div>
      </div>
      <div className="tableScroll">{children}</div>
    </section>
  );
}

function loadMovements(): ClassifiedMovement[] {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored ? (JSON.parse(stored) as ClassifiedMovement[]) : [];
  } catch {
    return [];
  }
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
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

function DonutChart({ summaries, hasMovements }: { summaries: CategorySummary[]; hasMovements: boolean }) {
  if (!hasMovements || summaries.length === 0) {
    return <div className="emptyChart">Sin datos reales para graficar.</div>;
  }

  const total = summaries.reduce((sum, item) => sum + item.amount, 0);
  let offset = 25;
  const colors = ["#3f776a", "#bf7b43", "#44788e", "#9a6a96", "#b35b5b", "#65758b", "#8b7a42"];

  return (
    <div className="donutWrap">
      <svg className="donut" viewBox="0 0 42 42" role="img" aria-label="Distribución del consumo por categoría">
        <circle className="donutBase" cx="21" cy="21" r="15.9" />
        {summaries.slice(0, 7).map((summary, index) => {
          const dash = total > 0 ? (summary.amount / total) * 100 : 0;
          const segment = (
            <circle
              className="donutSegment"
              cx="21"
              cy="21"
              key={summary.category}
              r="15.9"
              stroke={colors[index]}
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offset}
            />
          );
          offset -= dash;
          return segment;
        })}
        <text x="21" y="20" textAnchor="middle" className="donutValue">
          {formatEuro(total)}
        </text>
        <text x="21" y="24" textAnchor="middle" className="donutLabel">
          consumo
        </text>
      </svg>
      <div className="legend">
        {summaries.slice(0, 6).map((summary, index) => (
          <div className="legendItem" key={summary.category}>
            <span style={{ background: colors[index] }} />
            <p>{summary.category}</p>
            <strong>{formatEuro(summary.amount)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function LimitBars({ statuses, hasMovements }: { statuses: ReturnType<typeof analyzeMovements>["limitStatus"]; hasMovements: boolean }) {
  if (!hasMovements) {
    return <div className="emptyChart">Los límites aparecerán cuando haya gasto clasificado.</div>;
  }

  return (
    <div className="limitBars">
      {Object.entries(statuses).map(([name, status]) => (
        <div className="limitBarRow" key={name}>
          <div>
            <span>{name}</span>
            <strong>{formatEuro(status.spent)}</strong>
          </div>
          <div className="progressTrack">
            <div className="progressBar" style={{ width: `${Math.min(100, (status.spent / status.limit) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
