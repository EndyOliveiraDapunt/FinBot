import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { UserContext } from '../services/userService.js';
import { buildSystemPrompt } from './prompts.js';
import { financialTools } from './tools.js';
import {
  createTransaction,
  getFinancialSummary,
  cancelLastTransaction,
} from '../services/transactionService.js';
import { supabaseAdmin } from '../config/supabase.js';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const isGeminiConfigured = apiKey && apiKey !== 'sua_chave_gemini_aqui' && apiKey.length > 10;

const geminiClient = isGeminiConfigured ? new GoogleGenAI({ apiKey }) : null;

export interface AgentInput {
  userContext: UserContext;
  messageText: string;
  audioBase64?: string;
  audioMimeType?: string;
}

export interface AgentResponse {
  replyText: string;
  toolExecuted?: string;
  toolResult?: any;
}

/**
 * Orquestra o processamento da mensagem do usuário com a IA e executa as ações no Supabase
 */
export async function processUserMessage(input: AgentInput): Promise<AgentResponse> {
  const { userContext, messageText, audioBase64, audioMimeType } = input;
  const systemPrompt = buildSystemPrompt(userContext);

  // 1. Registra mensagem de entrada do usuário no histórico (chat_messages)
  await supabaseAdmin.from('chat_messages').insert({
    user_id: userContext.userId,
    role: 'user',
    content: messageText || '[Áudio Recebido]',
    metadata: { hasAudio: !!audioBase64 },
  });

  let response: AgentResponse;

  if (geminiClient) {
    try {
      response = await runWithGemini(input, systemPrompt);
    } catch (err: any) {
      console.warn('Falha na chamada ao Gemini API, acionando fallback inteligente:', err.message);
      response = await runWithHeuristicFallback(input);
    }
  } else {
    // Modo de desenvolvimento sem chave de API configurada
    response = await runWithHeuristicFallback(input);
  }

  // 2. Registra resposta da IA no histórico
  await supabaseAdmin.from('chat_messages').insert({
    user_id: userContext.userId,
    role: 'assistant',
    content: response.replyText,
    metadata: {
      toolExecuted: response.toolExecuted || null,
      toolResult: response.toolResult || null,
    },
  });

  return response;
}

/**
 * Executa a orquestração via modelo oficial Gemini 3.8 Flash com Function Calling
 */
async function runWithGemini(input: AgentInput, systemPrompt: string): Promise<AgentResponse> {
  const { userContext, messageText, audioBase64, audioMimeType } = input;

  // Busca histórico recente para contexto conversacional (últimas 6 mensagens)
  const { data: recentHistory } = await supabaseAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userContext.userId)
    .order('created_at', { ascending: false })
    .limit(6);

  const formattedHistory = (recentHistory || [])
    .reverse()
    .map((msg) => `${msg.role === 'user' ? 'Usuário' : 'Assistente'}: ${msg.content}`)
    .join('\n');

  const contentPrompt = `Histórico Recente:\n${formattedHistory}\n\nNova Mensagem do Usuário: "${messageText}"`;

  // Chama a API com tools
  const interaction = await geminiClient!.interactions.create({
    model: 'gemini-3.8-flash',
    input: contentPrompt,
    system_instruction: systemPrompt,
    tools: financialTools as any,
  });

  // Verifica se a IA solicitou execução de ferramenta (Tool Call)
  let toolExecuted: string | undefined;
  let toolResult: any;

  for (const step of interaction.steps || []) {
    if (step.type === 'function_call') {
      toolExecuted = step.name;
      const args = step.arguments as any;

      if (step.name === 'create_transaction') {
        toolResult = await createTransaction({
          userId: userContext.userId,
          amount: args.amount,
          type: args.type,
          description: args.description,
          categoryName: args.category_name,
          accountName: args.account_name,
          date: args.date,
        });

        // Envia o resultado da tool de volta para a IA gerar a resposta simpática final
        const followUp = await geminiClient!.interactions.create({
          model: 'gemini-3.8-flash',
          previous_interaction_id: interaction.id,
          input: [
            {
              type: 'function_result',
              name: step.name,
              call_id: step.id,
              result: JSON.stringify(toolResult),
            },
          ],
        });

        return {
          replyText: followUp.output_text || formatTransactionMessage(toolResult),
          toolExecuted,
          toolResult,
        };
      } else if (step.name === 'get_financial_summary') {
        toolResult = await getFinancialSummary(userContext.userId, args.period, args.category_name);

        const followUp = await geminiClient!.interactions.create({
          model: 'gemini-3.8-flash',
          previous_interaction_id: interaction.id,
          input: [
            {
              type: 'function_result',
              name: step.name,
              call_id: step.id,
              result: JSON.stringify(toolResult),
            },
          ],
        });

        return {
          replyText: followUp.output_text || formatSummaryMessage(toolResult),
          toolExecuted,
          toolResult,
        };
      } else if (step.name === 'cancel_last_transaction') {
        toolResult = await cancelLastTransaction(userContext.userId);

        const followUp = await geminiClient!.interactions.create({
          model: 'gemini-3.8-flash',
          previous_interaction_id: interaction.id,
          input: [
            {
              type: 'function_result',
              name: step.name,
              call_id: step.id,
              result: JSON.stringify(toolResult),
            },
          ],
        });

        return {
          replyText: followUp.output_text || (toolResult.success ? '✅ Última transação desfeita com sucesso!' : 'Nenhuma transação para desfazer.'),
          toolExecuted,
          toolResult,
        };
      }
    }
  }

  return {
    replyText: interaction.output_text || 'Entendi! Como posso te ajudar com suas finanças hoje?',
  };
}

/**
 * Fallback heurístico inteligente em linguagem natural para desenvolvimento local
 */
