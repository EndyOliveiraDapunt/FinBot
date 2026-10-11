import { supabaseAdmin } from '../config/supabase.js';
import { getTodayDateString, resolvePeriodDates } from '../lib/dates.js';

export interface CreateTransactionParams {
  userId: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  description: string;
  categoryName?: string;
  accountName?: string;
  transferAccountName?: string;
  date?: string; // YYYY-MM-DD
  source?: 'whatsapp' | 'web' | 'manual' | 'import';
  externalMessageId?: string;
  importId?: string;
  metadata?: Record<string, any>;
  timezone?: string;
}

export interface TransactionResult {
  transaction: any;
  account: {
    id: string;
    name: string;
    previousBalance: number;
    newBalance: number;
  };
  transferAccount?: {
    id: string;
    name: string;
    newBalance: number;
  };
  categoryName: string;
}

/**
 * Cria uma nova transação financeira no Supabase vinculando contas e categorias do próprio usuário
 */
export async function createTransaction(params: CreateTransactionParams): Promise<TransactionResult> {
  const {
    userId,
    amount,
    type,
    description,
    categoryName,
    accountName,
    transferAccountName,
    date,
    source = 'whatsapp',
    externalMessageId,
    importId,
    metadata = {},
    timezone = 'America/Sao_Paulo',
  } = params;

  const txDate = date || getTodayDateString(timezone);

  // 1. Busca a conta de origem (especificada ou a primeira conta ativa)
  const { data: accounts } = await supabaseAdmin
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!accounts || accounts.length === 0) {
    throw new Error('Nenhuma conta ativa encontrada para o usuário.');
  }

  let targetAccount = accounts[0];
  if (accountName) {
    const matched = accounts.find((acc) =>
      acc.name.toLowerCase().includes(accountName.toLowerCase())
    );
    if (matched) targetAccount = matched;
  }

  // 2. Busca conta de destino em caso de transferência
  let transferAccount: any = null;
  if (type === 'transfer') {
    if (transferAccountName) {
      transferAccount = accounts.find((acc) =>
        acc.id !== targetAccount.id && acc.name.toLowerCase().includes(transferAccountName.toLowerCase())
      );
    }
    // Se não especificou destino diferente, pega uma segunda conta
    if (!transferAccount) {
      transferAccount = accounts.find((acc) => acc.id !== targetAccount.id);
    }
  }

  // 3. Busca ou mapeia a categoria
  let targetCategory: any = null;
  if (type !== 'transfer') {
    const { data: categories } = await supabaseAdmin
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .eq('type', type === 'income' ? 'income' : 'expense');

    if (categoryName && categories && categories.length > 0) {
      const matched = categories.find((cat) =>
        cat.name.toLowerCase().includes(categoryName.toLowerCase())
      );
      if (matched) targetCategory = matched;
    }

    if (!targetCategory && categories && categories.length > 0) {
      // Pega categoria padrão ou a primeira
      targetCategory = categories.find((c) => c.is_default) || categories[0];
    }
  }

  // 4. Insere a transação
  const previousBalance = Number(targetAccount.current_balance);

  const { data: transaction, error: txError } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: targetAccount.id,
      transfer_account_id: transferAccount ? transferAccount.id : null,
      category_id: targetCategory ? targetCategory.id : null,
      amount: Math.abs(amount),
      type,
      description,
      transaction_date: txDate,
      status: 'completed',
      source,
      external_message_id: externalMessageId || null,
      import_id: importId || null,
      metadata,
    })
    .select('*')
    .single();

  if (txError) {
    throw new Error(`Falha ao registrar transação: ${txError.message}`);
  }

  // 5. Busca saldos atualizados
  const { data: updatedAccount } = await supabaseAdmin
    .from('accounts')
    .select('current_balance')
    .eq('id', targetAccount.id)
    .single();

  const newBalance = updatedAccount ? Number(updatedAccount.current_balance) : previousBalance;

  let updatedTransferAcc: any = null;
  if (transferAccount) {
    const { data: upTrans } = await supabaseAdmin
      .from('accounts')
      .select('name, current_balance')
      .eq('id', transferAccount.id)
      .single();
    if (upTrans) {
      updatedTransferAcc = {
        id: transferAccount.id,
        name: upTrans.name,
        newBalance: Number(upTrans.current_balance),
      };
    }
  }

  return {
    transaction,
    account: {
      id: targetAccount.id,
      name: targetAccount.name,
      previousBalance,
      newBalance,
    },
    transferAccount: updatedTransferAcc,
    categoryName: targetCategory ? targetCategory.name : type === 'transfer' ? 'Transferência' : 'Outros',
  };
}

/**
 * Consulta o resumo financeiro consolidado de um período
 */
