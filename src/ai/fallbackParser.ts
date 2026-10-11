import { UserContext } from '../services/userService.js';
import { parseBRLMoney, formatBRL } from '../lib/money.js';
import {
  createTransaction,
  getFinancialSummary,
  cancelLastTransaction,
} from '../services/transactionService.js';
import { AgentResponse } from './agent.js';

export async function runWithHeuristicFallback(
  userContext: UserContext,
  messageText: string
): Promise<AgentResponse> {
  const text = messageText.toLowerCase().trim();

  // 1. Cancelar / Desfazer
  if (text.includes('cancela') || text.includes('desfazer') || text.includes('apaga o último') || text.includes('apagar o ultimo')) {
    const res = await cancelLastTransaction(userContext.userId);
    if (!res.success) {
      return { replyText: '❌ Nenhuma transação recente encontrada para cancelar.' };
    }
    return {
      replyText: `🗑️ *Transação cancelada!*\nDesfeita a ${res.canceledTransaction?.type === 'expense' ? 'despesa' : 'receita'} de *${formatBRL(res.canceledTransaction?.amount || 0)}* (*${res.canceledTransaction?.description}*).`,
      toolExecuted: 'cancel_last_transaction',
      toolResult: res,
    };
  }

  // 2. Consulta de Saldo Geral
  if (text === 'saldo' || text.includes('qual meu saldo') || text.includes('quanto tenho')) {
    const totalBalance = userContext.accounts.reduce((acc, a) => acc + Number(a.current_balance), 0);
    const details = userContext.accounts.map((a) => `- ${a.name}: ${formatBRL(Number(a.current_balance))}`).join('\n');
    return {
      replyText: `🏦 *Seu Saldo Consolidado:* ${formatBRL(totalBalance)}\n\n*Por conta:*\n${details || 'Nenhuma conta ativa'}`,
      toolExecuted: 'get_balance',
      toolResult: { totalBalance },
    };
  }

  // 3. Consulta de Resumo Financeiro
  if (text.includes('quanto gastei') || text.includes('resumo') || text.includes('extrato')) {
    const period = text.includes('hoje')
      ? 'today'
      : text.includes('ontem')
      ? 'yesterday'
      : text.includes('semana')
      ? 'this_week'
      : 'this_month';

    const summary = await getFinancialSummary(userContext.userId, period, undefined, userContext.timezone);

    let reply = `📊 *Resumo Financeiro (${summary.periodLabel})*\n\n`;
    reply += `💸 *Total Gasto:* ${formatBRL(summary.totalExpenses)}\n`;
    reply += `💰 *Total Recebido:* ${formatBRL(summary.totalIncome)}\n`;
    reply += `🏦 *Saldo Geral:* ${formatBRL(summary.totalBalance)}\n`;

    const cats = Object.entries(summary.byCategory);
    if (cats.length > 0) {
      reply += `\n*Gastos por Categoria:*\n`;
      for (const [cat, val] of cats) {
        reply += `- ${cat}: ${formatBRL(val as number)}\n`;
      }
    }

    return {
      replyText: reply.trim(),
      toolExecuted: 'get_summary',
      toolResult: summary,
    };
  }

  // 4. Lançamento monetário
  const amount = parseBRLMoney(text);
  if (amount && amount > 0) {
    const isIncome =
      text.includes('recebi') ||
      text.includes('ganhei') ||
      text.includes('salário') ||
      text.includes('salario') ||
      text.includes('pix de') ||
      text.includes('freela');

    const type = isIncome ? 'income' : 'expense';

    // Determina descrição
    let desc = 'Gasto registrado via WhatsApp';
    if (text.includes('almoço') || text.includes('almoco')) desc = 'Almoço';
    else if (text.includes('uber') || text.includes('táxi') || text.includes('99')) desc = 'Transporte / Uber';
    else if (text.includes('mercado') || text.includes('compras')) desc = 'Supermercado';
    else if (text.includes('padaria') || text.includes('café') || text.includes('cafe')) desc = 'Padaria / Café';
    else if (text.includes('luz') || text.includes('energia')) desc = 'Conta de Luz';
    else if (text.includes('internet')) desc = 'Conta de Internet';
    else if (text.includes('farmácia') || text.includes('farmacia') || text.includes('remédio')) desc = 'Farmácia';
    else if (text.includes('pizza') || text.includes('lanche') || text.includes('hambúrguer')) desc = 'Lanche / Pizza';
    else if (isIncome) desc = 'Receita / Pagamento';

    // Categoria
    let catName = 'Outros';
    if (desc.includes('Almoço') || desc.includes('Padaria') || desc.includes('Supermercado') || desc.includes('Pizza')) catName = 'Alimentação';
    else if (desc.includes('Transporte')) catName = 'Transporte';
    else if (desc.includes('Luz') || desc.includes('Internet')) catName = 'Moradia';
    else if (desc.includes('Farmácia')) catName = 'Saúde';
    else if (isIncome) catName = 'Salário';

    const result = await createTransaction({
      userId: userContext.userId,
      amount,
      type,
      description: desc,
      categoryName: catName,
      timezone: userContext.timezone,
    });

    const prefix = type === 'expense' ? '💸 *Despesa Anotada!*' : '🎉 *Receita Registrada!*';
    const replyText = `${prefix}\n\n*Valor:* ${formatBRL(result.transaction.amount)}\n*Descrição:* ${result.transaction.description}\n*Categoria:* 🏷️ ${result.categoryName}\n*Conta:* 💳 ${result.account.name}\n*Saldo Atual:* ${formatBRL(result.account.newBalance)}`;

    return {
      replyText,
      toolExecuted: 'add_transaction',
      toolResult: result,
    };
  }

  // 5. Ajuda padrão
  return {
    replyText: `Olá, ${userContext.fullName}! 👋\nSou o FinBot, seu assistente de controle financeiro.\n\nVocê pode me mandar mensagens como:\n- *"Gastei 42,50 no almoço"*\n- *"Paguei 120 de luz hoje"*\n- *"Recebi 1500 de freela"*\n- *"Quanto gastei hoje?"*\n- *"Qual meu saldo?"*\n- *"Cancela o último lançamento"*`,
  };
}
