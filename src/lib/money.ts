/**
 * Utilitários para parsing e formatação monetária em padrão brasileiro (BRL)
 */

export function parseBRLMoney(text: string): number | null {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // Expressões idiomáticas comuns brasileiras
  if (lower.includes('cinquentão') || lower.includes('cinquentao')) return 50.0;
  if (lower.includes('cem conto') || lower.includes('cem pila')) return 100.0;
  if (lower.includes('vinte conto') || lower.includes('vinte pila')) return 20.0;
  if (lower.includes('dez conto') || lower.includes('dez pila')) return 10.0;
  if (lower.includes('um barão') || lower.includes('um barao') || lower.includes('1 barão') || lower.includes('1 barao')) return 1000.0;

  // "3 mil", "3,5 mil", "3.5 mil", "3k", "3.5k"
  const milMatch = lower.match(/(?:r\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:mil|k)\b/i);
  if (milMatch) {
    const rawVal = parseFloat(milMatch[1].replace(',', '.'));
    if (!isNaN(rawVal)) {
      return Math.round(rawVal * 1000 * 100) / 100;
    }
  }

  // Padrão com separador de milhar e decimal: "1.250,50" ou "1250,50" ou "45,90"
  const brlNumberMatch = lower.match(/(?:r\$\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:[.,]\d{1,2})?)/i);
  if (brlNumberMatch) {
    let clean = brlNumberMatch[1];
    // Se tem ponto como milhar e vírgula como decimal: "1.250,50" -> "1250.50"
    if (clean.includes('.') && clean.includes(',')) {
      clean = clean.replace(/\./g, '').replace(',', '.');
    } else if (clean.includes(',')) {
      clean = clean.replace(',', '.');
    }
    const val = parseFloat(clean);
    if (!isNaN(val) && val > 0) {
      return Math.round(val * 100) / 100;
    }
  }

  return null;
}

export function formatBRL(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(amount);
}
