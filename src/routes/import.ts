import { FastifyInstance } from 'fastify';
import { parseStatementPdf } from '../lib/pdfParser.js';
import { importStatementTransactions } from '../services/transactionService.js';

export async function importRoutes(fastify: FastifyInstance) {
  fastify.post('/api/imports/pdf', async (request, reply) => {
    const data = await request.file();
    if (!data) {
      return reply.status(400).send({ error: 'Nenhum arquivo PDF enviado' });
    }

    const buffer = await data.toBuffer();
    const fields: any = data.fields;
    const userId = fields.userId?.value;
    const accountId = fields.accountId?.value;
    const confirm = fields.confirm?.value === 'true';

    if (!userId) {
      return reply.status(400).send({ error: 'Campo userId é obrigatório' });
    }

    try {
      const parsed = await parseStatementPdf(buffer);

      if (confirm && accountId && parsed.items.length > 0) {
        const importResult = await importStatementTransactions(
          userId,
          accountId,
          data.filename || 'extrato.pdf',
          parsed.items
        );

        return reply.send({
          success: true,
          confirmed: true,
          importId: importResult.importId,
          totalInserted: importResult.totalInserted,
          stats: {
            totalItems: parsed.totalItems,
            totalExpenses: parsed.totalExpenses,
            totalIncome: parsed.totalIncome,
          },
          items: parsed.items,
        });
      }

      // Se não confirmou ainda, retorna preview
      return reply.send({
        success: true,
        confirmed: false,
        stats: {
          totalItems: parsed.totalItems,
          totalExpenses: parsed.totalExpenses,
          totalIncome: parsed.totalIncome,
        },
        items: parsed.items,
      });
    } catch (err: any) {
      console.error('[Import PDF] Erro:', err);
      return reply.status(500).send({ error: `Erro ao processar PDF: ${err.message}` });
    }
  });
}
