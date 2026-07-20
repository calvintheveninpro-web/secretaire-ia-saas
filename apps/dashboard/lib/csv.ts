// Génération CSV (séparateur point-virgule, BOM UTF-8 pour Excel).

export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [headers, ...rows].map((row) => row.map(escape).join(";"));
  return "\uFEFF" + lines.join("\r\n");
}
