import { supabaseAdmin } from '../config/supabase.js';

export interface CreateTransactionParams {
  userId: string;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  description: string;
  categoryName?: string;
  accountName?: string;
  date?: string; // YYYY-MM-DD
  source?: 'whatsapp' | 'web' | 'manual';
  metadata?: Record<string, any>;
}

export interface TransactionResult {
  transaction: any;
  account: {
    id: string;
    name: string;
    previousBalance: number;
    newBalance: number;
  };
  categoryName: string;
}

/**
 * Cria uma nova transação financeira vinculando a conta e categoria do usuário
 */
export async function createTransaction(params: CreateTransactionParams): Promise<TransactionResult> {
  const {
    userId,
    amount,
    type,
    description,
    categoryName,
    accountName,
    date = new Date().toISOString().split('T')[0],
    source = 'whatsapp',
    metadata = {},
  } = params;

  // 1. Busca a conta especificada ou a conta padrão
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

  // 2. Busca ou mapeia a categoria
  const { data: categories } = await supabaseAdmin
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .eq('type', type === 'income' ? 'income' : 'expense');

  let targetCategory = (categories || [])[0];
  if (categoryName && categories && categories.length > 0) {
    const matched = categories.find((cat) =>
      cat.name.toLowerCase().includes(categoryName.toLowerCase())
    );
    if (matched) targetCategory = matched;
  }

  // 3. Insere a transação no Supabase
  const previousBalance = Number(targetAccount.current_balance);

  const { data: transaction, error: txError } = await supabaseAdmin
    .from('transactions')
    .insert({
      user_id: userId,
      account_id: targetAccount.id,
      category_id: targetCategory ? targetCategory.id : null,
      amount: Math.abs(amount),
      type,
      description,
      transaction_date: date,
      status: 'completed',
      source,
      metadata,
    })
    .select('*')
    .single();

  if (txError) {
    throw new Error(`Falha ao registrar transação: ${txError.message}`);
  }

  // 4. Busca o saldo atualizado pela trigger
  const { data: updatedAccount } = await supabaseAdmin
    .from('accounts')
    .select('current_balance')
    .eq('id', targetAccount.id)
    .single();

  const newBalance = updatedAccount ? Number(updatedAccount.current_balance) : previousBalance;

  return {
    transaction,
    account: {
      id: targetAccount.id,
      name: targetAccount.name,
      previousBalance,
      newBalance,
    },
    categoryName: targetCategory ? targetCategory.name : 'Outros',
  };
}

/**
 * Consulta o resumo financeiro (gastos, receitas, saldo) para um período
 */
export async function getFinancialSummary(
  userId: string,
  period: 'today' | 'current_week' | 'current_month' = 'current_month',
  categoryName?: string
) {
  const now = new Date();
  let startDate: string;

  if (period === 'today') {
    startDate = now.toISOString().split('T')[0];
  } else if (period === 'current_week') {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startDate = startOfWeek.toISOString().split('T')[0];
  } else {
    // current_month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startDate = startOfMonth.toISOString().split('T')[0];
  }

  let query = supabaseAdmin
    .from('transactions')
    .select('id, amount, type, description, transaction_date, category_id, categories(name)')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .eq('status', 'completed');

  const { data: transactions, error } = await query;
  if (error) throw new Error(`Erro ao buscar resumo: ${error.message}`);

  let totalExpenses = 0;
  let totalIncome = 0;
  const byCategory: Record<string, number> = {};

  for (const tx of transactions || []) {
    const val = Number(tx.amount);
    const catName = (tx.categories as any)?.name || 'Sem Categoria';

    if (tx.type === 'expense') {
      totalExpenses += val;
      byCategory[catName] = (byCategory[catName] || 0) + val;
    } else if (tx.type === 'income') {
      totalIncome += val;
    }
  }

  // Saldo geral consolidado de todas as contas
  const { data: accounts } = await supabaseAdmin
    .from('accounts')
    .select('current_balance')
    .eq('user_id', userId)
    .eq('is_active', true);

  const totalBalance = (accounts || []).reduce((acc, curr) => acc + Number(curr.current_balance), 0);

  return {
    period,
    startDate,
    totalExpenses,
    totalIncome,
    totalBalance,
    byCategory,
    transactionCount: (transactions || []).length,
  };
}

/**
 * Cancela ou desfaz a última transação realizada
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
