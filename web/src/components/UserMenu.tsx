import React, { useState, useRef, useEffect } from 'react';
import { 
  Settings, 
  Sun, 
  Moon, 
  LogOut, 
  LogIn, 
  ChevronDown, 
  Sparkles,
  Phone
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
  const displayPhone = profile?.phone_number ? `+${profile.phone_number}` : 'WhatsApp não vinculado';
  
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
        className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-elevated hover:bg-slate-200 dark:hover:bg-slate-800 border border-border-subtle transition-all group"
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-emerald-400 text-white font-bold text-xs flex items-center justify-center shadow-sm ring-1 ring-black/5 dark:ring-white/10 shrink-0">
          {initials}
        </div>
        <div className="hidden sm:block text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-800 dark:text-white group-hover:text-brand-500 transition-colors">
              {displayName}
            </span>
            <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20">
              {profile?.plan_tier ? profile.plan_tier.toUpperCase() : 'PRO'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">{displayPhone}</p>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-white transition-transform hidden sm:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-72 rounded-2xl bg-surface border border-border-subtle shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Card */}
          <div className="p-3.5 rounded-xl bg-surface-elevated border border-border-subtle mb-1.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{displayName}</span>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> {profile?.plan_tier ? profile.plan_tier.toUpperCase() : 'PRO'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Phone className="w-3 h-3 text-[#25D366]" />
              <span className="truncate">{displayPhone}</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-0.5">
            <button
              onClick={() => {
                toggleTheme();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
                <span>Aparência</span>
              </div>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 capitalize">{theme === 'dark' ? 'Escuro 🌙' : 'Claro ☀️'}</span>
            </button>

            <button
              onClick={() => {
                onOpenSettings();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Configurações & Perfil</span>
            </button>
          </div>

          <div className="h-px bg-border-subtle my-1.5"></div>

          {/* Auth Action */}
          {user ? (
            <button
              onClick={() => {
                signOut();
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
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
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-500/10 rounded-lg transition-colors"
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
