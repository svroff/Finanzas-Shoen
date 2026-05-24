# Finanzas-Shoen

App web local para control mensual de gastos personales de Sergi.

## Qué hace

- Importa movimientos desde CSV, Excel, PDF o texto pegado.
- Limpia datos sensibles antes de mostrarlos.
- Clasifica gastos con reglas deterministas.
- Separa ahorro/inversión y movimientos internos del consumo real.
- Compara categorías contra límites mensuales y línea base de abril 2026.
- Marca movimientos revisables sin moralizar ni tomar decisiones financieras.

## Uso local

```bash
npm install
npm run dev
```

Abre `http://127.0.0.1:5173/`.

## Verificación

```bash
npm test -- --run
npm run build
npm audit --audit-level=moderate
```

## Privacidad

La app es local-first. No envía movimientos bancarios a servicios externos. La limpieza oculta IBANs, tarjetas, DNI y referencias largas antes de renderizar los movimientos.