export async function getFinancialSummary(
  userId: string,
  period: string = 'this_month',
  categoryName?: string,
  timezone: string = 'America/Sao_Paulo'
) {
  const range = resolvePeriodDates(period, timezone);

  // Tenta RPC otimizada primeiro
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('get_period_summary', {
    p_user_id: userId,
    p_start_date: range.startDate,
    p_end_date: range.endDate,
  });

  if (!rpcError && rpcData) {
    return {
      period,
      periodLabel: range.label,
      startDate: range.startDate,
      endDate: range.endDate,
      totalExpenses: Number(rpcData.total_expenses || 0),
      totalIncome: Number(rpcData.total_income || 0),
      totalBalance: Number(rpcData.total_balance || 0),
      transactionCount: Number(rpcData.transaction_count || 0),
      byCategory: rpcData.by_category || {},
    };
  }

  // Fallback SQL direto
  const { data: transactions, error } = await supabaseAdmin
    .from('transactions')
    .select('id, amount, type, description, transaction_date, category_id, categories(name)')
    .eq('user_id', userId)
    .gte('transaction_date', range.startDate)
    .lte('transaction_date', range.endDate)
    .eq('status', 'completed');

  if (error) {
    throw new Error(`Erro ao buscar resumo financeiro: ${error.message}`);
  }

  let totalExpenses = 0;
  let totalIncome = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of transactions || []) {
    const val = Number(tx.amount);
    const cat = (tx.categories as any)?.name || 'Sem Categoria';

    if (tx.type === 'expense') {
      totalExpenses += val;
      byCategory[cat] = (byCategory[cat] || 0) + val;
    } else if (tx.type === 'income') {
      totalIncome += val;
    }
  }

  const { data: accounts } = await supabaseAdmin
    .from('accounts')
    .select('current_balance')
    .eq('user_id', userId)
    .eq('is_active', true);

  const totalBalance = (accounts || []).reduce((acc, curr) => acc + Number(curr.current_balance), 0);

  return {
    period,
    periodLabel: range.label,
    startDate: range.startDate,
    endDate: range.endDate,
    totalExpenses,
    totalIncome,
    totalBalance,
    byCategory,
    transactionCount: (transactions || []).length,
  };
}

/**
 * Lista transações recentes do usuário com filtros opcionais
 */
export async function listRecentTransactions(
  userId: string,
  limit: number = 5,
  period?: string,
  type?: 'expense' | 'income' | 'all',
  timezone: string = 'America/Sao_Paulo'
) {
  let query = supabaseAdmin
    .from('transactions')
    .select('id, amount, type, description, transaction_date, account:accounts(name), category:categories(name)')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  if (period) {
    const range = resolvePeriodDates(period, timezone);
    query = query.gte('transaction_date', range.startDate).lte('transaction_date', range.endDate);
  }

  if (type && type !== 'all') {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao listar transações: ${error.message}`);
  return data || [];
}

/**
 * Desfaz ou cancela a última transação financeira realizada
 */
export async function cancelLastTransaction(userId: string) {
  const { data: lastTx, error: findErr } = await supabaseAdmin
    .from('transactions')
    .select('id, amount, description, type, account_id, accounts(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findErr || !lastTx) {
    return { success: false, message: 'Nenhuma transação recente encontrada para cancelar.' };
  }

  const { error: deleteErr } = await supabaseAdmin
    .from('transactions')
    .delete()
    .eq('id', lastTx.id);

  if (deleteErr) {
    throw new Error(`Erro ao cancelar transação: ${deleteErr.message}`);
  }

  return {
    success: true,
    canceledTransaction: {
      amount: Number(lastTx.amount),
      description: lastTx.description,
      type: lastTx.type,
      accountName: (lastTx.accounts as any)?.name || 'Conta',
    },
  };
}

/**
 * Importa um lote de transações extraídas de fatura/extrato PDF
 */
export async function importStatementTransactions(
  userId: string,
  accountId: string,
  filename: string,
  items: Array<{ date: string; description: string; amount: number; type: 'expense' | 'income' }>
) {
  // 1. Cria o registro de importação
  const { data: importRec, error: impErr } = await supabaseAdmin
    .from('statement_imports')
    .insert({
      user_id: userId,
      account_id: accountId,
      filename,
      status: 'completed',
      total_transactions: items.length,
    })
    .select('*')
    .single();

  if (impErr) throw new Error(`Erro ao registrar importação: ${impErr.message}`);

  // 2. Busca categorias do usuário
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('id, name, type')
    .eq('user_id', userId);

  const expenseDefault = categories?.find((c) => c.type === 'expense' && c.name.toLowerCase().includes('outros'))?.id;
  const incomeDefault = categories?.find((c) => c.type === 'income')?.id;

  // 3. Insere as transações
  let inserted = 0;
  for (const item of items) {
    const catId = item.type === 'income' ? incomeDefault : expenseDefault;
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      account_id: accountId,
      category_id: catId || null,
      import_id: importRec.id,
      amount: item.amount,
      type: item.type,
      description: item.description,
      transaction_date: item.date,
      status: 'completed',
      source: 'import',
    });
    inserted++;
  }

  return {
    importId: importRec.id,
    totalInserted: inserted,
  };
}
