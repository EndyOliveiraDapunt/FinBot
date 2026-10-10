import React from 'react';
import { CreditCard, Wallet, Landmark } from 'lucide-react';
import { Account } from '../types';

interface AccountsListProps {
  accounts: Account[];
}

export const AccountsList: React.FC<AccountsListProps> = ({ accounts }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Minhas Contas & Carteiras</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Origens de pagamento sincronizadas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {accounts.map((acc) => {
          const isPositive = Number(acc.current_balance) >= 0;
          return (
            <div
              key={acc.id}
              className="p-5 rounded-2xl bg-surface-elevated border border-border-subtle hover:border-border-focus transition-all group relative overflow-hidden shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {acc.type === 'checking' ? 'Conta Corrente' : acc.type === 'credit_card' ? 'Cartão de Crédito' : 'Carteira'}
                </span>
                <div className="w-8 h-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-700 dark:text-slate-300">
                  {acc.type === 'checking' ? (
                    <Landmark className="w-4 h-4" />
                  ) : acc.type === 'credit_card' ? (
                    <CreditCard className="w-4 h-4" />
                  ) : (
                    <Wallet className="w-4 h-4" />
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-white mb-1 group-hover:text-brand-500 transition-colors">
                  {acc.name}
                </h4>
                <div className="flex items-baseline justify-between mt-2">
                  <span className={`text-2xl font-extrabold tracking-tight ${isPositive ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                    {formatCurrency(Number(acc.current_balance))}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                    Ativa
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
