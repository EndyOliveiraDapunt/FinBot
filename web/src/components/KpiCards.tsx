import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  WalletCards, 
  TrendingUp, 
  CreditCard 
} from 'lucide-react';
import { FinancialStats } from '../types';

interface KpiCardsProps {
  stats: FinancialStats;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ stats }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Saldo Consolidado */}
      <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Saldo Total em Contas
          </span>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <WalletCards className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatCurrency(stats.totalBalance)}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Disponível para uso imediato</span>
          </div>
        </div>
      </div>

      {/* 2. Receitas */}
      <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-36 h-36 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/15 transition-all"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Entradas do Mês
          </span>
          <div className="w-10 h-10 rounded-xl bg-teal-500/15 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/20">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
            {formatCurrency(stats.totalIncome)}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>Salários e entradas registradas</span>
          </div>
        </div>
      </div>

      {/* 3. Despesas */}
      <div className="glass-card glass-card-hover rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/15 transition-all"></div>
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Saídas do Mês
          </span>
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>
        <div className="space-y-1.5">
          <h3 className="text-3xl sm:text-4xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">
            {formatCurrency(stats.totalExpenses)}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <CreditCard className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Total de despesas e compras</span>
          </div>
        </div>
      </div>
    </div>
  );
};
