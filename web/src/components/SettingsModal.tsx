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
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { profile, updateProfile } = useAuth();
  const { theme, setTheme } = useTheme();

  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'plan'>('profile');
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || '');
  const [currency, setCurrency] = useState(profile?.currency || 'BRL');
  const [timezone, setTimezone] = useState(profile?.timezone || 'America/Sao_Paulo');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(false);

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const res = await updateProfile({
      full_name: fullName.trim(),
      phone_number: cleanPhone || null,
      currency,
      timezone,
    });

    setIsSaving(false);
    if (!res.error) {
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-surface border border-border-subtle rounded-3xl p-6 sm:p-8 shadow-2xl relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-5 border-b border-border-subtle">
          <div>
            <h3 className="text-lg font-bold text-white">Configurações & Perfil</h3>
            <p className="text-xs text-slate-400">Gerencie sua conta, integração do WhatsApp e preferências</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-2 mt-4 pb-4 border-b border-border-subtle">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'profile'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <User className="w-4 h-4" /> Perfil & WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'appearance'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />} Aparência
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'plan'
                ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CreditCard className="w-4 h-4" /> Plano SaaS
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto py-5">
          {/* TAB 1: PERFIL */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Nome Completo</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Telefone do WhatsApp (Vínculo da IA)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Auto-roteamento ativado
                  </span>
                </div>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    placeholder="Ex: 5511999999999 (com DDI e DDD)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Qualquer mensagem de texto ou áudio enviada deste número para o FinBot será registrada nesta conta.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Moeda Padrão</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="BRL">BRL (R$) - Real Brasileiro</option>
                    <option value="USD">USD ($) - Dólar Americano</option>
                    <option value="EUR">EUR (€) - Euro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Fuso Horário</label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                    <option value="America/Manaus">Manaus (GMT-4)</option>
                    <option value="UTC">UTC Universal</option>
                  </select>
                </div>
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  <span>Perfil atualizado com sucesso!</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white font-bold text-xs shadow-glow-brand transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
              </button>
            </form>
          )}

          {/* TAB 2: APARÊNCIA */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white mb-1">Tema da Interface</h4>
                <p className="text-xs text-slate-400 mb-4">Escolha a aparência visual do painel administrativo</p>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Dark Mode Card */}
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      theme === 'dark'
                        ? 'bg-surface-elevated border-brand-500 ring-2 ring-brand-500/20 shadow-glow-brand'
                        : 'bg-surface border-border-subtle hover:border-white/20'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-300 mb-3">
                      <Moon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-sm font-bold text-white">Modo Escuro</h5>
                        <p className="text-[11px] text-slate-400">Padrão Fintech Dark</p>
                      </div>
                      {theme === 'dark' && <Check className="w-4 h-4 text-brand-400" />}
                    </div>
                  </button>

                  {/* Light Mode Card */}
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      theme === 'light'
                        ? 'bg-slate-100 border-brand-500 ring-2 ring-brand-500/20 shadow-sm'
                        : 'bg-surface border-border-subtle hover:border-white/20'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-600 mb-3">
                      <Sun className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-sm font-bold text-white">Modo Claro</h5>
                        <p className="text-[11px] text-slate-400">Contraste diurno limpo</p>
                      </div>
                      {theme === 'light' && <Check className="w-4 h-4 text-brand-400" />}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PLANO SAAS */}
          {activeTab === 'plan' && (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-gradient-to-br from-brand-950/40 via-surface to-surface-elevated border border-brand-500/30 relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-brand-500 text-white">
                      Plano {profile?.plan_tier ? profile.plan_tier.toUpperCase() : 'PRO'}
                    </span>
                    <span className="text-xs text-emerald-400 font-medium">Assinatura Ativa</span>
                  </div>
                  <Sparkles className="w-5 h-5 text-brand-400" />
                </div>

                <h4 className="text-xl font-extrabold text-white mb-2">FinBot Ilimitado</h4>
                <p className="text-xs text-slate-300 mb-4">
                  Seu plano dá acesso total ao agente conversacional Gemini 3.8 Flash no WhatsApp com mensagens de áudio e texto ilimitadas.
                </p>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand-400" />
                    <span>Lançamentos via áudio e texto no WhatsApp sem limites</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand-400" />
                    <span>Sincronização instantânea com PostgreSQL Supabase</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-brand-400" />
                    <span>Consultas de saldo e resumos dinâmicos com IA</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
