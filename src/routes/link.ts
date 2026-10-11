import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generatePhoneLinkCode, getUserContext } from '../services/userService.js';

const linkCodeSchema = z.object({
  userId: z.string().uuid(),
});

export async function linkRoutes(fastify: FastifyInstance) {
  fastify.post('/api/link-code', async (request, reply) => {
    const parse = linkCodeSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'ID de usuário inválido' });
    }

    try {
      const result = await generatePhoneLinkCode(parse.data.userId);
      return reply.send(result);
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  fastify.get('/api/link-status/:userId', async (request, reply) => {
    const { userId } = request.params as { userId: string };
    try {
      const user = await getUserContext(userId);
      return reply.send({
        isLinked: !!user.phoneNumber,
        phoneNumber: user.phoneNumber,
      });
    } catch (err: any) {
      return reply.status(404).send({ error: err.message });
    }
  });
}
