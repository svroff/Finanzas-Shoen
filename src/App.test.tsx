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
    expect(screen.getByText("Sin movimientos importados")).toBeInTheDocument();
    expect(screen.queryByText("2500,00 €")).not.toBeInTheDocument();
    expect(screen.queryByText("FONDO EMERGENCIA")).not.toBeInTheDocument();
  });

  it("explains when pasted text produces no movements instead of silently doing nothing", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Clasificar texto" }));

    expect(screen.getByText("No he detectado movimientos. Revisa el formato o prueba con CSV/Excel, que son más fiables que PDF.")).toBeInTheDocument();
  });
});
