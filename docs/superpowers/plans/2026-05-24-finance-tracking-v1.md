# FINANCE_TRACKING_V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first personal finance control app for Sergi that imports, sanitizes, classifies, analyzes, and reports monthly bank movements.

**Architecture:** A Vite React shell wraps a pure TypeScript finance engine. The engine owns sanitization, import normalization, classification, analytics, and report text so it can be tested independently from the UI.

**Tech Stack:** Vite, React, TypeScript, Vitest, PapaParse, xlsx, pdfjs-dist, localStorage.

---

## Files

- Create `package.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.node.json`.
- Create `src/core/types.ts`, `src/core/sanitizer.ts`, `src/core/classifier.ts`, `src/core/analytics.ts`, `src/core/importers.ts`, `src/core/report.ts`.
- Create tests in `src/core/*.test.ts`.
- Create UI in `src/App.tsx`, `src/main.tsx`, `src/styles/global.css`.

## Tasks

- [ ] Add project scaffolding and dependencies.
- [ ] Write failing tests for privacy masking, classification, and analytics.
- [ ] Implement the finance engine until tests pass.
- [ ] Build the React local app around the finance engine.
- [ ] Verify tests, build, and browser smoke test.
- [ ] Commit and publish to GitHub if a remote or authenticated GitHub tool is available.

## TDD Test Targets

```ts
expect(sanitizeSensitiveText("IBAN ES0912345678123456788981 Tarjeta 1234 5678 9012 2451 DNI 12345678Z"))
  .toContain("ES09 **** **** **** **** 8981");

expect(classifyMovement({ description: "OPENAI CHATGPT", amount: -106.74 }).category)
  .toBe("IA / herramientas / productividad / servidores");

expect(analyzeMovements(classified).realConsumption)
  .toBe(outflows - savings);
```

## Verification

Run:

```bash
npm test -- --run
npm run build
```

Then launch the dev server and inspect the local app in a browser.
