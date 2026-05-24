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
  WalletCards
} from "lucide-react";
import { useMemo, useState } from "react";
import { analyzeMovements } from "./core/analytics";
import { classifyMovement } from "./core/classifier";
import { parseFile, parseManualText } from "./core/importers";
import { buildComparisonLines, buildObjectiveReading, formatEuro, reviewReason } from "./core/report";
import type { ClassifiedMovement, RawMovement } from "./core/types";

const sampleText = `01/05 Sueldo 2500,00
02/05 FONDO EMERGENCIA -100,00
03/05 MERCADONA -45,50
04/05 OPENAI CHATGPT PLUS -106,74
05/05 WWW.AMAZON.ES MARKETPLACE -174,00
06/05 STARBUCKS -4,20
07/05 INSTANT GAMING -39,99
08/05 YOUTUBE PREMIUM -12,99
09/05 TRANSFERENCIA ENTRE MIS CUENTAS -300,00`;

const storageKey = "finance_tracking_v1_movements";

export function App() {
  const [rawText, setRawText] = useState(sampleText);
  const [movements, setMovements] = useState<ClassifiedMovement[]>(() => loadMovements());
  const [periodStart, setPeriodStart] = useState("2026-05-01");
  const [periodEnd, setPeriodEnd] = useState("2026-05-31");
  const [message, setMessage] = useState("Datos de ejemplo listos. Importa un archivo o pega movimientos para empezar.");

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

  function importRaw(raw: RawMovement[]) {
    const classified = raw.map(classifyMovement);
    setMovements(classified);
    window.localStorage.setItem(storageKey, JSON.stringify(classified));
    setMessage(`${classified.length} movimientos importados y clasificados.`);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
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
          <p>Proyección: {formatEuro(analysis.projection.realConsumptionAtPeriodEnd)}</p>
          <div className="monthSignal">
            {topFocus.length > 0 ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            {topFocus.length > 0 ? `${topFocus.length} focos activos` : "Sin alertas relevantes"}
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
            <input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>

          <textarea value={rawText} onChange={(event) => setRawText(event.target.value)} spellCheck={false} />
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
    return stored ? (JSON.parse(stored) as ClassifiedMovement[]) : parseManualText(sampleText).map(classifyMovement);
  } catch {
    return parseManualText(sampleText).map(classifyMovement);
  }
}

function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
