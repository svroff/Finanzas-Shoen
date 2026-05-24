const IBAN_RE = /\b([A-Z]{2})(\d{2})(?:\s?\d{4}){4}\s?\d{4}\b/g;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;
const DNI_RE = /\b\d{8}[A-Z]\b/gi;
const LONG_REFERENCE_RE = /\b(?=[A-Z0-9-]{16,}\b)(?=.*\d)[A-Z0-9-]+\b/gi;

export function sanitizeSensitiveText(input: string): string {
  return input
    .replace(IBAN_RE, (match, country: string, check: string) => {
      const digits = match.replace(/\D/g, "");
      return `${country}${check} **** **** **** **** ${digits.slice(-4)}`;
    })
    .replace(CARD_RE, (match) => {
      const digits = match.replace(/\D/g, "");
      if (digits.length < 13 || digits.length > 19) return match;
      return `**** ${digits.slice(-4)}`;
    })
    .replace(DNI_RE, "[DNI oculto]")
    .replace(LONG_REFERENCE_RE, "[referencia oculta]")
    .replace(/\s{2,}/g, " ")
    .trim();
}

