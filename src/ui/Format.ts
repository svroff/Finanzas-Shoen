export const euro = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

export function formatEuro(value: number): string {
  return euro.format(value);
}

export function formatShortDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

