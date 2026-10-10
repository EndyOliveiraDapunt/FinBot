import React, { useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Sun, 
  Moon, 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Save, 
  CreditCard,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, profile, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'whatsapp' | 'appearance' | 'plan'>('profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [currency, setCurrency] = useState(profile?.currency || 'BRL');
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/Sao_Paulo');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const res = await updateProfile({
      full_name: fullName.trim(),
      phone_number: cleanPhone || null,
      currency,
      timezone,
    });

    setIsSaving(false);
    if (!res.error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const displayName = fullName || profile?.full_name || 'João Silva';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'FB';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-surface border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 text-white font-extrabold flex items-center justify-center shadow-sm">
              {initials}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Configurações da Conta</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Preferências pessoais, integração e tema</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 flex gap-2 border-b border-border-subtle bg-surface-elevated/20 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4" /> Perfil Geral
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('whatsapp')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'whatsapp'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Phone className="w-4 h-4 text-[#25D366]" /> Conexão WhatsApp
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'appearance'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} Aparência
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'plan'
                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Assinatura
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* TAB 1: PERFIL */}
            {activeTab === 'profile' && (
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full bg-surface-elevated border border-border-subtle focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Email de Acesso
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || 'joao@finbot.local'}
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-border-subtle rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Gerenciado via Supabase Auth</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Moeda
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full bg-surface-elevated border border-border-subtle focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="BRL">BRL (R$) - Real Brasileiro</option>
                      <option value="USD">USD ($) - Dólar Americano</option>
                      <option value="EUR">EUR (€) - Euro</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      Fuso Horário
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full bg-surface-elevated border border-border-subtle focus:border-brand-500 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                      <option value="America/Manaus">Manaus (GMT-4)</option>
                      <option value="UTC">UTC Padrão</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: WHATSAPP */}
            {activeTab === 'whatsapp' && (
              <div className="space-y-5">
                {/* Visual WhatsApp Card */}
                <div className="p-5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Auto-Roteamento Inteligente</h4>
                      <span className="text-[10px] font-bold uppercase bg-[#25D366] text-slate-950 px-2 py-0.5 rounded-full">
                        Ativo
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      Ao cadastrar seu número abaixo, qualquer mensagem ou áudio que você enviar para o bot no WhatsApp será identificada e lançada automaticamente no seu painel.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Seu Número do WhatsApp (com DDI e DDD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
                      🇧🇷 +
                    </span>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="5511999999999"
                      className="w-full bg-surface-elevated border border-border-subtle focus:border-[#25D366] focus:ring-2 focus:ring-[#25D366]/20 rounded-xl pl-16 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    Exemplo: <span className="font-mono font-medium">5511999999999</span> (apenas números, incluindo código 55 do Brasil).
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: APARÊNCIA */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                  Selecione o esquema de cores para o painel de controle:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Card Modo Escuro */}
                  <div
                    onClick={() => setTheme('dark')}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all relative ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-brand-500 ring-2 ring-brand-500/30 shadow-lg'
                        : 'bg-slate-900/40 border-border-subtle hover:border-slate-500 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <Moon className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold text-sm text-white">Modo Escuro</span>
                      </div>
                      {theme === 'dark' && <CheckCircle2 className="w-5 h-5 text-brand-400" />}
                    </div>

                    {/* Mini UI Preview */}
                    <div className="p-3 rounded-xl bg-[#090D16] border border-white/10 space-y-2">
                      <div className="h-2 w-16 bg-brand-500 rounded"></div>
                      <div className="h-2 w-28 bg-white/20 rounded"></div>
                      <div className="flex gap-1.5 pt-1">
                        <div className="h-4 flex-1 bg-white/5 rounded"></div>
                        <div className="h-4 flex-1 bg-white/5 rounded"></div>
                      </div>
                    </div>
                  </div>

                  {/* Card Modo Claro */}
                  <div
                    onClick={() => setTheme('light')}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all relative ${
                      theme === 'light'
                        ? 'bg-white border-brand-500 ring-2 ring-brand-500/30 shadow-lg'
                        : 'bg-white/40 border-border-subtle hover:border-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <Sun className="w-5 h-5 text-amber-500" />
                        <span className="font-bold text-sm text-slate-900">Modo Claro</span>
                      </div>
                      {theme === 'light' && <CheckCircle2 className="w-5 h-5 text-brand-500" />}
                    </div>

                    {/* Mini UI Preview */}
                    <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 space-y-2">
                      <div className="h-2 w-16 bg-brand-600 rounded"></div>
                      <div className="h-2 w-28 bg-slate-400 rounded"></div>
                      <div className="flex gap-1.5 pt-1">
                        <div className="h-4 flex-1 bg-white rounded border border-slate-200"></div>
                        <div className="h-4 flex-1 bg-white rounded border border-slate-200"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PLANO & ASSINATURA */}
            {activeTab === 'plan' && (
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-brand-500/10 via-surface-elevated to-surface border border-brand-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full bg-brand-500 text-white">
                      Plano {profile?.plan_tier ? profile.plan_tier.toUpperCase() : 'PRO'}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-4 h-4" /> Ilimitado
                    </span>
                  </div>

                  <h4 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
                    FinBot SaaS Inteligente
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                    Assinatura com processamento ilimitado de áudios e textos no WhatsApp com Gemini 3.8 Flash e backup no PostgreSQL Supabase.
                  </p>

                  <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300 font-medium">
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-brand-500" />
                      <span>Lançamentos automáticos via áudio do WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-brand-500" />
                      <span>Classificação inteligente de despesas com IA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-brand-500" />
                      <span>Sincronização em tempo real multi-dispositivo</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Feedback and Action */}
            <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
              {saveSuccess ? (
                <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <Check className="w-4 h-4" />
                  <span>Alterações salvas com sucesso!</span>
                </div>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white font-bold text-xs shadow-glow-brand transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
