import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  Sparkles, 
  CheckCheck
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { API_URL } from '../services/api';

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
      const res = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, message: msg }),
      });

      let reply = '';
      if (res.ok) {
        const data = await res.json();
        reply = data.reply;
      } else {
        const errData = await res.json().catch(() => ({}));
        reply = `⚠️ ${errData.error || 'Não foi possível se comunicar com o motor do FinBot.'}`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: reply,
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      onTransactionUpdated();
    } catch (err: any) {
      console.error('Erro no chat:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ Servidor FinBot indisponível. Certifique-se de que o backend está rodando.',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md h-[680px] max-h-[90vh] bg-surface border border-border-subtle rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header do WhatsApp */}
        <div className="bg-[#075E54] dark:bg-[#0B141A] text-white px-4 py-3.5 flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-[#075E54] rounded-full"></span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-semibold text-sm leading-tight">FinBot WhatsApp</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                  <Sparkles className="w-2.5 h-2.5" /> Assistente
                </span>
              </div>
              <p className="text-[11px] text-emerald-100/70">Online • Pronto para conversar</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fundo de Conversa */}
        <div className="flex-1 bg-[#ECE5DD] dark:bg-[#0B141A] p-4 overflow-y-auto space-y-3 font-sans text-xs">
          {/* Alerta de privacidade */}
          <div className="text-center my-2">
            <span className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-600 dark:text-slate-400 text-[10px] px-3 py-1 rounded-full shadow-sm">
              🔒 Suas mensagens e lançamentos são sincronizados com seu controle em tempo real.
            </span>
          </div>

          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div
                key={m.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm text-[13px] leading-relaxed relative ${
                    isUser
                      ? 'bg-[#E7FFDB] dark:bg-[#005C4B] text-slate-800 dark:text-white rounded-tr-none'
                      : 'bg-white dark:bg-[#202C33] text-slate-800 dark:text-slate-100 rounded-tl-none border border-black/5 dark:border-white/5'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                    <span>{m.time}</span>
                    {isUser && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-[#202C33] rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm border border-black/5 dark:border-white/5 flex items-center gap-2 text-slate-500 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>FinBot digitando...</span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Sugestões Rápidas */}
        <div className="bg-slate-100 dark:bg-[#111B21] px-3 py-2 border-t border-border-subtle flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {[
            'Gastei 45 no almoço',
            'Paguei 120 de luz',
            'Recebi 1500 de freela',
            'Quanto gastei hoje?',
            'Qual meu saldo?',
            'Cancela o último',
          ].map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 rounded-full bg-white dark:bg-surface text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:border-emerald-500 border border-border-subtle shrink-0 transition-colors shadow-2xs"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Barra de Envio */}
        <div className="p-3 bg-white dark:bg-[#202C33] border-t border-border-subtle flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Mensagem para o FinBot..."
            className="flex-1 bg-slate-100 dark:bg-[#2A3942] text-slate-800 dark:text-white text-xs px-4 py-2.5 rounded-full outline-hidden border border-transparent focus:border-emerald-500 transition-colors"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
            className="w-9 h-9 rounded-full bg-[#00A884] hover:bg-[#008f6f] disabled:opacity-50 text-white flex items-center justify-center transition-all shadow-sm shrink-0"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
