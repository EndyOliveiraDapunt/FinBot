import OpenAI from 'openai';
import { UserContext, checkAndConsumeUserQuota } from '../services/userService.js';
import { buildSystemPrompt } from './prompts.js';
import { financialTools } from './tools.js';
import { aiProviders } from './providers.js';
import { runWithHeuristicFallback } from './fallbackParser.js';
import {
  createTransaction,
  getFinancialSummary,
  listRecentTransactions,
  cancelLastTransaction,
} from '../services/transactionService.js';
import { formatBRL, parseBRLMoney } from '../lib/money.js';
import { supabaseAdmin } from '../config/supabase.js';

export interface AgentInput {
  userContext: UserContext;
  messageText: string;
  audioBase64?: string;
}

export interface AgentResponse {
  replyText: string;
  toolExecuted?: string;
  toolResult?: any;
}

/**
 * Processa a mensagem do usuário executando o ciclo do agente inteligente
 */
export async function processUserMessage(input: AgentInput): Promise<AgentResponse> {
  const { userContext, messageText } = input;

  // 1. Verifica cota mensal do plano (basic, pro, plus)
  const quota = await checkAndConsumeUserQuota(userContext.userId);
  if (!quota.allowed) {
    return {
      replyText: `⚠️ *Limite Mensal Atingido*\n\n${quota.reason || 'Você utilizou todas as interações disponíveis no seu plano este mês.'}\n\nAcesse o painel web para gerenciar seu plano.`,
    };
  }

  // 2. Registra mensagem de entrada no histórico
  await supabaseAdmin.from('chat_messages').insert({
    user_id: userContext.userId,
    role: 'user',
    content: messageText,
  });

  let response: AgentResponse;

  try {
    response = await runAgentWithLLM(input);
  } catch (err: any) {
    console.warn('⚠️ Falha no processamento com LLM, usando fallback heurístico:', err.message);
    response = await runWithHeuristicFallback(userContext, messageText);
  }

  // 3. Registra resposta no histórico
  await supabaseAdmin.from('chat_messages').insert({
    user_id: userContext.userId,
    role: 'assistant',
    content: response.replyText,
    metadata: {
      toolExecuted: response.toolExecuted || null,
    },
  });

  return response;
}

/**
 * Ciclo de chamada de ferramentas com OpenAI client (Gemini ou OpenRouter)
 */
async function runAgentWithLLM(input: AgentInput): Promise<AgentResponse> {
  const { userContext, messageText } = input;
  const systemPrompt = buildSystemPrompt(userContext);

  // Busca histórico recente para contexto conversacional (últimas 6 mensagens)
  const { data: recentHistory } = await supabaseAdmin
    .from('chat_messages')
    .select('role, content')
    .eq('user_id', userContext.userId)
    .order('created_at', { ascending: false })
    .limit(6);

  const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = (recentHistory || [])
    .reverse()
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: messageText },
  ];

  // Primeira rodada do LLM
  const initialCall = await aiProviders.chatCompletion({
    messages,
    tools: financialTools,
  });

  const assistantMsg = initialCall.message;

  // Se o modelo não chamou ferramentas, retorna o texto diretamente
  if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
    return {
      replyText: assistantMsg.content || 'Entendi! Como posso te ajudar com suas finanças hoje?',
    };
  }

  // Executa as ferramentas chamadas
  let toolExecuted: string | undefined;
  let toolResult: any;

  // Adiciona a mensagem do assistente com as tool_calls na conversa
  messages.push(assistantMsg);

  for (const toolCall of assistantMsg.tool_calls) {
    if (toolCall.type !== 'function') continue;
    const name = toolCall.function.name;
    toolExecuted = name;
    let args: any = {};
    try {
      args = JSON.parse(toolCall.function.arguments);
    } catch {
      args = {};
    }

    if (name === 'add_transaction') {
      toolResult = await createTransaction({
        userId: userContext.userId,
        amount: args.amount,
        type: args.type,
        description: args.description,
        categoryName: args.category_name,
        accountName: args.account_name,
        transferAccountName: args.transfer_account_name,
        date: args.date,
        timezone: userContext.timezone,
      });
    } else if (name === 'get_summary') {
      toolResult = await getFinancialSummary(
        userContext.userId,
        args.period || 'this_month',
        args.category_name,
        userContext.timezone
      );
    } else if (name === 'list_transactions') {
      toolResult = await listRecentTransactions(
        userContext.userId,
        args.limit || 5,
        args.period,
        args.type,
        userContext.timezone
      );
    } else if (name === 'get_balance') {
      const { data: accounts } = await supabaseAdmin
        .from('accounts')
        .select('name, current_balance')
        .eq('user_id', userContext.userId)
        .eq('is_active', true);
      const totalBalance = (accounts || []).reduce((acc, a) => acc + Number(a.current_balance), 0);
      toolResult = { totalBalance, accounts };
    } else if (name === 'cancel_last_transaction') {
      toolResult = await cancelLastTransaction(userContext.userId);
    } else if (name === 'list_categories') {
      toolResult = userContext.categories;
    } else if (name === 'list_accounts') {
      toolResult = userContext.accounts;
    }

    // Adiciona o resultado da ferramenta na pilha de mensagens
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(toolResult),
    });
  }

  // Segunda chamada ao LLM para formatar a resposta amigável final
  const followUp = await aiProviders.chatCompletion({
    messages,
  });

  return {
    replyText: followUp.message.content || 'Operação realizada com sucesso!',
    toolExecuted,
    toolResult,
  };
}
