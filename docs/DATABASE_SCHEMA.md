# 🗄️ Documentação do Modelo de Dados (Supabase / PostgreSQL)

Este documento detalha o schema do banco de dados do **FinBot SaaS**, suas restrições de integridade, triggers automatizados e políticas de segurança (*Row Level Security*).

---

## 1. Tabelas do Sistema

### `public.profiles`
Armazena os dados complementares dos usuários autenticados via Supabase Auth.
* `id` (`UUID`, PK): Chave estrangeira referenciando `auth.users(id)` com `ON DELETE CASCADE`.
* `phone_number` (`TEXT`, UNIQUE): Telefone no padrão internacional (ex: `5511999999999`). Indexado (`idx_profiles_phone_number`) para resolução instantânea via webhook.
* `full_name` (`TEXT`): Nome de exibição.
* `plan_tier` (`TEXT`): Nível de assinatura (`free`, `pro`, `family`).
* `currency` (`TEXT`): Moeda padrão (`BRL`).
* `timezone` (`TEXT`): Fuso horário do usuário (`America/Sao_Paulo`).

### `public.accounts`
Contas correntes, carteiras, dinheiro vivo ou cartões.
* `id` (`UUID`, PK): Identificador único da conta.
* `user_id` (`UUID`, FK): Referência a `profiles(id)`.
* `name` (`TEXT`): Ex: "Conta Principal", "Nubank", "Carteira".
* `type` (`TEXT`): `checking`, `savings`, `credit_card`, `cash`, `investment`.
* `initial_balance` (`NUMERIC(15, 2)`): Saldo inicial.
* `current_balance` (`NUMERIC(15, 2)`): Saldo atual recalculado por trigger.
* `is_active` (`BOOLEAN`): Indica se a conta está ativa.

### `public.categories`
Categorias para classificação das despesas e receitas.
* `id` (`UUID`, PK): Identificador único.
* `user_id` (`UUID`, FK): Referência a `profiles(id)`.
* `name` (`TEXT`): Ex: "Alimentação", "Transporte", "Salário".
* `type` (`TEXT`): `expense` (despesa) ou `income` (receita).
* `icon` (`TEXT`): Identificador do ícone (Lucide Icons).
* `color` (`TEXT`): Código hexadecimal para gráficos.
* `is_default` (`BOOLEAN`): Categorias padrão geradas no onboarding.

### `public.transactions`
Registro contábil de cada movimentação financeira.
* `id` (`UUID`, PK): Identificador único da transação.
* `user_id` (`UUID`, FK): Referência a `profiles(id)`.
* `account_id` (`UUID`, FK): Conta de origem.
* `category_id` (`UUID`, FK): Categoria atribuída.
* `amount` (`NUMERIC(15, 2)`): Valor monetário estritamente positivo (`CHECK (amount > 0)`).
* `type` (`TEXT`): `expense`, `income`, `transfer`.
* `description` (`TEXT`): Descrição do gasto (extraída pela IA ou enviada pelo usuário).
* `transaction_date` (`DATE`): Data de competência.
* `status` (`TEXT`): `completed` ou `pending`.
* `source` (`TEXT`): Origem do lançamento (`whatsapp`, `web`, `manual`, `import`).
* `metadata` (`JSONB`): Dados técnicos adicionais (áudio ID, raw prompt, etc.).

### `public.idempotency_keys`
Proteção contra duplicidade de mensagens do WhatsApp.
* `message_id` (`TEXT`, PK): ID único gerado pelo WhatsApp/gateway.
* `user_id` (`UUID`, FK): Usuário associado.
* `created_at` (`TIMESTAMPTZ`): Data e hora do recebimento.

### `public.chat_messages`
Histórico conversacional para fornecer memória contextual ao LLM.
* `id` (`UUID`, PK): Identificador da mensagem.
* `user_id` (`UUID`, FK): Dono da conversa.
* `role` (`TEXT`): `user`, `assistant`, `system`.
* `content` (`TEXT`): Texto da mensagem.
* `metadata` (`JSONB`): Informações de áudio, transcrição e intents identificados.

---

## 2. Automação e Triggers

1. **`trg_update_account_balance`**:
   * Executado após `INSERT`, `UPDATE` ou `DELETE` na tabela `transactions`.
   * Ajusta `accounts.current_balance` de forma atômica e consistente com base no tipo (`expense` subtrai, `income` adiciona).
2. **`on_auth_user_created`**:
   * Executado quando um novo registro surge em `auth.users`.
   * Cria automaticamente a linha em `profiles`, gera a "Conta Principal" e insere 10 categorias padrão essenciais.
