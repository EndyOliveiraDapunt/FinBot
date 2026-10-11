import { env } from '../config/env.js';

export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    pushName?: string;
    messageType?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
      audioMessage?: {
        mimetype?: string;
      };
    };
  };
}

export interface ParsedWhatsAppMessage {
  messageId: string;
  phoneNumber: string;
  senderName: string;
  text: string;
  isGroup: boolean;
  fromMe: boolean;
}

/**
 * Faz o parsing do payload do webhook recebido da Evolution API v2
 */
export function parseEvolutionWebhook(payload: any): ParsedWhatsAppMessage | null {
  if (!payload || !payload.data || !payload.data.key) return null;

  const key = payload.data.key;
  const remoteJid = key.remoteJid || '';
  const fromMe = !!key.fromMe;
  const isGroup = remoteJid.endsWith('@g.us');

  // Extrai texto da mensagem
  const msgObj = payload.data.message || {};
  const text = (msgObj.conversation || msgObj.extendedTextMessage?.text || '').trim();

  // Limpa número de telefone do remoteJid
  const phoneNumber = remoteJid.split('@')[0];

  return {
    messageId: key.id,
    phoneNumber,
    senderName: payload.data.pushName || 'Usuário WhatsApp',
    text,
    isGroup,
    fromMe,
  };
}

/**
 * Envia uma mensagem de texto de volta para o usuário via Evolution API
 */
export async function sendWhatsAppText(phoneNumber: string, text: string): Promise<boolean> {
  const url = `${env.EVOLUTION_API_URL}/message/sendText/${env.EVOLUTION_INSTANCE_NAME}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        number: phoneNumber,
        textMessage: {
          text,
        },
        delay: 500,
        linkPreview: false,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Evolution API] Erro ao enviar mensagem para ${phoneNumber}: ${response.status} - ${errText}`);
      return false;
    }

    return true;
  } catch (err: any) {
    console.warn(`[Evolution API] Falha na requisição para ${phoneNumber}:`, err.message);
    return false;
  }
}
