import { AlertTriangle, BarChart3, FileUp, Lock, RefreshCw, Save, Trash2 } from "lucide-react";
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
      <header className="topbar">
        <div>
          <p className="eyebrow">Nexus · operador financiero local</p>
          <h1>FINANCE_TRACKING_V1</h1>
        </div>
        <div className="privacy">
          <Lock size={18} />
          <span>Local-first · datos sensibles enmascarados</span>
        </div>
      </header>

      <section className="toolbar">
        <label className="fileButton">
          <FileUp size={18} />
          <span>Importar CSV / Excel / PDF</span>
          <input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={(event) => handleFile(event.target.files?.[0])} />
        </label>
        <button onClick={() => importRaw(parseManualText(rawText))}>
          <RefreshCw size={18} />
          Clasificar texto
        </button>
        <button onClick={() => window.localStorage.setItem(storageKey, JSON.stringify(movements))}>
          <Save size={18} />
          Guardar local
        </button>
        <button className="danger" onClick={clearData}>
          <Trash2 size={18} />
          Vaciar
        </button>
      </section>

      <p className="status">{message}</p>

      <section className="workspace">
        <aside className="importPanel">
          <div className="panelHeader">
            <h2>Entrada manual</h2>
            <span>CSV si existe, antes que PDF</span>
          </div>
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
        </aside>

        <section className="dashboard">
          <div className="kpis">
            <Metric label="Ingresos" value={formatEuro(analysis.totalIncome)} />
            <Metric label="Salidas" value={formatEuro(analysis.totalOutflows)} />
            <Metric label="Ahorro/inversión" value={formatEuro(analysis.totalSavings)} />
            <Metric label="Consumo real" value={formatEuro(analysis.realConsumption)} accent />
          </div>

          <section className="band">
            <div className="panelHeader">
              <h2>Estado por límites</h2>
              <BarChart3 size={20} />
            </div>
            <div className="limitGrid">
              {Object.entries(analysis.limitStatus).map(([name, status]) => (
                <div className="limitItem" key={name}>
                  <div>
                    <strong>{name}</strong>
                    <span>{formatEuro(status.spent)} / {formatEuro(status.limit)}</span>
                  </div>
                  <em className={status.status.replace(/\s/g, "-")}>{status.status}</em>
                </div>
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
                      <td>{formatEuro(summary.amount)}</td>
                      <td>{summary.percentageOfConsumption}%</td>
                      <td>{summary.movementCount}</td>
                      <td>{formatEuro(summary.averageTicket)}</td>
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
                      <td>{formatEuro(Math.abs(movement.amount))}</td>
                      <td>{reviewReason(movement)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablePanel>
          </section>

          <section className="report">
            <div className="panelHeader">
              <h2>Lectura objetiva</h2>
              <AlertTriangle size={20} />
            </div>
            <ul>
              {buildObjectiveReading(analysis).map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>Ritmo estimado de cierre: {formatEuro(analysis.projection.realConsumptionAtPeriodEnd)}.</li>
              {buildComparisonLines(analysis).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
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
                    <td>{movement.labels.join(" / ")}</td>
                    <td>{formatEuro(movement.amount)}</td>
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

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={accent ? "metric accent" : "metric"}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function TablePanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="tablePanel">
      <div className="panelHeader">
        <h2>{title}</h2>
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

