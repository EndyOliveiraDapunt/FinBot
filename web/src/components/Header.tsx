import React from 'react';
import { 
  Wallet, 
  MessageSquare, 
  Plus, 
  RefreshCw,
  Sun,
  Moon,
  FileText,
  Shield
} from 'lucide-react';
import { UserMenu } from './UserMenu';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  onOpenWhatsApp: () => void;
  onOpenNewTransaction: () => void;
  onOpenImportPdf: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenAdmin: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWhatsApp,
  onOpenNewTransaction,
  onOpenImportPdf,
  onOpenSettings,
  onOpenAuth,
  onOpenAdmin,
  onRefresh,
  isRefreshing,
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/90 backdrop-blur-xl px-4 sm:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center shadow-glow-brand ring-1 ring-black/5 dark:ring-white/20 shrink-0">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-sans">
              Fin<span className="text-brand-500">Bot</span>
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">Controle Financeiro Pessoal</p>
          </div>
        </div>

        {/* Action Controls & User Area */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
            className="p-2.5 rounded-xl bg-surface-elevated hover:bg-slate-200 dark:hover:bg-slate-800 border border-border-subtle text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Atualizar dados"
            className="p-2.5 rounded-xl bg-surface-elevated hover:bg-slate-200 dark:hover:bg-slate-800 border border-border-subtle text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-brand-500' : ''}`} />
          </button>

          {/* Importar PDF */}
          <button
            onClick={onOpenImportPdf}
            className="hidden md:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface-elevated hover:bg-slate-200 dark:hover:bg-slate-800 border border-border-subtle text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all hover:scale-[1.02] shadow-sm"
          >
            <FileText className="w-4 h-4 text-brand-500" />
            <span>Importar Extrato PDF</span>
          </button>

          {/* Assistente WhatsApp */}
          <button
            onClick={onOpenWhatsApp}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#128C7E] dark:text-[#25D366] text-xs font-semibold transition-all hover:scale-[1.02] shadow-sm"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Assistente WhatsApp</span>
          </button>

          {/* New Transaction Button */}
          <button
            onClick={onOpenNewTransaction}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white text-xs font-semibold shadow-glow-brand transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Lançamento</span>
          </button>

          <div className="h-6 w-px bg-border-subtle mx-1"></div>

          {/* User Profile Menu */}
          <UserMenu
            onOpenSettings={onOpenSettings}
            onOpenAuth={onOpenAuth}
            onOpenAdmin={onOpenAdmin}
          />
        </div>
      </div>
    </header>
  );
};
