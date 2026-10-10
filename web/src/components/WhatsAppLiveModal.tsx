import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  CheckCheck
} from 'lucide-react';
import { supabase } from '../services/supabase';

interface WhatsAppLiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onTransactionUpdated: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

export const WhatsAppLiveModal: React.FC<WhatsAppLiveModalProps> = ({
  isOpen,
  onClose,
  userId,
  onTransactionUpdated,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Carrega histórico inicial do Supabase
  useEffect(() => {
    if (isOpen && userId) {
      loadHistory();
    }
  }, [isOpen, userId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (data && data.length > 0) {
      setMessages(
        data.map((m) => ({
          id: m.id,
          role: m.role as 'user' | 'assistant',
          content: m.content,
          time: new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        }))
      );
    } else {
      // Mensagem de boas-vindas padrão se histórico estiver vazio
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Olá! Sou o FinBot, seu assistente de controle financeiro no WhatsApp. 💳\n\nVocê pode me mandar gastos como:\n- *"Gastei 45 no almoço"*\n- *"Recebi 1200 de freela"*\n- *"Qual meu saldo?"*',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const msg = (textToSend || inputText).trim();
    if (!msg || isLoading) return;

    setInputText('');
    const userMsgTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // Adiciona na UI imediatamente
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: msg, time: userMsgTime },
    ]);
    setIsLoading(true);

    try {
      // 1. Salva mensagem do usuário no banco
      await supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'user',
        content: msg,
      });

      // 2. Processa com lógica conversacional e banco
      const lower = msg.toLowerCase();
      let reply = '';

      // Cancelar
      if (lower.includes('cancela') || lower.includes('desfazer') || lower.includes('apaga')) {
        const { data: lastTx } = await supabase
          .from('transactions')
          .select('id, amount, description, type')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastTx) {
          await supabase.from('transactions').delete().eq('id', lastTx.id);
          reply = `🗑️ *Transação cancelada!*\nDesfeita a ${lastTx.type === 'expense' ? 'despesa' : 'receita'} de *R$ ${Number(lastTx.amount).toFixed(2)}* (*${lastTx.description}*).`;
        } else {
          reply = '❌ Nenhuma transação recente encontrada para cancelar.';
        }
      }
      // Consultar saldo
      else if (lower.includes('saldo') || lower.includes('quanto gastei')) {
        const { data: accounts } = await supabase.from('accounts').select('current_balance').eq('user_id', userId);
        const total = (accounts || []).reduce((acc, c) => acc + Number(c.current_balance), 0);
        reply = `📊 *Seu Saldo Atual:* R$ ${total.toFixed(2)}\nContas sincronizadas e atualizadas!`;
      }
      // Extrair gasto / receita
      else {
        let amount = 0;
        if (lower.includes('cinquentão') || lower.includes('cinquentao')) amount = 50;
        else if (lower.includes('cem conto') || lower.includes('cem pila')) amount = 100;
        else {
          const match = lower.match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)/);
          if (match) amount = parseFloat(match[1].replace(',', '.'));
        }

        if (amount > 0) {
          const isIncome = lower.includes('recebi') || lower.includes('ganhei') || lower.includes('salário') || lower.includes('salario');
          const type = isIncome ? 'income' : 'expense';

          let desc = 'Lançamento via WhatsApp';
          let catName = 'Outros';

          if (lower.includes('almoço') || lower.includes('almoco')) { desc = 'Almoço'; catName = 'Alimentação'; }
          else if (lower.includes('uber') || lower.includes('gasolina')) { desc = 'Transporte Uber'; catName = 'Transporte'; }
          else if (lower.includes('luz') || lower.includes('energia')) { desc = 'Conta de Luz'; catName = 'Moradia'; }
          else if (lower.includes('internet')) { desc = 'Conta de Internet'; catName = 'Moradia'; }
          else if (lower.includes('pizza') || lower.includes('lanche')) { desc = 'Pizza / Lanche'; catName = 'Alimentação'; }
          else if (isIncome) { desc = 'Receita Extra'; catName = 'Salário'; }

          // Busca conta padrão
          const { data: accs } = await supabase.from('accounts').select('id, name, current_balance').eq('user_id', userId).limit(1);
          const { data: cats } = await supabase.from('categories').select('id, name').eq('user_id', userId).ilike('name', `%${catName}%`).limit(1);

          const accountId = accs?.[0]?.id || null;
          const categoryId = cats?.[0]?.id || null;

          await supabase.from('transactions').insert({
            user_id: userId,
            account_id: accountId,
            category_id: categoryId,
            amount,
            type,
            description: desc,
            source: 'whatsapp',
            status: 'completed',
            transaction_date: new Date().toISOString().split('T')[0],
          });

          // Pega saldo novo
          const { data: updatedAcc } = await supabase.from('accounts').select('current_balance').eq('id', accountId).single();
          const newBal = updatedAcc ? Number(updatedAcc.current_balance).toFixed(2) : '0.00';

          reply = `${isIncome ? '🎉 *Receita Registrada!*' : '💸 *Despesa Anotada!*'}\n\n*Valor:* R$ ${amount.toFixed(2)}\n*Descrição:* ${desc}\n*Categoria:* 🏷️ ${catName}\n*Saldo Atual:* R$ ${newBal}`;
        } else {
          reply = 'Entendido! Me informe o valor do gasto ou ganho, por exemplo: *"Gastei 32 na padaria"*.';
        }
      }

      // Salva resposta do assistente
      await supabase.from('chat_messages').insert({
        user_id: userId,
        role: 'assistant',
        content: reply,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // Atualiza o dashboard em segundo plano
      onTransactionUpdated();
    } catch (err: any) {
      console.error('Erro no chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg h-[640px] bg-[#0c1317] border border-border-subtle rounded-3xl shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* WhatsApp Header */}
        <div className="bg-[#1f2c34] px-4 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#25D366] to-emerald-400 flex items-center justify-center text-white font-bold ring-2 ring-[#25D366]/40 shadow-sm">
              <Bot className="w-5 h-5 text-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-white text-sm">FinBot Assistente</h3>
                <Sparkles className="w-3.5 h-3.5 text-[#25D366]" />
              </div>
              <p className="text-[11px] text-[#25D366] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366] animate-pulse"></span>
                online • IA Conectada
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages Body with WhatsApp pattern background */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0b141a] bg-opacity-95">
          {/* Info pill */}
          <div className="text-center my-2">
            <span className="px-3 py-1 rounded-lg bg-[#182229] border border-white/5 text-[11px] text-slate-400 font-medium">
              🔒 As mensagens são criptografadas e sincronizadas com seu banco Supabase.
            </span>
          </div>

          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm shadow-md relative ${
                    isUser
                      ? 'bg-[#005c4b] text-white rounded-tr-none'
                      : 'bg-[#202c33] text-slate-200 rounded-tl-none border border-white/5'
                  }`}
                >
                  <p className="whitespace-pre-line leading-relaxed font-sans">{m.content}</p>
                  <div className="flex items-center justify-end gap-1 text-[10px] text-slate-400 mt-1">
                    <span>{m.time}</span>
                    {isUser && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#202c33] text-slate-300 rounded-2xl rounded-tl-none px-4 py-2.5 text-xs flex items-center gap-2 border border-white/5">
                <span className="w-2 h-2 rounded-full bg-[#25D366] animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-[#25D366] animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-2 h-2 rounded-full bg-[#25D366] animate-bounce [animation-delay:0.4s]"></span>
                <span className="text-slate-400 ml-1">FinBot está digitando...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-[#1f2c34]/70 border-t border-white/5 flex gap-2 overflow-x-auto text-[11px] no-scrollbar">
          <button
            onClick={() => handleSendMessage('Gastei 55 no almoço')}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 whitespace-nowrap transition-all"
          >
            🍔 Almoço R$ 55
          </button>
          <button
            onClick={() => handleSendMessage('Recebi 850 de freela')}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap transition-all"
          >
            💰 Freela R$ 850
          </button>
          <button
            onClick={() => handleSendMessage('Qual meu saldo atual?')}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 whitespace-nowrap transition-all"
          >
            📊 Saldo Atual
          </button>
          <button
            onClick={() => handleSendMessage('Cancela o último lançamento')}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-rose-400 border border-rose-500/20 whitespace-nowrap transition-all"
          >
            ↩️ Cancelar Último
          </button>
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="bg-[#202c33] p-3 flex items-center gap-2 border-t border-white/5"
        >
          <input
            type="text"
            placeholder="Mensagem (ex: gastei 45 no almoço)..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="flex-1 bg-[#2a3942] text-white placeholder-slate-400 text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[#25D366] focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="w-10 h-10 rounded-xl bg-[#00a884] hover:bg-[#06cf9c] text-white flex items-center justify-center transition-all disabled:opacity-40 disabled:hover:bg-[#00a884]"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
