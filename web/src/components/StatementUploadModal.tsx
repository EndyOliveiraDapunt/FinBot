import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { Account } from '../types';
import { API_URL } from '../services/api';

interface StatementUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  accounts: Account[];
  onSuccess: () => void;
}

export const StatementUploadModal: React.FC<StatementUploadModalProps> = ({
  isOpen,
  onClose,
  userId,
  accounts,
  onSuccess,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    stats: { totalItems: number; totalExpenses: number; totalIncome: number };
    items: Array<{ date: string; description: string; amount: number; type: 'expense' | 'income' }>;
  } | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type !== 'application/pdf') {
        setErrorMsg('Por favor, selecione um arquivo em formato PDF.');
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
      setPreviewData(null);
    }
  };

  const handleParsePreview = async () => {
    if (!selectedFile || !userId) return;
    setIsLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userId', userId);
    formData.append('accountId', selectedAccountId);
    formData.append('confirm', 'false');

    try {
      const res = await fetch(`${API_URL}/api/imports/pdf`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar extrato');
      }

      if (data.items.length === 0) {
        setErrorMsg('Nenhuma transação financeira reconhecida neste PDF.');
      } else {
        setPreviewData({
          stats: data.stats,
          items: data.items,
        });
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao ler arquivo PDF.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!selectedFile || !userId || !selectedAccountId) return;
    setIsLoading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('userId', userId);
    formData.append('accountId', selectedAccountId);
    formData.append('confirm', 'true');

    try {
      const res = await fetch(`${API_URL}/api/imports/pdf`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao importar transações');
      }

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao confirmar importação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-surface border border-border-subtle rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-border-subtle flex items-center justify-between bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Importar Extrato em PDF</h3>
              <p className="text-xs text-slate-500">Nubank, Inter, Itaú, Bradesco e faturas de cartão</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {isSuccess ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce" />
              <h4 className="font-bold text-lg text-slate-900 dark:text-white">Transações Importadas com Sucesso!</h4>
              <p className="text-xs text-slate-500">Seu saldo e extrato foram atualizados no painel.</p>
            </div>
          ) : (
            <>
              {/* Seleção de Conta */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Destino dos lançamentos
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full bg-surface-elevated border border-border-subtle rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.type}) - Saldo: R$ {Number(acc.current_balance).toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Upload Dropzone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Arquivo PDF
                </label>
                <div className="border-2 border-dashed border-border-subtle rounded-2xl p-6 text-center hover:border-brand-500 transition-colors bg-surface-elevated/40">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="pdf-upload-input"
                  />
                  <label htmlFor="pdf-upload-input" className="cursor-pointer space-y-2 block">
                    <Upload className="w-8 h-8 text-brand-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {selectedFile ? selectedFile.name : 'Clique para selecionar o PDF do extrato'}
                    </p>
                    <p className="text-[11px] text-slate-400">PDF de até 10MB</p>
                  </label>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Preview dos itens extraídos */}
              {previewData && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                    <span>{previewData.stats.totalItems} transações identificadas</span>
                    <span className="text-red-500">Gastos: R$ {previewData.stats.totalExpenses.toFixed(2)}</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border-subtle rounded-xl p-2 bg-surface-elevated/20 text-xs">
                    {previewData.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-surface hover:bg-surface-elevated transition-colors">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white truncate max-w-[240px]">{it.description}</p>
                          <p className="text-[10px] text-slate-400">{it.date}</p>
                        </div>
                        <span className={`font-mono font-bold ${it.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}>
                          {it.type === 'expense' ? '-' : '+'} R$ {it.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isSuccess && (
          <div className="px-6 py-4 border-t border-border-subtle flex items-center justify-end gap-3 bg-surface-elevated/20">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Cancelar
            </button>

            {!previewData ? (
              <button
                onClick={handleParsePreview}
                disabled={!selectedFile || isLoading}
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Ler Extrato</span>
              </button>
            ) : (
              <button
                onClick={handleConfirmImport}
                disabled={isLoading}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md"
              >
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Importação</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
