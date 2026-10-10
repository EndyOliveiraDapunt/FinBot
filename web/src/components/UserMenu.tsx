import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Settings, 
  Sun, 
  Moon, 
  LogOut, 
  LogIn, 
  ChevronDown, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface UserMenuProps {
  onOpenSettings: () => void;
  onOpenAuth: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ onOpenSettings, onOpenAuth }) => {
  const { user, profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'João Silva';
  const displayEmail = user?.email || (profile?.phone_number ? `+${profile.phone_number}` : 'joao@finbot.local');
  
  // Iniciais para o avatar
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'FB';

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface hover:bg-surface-elevated border border-border-subtle hover:border-white/20 transition-all group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-emerald-400 text-white font-bold text-xs flex items-center justify-center shadow-sm ring-1 ring-white/10">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-white group-hover:text-brand-400 transition-colors">
              {displayName}
            </span>
            <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
              {profile?.plan_tier ? profile.plan_tier.toUpperCase() : 'PRO'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{displayEmail}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform hidden sm:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-border-subtle shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* User info box */}
          <div className="p-3 rounded-xl bg-surface-elevated border border-border-subtle mb-1">
            <p className="text-xs font-bold text-white truncate">{displayName}</p>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">{displayEmail}</p>
            <div className="mt-2 flex items-center justify-between text-[10px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Assinante {profile?.plan_tier ? profile.plan_tier.toUpperCase() : 'PRO'}
              </span>
              <span className="text-slate-500">Supabase Auth</span>
            </div>
          </div>

          {/* Quick Theme Toggle */}
          <button
            onClick={() => {
              toggleTheme();
              setIsOpen(false);
            }}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2.5">
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
              <span>Tema: {theme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}</span>
            </div>
            <span className="text-[10px] text-slate-500 uppercase font-mono">Alternar</span>
          </button>

          {/* Settings Trigger */}
          <button
            onClick={() => {
              onOpenSettings();
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Configurações & Perfil</span>
          </button>

          <div className="h-px bg-border-subtle my-1"></div>

          {/* Auth Action */}
          {user ? (
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair da Conta</span>
            </button>
          ) : (
            <button
              onClick={() => {
                onOpenAuth();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-brand-400 hover:bg-brand-500/10 rounded-lg transition-colors"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar / Trocar Conta</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
