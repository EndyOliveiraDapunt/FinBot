import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabase';
import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { FinancialCharts } from './components/FinancialCharts';
import { AccountsList } from './components/AccountsList';
import { RecentTransactions } from './components/RecentTransactions';
import { WhatsAppLiveModal } from './components/WhatsAppLiveModal';
import { NewTransactionModal } from './components/NewTransactionModal';
import { StatementUploadModal } from './components/StatementUploadModal';
import { SettingsModal } from './components/SettingsModal';
import { LoginPage } from './components/LoginPage';
import { AdminPanel } from './components/AdminPanel';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Transaction, Account, Category, FinancialStats } from './types';
import { MessageSquare, ShieldCheck, FileText } from 'lucide-react';

function Dashboard() {
  const { user, profile } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Modais
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [isNewTxOpen, setIsNewTxOpen] = useState<boolean>(false);
  const [isImportPdfOpen, setIsImportPdfOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  const activeUserId = profile?.id || user?.id || '';

  // Carrega transações, contas e categorias do Supabase
  const fetchData = useCallback(async () => {
    if (!activeUserId) return;

    setIsRefreshing(true);
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, category:categories(name, color, icon), account:accounts(name, type)')
          .eq('user_id', activeUserId)
          .order('created_at', { ascending: false }),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', activeUserId)
          .eq('is_active', true),
        supabase
          .from('categories')
          .select('*')
          .eq('user_id', activeUserId),
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
  }, [activeUserId]);

  useEffect(() => {
    if (activeUserId) {
      fetchData();
    } else {
      setTransactions([]);
      setAccounts([]);
      setCategories([]);
    }
  }, [activeUserId, fetchData]);

  // Subscrição Realtime no Supabase
  useEffect(() => {
    if (!activeUserId) return;

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
  }, [activeUserId, fetchData]);

  // KPIs
  const stats: FinancialStats = React.useMemo(() => {
    const totalBalance = accounts.reduce((acc, a) => acc + Number(a.current_balance), 0);
    let totalIncome = 0;
    let totalExpenses = 0;

    for (const t of transactions) {
      const val = Number(t.amount);
      if (t.type === 'income') totalIncome += val;
      if (t.type === 'expense') totalExpenses += val;
    }

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
    };
  }, [accounts, transactions]);

  const handleDeleteTransaction = async (id: string) => {
    try {
      await supabase.from('transactions').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error('Erro ao deletar transação:', err);
    }
  };

  // Se deslogado, exibe exclusivamente a página de login limpa e focada
  if (!user) {
    return <LoginPage />;
  }

  // Se estiver na visão administrativa
  if (currentView === 'admin') {
    return <AdminPanel onBackToDashboard={() => setCurrentView('dashboard')} />;
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Usuário';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Header */}
      <Header
        onOpenWhatsApp={() => setIsWhatsAppOpen(true)}
        onOpenNewTransaction={() => setIsNewTxOpen(true)}
        onOpenImportPdf={() => setIsImportPdfOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAuth={() => {}}
        onOpenAdmin={() => setCurrentView('admin')}
        onRefresh={() => fetchData()}
        isRefreshing={isRefreshing}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-surface border border-border-subtle relative overflow-hidden shadow-sm">
          <div className="absolute top-0 right-0 w-80 h-full bg-brand-500/5 blur-3xl pointer-events-none"></div>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400 uppercase tracking-wider">
                Plano {(profile?.plan_tier || 'basic').toUpperCase()}
              </span>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                WhatsApp: {profile?.phone_number ? `+${profile.phone_number}` : 'Pronto para vincular'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Olá, {displayName} 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
              Suas despesas e receitas sincronizadas em tempo real via WhatsApp e Web.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsImportPdfOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-surface-elevated hover:bg-slate-200 dark:hover:bg-slate-800 border border-border-subtle text-slate-700 dark:text-slate-300 text-xs font-bold transition-all shadow-sm group"
            >
              <FileText className="w-4 h-4 text-brand-500" />
              <span>Importar Extrato PDF</span>
            </button>

            <button
              onClick={() => setIsWhatsAppOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-[#25D366]/15 hover:bg-[#25D366]/25 border border-[#25D366]/30 text-[#25D366] text-xs font-bold transition-all shadow-sm group"
            >
              <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Conversar no WhatsApp</span>
            </button>
          </div>
        </div>

        {/* 1. KPI Cards (Saldo, Entradas, Saídas) */}
        <KpiCards stats={stats} />

        {/* 2. Gráficos Analíticos */}
        <FinancialCharts transactions={transactions} />

        {/* 3. Contas & Carteiras */}
        <AccountsList accounts={accounts} />

        {/* 4. Extrato de Transações */}
        <RecentTransactions
          transactions={transactions}
          onDeleteTransaction={handleDeleteTransaction}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-border-subtle py-6 text-center text-xs text-slate-500">
        <p>FinBot • Controle Financeiro Pessoal</p>
      </footer>

      {/* Modals */}
      <WhatsAppLiveModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        userId={activeUserId}
        onTransactionUpdated={() => fetchData()}
      />

      <NewTransactionModal
        isOpen={isNewTxOpen}
        onClose={() => setIsNewTxOpen(false)}
        userId={activeUserId}
        accounts={accounts}
        categories={categories}
        onSuccess={() => fetchData()}
      />

      <StatementUploadModal
        isOpen={isImportPdfOpen}
        onClose={() => setIsImportPdfOpen(false)}
        userId={activeUserId}
        accounts={accounts}
        onSuccess={() => fetchData()}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
