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

## User Directives
1. **[2026-05-24] Sergi wants skills announced before work**
   Do instead: name applicable skills briefly before starting substantial tasks.
