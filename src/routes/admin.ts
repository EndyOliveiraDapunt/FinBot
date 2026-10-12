import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { supabaseAdmin } from '../config/supabase.js';
import { env } from '../config/env.js';

const updatePlanSchema = z.object({
  userId: z.string().uuid(),
  planTier: z.enum(['basic', 'pro', 'plus']),
});

async function verifyAdminAuth(request: any, reply: any) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Acesso restrito. Faça login como administrador.' });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return reply.status(401).send({ error: 'Sessão inválida ou expirada.' });
  }

  const user = data.user;
  const isAdmin = Boolean(
    user.app_metadata?.role === 'admin' ||
    user.user_metadata?.role === 'admin' ||
    user.email?.toLowerCase() === 'admin@finbot.com'
  );

  if (!isAdmin) {
    return reply.status(403).send({ error: 'Acesso negado. Esta rota é restrita a administradores.' });
  }
}

export async function adminRoutes(fastify: FastifyInstance) {
  // Lista todos os usuários cadastrados com detalhes de plano e uso
  fastify.get('/api/admin/users', { preHandler: verifyAdminAuth }, async (request, reply) => {
    try {
      // 1. Busca todos os perfis
      const { data: profiles, error: profError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profError) {
        throw new Error(profError.message);
      }

      // 2. Busca lista de usuários do auth para obter e-mails e status de confirmação
      const { data: authData } = await supabaseAdmin.auth.admin.listUsers();
      const authMap = new Map<string, { email: string; emailConfirmed: boolean }>();
      for (const u of authData?.users || []) {
        authMap.set(u.id, {
          email: u.email || 'sem email',
          emailConfirmed: Boolean(u.email_confirmed_at),
        });
      }

      // 3. Busca resumo de transações por usuário
      const { data: transactions } = await supabaseAdmin
        .from('transactions')
        .select('user_id, amount');

      const txCountMap = new Map<string, number>();
      for (const tx of transactions || []) {
        txCountMap.set(tx.user_id, (txCountMap.get(tx.user_id) || 0) + 1);
      }

      const usersWithDetails = (profiles || []).map((p) => {
        const limits: Record<string, number> = { basic: 50, pro: 500, plus: 2000 };
        const maxQuota = limits[p.plan_tier] || 50;
        const authInfo = authMap.get(p.id) || { email: 'Não disponível', emailConfirmed: true };

        return {
          id: p.id,
          fullName: p.full_name || 'Sem Nome',
          email: authInfo.email,
          emailConfirmed: authInfo.emailConfirmed,
          phoneNumber: p.phone_number || null,
          planTier: p.plan_tier,
          isPaying: p.plan_tier !== 'basic',
          monthlyQueriesUsed: p.monthly_queries_used || 0,
          monthlyLimit: maxQuota,
          queriesResetAt: p.queries_reset_at,
          createdAt: p.created_at,
          transactionCount: txCountMap.get(p.id) || 0,
        };
      });

      return reply.send({
        totalUsers: usersWithDetails.length,
        users: usersWithDetails,
      });
    } catch (err: any) {
      console.error('[Admin] Erro ao listar usuários:', err);
      return reply.status(500).send({ error: err.message || 'Erro ao carregar dados administrativos' });
    }
  });

  // Atualiza o plano de um usuário diretamente
  fastify.post('/api/admin/update-plan', { preHandler: verifyAdminAuth }, async (request, reply) => {
    const parse = updatePlanSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({ error: 'Dados inválidos' });
    }

    const { userId, planTier } = parse.data;

    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          plan_tier: planTier,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw new Error(error.message);

      return reply.send({ success: true, userId, planTier });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Confirma e-mail de um usuário pelo painel administrativo
  fastify.post('/api/admin/confirm-user-email', { preHandler: verifyAdminAuth }, async (request, reply) => {
    const { userId } = (request.body || {}) as { userId?: string };
    if (!userId) {
      return reply.status(400).send({ error: 'userId é obrigatório' });
    }

    try {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });

      if (error) {
        return reply.status(500).send({ error: error.message });
      }

      return reply.send({ success: true, userId });
    } catch (err: any) {
      return reply.status(500).send({ error: err.message });
    }
  });

  // Retorna telemetria do sistema e modelos de IA (exclusivo para administração)
  fastify.get('/api/admin/telemetry', { preHandler: verifyAdminAuth }, async (request, reply) => {
    return reply.send({
      server: {
        status: 'online',
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        environment: env.NODE_ENV,
      },
      aiEngine: {
        primaryProvider: 'Google Gemini',
        primaryModel: env.GEMINI_MODEL,
        fallbackProvider: 'OpenRouter Free',
        fallbackModel: env.OPENROUTER_MODEL,
        geminiConfigured: !!env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 5,
        openRouterConfigured: !!env.OPENROUTER_API_KEY && env.OPENROUTER_API_KEY.length > 5,
      },
      whatsappGateway: {
        type: 'Evolution API v2',
        url: env.EVOLUTION_API_URL,
        instance: env.EVOLUTION_INSTANCE_NAME,
      },
      database: {
        provider: 'Supabase PostgreSQL',
        url: env.SUPABASE_URL,
      },
    });
  });
}
