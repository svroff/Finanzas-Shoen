import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
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
});
