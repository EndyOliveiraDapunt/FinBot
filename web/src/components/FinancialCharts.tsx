import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Transaction } from '../types';

interface FinancialChartsProps {
  transactions: Transaction[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Alimentação': '#EF4444',
  'Transporte': '#F59E0B',
  'Moradia': '#3B82F6',
  'Lazer': '#8B5CF6',
  'Saúde': '#EC4899',
  'Educação': '#10B981',
  'Salário': '#059669',
  'Investimentos': '#047857',
  'Outros': '#6B7280',
};

const DEFAULT_COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

export const FinancialCharts: React.FC<FinancialChartsProps> = ({ transactions }) => {
  // 1. Agrupa despesas por categoria
  const expensesByCategory: Record<string, number> = {};
  for (const t of transactions) {
    if (t.type === 'expense') {
      const catName = t.category?.name || 'Outros';
      expensesByCategory[catName] = (expensesByCategory[catName] || 0) + Number(t.amount);
    }
  }

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
    color: CATEGORY_COLORS[name] || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
  }));

  // 2. Timeline de transações (últimos dias)
  const timelineMap: Record<string, { date: string; receitas: number; despesas: number }> = {};

  // Ordena por data crescente
  const sorted = [...transactions].sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));

  for (const t of sorted) {
    const d = t.transaction_date;
    if (!timelineMap[d]) {
      timelineMap[d] = { date: d.slice(5), receitas: 0, despesas: 0 };
    }
    if (t.type === 'income') {
      timelineMap[d].receitas += Number(t.amount);
    } else if (t.type === 'expense') {
      timelineMap[d].despesas += Number(t.amount);
    }
  }

  const timelineData = Object.values(timelineMap);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Gráfico 1: Fluxo de Caixa (Evolução) */}
      <div className="lg:col-span-2 glass-card rounded-2xl p-6 relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-white">Evolução do Fluxo de Caixa</h3>
            <p className="text-xs text-slate-400">Receitas vs Despesas ao longo do tempo</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300">Receitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-slate-300">Despesas</span>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full">
          {timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={11} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                  itemStyle={{ fontSize: '12px' }}
                  formatter={(value: any) => [formatCurrency(Number(value)), '']}
                />
                <Area
                  type="monotone"
                  dataKey="receitas"
                  name="Receitas"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReceitas)"
                />
                <Area
                  type="monotone"
                  dataKey="despesas"
                  name="Despesas"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorDespesas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm">
              Nenhuma transação registrada no período
            </div>
          )}
        </div>
      </div>

      {/* Gráfico 2: Despesas por Categoria */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
        <div>
          <h3 className="text-base font-semibold text-white">Despesas por Categoria</h3>
          <p className="text-xs text-slate-400">Distribuição percentual dos gastos</p>
        </div>

        <div className="h-[220px] w-full my-auto flex items-center justify-center">
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0F172A',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val)), '']}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-slate-500 text-sm">Sem despesas no período</div>
          )}
        </div>

        {/* Mini Legend List */}
        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
          {pieData.map((p) => (
            <div key={p.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }}></span>
                <span className="text-slate-300 truncate max-w-[120px]">{p.name}</span>
              </div>
              <span className="font-semibold text-white">{formatCurrency(p.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
