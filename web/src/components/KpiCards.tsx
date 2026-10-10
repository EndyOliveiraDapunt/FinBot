import React from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  WalletCards, 
  TrendingUp, 
  PiggyBank, 
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Saldo Consolidado */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/15 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Saldo em Contas</span>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <WalletCards className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(stats.totalBalance)}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Disponível consolidado</span>
          </div>
        </div>
      </div>

      {/* 2. Receitas */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/10 rounded-full blur-2xl group-hover:bg-teal-500/15 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Entradas (Mês)</span>
          <div className="w-9 h-9 rounded-xl bg-teal-500/15 text-teal-400 flex items-center justify-center border border-teal-500/20">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(stats.totalIncome)}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-teal-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Salários e receitas</span>
          </div>
        </div>
      </div>

      {/* 3. Despesas */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/15 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Saídas (Mês)</span>
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center border border-rose-500/20">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(stats.totalExpenses)}
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Gastos registrados</span>
          </div>
        </div>
      </div>

      {/* 4. Taxa de Economia */}
      <div className="glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/15 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Taxa de Poupança</span>
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <PiggyBank className="w-4 h-4" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {stats.savingsRate.toFixed(1)}%
            </h3>
            <span className="text-xs text-slate-400">da renda poupada</span>
          </div>
          {/* Progress bar */}
          <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(Math.max(stats.savingsRate, 0), 100)}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};
