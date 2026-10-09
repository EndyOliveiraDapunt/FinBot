-- ==============================================================================
-- PROJETO: FinBot SaaS - Sistema de Controle Financeiro Pessoal (WhatsApp + IA)
-- MIGRATION: 20261009_initial_schema.sql
-- DESCRIÇÃO: Estrutura inicial de tabelas, índices, triggers de saldo, categorias padrão e RLS.
-- ==============================================================================

-- Habilita extensão para geração de UUIDs se ainda não estiver ativa
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABELA DE PERFIS (profiles)
-- ==============================================================================
-- Espelha a tabela auth.users com dados específicos do SaaS e o telefone para WhatsApp.
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT UNIQUE, -- Formato internacional: 5511999999999 (sem caracteres especiais)
    full_name TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'free' CHECK (plan_tier IN ('free', 'pro', 'family')),
    currency TEXT NOT NULL DEFAULT 'BRL',
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índice rápido para resolução de chamadas do WhatsApp em milissegundos
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);

-- ==============================================================================
-- 2. TABELA DE CONTAS E CARTEIRAS (accounts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'cash', 'investment')),
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    color TEXT DEFAULT '#10B981',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON public.accounts(user_id);

-- ==============================================================================
-- 3. TABELA DE CATEGORIAS (categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    icon TEXT,
    color TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_categories_user_type ON public.categories(user_id, type);

-- ==============================================================================
-- 4. TABELA DE TRANSAÇÕES (transactions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
    source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'web', 'manual', 'import')),
    metadata JSONB DEFAULT '{}'::jsonb, -- Guarda dados extras (ex.: id da mensagem de áudio, raw text da IA)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices compostos para consultas rápidas de extrato e gráficos por período
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);

-- ==============================================================================
-- 5. TABELA DE IDEMPOTÊNCIA DO WHATSAPP (idempotency_keys)
-- ==============================================================================
-- Evita duplicação caso a Meta ou o gateway envie o webhook repetidas vezes.
CREATE TABLE IF NOT EXISTS public.idempotency_keys (
    message_id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 6. HISTÓRICO DE CONVERSAS COM A IA (chat_messages)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON public.chat_messages(user_id, created_at DESC);

-- ==============================================================================
-- 7. TRIGGERS AUTOMÁTICOS
-- ==============================================================================

-- A) Trigger para atualizar saldos da conta automaticamente ao inserir/alterar/remover transações
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Se for INSERT ou UPDATE de transação completada
    IF (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
        IF NEW.type = 'expense' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'income' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        END IF;
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'completed') THEN
        IF OLD.type = 'expense' THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'income' THEN
            UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
        END IF;
    ELSIF (TG_OP = 'UPDATE') THEN
        -- Reverte o saldo antigo se estava completada
        IF OLD.status = 'completed' THEN
            IF OLD.type = 'expense' THEN
                UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
            ELSIF OLD.type = 'income' THEN
                UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
            END IF;
        END IF;
        -- Aplica o saldo novo se agora está completada
        IF NEW.status = 'completed' THEN
            IF NEW.type = 'expense' THEN
                UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
            ELSIF NEW.type = 'income' THEN
                UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_account_balance ON public.transactions;
CREATE TRIGGER trg_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- B) Trigger de Onboarding Automático: Cria perfil, conta padrão e categorias iniciais
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_profile_id UUID;
    default_account_id UUID;
BEGIN
    -- Cria o perfil
    INSERT INTO public.profiles (id, full_name, plan_tier)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'), 'free')
    RETURNING id INTO new_profile_id;

    -- Cria conta padrão ("Conta Principal")
    INSERT INTO public.accounts (user_id, name, type, initial_balance, current_balance, color)
    VALUES (new_profile_id, 'Conta Principal', 'checking', 0.00, 0.00, '#3B82F6')
    RETURNING id INTO default_account_id;

    -- Cria categorias padrão de Despesas
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
    (new_profile_id, 'Alimentação', 'expense', 'utensils', '#EF4444', TRUE),
    (new_profile_id, 'Transporte', 'expense', 'car', '#F59E0B', TRUE),
    (new_profile_id, 'Moradia', 'expense', 'home', '#3B82F6', TRUE),
    (new_profile_id, 'Lazer', 'expense', 'gamepad-2', '#8B5CF6', TRUE),
    (new_profile_id, 'Saúde', 'expense', 'heart-pulse', '#EC4899', TRUE),
    (new_profile_id, 'Educação', 'expense', 'graduation-cap', '#10B981', TRUE),
    (new_profile_id, 'Outros', 'expense', 'tag', '#6B7280', TRUE);

    -- Cria categorias padrão de Receitas
    INSERT INTO public.categories (user_id, name, type, icon, color, is_default) VALUES
    (new_profile_id, 'Salário', 'income', 'briefcase', '#10B981', TRUE),
    (new_profile_id, 'Investimentos', 'income', 'trending-up', '#059669', TRUE),
    (new_profile_id, 'Outras Receitas', 'income', 'plus-circle', '#6B7280', TRUE);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para PROFILES
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Políticas para ACCOUNTS
CREATE POLICY "Users can view their own accounts"
ON public.accounts FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own accounts"
ON public.accounts FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
ON public.accounts FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
ON public.accounts FOR DELETE USING (auth.uid() = user_id);

-- Políticas para CATEGORIES
CREATE POLICY "Users can view their own categories"
ON public.categories FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own categories"
ON public.categories FOR ALL USING (auth.uid() = user_id);

-- Políticas para TRANSACTIONS
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Políticas para CHAT_MESSAGES
CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own chat messages"
ON public.chat_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
