import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { supabaseAdmin } from '../config/supabase.js';

interface RegisterBody {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string;
}

interface AutoConfirmBody {
  email: string;
}

export async function authRoutes(fastify: FastifyInstance, _opts: FastifyPluginOptions) {
  /**
   * POST /api/auth/register
   * Cria novo usuário diretamente no Supabase com email já confirmado.
   * Não dispara e-mail de confirmação e permite login imediato.
   */
  fastify.post('/api/auth/register', async (request, reply) => {
    const { email, password, fullName, phoneNumber } = request.body as RegisterBody;

    if (!email || !password || !fullName) {
      return reply.status(400).send({
        error: 'E-mail, senha e nome completo são obrigatórios.',
      });
    }

    try {
      const cleanPhone = phoneNumber ? phoneNumber.replace(/\D/g, '') : undefined;

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('duplicate')) {
          return reply.status(400).send({ error: 'Este e-mail já está cadastrado.' });
        }
        return reply.status(400).send({ error: error.message });
      }

      // Se passou telefone, atualiza no perfil
      if (data.user && cleanPhone) {
        await supabaseAdmin
          .from('profiles')
          .update({ phone_number: cleanPhone })
          .eq('id', data.user.id);
      }

      return reply.send({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || 'Erro ao criar conta.',
      });
    }
  });

  /**
   * POST /api/auth/auto-confirm
   * Confirma o e-mail de um usuário existente sem necessidade de link de verificação.
   */
  fastify.post('/api/auth/auto-confirm', async (request, reply) => {
    const { email } = request.body as AutoConfirmBody;

    if (!email) {
      return reply.status(400).send({ error: 'E-mail é obrigatório.' });
    }

    try {
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return reply.status(500).send({ error: listError.message });
      }

      const target = listData.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );

      if (!target) {
        return reply.status(404).send({ error: 'Usuário não encontrado.' });
      }

      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        target.id,
        { email_confirm: true }
      );

      if (updateError) {
        return reply.status(500).send({ error: updateError.message });
      }

      return reply.send({
        success: true,
        message: 'E-mail confirmado com sucesso.',
        user: {
          id: updateData.user.id,
          email: updateData.user.email,
          confirmedAt: updateData.user.email_confirmed_at,
        },
      });
    } catch (err: any) {
      fastify.log.error(err);
      return reply.status(500).send({
        error: err.message || 'Erro ao confirmar e-mail.',
      });
    }
  });
}
