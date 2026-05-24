import { BarChart3, FileUp, ListChecks, PieChart, ScrollText, Trash2 } from "lucide-react";
import { useFinanceWorkspace, type WorkspaceStep } from "./app/useFinanceWorkspace";
import { Dashboard } from "./features/dashboard/Dashboard";
import { ImportWorkbench } from "./features/import/ImportWorkbench";
import { ReportView } from "./features/report/ReportView";
import { ReviewTable } from "./features/review/ReviewTable";
import { formatEuro, formatShortDate } from "./ui/Format";
import { ShoenMark } from "./ui/Icons";

const steps: Array<{ id: WorkspaceStep; label: string; icon: typeof FileUp }> = [
  { id: "import", label: "Importar", icon: FileUp },
  { id: "review", label: "Revisar", icon: ListChecks },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "report", label: "Informe", icon: ScrollText }
];

export function App() {
  const workspace = useFinanceWorkspace();
  const hasMovements = workspace.movements.length > 0;

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brandBlock">
          <ShoenMark />
          <div>
            <strong>Finanzas Shoen</strong>
            <span>Local finance control</span>
          </div>
        </div>

        <nav className="stepNav" aria-label="Flujo principal">
          {steps.map((step) => {
            const Icon = step.icon;
            const disabled = (step.id === "dashboard" || step.id === "report" || step.id === "review") && !hasMovements && !workspace.draft;
            return (
              <button
                className={workspace.step === step.id ? "active" : ""}
                disabled={disabled}
                key={step.id}
                onClick={() => workspace.setStep(step.id)}
              >
                <Icon size={18} />
                {step.label}
              </button>
            );
          })}
        </nav>

        <div className="periodBox">
          <span>Periodo</span>
          <label>
            Inicio
            <input value={workspace.periodStart} onChange={(event) => workspace.setPeriodStart(event.target.value)} type="date" />
          </label>
          <label>
            Fin
            <input value={workspace.periodEnd} onChange={(event) => workspace.setPeriodEnd(event.target.value)} type="date" />
          </label>
        </div>

        <button className="clearButton" onClick={workspace.clearAll}>
          <Trash2 size={16} />
          Vaciar datos locales
        </button>
      </aside>

      <section className="mainSurface">
        <header className="commandHeader">
          <div>
            <span>{formatShortDate(workspace.periodStart)} - {formatShortDate(workspace.periodEnd)}</span>
            <h1>Control mensual</h1>
            <p>{workspace.message}</p>
          </div>
          <div className="headerSummary">
            <div>
              <span>Movimientos</span>
              <strong>{workspace.movements.length}</strong>
            </div>
            <div>
              <span>Consumo real</span>
              <strong>{formatEuro(workspace.analysis.realConsumption)}</strong>
            </div>
            <div>
              <span>Revisables</span>
              <strong>{workspace.analysis.reviewableMovements.length}</strong>
            </div>
          </div>
        </header>

        {workspace.step === "import" ? (
          <ImportWorkbench
            draft={workspace.draft}
            message={workspace.message}
            onClear={workspace.clearAll}
            onConfirm={workspace.confirmDraft}
            onFile={workspace.importFile}
            onText={workspace.importText}
            rawText={workspace.rawText}
            setRawText={workspace.setRawText}
          />
        ) : null}

        {workspace.step === "review" ? (
          hasMovements ? (
            <ReviewTable
              filters={workspace.filters}
              movements={workspace.visibleMovements}
              onCategoryFilter={workspace.setCategoryFilter}
              onPatch={workspace.patchMovement}
              setFilters={workspace.setFilters}
            />
          ) : workspace.draft ? (
            <ImportWorkbench
              draft={workspace.draft}
              message={workspace.message}
              onClear={workspace.clearAll}
              onConfirm={workspace.confirmDraft}
              onFile={workspace.importFile}
              onText={workspace.importText}
              rawText={workspace.rawText}
              setRawText={workspace.setRawText}
            />
          ) : (
            <EmptyState />
          )
        ) : null}

        {workspace.step === "dashboard" ? (
          hasMovements ? <Dashboard analysis={workspace.analysis} dailySeries={workspace.dailySeries} /> : <EmptyState />
        ) : null}

        {workspace.step === "report" ? (hasMovements ? <ReportView analysis={workspace.analysis} /> : <EmptyState />) : null}
      </section>
    </main>
  );
}

function EmptyState() {
  return (
    <section className="fullEmpty">
      <PieChart size={42} />
      <h2>Primero importa movimientos reales</h2>
      <p>El dashboard y el informe se desbloquean cuando confirmas una vista previa de CSV, Excel, PDF o texto pegado.</p>
    </section>
  );
}
