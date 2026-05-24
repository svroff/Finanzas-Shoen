# FINANCE_TRACKING_V1 Design

## Decision

Build a local-first web app in `/Users/sergivicente/Documents/APPS`.

The app runs on Sergi's Mac through a local Vite dev server. It does not send bank data to an external service. It imports CSV, Excel, PDF text extraction, or pasted text; sanitizes sensitive values; classifies movements with explicit deterministic rules; and generates weekly/monthly finance summaries in Spanish using the FINANCE_TRACKING_V1 prompt rules.

## Product Scope

The first version must support:

- Importing bank movements from CSV, Excel, PDF, or pasted text.
- Masking/removing IBANs, cards, DNI, long references, and contract-like identifiers before display.
- Rule-based classification into the prompt categories.
- Review labels such as `OK`, `REVISABLE`, `SUSCRIPCION`, `CARGA_FUTURA`, `A_CONFIRMAR`, `AHORRO`, and `INGRESO`.
- Monthly limits and April 2026 baseline comparison.
- Weekly and monthly report views.
- Movement table with category, label, sanitized concept, amount, and review reason.
- Local-only storage through browser `localStorage`.

## Architecture

The app separates deterministic finance logic from UI:

- `src/core`: parsing, sanitization, classification, analytics, report generation.
- `src/components`: import panel, summary cards, category tables, review tables, report view.
- `src/App.tsx`: app state and view composition.

The finance engine must be testable without React. UI reads already-sanitized and already-classified movements.

## Data Model

A movement has:

- `date`
- `merchant`
- `description`
- `amount`
- `direction`
- `category`
- `type`
- `labels`
- `reviewReason`
- `source`

Positive amounts are income. Negative amounts are outflows. Savings and internal movements are separated from real consumption.

## Privacy

The app must never display full sensitive identifiers. Sanitization runs before rendering imported rows:

- IBAN: keep country/check prefix and last four digits only.
- Card: display only last four digits as `**** 1234`.
- DNI: remove.
- Long references/contracts: truncate or replace with `[referencia oculta]`.

## Reporting

Weekly and monthly reports follow Sergi's requested Spanish structure and language rules:

- no moralizing
- no "deberías"
- no financial decisions
- mark uncertain items as "revisar con Sergi"

## Technology

- Vite
- React
- TypeScript
- Vitest
- PapaParse for CSV
- `xlsx` for Excel
- `pdfjs-dist` for PDF text extraction
- Local browser storage

