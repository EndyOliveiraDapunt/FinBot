import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabase';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { FinancialCharts } from './components/FinancialCharts';
import { AccountsList } from './components/AccountsList';
import { RecentTransactions } from './components/RecentTransactions';
import { WhatsAppLiveModal } from './components/WhatsAppLiveModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { Transaction, Account, Category, FinancialStats } from './types';
import { MessageSquare } from 'lucide-react';

export function App() {
  const [userId, setUserId] = useState<string>('');
  const [userName, setUserName] = useState<string>('João Silva');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modals state
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [isNewTxOpen, setIsNewTxOpen] = useState<boolean>(false);

  // 1. Inicializa usuário (usa o perfil de teste criado ou o primeiro perfil encontrado)
  const initUser = useCallback(async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, phone_number')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (profile) {
        setUserId(profile.id);
        setUserName(profile.full_name || 'João Silva');
        return profile.id;
      }
    } catch (err) {
      console.error('Erro ao inicializar perfil:', err);
    }
    return '';
  }, []);

  // 2. Carrega todos os dados do banco
  const fetchData = useCallback(async (targetUserId?: string) => {
    const uid = targetUserId || userId;
    if (!uid) return;

    setIsRefreshing(true);
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, category:categories(name, color, icon), account:accounts(name, type)')
          .eq('user_id', uid)
          .order('created_at', { ascending: false }),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', uid)
          .eq('is_active', true),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', uid),
      ]);

      if (txRes.data) setTransactions(txRes.data as any);
      if (accRes.data) setAccounts(accRes.data as any);
      if (catRes.data) setCategories(catRes.data as any);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    initUser().then((uid) => {
      if (uid) fetchData(uid);
    });
  }, [initUser, fetchData]);

  // 3. Listener Realtime do Supabase: Atualiza UI automaticamente quando nova transação surge no banco!
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accounts' },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchData]);

  // 4. Calcula métricas (KPIs)
  const stats: FinancialStats = React.useMemo(() => {
    const totalBalance = accounts.reduce((acc, a) => acc + Number(a.current_balance), 0);
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions) {
      const val = Number(t.amount);
      if (t.type === 'income') totalIncome += val;
      if (t.type === 'expense') totalExpenses += val;
    }

    const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      savingsRate,
    };
  }, [accounts, transactions]);

  // Excluir transação
  const handleDeleteTransaction = async (id: string) => {
    try {
      await supabase.from('transactions').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error('Erro ao deletar:', err);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans">
      {/* Header */}
      <Header
        onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
        onOpenNewTransaction={() => setIsNewTxOpen(true)}
        onRefresh={() => fetchData()}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Welcome Banner / SaaS Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-gradient-to-r from-surface to-surface-elevated border border-border-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-full bg-brand-500/5 blur-3xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Painel Financeiro Consolidado</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Olá, {userName} 👋
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Suas movimentações registradas pelo WhatsApp e Web são auditadas e calculadas em tempo real com precisão matemática.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsWhatsAppOpen(true)}
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-bold transition-all shadow-sm group"
            >
              <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Simular Conversa no WhatsApp</span>
            </button>
          </div>
        </div>

        {/* 1. KPI Cards */}
        <KpiCards stats={stats} />

        {/* 2. Visual Charts (Fluxo & Categorias) */}
        <FinancialCharts transactions={transactions} />

        {/* 3. Contas & Carteiras */}
        <AccountsList accounts={accounts} />

        {/* 4. Extrato & Transações Recentes */}
        <RecentTransactions
          transactions={transactions}
          onDeleteTransaction={handleDeleteTransaction}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-6 text-center text-xs text-slate-500">
        <p>FinBot SaaS • Gestão Financeira Conversacional • Supabase PostgreSQL • Gemini 3.8 Flash</p>
      </footer>

      {/* Modals */}
      <WhatsAppLiveModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        userId={userId}
        onTransactionUpdated={() => fetchData()}
      />

      <NewTransactionModal
        isOpen={isNewTxOpen}
        onClose={() => setIsNewTxOpen(false)}
        userId={userId}
        accounts={accounts}
        categories={categories}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
export default App;
