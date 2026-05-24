import type { CategorySummary } from "../core/types";
import type { DailyPoint } from "../core/session";
import { formatEuro } from "./Format";

const palette = ["#1f7a68", "#b56b3f", "#356f95", "#8b5f8e", "#b74e53", "#6c7887", "#9a7a2d"];

export function DonutChart({ summaries }: { summaries: CategorySummary[] }) {
  const total = summaries.reduce((sum, item) => sum + item.amount, 0);
  if (total === 0) return <div className="emptyChart">Sin consumo confirmado.</div>;
  let offset = 25;

  return (
    <div className="donutModule">
      <svg className="donutChart" viewBox="0 0 42 42" role="img" aria-label="Distribución del consumo">
        <circle className="donutTrack" cx="21" cy="21" r="15.9" />
        {summaries.slice(0, 7).map((summary, index) => {
          const dash = (summary.amount / total) * 100;
          const segment = (
            <circle
              className="donutArc"
              cx="21"
              cy="21"
              key={summary.category}
              r="15.9"
              stroke={palette[index]}
              strokeDasharray={`${dash} ${100 - dash}`}
              strokeDashoffset={offset}
            />
          );
          offset -= dash;
          return segment;
        })}
        <text className="donutNumber" x="21" y="20" textAnchor="middle">
          {formatEuro(total)}
        </text>
        <text className="donutCaption" x="21" y="24" textAnchor="middle">
          consumo
        </text>
      </svg>
      <div className="chartLegend">
        {summaries.slice(0, 6).map((summary, index) => (
          <div className="legendRow" key={summary.category}>
            <span style={{ background: palette[index] }} />
            <p>{summary.category}</p>
            <strong>{formatEuro(summary.amount)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyBars({ points }: { points: DailyPoint[] }) {
  const max = Math.max(...points.map((point) => point.amount), 1);
  if (points.length === 0) return <div className="emptyChart">Sin serie diaria todavía.</div>;

  return (
    <div className="dailyBars">
      {points.map((point) => (
        <div className="dailyBar" key={point.date}>
          <span>{point.date.slice(8)}</span>
          <div>
            <i style={{ height: `${Math.max(8, (point.amount / max) * 100)}%` }} />
          </div>
          <em>{formatEuro(point.amount)}</em>
        </div>
      ))}
    </div>
  );
}

