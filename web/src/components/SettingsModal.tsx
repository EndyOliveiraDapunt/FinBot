import React, { useState } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Sun, 
  Moon, 
  Sparkles, 
  Check, 
  Save, 
  CreditCard,
  MessageSquare,
  CheckCircle2,
  Copy,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { API_URL } from '../services/api';

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

  // Vínculo via código de 6 dígitos
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkExpiresAt, setLinkExpiresAt] = useState<string | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const handleGenerateLinkCode = async () => {
    if (!profile?.id) return;
    setIsGeneratingCode(true);
    try {
      const res = await fetch(`${API_URL}/api/link-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: profile.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setLinkCode(data.code);
        setLinkExpiresAt(data.expiresAt);
      }
    } catch (err) {
      console.error('Erro ao gerar código de vínculo:', err);
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleCopyCode = () => {
    if (!linkCode) return;
    navigator.clipboard.writeText(`vincular ${linkCode}`);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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

  const displayName = fullName || profile?.full_name || 'Usuário';
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0])
    .join('')
    .toUpperCase() || 'FB';

  const planTiers = [
    {
      id: 'basic',
      name: 'Básico',
      queries: '50 mensagens/mês',
      price: 'Grátis',
      features: ['WhatsApp texto e áudio', 'Extratos e faturas em PDF', 'Dashboard completo'],
    },
    {
      id: 'pro',
      name: 'Pro',
      queries: '500 mensagens/mês',
      price: 'R$ 19,90/mês',
      popular: true,
      features: ['Múltiplas contas e cartões', 'IA com alta velocidade', 'Exportação de relatórios'],
    },
    {
      id: 'plus',
      name: 'Plus',
      queries: '2.000 mensagens/mês',
      price: 'R$ 39,90/mês',
      features: ['Suporte prioritário', 'Sem limite prático', 'Ideal para finanças familiares'],
    },
  ];

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
              <p className="text-xs text-slate-500 dark:text-slate-400">Preferências pessoais, integração e planos</p>
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
                ? 'border-[#25D366] text-[#25D366]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" /> Vincular WhatsApp
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
            <Sun className="w-4 h-4" /> Aparência
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
            <CreditCard className="w-4 h-4" /> Planos & Quota
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <form onSubmit={handleSave} className="space-y-6">
            
            {/* TAB 1: PERFIL */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
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
                    value={user?.email || 'usuario@finbot.local'}
                    className="w-full bg-slate-100 dark:bg-slate-800/50 border border-border-subtle rounded-xl px-4 py-3 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">E-mail principal vinculado ao seu acesso</p>
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
                <div className="p-5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">Vínculo Seguro por Código</h4>
                      <span className="text-[10px] font-bold uppercase bg-[#25D366] text-slate-950 px-2 py-0.5 rounded-full">
                        {profile?.phone_number ? 'Conectado' : 'Aguardando'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                      {profile?.phone_number
                        ? `Seu WhatsApp (+${profile.phone_number}) está conectado. Cada gasto enviado por ele será lançado no seu painel.`
                        : 'Para provar a posse do seu número sem gastar com SMS, gere um código temporário abaixo e mande para o bot.'}
                    </p>
                  </div>
                </div>

                {!linkCode ? (
                  <div className="p-6 rounded-2xl bg-surface-elevated border border-border-subtle text-center space-y-3">
                    <h5 className="text-sm font-bold text-slate-900 dark:text-white">Como conectar seu WhatsApp:</h5>
                    <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 text-left max-w-md mx-auto list-decimal list-inside">
                      <li>Clique em <strong>Gerar Código de Vínculo</strong> abaixo</li>
                      <li>Abra a conversa com o número do bot no WhatsApp</li>
                      <li>Envie a mensagem: <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">vincular CÓDIGO</code></li>
                    </ol>
                    <button
                      type="button"
                      onClick={handleGenerateLinkCode}
                      disabled={isGeneratingCode}
                      className="mt-3 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs shadow-md transition-all inline-flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isGeneratingCode ? 'Gerando...' : 'Gerar Código de Vínculo'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-emerald-500/10 border-2 border-dashed border-[#25D366] text-center space-y-4">
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Seu código de pareamento:
                    </p>
                    <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-[#25D366]/40 shadow-sm">
                      <span className="font-mono text-2xl font-extrabold tracking-widest text-slate-900 dark:text-white">
                        {linkCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Copiar comando"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Mande no WhatsApp do bot: <strong className="font-mono text-slate-900 dark:text-white">vincular {linkCode}</strong>
                    </p>
                    <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Válido por 10 minutos</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: APARÊNCIA */}
            {activeTab === 'appearance' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setTheme('dark')}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all relative ${
                      theme === 'dark'
                        ? 'bg-slate-900 border-brand-500 ring-2 ring-brand-500/30 shadow-lg'
                        : 'bg-slate-900/40 border-border-subtle hover:border-slate-500 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <Moon className="w-5 h-5 text-indigo-400" />
                        <span className="font-bold text-sm text-white">Modo Escuro</span>
                      </div>
                      {theme === 'dark' && <CheckCircle2 className="w-5 h-5 text-brand-400" />}
                    </div>
                  </div>

                  <div
                    onClick={() => setTheme('light')}
                    className={`cursor-pointer p-5 rounded-2xl border transition-all relative ${
                      theme === 'light'
                        ? 'bg-white border-brand-500 ring-2 ring-brand-500/30 shadow-lg'
                        : 'bg-white/40 border-border-subtle hover:border-slate-400 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <Sun className="w-5 h-5 text-amber-500" />
                        <span className="font-bold text-sm text-slate-900">Modo Claro</span>
                      </div>
                      {theme === 'light' && <CheckCircle2 className="w-5 h-5 text-brand-500" />}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PLANOS & QUOTA */}
            {activeTab === 'plan' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {planTiers.map((tier) => {
                    const isCurrent = (profile?.plan_tier || 'basic') === tier.id;
                    return (
                      <div
                        key={tier.id}
                        className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                          isCurrent
                            ? 'bg-brand-500/10 border-brand-500 ring-2 ring-brand-500/20'
                            : 'bg-surface-elevated border-border-subtle'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-extrabold text-sm text-slate-900 dark:text-white">{tier.name}</span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-500 text-white uppercase">
                                Atual
                              </span>
                            )}
                          </div>
                          <div className="text-base font-extrabold text-brand-600 dark:text-brand-400 mb-1">
                            {tier.price}
                          </div>
                          <p className="text-[11px] font-medium text-slate-500 mb-3">{tier.queries}</p>
                          <ul className="text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                            {tier.features.map((f, i) => (
                              <li key={i} className="flex items-center gap-1.5">
                                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span>{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
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
