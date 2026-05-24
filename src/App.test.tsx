import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

describe("App initial state", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("does not invent financial data before the user imports movements", () => {
    render(<App />);

    expect(screen.getAllByText("0,00 €").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Carga CSV/Excel/PDF o pega movimientos. No hay datos de ejemplo.")).toHaveLength(2);
    expect(screen.getByText("No hay movimientos detectados.")).toBeInTheDocument();
    expect(screen.queryByText("2500,00 €")).not.toBeInTheDocument();
    expect(screen.queryByText("FONDO EMERGENCIA")).not.toBeInTheDocument();
  });

  it("does not ask for sample data when confirmed movements already exist locally", () => {
    window.localStorage.setItem(
      "finance_tracking_v2_movements",
      JSON.stringify([
        {
          id: "stored-1",
          date: "2026-05-01",
          description: "MERCADONA",
          safeDescription: "MERCADONA",
          safeMerchant: "MERCADONA",
          merchant: "MERCADONA",
          amount: -45.5,
          source: "manual",
          category: "Comida casa / supermercado",
          type: "NECESARIO",
          labels: ["OK"],
          reviewReason: "",
          countsAsConsumption: true
        }
      ])
    );

    render(<App />);

    expect(screen.getAllByText("1 movimientos cargados desde este navegador.")).toHaveLength(2);
    expect(screen.queryByText("Carga CSV/Excel/PDF o pega movimientos. No hay datos de ejemplo.")).not.toBeInTheDocument();
    expect(screen.getByText("45,50 €")).toBeInTheDocument();
  });

  it("explains when pasted text produces no movements instead of silently doing nothing", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Procesar texto" }));

    expect(screen.getAllByText("No he detectado movimientos en el texto pegado.")).toHaveLength(2);
  });

  it("imports pasted movements only after explicit confirmation", () => {
    render(<App />);

    fireEvent.change(screen.getByPlaceholderText(/Pega movimientos reales aquí/), {
      target: {
        value: "01/05/2026;MERCADONA;-45,50\n02/05/2026;OPENAI;-20,00\n03/05/2026;Sueldo;1800,00"
      }
    });
    fireEvent.click(screen.getByRole("button", { name: "Procesar texto" }));

    expect(screen.getAllByText("3 movimientos detectados desde texto pegado.")).toHaveLength(2);
    expect(screen.getByText("MERCADONA")).toBeInTheDocument();
    expect(screen.getByText("OPENAI")).toBeInTheDocument();
    expect(screen.getByText("Sueldo")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirmar importación" }));

    expect(screen.getByText("3 movimientos confirmados y clasificados.")).toBeInTheDocument();
    expect(screen.getByText("Distribución del consumo")).toBeInTheDocument();
    expect(screen.getByText("Límites mensuales")).toBeInTheDocument();
    expect(screen.queryByText("2500,00 €")).not.toBeInTheDocument();
  });
});
