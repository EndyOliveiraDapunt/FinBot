# 💰 FinBot SaaS - Gestão Financeira Conversacional

Sistema SaaS de controle financeiro pessoal com foco em **fricção zero**: os usuários registram suas receitas e despesas conversando diretamente pelo **WhatsApp** (texto ou áudio), onde uma **IA (Gemini Flash)** interpreta e categoriza os gastos em tempo real, alimentando um banco de dados **Supabase (PostgreSQL)** com precisão matemática e segurança multi-tenant (RLS).

---

## 📁 Estrutura do Repositório

```text
├── docs/
│   ├── SDR.md                 # System Design Review (Arquitetura, Fluxos e Diretrizes do Sênior)
│   └── DATABASE_SCHEMA.md     # Documentação detalhada do modelo relacional e regras de negócio
├── supabase/
│   └── migrations/
│       └── 20261009_initial_schema.sql  # Schema inicial, índices, triggers e RLS
├── scripts/                   # Utilitários e scripts de automação/testes
├── .agents/                   # Supabase Agent Skills oficiais instaladas
└── README.md                  # Este documento
```

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Motivação |
| :--- | :--- | :--- |
| **Banco de Dados** | Supabase (PostgreSQL 15+) | Precisão com `numeric(15,2)`, Row Level Security (RLS) nativo e Webhooks. |
| **Motor de IA** | Gemini Flash (Tool Calling) | Latência ultrabaixa, suporte nativo a áudio/voz e custo acessível. |
| **Mensageria** | WhatsApp Gateway (Evolution / Meta API) | Canal sem fricção onde o usuário já passa o dia. |
| **Frontend Web** | Next.js + Tailwind CSS + shadcn/ui | Dashboard visual para relatórios e extratos consolidados. |

---

## 🚦 Roadmap do Projeto

- [x] **Fase 1: Fundação do Banco de Dados & RLS**
  - [x] SDR e especificação arquitetural
  - [x] Schema inicial com tipos monetários e RLS
  - [x] Configuração da conexão com o projeto Supabase (`dqigaogendvfytahnpfj`)
- [ ] **Fase 2: Execução das Migrations & Testes Automatizados**
  - [ ] Aplicação da migração no Supabase remoto
  - [ ] Teste de triggers de saldo e isolamento de tenants
- [ ] **Fase 3: Motor de IA (Gemini Flash & Tool Calling)**
  - [ ] Definição dos esquemas de ferramentas (`create_transaction`, `get_balance`)
  - [ ] Prompt de sistema com suporte a linguagem natural brasileira
- [ ] **Fase 4: Integração de Webhook do WhatsApp**
  - [ ] Receptor de mensagens com verificação de idempotência
  - [ ] Loop de confirmação de registro
- [ ] **Fase 5: Dashboard Web & Monetização**
  - [ ] Interface Next.js para gerenciamento e gráficos
  - [ ] Planos Free vs Pro
