import React from 'react';
import { 
  Wallet, 
  MessageSquare, 
  Plus, 
  Sparkles,
  RefreshCw,
  Sun,
  Moon
} from 'lucide-react';
import { UserMenu } from './UserMenu';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onOpenWhatsApp: () => void;
  onOpenNewTransaction: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWhatsApp,
  onOpenNewTransaction,
  onOpenSettings,
  onOpenAuth,
  onRefresh,
  isRefreshing,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/80 backdrop-blur-xl px-4 sm:px-6 py-3.5 transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-glow-brand ring-1 ring-white/20 shrink-0">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-white dark:text-white light:text-slate-900 font-sans">
                Fin<span className="text-brand-400">Bot</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
                SaaS Pro
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Controle Financeiro Autônomo com IA</p>
          </div>
        </div>

        {/* Center / Status Badge */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated/60 border border-border-subtle text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>WhatsApp Webhook: <strong>Conectado</strong></span>
          <span className="text-slate-600">|</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <Sparkles className="w-3.5 h-3.5" /> Gemini 3.8 Flash
          </span>
        </div>

        {/* Action Controls & User Area */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Quick Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            className="p-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border-subtle text-slate-400 hover:text-white transition-all"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Atualizar dados do Supabase"
            className="p-2 rounded-xl bg-surface hover:bg-surface-elevated border border-border-subtle text-slate-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-400' : ''}`} />
          </button>

          {/* WhatsApp Simulator Live */}
          <button
            onClick={onOpenWhatsApp}
            className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-xs font-semibold transition-all hover:scale-[1.02]"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp Live</span>
          </button>

          {/* New Transaction Button */}
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white text-xs font-semibold shadow-glow-brand transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Lançamento</span>
          </button>

          <div className="h-6 w-px bg-border-subtle mx-0.5"></div>

          {/* User Profile Menu */}
          <UserMenu
            onOpenSettings={onOpenSettings}
            onOpenAuth={onOpenAuth}
          />
        </div>
      </div>
    </header>
  );
};
