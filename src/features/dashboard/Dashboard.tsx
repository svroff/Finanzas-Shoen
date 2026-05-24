import type { FinanceAnalysis } from "../../core/types";
import type { DailyPoint } from "../../core/session";
import { DailyBars, DonutChart } from "../../ui/Charts";
import { formatEuro } from "../../ui/Format";
import { Panel, Stat } from "../../ui/Primitives";

export function Dashboard({ analysis, dailySeries }: { analysis: FinanceAnalysis; dailySeries: DailyPoint[] }) {
  return (
    <div className="dashboardGrid">
      <div className="statGrid">
        <Stat label="Ingresos" value={formatEuro(analysis.totalIncome)} detail="Entradas confirmadas" tone="income" />
        <Stat label="Salidas" value={formatEuro(analysis.totalOutflows)} detail="Todas las salidas" tone="outflow" />
        <Stat label="Ahorro/inversión" value={formatEuro(analysis.totalSavings)} detail="Separado de consumo" tone="saving" />
        <Stat label="Consumo real" value={formatEuro(analysis.realConsumption)} detail="Sin ahorro ni internos" tone="consumption" />
      </div>

      <Panel title="Distribución del consumo" kicker="Visual">
        <DonutChart summaries={analysis.categorySummaries} />
      </Panel>

      <Panel title="Ritmo diario" kicker="Visual">
        <DailyBars points={dailySeries} />
      </Panel>

      <Panel title="Límites mensuales" kicker="Control">
        <div className="limitStack">
          {Object.entries(analysis.limitStatus).map(([name, status]) => (
            <div className="limitRow" key={name}>
              <div>
                <strong>{name}</strong>
                <span>{formatEuro(status.spent)} / {formatEuro(status.limit)}</span>
              </div>
              <div className="limitMeter">
                <i style={{ width: `${Math.min(100, (status.spent / status.limit) * 100)}%` }} />
              </div>
              <em className={status.status.replace(/\s/g, "-")}>{status.status}</em>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Top gastos" kicker="Detalle">
        <div className="rankList">
          {analysis.topExpenses.slice(0, 8).map((movement, index) => (
            <div className="rankRow" key={movement.id}>
              <span>{index + 1}</span>
              <div>
                <strong>{movement.safeMerchant}</strong>
                <p>{movement.category}</p>
              </div>
              <em>{formatEuro(Math.abs(movement.amount))}</em>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

