import { PDFParse } from 'pdf-parse';

export interface ExtractedStatementItem {
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: 'expense' | 'income';
  rawText: string;
}

export interface StatementParseResult {
  totalItems: number;
  totalExpenses: number;
  totalIncome: number;
  items: ExtractedStatementItem[];
}

/**
 * Extrai transações financeiras de extratos e faturas em formato PDF
 */
export async function parseStatementPdf(pdfBuffer: Buffer, referenceYear: number = new Date().getFullYear()): Promise<StatementParseResult> {
  const parser = new PDFParse({ data: pdfBuffer });
  const textResult = await parser.getText();
  const text = textResult.text || '';
  const lines: string[] = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

  const items: ExtractedStatementItem[] = [];

  // Padrões comuns em faturas e extratos brasileiros (Nubank, Itaú, Bradesco, Inter, Santander)
  // Ex: "15 OUT Uber *Trip R$ 24,90" ou "15/10/2026 Padaria Real -35,00" ou "12 MAI - Supermercado Pão de Açúcar 150,00"
  const dateRegex = /(?:(\d{1,2})[\/\.-](\d{1,2})(?:[\/\.-](\d{2,4}))?|(\d{1,2})\s+(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))/i;
  const moneyRegex = /(?:R\$\s*)?(-?\s*\d{1,3}(?:\.\d{3})*,\d{2}|-?\s*\d+,\d{2})/i;

  const monthNames: Record<string, string> = {
    jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06',
    jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12',
  };

  for (const line of lines) {
    const dateMatch = line.match(dateRegex);
    const moneyMatch = line.match(moneyRegex);

    if (dateMatch && moneyMatch) {
      let day = '';
      let month = '';
      let year = String(referenceYear);

      if (dateMatch[1] && dateMatch[2]) {
        day = dateMatch[1].padStart(2, '0');
        month = dateMatch[2].padStart(2, '0');
        if (dateMatch[3]) {
          year = dateMatch[3].length === 2 ? `20${dateMatch[3]}` : dateMatch[3];
        }
      } else if (dateMatch[4] && dateMatch[5]) {
        day = dateMatch[4].padStart(2, '0');
        month = monthNames[dateMatch[5].toLowerCase()] || '01';
      }

      const isoDate = `${year}-${month}-${day}`;

      // Extrai valor monetário
      let rawAmountStr = moneyMatch[1].replace(/\s+/g, '');
      const isNegative = rawAmountStr.includes('-');
      rawAmountStr = rawAmountStr.replace('-', '').replace(/\./g, '').replace(',', '.');
      const amountVal = parseFloat(rawAmountStr);

      if (isNaN(amountVal) || amountVal <= 0) continue;

      // Descrição limpa removendo data e valor
      let desc = line
        .replace(dateMatch[0], '')
        .replace(moneyMatch[0], '')
        .replace(/R\$/gi, '')
        .trim();

      desc = desc.replace(/^[-–—:\s]+|[-–—:\s]+$/g, '').trim();
      if (!desc) desc = 'Lançamento extrato';

      // Identifica se é despesa ou receita
      const lowerLine = line.toLowerCase();
      let type: 'expense' | 'income' = 'expense';

      if (
        lowerLine.includes('pagamento recebido') ||
        lowerLine.includes('transferência recebida') ||
        lowerLine.includes('pix recebido') ||
        lowerLine.includes('salário') ||
        lowerLine.includes('rendimento')
      ) {
        type = 'income';
      } else if (isNegative || lowerLine.includes('compra') || lowerLine.includes('débito') || lowerLine.includes('saque') || lowerLine.includes('pagamento de fatura')) {
        type = 'expense';
      }

      items.push({
        date: isoDate,
        description: desc,
        amount: Math.round(amountVal * 100) / 100,
        type,
        rawText: line,
      });
    }
  }

  let totalExpenses = 0;
  let totalIncome = 0;

  for (const item of items) {
    if (item.type === 'expense') totalExpenses += item.amount;
    else totalIncome += item.amount;
  }

  return {
    totalItems: items.length,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    totalIncome: Math.round(totalIncome * 100) / 100,
    items,
  };
}
