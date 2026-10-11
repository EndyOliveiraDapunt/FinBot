# 💰 FinBot SaaS - Controle Financeiro Pessoal Inteligente

SaaS de gestão financeira pessoal onde os usuários controlam suas receitas, despesas e faturas conversando pelo **WhatsApp** ou pelo **Dashboard Web**, alimentado por inteligência artificial leve (**Google Gemini** como principal e **OpenRouter** como reserva) e banco de dados **Supabase (PostgreSQL)** com segurança multi-tenant (RLS) e precisão matemática.

---

## 🚀 Principais Funcionalidades

1. **Gestão Conversacional no WhatsApp**:
   - Registro instantâneo de gastos e ganhos ("gastei 45 no almoço", "recebi 1500 de freela").
   - Consulta de saldo e extrato ("qual meu saldo?", "quanto gastei hoje?").
   - Desfazer lançamentos rápidos ("cancela o último").
   - Entendimento de gírias e expressões monetárias brasileiras (*cinquentão*, *cem conto*, *3 mil*, *um barão*).

2. **Vínculo Seguro de WhatsApp (Zero-SMS)**:
   - O usuário cria a conta no painel web.
   - Gera um código efêmero de 6 dígitos em *Configurações > Vincular WhatsApp*.
   - Envia `vincular 123456` para o número do bot. A posse do número é comprovada diretamente pela mensagem.

3. **Importação de Extratos e Faturas em PDF**:
   - Leitura de extratos bancários e faturas de cartão (Nubank, Inter, Itaú, Bradesco, etc.).
   - Reconhecimento automático de data, descrição, valor e tipo (despesa vs receita).
   - Confirmação em lote no dashboard.

4. **Planos SaaS com Controle de Quotas**:
   - **Básico**: 50 mensagens/mês (grátis).
   - **Pro**: 500 mensagens/mês.
   - **Plus**: 2.000 mensagens/mês.

5. **Alta Resiliência da IA**:
   - Tenta o **Gemini** primeiro.
   - Em caso de indisponibilidade ou rate limit, faz fallback automático para o **OpenRouter** gratuito.
   - Se ambos estiverem fora, utiliza parser heurístico local.

---

## 📁 Estrutura do Projeto

```text
├── src/
│   ├── ai/                      # Motor de IA (Gemini, OpenRouter, ferramentas e loop de agente)
│   ├── config/                  # Validação de variáveis de ambiente com Zod e cliente Supabase
│   ├── lib/                     # Utilitários de dinheiro BRL, fuso horário e leitor de PDF
│   ├── routes/                  # Rotas Fastify (webhook Evolution, chat, pareamento e importação)
│   ├── services/                # Serviços de transações, usuários e WhatsApp
│   └── index.ts                 # Servidor Fastify principal
├── web/                         # Dashboard Web em React + Vite + Tailwind CSS
├── supabase/
│   └── migrations/
│       └── 20261011_reset_schema.sql  # Schema moderno, planos, RLS e triggers de saldo
├── docker-compose.yml           # Orquestração completa: Evolution API v2, Postgres, Redis e FinBot
└── README.md
```

---

## 🛠️ Como Executar

### 1. Pré-requisitos
- Node.js 20+ instalado
- Conta no [Supabase](https://supabase.com)
- Chave de API do [Google AI Studio](https://aistudio.google.com/) ou [OpenRouter](https://openrouter.ai/)

### 2. Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e preencha as chaves:
```bash
cp .env.example .env
```

### 3. Aplicar a Migração do Banco
No painel do Supabase, acesse **SQL Editor** e execute o conteúdo de:
`supabase/migrations/20261011_reset_schema.sql`

### 4. Instalar Dependências e Executar

**Backend (API & Webhook):**
```bash
npm install
npm test          # Executa a suite de testes unitários
npm run dev       # Inicia o servidor Fastify em http://localhost:3000
```

**Frontend (Dashboard Web):**
```bash
cd web
npm install
npm run dev       # Inicia a interface Vite em http://localhost:5173
```

**Com Docker Compose (inclui Evolution API):**
```bash
docker compose up -d
```
Abra a Evolution API em `http://localhost:8080`, crie a instância `finbot` e escaneie o QR Code com seu WhatsApp!

---

## 🧪 Testes Automatizados

Para rodar os testes unitários do backend:
```bash
npm test
```
Para testar a conectividade com as tabelas do Supabase:
```bash
npm run test:db
```
Para simular conversas no terminal:
```bash
npm run test:ai
```
