import { buildComparisonLines, buildObjectiveReading, reviewReason } from "../../core/report";
import type { FinanceAnalysis } from "../../core/types";
import { formatEuro } from "../../ui/Format";
import { Panel } from "../../ui/Primitives";

export function ReportView({ analysis }: { analysis: FinanceAnalysis }) {
  return (
    <div className="reportGrid">
      <Panel title="Lectura objetiva" kicker="Informe">
        <div className="briefList">
          {buildObjectiveReading(analysis).map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p>Ritmo estimado de cierre: {formatEuro(analysis.projection.realConsumptionAtPeriodEnd)}.</p>
          {buildComparisonLines(analysis).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </Panel>

      <Panel title="Movimientos a revisar" kicker="Prioridad">
        <div className="reviewCards">
          {analysis.reviewableMovements.length === 0 ? (
            <p className="quiet">No hay movimientos revisables con las reglas actuales.</p>
          ) : (
            analysis.reviewableMovements.slice(0, 12).map((movement) => (
              <article key={movement.id}>
                <div>
                  <strong>{movement.safeMerchant}</strong>
                  <span>{movement.date}</span>
                </div>
                <p>{reviewReason(movement)}</p>
                <em>{formatEuro(Math.abs(movement.amount))}</em>
              </article>
            ))
          )}
        </div>
      </Panel>

      <Panel title="Suscripciones y cargas futuras" kicker="Recurrencias">
        <div className="twoColumnList">
          <div>
            <h3>Suscripciones</h3>
            {analysis.subscriptions.map((movement) => (
              <p key={movement.id}>
                {movement.safeMerchant} <strong>{formatEuro(Math.abs(movement.amount))}</strong>
              </p>
            ))}
          </div>
          <div>
            <h3>Financiaciones</h3>
            {analysis.financing.length === 0 ? <p className="quiet">Sin financiación detectada.</p> : null}
            {analysis.financing.map((movement) => (
              <p key={movement.id}>
                {movement.safeMerchant} <strong>{formatEuro(Math.abs(movement.amount))}</strong>
              </p>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  );
}
