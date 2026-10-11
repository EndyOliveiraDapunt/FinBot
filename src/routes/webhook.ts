import { FastifyInstance } from 'fastify';
import { parseEvolutionWebhook, sendWhatsAppText } from '../services/whatsappService.js';
import { getUserByPhoneNumber, linkPhoneWithCode } from '../services/userService.js';
import { processUserMessage } from '../ai/agent.js';
import { supabaseAdmin } from '../config/supabase.js';

export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post('/webhooks/evolution', async (request, reply) => {
    // 1. Responde 200 imediatamente para o gateway não reenviar a requisição
    reply.status(200).send({ status: 'received' });

    const payload = request.body;
    const parsed = parseEvolutionWebhook(payload);

    if (!parsed) return;
    if (parsed.fromMe || parsed.isGroup || !parsed.text) return;

    const { messageId, phoneNumber, text } = parsed;

    // 2. Idempotência: verifica se a mensagem já foi processada
    const { data: alreadyProcessed } = await supabaseAdmin
      .from('processed_messages')
      .select('message_id')
      .eq('message_id', messageId)
      .maybeSingle();

    if (alreadyProcessed) {
      console.log(`[Webhook] Mensagem duplicada ignorada: ${messageId}`);
      return;
    }

    // Registra a mensagem como recebida
    await supabaseAdmin.from('processed_messages').insert({
      message_id: messageId,
    });

    try {
      // 3. Verifica se é um comando de vínculo de conta: "vincular 123456" ou código de 6 dígitos
      const linkMatch = text.match(/^(?:vincular\s+)?([0-9]{6})$/i);
      if (linkMatch) {
        const code = linkMatch[1];
        const linkResult = await linkPhoneWithCode(code, phoneNumber);
        await sendWhatsAppText(phoneNumber, linkResult.message);
        return;
      }

      // 4. Busca o usuário associado a este telefone
      const userContext = await getUserByPhoneNumber(phoneNumber);

      if (!userContext) {
        // Usuário ainda não cadastrado / vinculado
        const welcomeNotLinked = `👋 Olá! Sou o *FinBot*, seu assistente financeiro no WhatsApp.\n\nEste número ainda não está vinculado a uma conta. Para começar:\n1. Acesse o painel web\n2. Vá em *Configurações > Vincular WhatsApp*\n3. Envie aqui o código gerado no formato: *vincular CÓDIGO*\n\nÉ rápido e 100% seguro!`;
        await sendWhatsAppText(phoneNumber, welcomeNotLinked);
        return;
      }

      // 5. Processa a mensagem pelo agente de IA
      const response = await processUserMessage({
        userContext,
        messageText: text,
      });

      // 6. Envia a resposta de volta ao usuário pelo WhatsApp
      await sendWhatsAppText(phoneNumber, response.replyText);
    } catch (err: any) {
      console.error(`[Webhook] Erro ao processar mensagem ${messageId}:`, err);
      await sendWhatsAppText(
        phoneNumber,
        'Desculpe, tive uma instabilidade momentânea ao processar sua mensagem. Por favor, tente novamente em instantes.'
      );
    }
  });
}
