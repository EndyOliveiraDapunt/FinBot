import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getUserContext } from '../services/userService.js';
import { processUserMessage } from '../ai/agent.js';

const chatBodySchema = z.object({
  userId: z.string().uuid(),
  message: z.string().min(1),
});

export async function chatRoutes(fastify: FastifyInstance) {
  fastify.post('/api/chat', async (request, reply) => {
    const parse = chatBodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Parâmetros inválidos', details: parse.error.format() });
    }

    const { userId, message } = parse.data;

    try {
      const userContext = await getUserContext(userId);
      const response = await processUserMessage({
        userContext,
        messageText: message,
      });

      return reply.send({
        reply: response.replyText,
        toolExecuted: response.toolExecuted,
        toolResult: response.toolResult,
      });
    } catch (err: any) {
      console.error('[API Chat] Erro ao processar:', err);
      return reply.status(500).send({ error: err.message || 'Erro interno ao processar mensagem' });
    }
  });
}
