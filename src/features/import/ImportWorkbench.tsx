import { FileSpreadsheet, FileText, Trash2, UploadCloud } from "lucide-react";
import type { ImportDraft } from "../../app/useFinanceWorkspace";
import type { RawMovement } from "../../core/types";
import { Panel } from "../../ui/Primitives";
import { formatEuro } from "../../ui/Format";

interface ImportWorkbenchProps {
  draft: ImportDraft | null;
  message: string;
  onClear: () => void;
  onConfirm: () => void;
  onFile: (file: File | undefined) => void;
  onText: () => void;
  rawText: string;
  setRawText: (value: string) => void;
}

export function ImportWorkbench({
  draft,
  message,
  onClear,
  onConfirm,
  onFile,
  onText,
  rawText,
  setRawText
}: ImportWorkbenchProps) {
  return (
    <div className="importGrid">
      <Panel title="Importar movimientos" kicker="Paso 1">
        <div className="dropZone">
          <UploadCloud size={34} />
          <div>
            <strong>CSV o Excel primero. PDF solo si no hay otra fuente.</strong>
            <p>La app no calcula nada hasta que confirmes la vista previa.</p>
          </div>
          <label className="uploadButton">
            <FileSpreadsheet size={18} />
            Seleccionar archivo
            <input
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              onChange={(event) => {
                void onFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>

        <div className="pasteBox">
          <div className="pasteHeader">
            <span>
              <FileText size={16} />
              Texto pegado
            </span>
            <button onClick={onText}>Procesar texto</button>
          </div>
          <textarea
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            placeholder={"Pega movimientos reales aquí:\n01/05/2026;MERCADONA;-45,50\n02/05/2026;OPENAI;-20,00"}
            spellCheck={false}
          />
        </div>

        <div className="importMessage">{message}</div>
      </Panel>

      <Panel
        title="Vista previa"
        kicker="Validación"
        action={
          draft ? (
            <div className="inlineActions">
              <button onClick={onConfirm}>Confirmar importación</button>
              <button className="ghostDanger" onClick={onClear}>
                <Trash2 size={16} />
                Vaciar
              </button>
            </div>
          ) : null
        }
      >
        {draft ? <DraftPreview draft={draft} /> : <EmptyPreview />}
      </Panel>
    </div>
  );
}

function EmptyPreview() {
  return (
    <div className="emptyPreview">
      <strong>No hay movimientos detectados.</strong>
      <p>Cuando cargues un archivo verás aquí filas, importes y posibles errores antes de confirmar.</p>
    </div>
  );
}

function DraftPreview({ draft }: { draft: ImportDraft }) {
  const income = draft.raw.filter((movement) => movement.amount > 0).reduce((sum, movement) => sum + movement.amount, 0);
  const outflows = draft.raw.filter((movement) => movement.amount < 0).reduce((sum, movement) => sum + Math.abs(movement.amount), 0);

  return (
    <div className="draftPreview">
      <div className="previewStats">
        <span>{draft.sourceName}</span>
        <strong>{draft.raw.length} movimientos</strong>
        <em>Ingresos {formatEuro(income)}</em>
        <em>Salidas {formatEuro(outflows)}</em>
      </div>
      <div className="previewTable">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Concepto detectado</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {draft.raw.slice(0, 12).map((movement: RawMovement, index) => (
              <tr key={`${movement.date}-${movement.amount}-${index}`}>
                <td>{movement.date}</td>
                <td>{movement.description}</td>
                <td className="money">{formatEuro(movement.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

