import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { webhookRoutes } from './routes/webhook.js';
import { chatRoutes } from './routes/chat.js';
import { linkRoutes } from './routes/link.js';
import { importRoutes } from './routes/import.js';
import { adminRoutes } from './routes/admin.js';

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

async function main() {
  // CORS para permitir chamadas do dashboard web
  await fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // Multipart para upload de faturas/extratos em PDF
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB máximo
    },
  });

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'finbot-saas',
      timestamp: new Date().toISOString(),
    };
  });

  // Registro das rotas
  await fastify.register(webhookRoutes);
  await fastify.register(chatRoutes);
  await fastify.register(linkRoutes);
  await fastify.register(importRoutes);
  await fastify.register(adminRoutes);

  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`\n🚀 FinBot API Server rodando em http://localhost:${env.PORT}`);
    console.log(`📡 Webhook Evolution: POST http://localhost:${env.PORT}/webhooks/evolution`);
    console.log(`💬 Chat API: POST http://localhost:${env.PORT}/api/chat`);
    console.log(`🔗 Link Code API: POST http://localhost:${env.PORT}/api/link-code`);
    console.log(`📄 PDF Import API: POST http://localhost:${env.PORT}/api/imports/pdf\n`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

main();