async function runWithHeuristicFallback(input: AgentInput): Promise<AgentResponse> {
  const { userContext, messageText } = input;
  const text = messageText.toLowerCase().trim();

  // 1. Desfazer / Cancelar
  if (text.includes('cancela') || text.includes('desfazer') || text.includes('apaga o último') || text.includes('apagar o ultimo')) {
    const res = await cancelLastTransaction(userContext.userId);
    if (!res.success) {
      return { replyText: '❌ Nenhuma transação recente encontrada para cancelar.' };
    }
    return {
      replyText: `🗑️ *Transação cancelada com sucesso!*\nDesfeita a ${res.canceledTransaction?.type === 'expense' ? 'despesa' : 'receita'} de *R$ ${res.canceledTransaction?.amount.toFixed(2)}* (*${res.canceledTransaction?.description}*).`,
      toolExecuted: 'cancel_last_transaction',
      toolResult: res,
    };
  }

  // 2. Consulta de Saldo / Resumo
  if (text.includes('saldo') || text.includes('quanto gastei') || text.includes('resumo') || text.includes('extrato')) {
    const period = text.includes('hoje') ? 'today' : text.includes('semana') ? 'current_week' : 'current_month';
    const summary = await getFinancialSummary(userContext.userId, period);
    return {
      replyText: formatSummaryMessage(summary),
      toolExecuted: 'get_financial_summary',
      toolResult: summary,
    };
  }

  // 3. Extração de Despesa / Receita com regex monetário inteligente
  // Trata números: "45", "45,50", "cinquentão", "cem conto"
  let amount = 0;
  if (text.includes('cinquentão') || text.includes('cinquentao')) amount = 50.0;
  else if (text.includes('cem conto') || text.includes('cem pila')) amount = 100.0;
  else if (text.includes('vinte conto') || text.includes('vinte pila')) amount = 20.0;
  else if (text.includes('um barão') || text.includes('um barao')) amount = 1000.0;
  else {
    const numMatch = text.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/i);
    if (numMatch) {
      amount = parseFloat(numMatch[1].replace(',', '.'));
    }
  }

  if (amount > 0) {
    const isIncome = text.includes('recebi') || text.includes('ganhei') || text.includes('salário') || text.includes('salario') || text.includes('pix de');
    const type = isIncome ? 'income' : 'expense';

    // Determina descrição básica
    let desc = 'Gasto registrado via WhatsApp';
    if (text.includes('almoço') || text.includes('almoco')) desc = 'Almoço';
    else if (text.includes('uber') || text.includes('táxi')) desc = 'Transporte Uber';
    else if (text.includes('mercado') || text.includes('compras')) desc = 'Supermercado';
    else if (text.includes('padaria') || text.includes('café') || text.includes('cafe')) desc = 'Padaria / Café';
    else if (text.includes('luz') || text.includes('energia')) desc = 'Conta de Luz';
    else if (text.includes('internet')) desc = 'Conta de Internet';
    else if (text.includes('pizza') || text.includes('lanche')) desc = 'Lanche / Pizza';
    else if (isIncome) desc = 'Receita / Pagamento';

    // Categoria
    let catName = 'Outros';
    if (desc.includes('Almoço') || desc.includes('Padaria') || desc.includes('Supermercado') || desc.includes('Pizza')) catName = 'Alimentação';
    else if (desc.includes('Uber')) catName = 'Transporte';
    else if (desc.includes('Luz') || desc.includes('Internet')) catName = 'Moradia';
    else if (isIncome) catName = 'Salário';

    const result = await createTransaction({
      userId: userContext.userId,
      amount,
      type,
      description: desc,
      categoryName: catName,
      accountName: 'Conta Principal',
    });

    return {
      replyText: formatTransactionMessage(result),
      toolExecuted: 'create_transaction',
      toolResult: result,
    };
  }

  return {
    replyText: `Olá! Sou seu assistente financeiro no WhatsApp. 💳\n\nVocê pode me mandar mensagens como:\n- *"Gastei 42,50 no almoço"*\n- *"Paguei 120 de luz"*\n- *"Recebi 500 de freela"*\n- *"Quanto gastei hoje?"*\n- *"Qual meu saldo?"*`,
  };
}

function formatTransactionMessage(result: any): string {
  const isExp = result.transaction.type === 'expense';
  const prefix = isExp ? '💸 *Despesa Anotada!*' : '🎉 *Receita Registrada!*';
  return `${prefix}\n\n*Valor:* R$ ${Number(result.transaction.amount).toFixed(2)}\n*Descrição:* ${result.transaction.description}\n*Categoria:* 🏷️ ${result.categoryName}\n*Conta:* 💳 ${result.account.name}\n*Saldo Atual:* R$ ${result.account.newBalance.toFixed(2)}`;
}

function formatSummaryMessage(summary: any): string {
  const periodLabel = summary.period === 'today' ? 'de Hoje' : summary.period === 'current_week' ? 'desta Semana' : 'deste Mês';
  let msg = `📊 *Resumo Financeiro (${periodLabel})*\n\n`;
  msg += `💸 *Total Gasto:* R$ ${summary.totalExpenses.toFixed(2)}\n`;
  msg += `💰 *Total Recebido:* R$ ${summary.totalIncome.toFixed(2)}\n`;
  msg += `🏦 *Saldo Geral em Contas:* R$ ${summary.totalBalance.toFixed(2)}\n`;

  const cats = Object.entries(summary.byCategory);
  if (cats.length > 0) {
    msg += `\n*Principais Categorias:*\n`;
    for (const [cat, val] of cats) {
      msg += `- ${cat}: R$ ${(val as number).toFixed(2)}\n`;
    }
  }

  return msg.trim();
}
