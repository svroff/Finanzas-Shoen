# Napkin Runbook

## Curation Rules
- Re-prioritize on every read.
- Keep recurring, high-value notes only.
- Max 10 items per category.
- Each item includes date + "Do instead".

## Execution & Validation (Highest Priority)
1. **[2026-05-24] New APPS workspace has no established stack**
   Do instead: choose project tooling explicitly per app and verify generated structure before implementation claims.

## Shell & Command Reliability
1. **[2026-05-24] Prefer fast file discovery**
   Do instead: use `rg --files` first, then fall back to `find` when the workspace is empty or path-specific.

## Domain Behavior Guardrails
1. **[2026-05-24] Finance app must protect sensitive banking data**
   Do instead: design import, display, and storage around masking/removal of IBANs, card numbers, DNI, long references, and contract identifiers.
2. **[2026-05-24] Bank PDFs often include transaction amount plus trailing balance**
   Do instead: parse PDF rows by removing dates and all money tokens, choose transaction amount before balance, and verify with a real PDF upload path.
3. **[2026-05-24] Real bank PDFs may split glyphs and stack one movement across nearby Y rows**
   Do instead: reconstruct PDF text from x/y coordinates, merge nearby row fragments, normalize compact dates, skip balance-only and financing-info rows, and never commit raw bank PDFs.

## User Directives
1. **[2026-05-24] Sergi wants skills announced before work**
   Do instead: name applicable skills briefly before starting substantial tasks.
