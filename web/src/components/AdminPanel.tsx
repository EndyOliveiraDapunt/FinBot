import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  CreditCard, 
  Clock, 
  Activity, 
  Server, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ChevronDown,
  Cpu,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_URL } from '../services/api';

interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  emailConfirmed: boolean;
  phoneNumber: string | null;
  planTier: 'basic' | 'pro' | 'plus';
  isPaying: boolean;
  monthlyQueriesUsed: number;
  monthlyLimit: number;
  queriesResetAt: string;
  createdAt: string;
  transactionCount: number;
}

interface TelemetryData {
  server: {
    status: string;
    uptimeSeconds: number;
    nodeVersion: string;
    environment: string;
  };
  aiEngine: {
    primaryProvider: string;
    primaryModel: string;
    fallbackProvider: string;
    fallbackModel: string;
    geminiConfigured: boolean;
    openRouterConfigured: boolean;
  };
  whatsappGateway: {
    type: string;
    url: string;
    instance: string;
  };
  database: {
    provider: string;
    url: string;
  };
}

interface AdminPanelProps {
  onBackToDashboard: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToDashboard }) => {
  const { session, isAdmin } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'telemetry'>('users');

  const authHeaders = {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };

  const fetchData = async () => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const [usersRes, telemRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/users`, { headers: authHeaders }),
        fetch(`${API_URL}/api/admin/telemetry`, { headers: authHeaders }),
      ]);

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }

      if (telemRes.ok) {
        const tData = await telemRes.json();
        setTelemetry(tData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados administrativos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchData();
    }
  }, [isAdmin]);

  const handleUpdatePlan = async (userId: string, newPlan: 'basic' | 'pro' | 'plus') => {
    setUpdatingUserId(userId);
    try {
      const res = await fetch(`${API_URL}/api/admin/update-plan`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId, planTier: newPlan }),
      });

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, planTier: newPlan, isPaying: newPlan !== 'basic' } : u))
        );
      }
    } catch (err) {
      console.error('Erro ao alterar plano:', err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleConfirmEmail = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/admin/confirm-user-email`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        await fetchData();
      }
    } catch (err) {
      console.error('Erro ao confirmar e-mail:', err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Acesso Exclusivo para Administrador</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Você não possui permissão para acessar esta área restrita da plataforma.
          </p>
          <button
            onClick={onBackToDashboard}
            className="px-5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Voltar ao Painel Principal
          </button>
        </div>
      </div>
    );
  }

  const payingCount = users.filter((u) => u.isPaying).length;
  const freeCount = users.length - payingCount;
  const totalTx = users.reduce((acc, u) => acc + u.transactionCount, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090D16] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      
      {/* Header Administrativo */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#111726] px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Voltar ao Painel"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                AD
              </div>
              <div>
                <h1 className="text-sm font-bold text-slate-900 dark:text-white">Painel Administrativo</h1>
                <p className="text-[11px] text-slate-500">Gestão de Usuários, Planos e Telemetria</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'users' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Usuários ({users.length})
              </button>
              <button
                onClick={() => setActiveTab('telemetry')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  activeTab === 'telemetry' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Telemetria & IA
              </button>
            </div>

            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              title="Atualizar dados"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* KPIs Administrativos */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Total de Usuários</span>
              <Users className="w-4 h-4 text-brand-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Assinantes Pagantes</span>
              <CreditCard className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{payingCount}</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Plano Gratuito</span>
              <Clock className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{freeCount}</div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-xs font-semibold">Transações Totais</span>
              <Activity className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{totalTx}</div>
          </div>
        </div>

        {/* TAB 1: TABELA DE USUÁRIOS */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Usuários Cadastrados</h3>
                <p className="text-xs text-slate-500">Gestão de planos, quotas e status de pagamento</p>
              </div>
            </div>

            {users.length === 0 ? (
              <div className="p-12 text-center text-xs text-slate-500">
                Nenhum usuário cadastrado no momento.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-900/40 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Usuário</th>
                      <th className="py-3 px-4 font-semibold">WhatsApp</th>
                      <th className="py-3 px-4 font-semibold">Plano & Status</th>
                      <th className="py-3 px-4 font-semibold">Uso Mensal</th>
                      <th className="py-3 px-4 font-semibold">Próximo Reset</th>
                      <th className="py-3 px-4 font-semibold">Cadastro</th>
                      <th className="py-3 px-4 font-semibold">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {users.map((u) => {
                      const pct = Math.min(100, Math.round((u.monthlyQueriesUsed / u.monthlyLimit) * 100));
                      const resetDate = new Date(u.queriesResetAt).toLocaleDateString('pt-BR');
                      const createdDate = new Date(u.createdAt).toLocaleDateString('pt-BR');

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white">{u.fullName}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[11px] text-slate-400">{u.email}</span>
                              {u.emailConfirmed ? (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> Confirmado
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmEmail(u.id)}
                                  className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                  title="Confirmar e-mail deste usuário agora"
                                >
                                  <AlertCircle className="w-2.5 h-2.5" /> Confirmar Agora
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-[11px]">
                            {u.phoneNumber ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                +{u.phoneNumber}
                              </span>
                            ) : (
                              <span className="text-slate-400">Não vinculado</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                u.planTier === 'plus'
                                  ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                  : u.planTier === 'pro'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}>
                                {u.planTier}
                              </span>
                              <span className={`text-[10px] font-semibold ${u.isPaying ? 'text-emerald-500' : 'text-slate-400'}`}>
                                ({u.isPaying ? 'Pagante' : 'Grátis'})
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="space-y-1 w-28">
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span>{u.monthlyQueriesUsed}/{u.monthlyLimit}</span>
                                <span>{pct}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct > 80 ? 'bg-red-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${pct}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">{resetDate}</td>
                          <td className="py-3.5 px-4 text-slate-500 text-[11px]">{createdDate}</td>

                          <td className="py-3.5 px-4">
                            <select
                              value={u.planTier}
                              disabled={updatingUserId === u.id}
                              onChange={(e) => handleUpdatePlan(u.id, e.target.value as any)}
                              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
                            >
                              <option value="basic">Mudar: Básico</option>
                              <option value="pro">Mudar: Pro</option>
                              <option value="plus">Mudar: Plus</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: TELEMETRIA & IA (O único local com detalhes técnicos) */}
        {activeTab === 'telemetry' && telemetry && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card Modelos de IA */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <Cpu className="w-5 h-5" />
                <span>Motor de Inteligência Artificial</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Provedor Principal</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{telemetry.aiEngine.primaryProvider}</div>
                  <div className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                    Modelo: {telemetry.aiEngine.primaryModel}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Provedor Reserva (Fallback)</span>
                  <div className="font-bold text-slate-900 dark:text-white mt-0.5">{telemetry.aiEngine.fallbackProvider}</div>
                  <div className="font-mono text-[11px] text-slate-500 mt-0.5">
                    Modelo: {telemetry.aiEngine.fallbackModel}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Servidor e Gateway */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-sm">
                <Server className="w-5 h-5" />
                <span>Infraestrutura e Gateway</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Status do Servidor:</span>
                  <span className="font-bold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Online ({telemetry.server.uptimeSeconds}s)
                  </span>
                </div>

                <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">WhatsApp Gateway:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {telemetry.whatsappGateway.type}
                  </span>
                </div>

                <div className="flex justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-slate-500">Banco de Dados:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {telemetry.database.provider}
                  </span>
                </div>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};
