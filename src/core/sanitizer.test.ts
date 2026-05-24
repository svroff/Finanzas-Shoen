import { describe, expect, it } from "vitest";
import { sanitizeSensitiveText } from "./sanitizer";

describe("sanitizeSensitiveText", () => {
  it("masks IBAN, card numbers, DNI and long references before display", () => {
    const raw =
      "Transferencia IBAN ES0912345678123456788981 tarjeta 1234 5678 9012 2451 DNI 12345678Z REF 99887766554433221100";

    const safe = sanitizeSensitiveText(raw);

    expect(safe).toContain("ES09 **** **** **** **** 8981");
    expect(safe).toContain("**** 2451");
    expect(safe).not.toContain("12345678Z");
    expect(safe).not.toContain("99887766554433221100");
  });
});

