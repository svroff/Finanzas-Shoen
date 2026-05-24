import type { MovementCategory, ReviewLabel, ClassifiedMovement } from "../../core/types";
import { Panel } from "../../ui/Primitives";
import { formatEuro } from "../../ui/Format";

const categories: MovementCategory[] = [
  "Ingresos",
  "Ahorro / inversión",
  "Salud / seguros / farmacia",
  "Transporte",
  "Comida casa / supermercado",
  "Cafés / comidas fuera",
  "IA / herramientas / productividad / servidores",
  "Gaming / ocio digital",
  "Compras online / Amazon / gadgets",
  "Suscripciones entretenimiento",
  "Impuestos / tasas / administración",
  "Deuda / financiación / aplazamientos",
  "Movimientos internos",
  "Otros / sin clasificar"
];

interface ReviewTableProps {
  filters: {
    query: string;
    category: MovementCategory | "all";
    reviewOnly: boolean;
  };
  movements: ClassifiedMovement[];
  onCategoryFilter: (category: MovementCategory | "all") => void;
  onPatch: (movementId: string, patch: { category?: MovementCategory; labels?: ReviewLabel[]; reviewReason?: string }) => void;
  setFilters: (updater: (current: ReviewTableProps["filters"]) => ReviewTableProps["filters"]) => void;
}

export function ReviewTable({ filters, movements, onCategoryFilter, onPatch, setFilters }: ReviewTableProps) {
  return (
    <Panel title="Revisión editable" kicker="Paso 2">
      <div className="reviewToolbar">
        <input
          type="search"
          value={filters.query}
          onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
          placeholder="Buscar comercio, categoría o concepto"
        />
        <select value={filters.category} onChange={(event) => onCategoryFilter(event.target.value as MovementCategory | "all")}>
          <option value="all">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <label className="toggleLine">
          <input
            checked={filters.reviewOnly}
            onChange={(event) => setFilters((current) => ({ ...current, reviewOnly: event.target.checked }))}
            type="checkbox"
          />
          Solo revisables
        </label>
      </div>

      <div className="reviewTable">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto seguro</th>
              <th>Categoría editable</th>
              <th>Etiqueta</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td>{movement.date}</td>
                <td>
                  <strong>{movement.safeMerchant}</strong>
                  <p>{movement.safeDescription}</p>
                  {movement.reviewReason ? <em>{movement.reviewReason}</em> : null}
                </td>
                <td>
                  <select
                    value={movement.category}
                    onChange={(event) =>
                      onPatch(movement.id, {
                        category: event.target.value as MovementCategory,
                        labels: ["OK"],
                        reviewReason: "Confirmado manualmente."
                      })
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <span className="labelPill">{movement.labels.join(" / ")}</span>
                </td>
                <td className="money">{formatEuro(movement.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
