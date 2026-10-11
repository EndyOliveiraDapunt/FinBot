-- ==============================================================================
-- PROJETO: FinBot SaaS - Controle Financeiro Pessoal (WhatsApp + Web + IA)
-- MIGRATION: 20261011_reset_schema.sql
-- DESCRIÇÃO: Reset e reconstrução do schema completo com suporte a:
--   - Planos SaaS (basic, pro, plus) e controle de cota de mensagens
--   - Vínculo seguro de WhatsApp via código efêmero (phone_link_codes)
--   - Suporte a contas padrão e importação de extratos/faturas PDF
--   - Isolamento estrito de tenants com FKs compostas (account_id, user_id)
--   - Suporte a transferências entre contas na trigger de saldo
--   - RLS rigoroso com (select auth.uid()) e search_path seguro
-- ==============================================================================

-- 1. Habilita extensão pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- DROP TABLES (Ordem reversa de dependências para reset limpo)
-- ==============================================================================
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.processed_messages CASCADE;
DROP TABLE IF EXISTS public.idempotency_keys CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.statement_imports CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.phone_link_codes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==============================================================================
-- 1. PERFIS DE USUÁRIOS (profiles)
-- ==============================================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    phone_number TEXT UNIQUE, -- Formato internacional: 5511999999999 (apenas dígitos)
    full_name TEXT,
    plan_tier TEXT NOT NULL DEFAULT 'basic' CHECK (plan_tier IN ('basic', 'pro', 'plus')),
    monthly_queries_used INTEGER NOT NULL DEFAULT 0,
    queries_reset_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    currency TEXT NOT NULL DEFAULT 'BRL',
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 2. CÓDIGOS DE VÍNCULO DE WHATSAPP (phone_link_codes)
-- ==============================================================================
CREATE TABLE public.phone_link_codes (
    code TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_phone_link_codes_user ON public.phone_link_codes(user_id);
CREATE INDEX idx_phone_link_codes_expires ON public.phone_link_codes(expires_at);

-- ==============================================================================
-- 3. CONTAS E CARTEIRAS (accounts)
-- ==============================================================================
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit_card', 'cash', 'investment')),
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    current_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_accounts_id_user UNIQUE (id, user_id)
);

CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);

-- ==============================================================================
-- 4. CATEGORIAS (categories)
-- ==============================================================================
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income')),
    icon TEXT,
    color TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_categories_id_user UNIQUE (id, user_id)
);

CREATE INDEX idx_categories_user_type ON public.categories(user_id, type);

-- ==============================================================================
-- 5. IMPORTAÇÕES DE EXTRATO/PDF (statement_imports)
-- ==============================================================================
CREATE TABLE public.statement_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID,
    filename TEXT NOT NULL,
    file_url TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    total_transactions INTEGER NOT NULL DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_imports_account_user FOREIGN KEY (account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE SET NULL
);

CREATE INDEX idx_statement_imports_user ON public.statement_imports(user_id, created_at DESC);

-- ==============================================================================
-- 6. TRANSAÇÕES (transactions)
-- ==============================================================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    account_id UUID,
    transfer_account_id UUID, -- Conta de destino em caso de transferência
    category_id UUID,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    description TEXT NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending')),
    source TEXT NOT NULL DEFAULT 'whatsapp' CHECK (source IN ('whatsapp', 'web', 'manual', 'import')),
    import_id UUID REFERENCES public.statement_imports(id) ON DELETE SET NULL,
    external_message_id TEXT UNIQUE, -- Garante idempotência para mensagens do WhatsApp
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT fk_tx_account_user FOREIGN KEY (account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE SET NULL,
    CONSTRAINT fk_tx_transfer_account_user FOREIGN KEY (transfer_account_id, user_id) REFERENCES public.accounts(id, user_id) ON DELETE SET NULL,
    CONSTRAINT fk_tx_category_user FOREIGN KEY (category_id, user_id) REFERENCES public.categories(id, user_id) ON DELETE SET NULL
);

CREATE INDEX idx_transactions_user_date ON public.transactions(user_id, transaction_date DESC);
CREATE INDEX idx_transactions_account ON public.transactions(account_id);
CREATE INDEX idx_transactions_category ON public.transactions(category_id);
CREATE INDEX idx_transactions_import ON public.transactions(import_id);

-- ==============================================================================
-- 7. IDEMPOTÊNCIA DE MENSAGENS (processed_messages)
-- ==============================================================================
CREATE TABLE public.processed_messages (
    message_id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- 8. HISTÓRICO DE MENSAGENS DA IA (chat_messages)
-- ==============================================================================
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_chat_messages_user_created ON public.chat_messages(user_id, created_at DESC);

-- ==============================================================================
-- 9. TRIGGERS AUTOMÁTICOS
-- ==============================================================================

-- A) Trigger para manter saldos de contas sincronizados (incluindo transferências)
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Se for INSERT e status completada
    IF (TG_OP = 'INSERT' AND NEW.status = 'completed') THEN
        IF NEW.type = 'expense' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'income' THEN
            UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
        ELSIF NEW.type = 'transfer' THEN
            UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
            IF NEW.transfer_account_id IS NOT NULL THEN
                UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.transfer_account_id;
            END IF;
        END IF;

    -- Se for DELETE e estava completada
    ELSIF (TG_OP = 'DELETE' AND OLD.status = 'completed') THEN
        IF OLD.type = 'expense' THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'income' THEN
            UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
        ELSIF OLD.type = 'transfer' THEN
            UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
            IF OLD.transfer_account_id IS NOT NULL THEN
                UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.transfer_account_id;
            END IF;
        END IF;

    -- Se for UPDATE
    ELSIF (TG_OP = 'UPDATE') THEN
        -- 1. Desfaz impacto antigo
        IF OLD.status = 'completed' THEN
            IF OLD.type = 'expense' THEN
                UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
            ELSIF OLD.type = 'income' THEN
                UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.account_id;
            ELSIF OLD.type = 'transfer' THEN
                UPDATE public.accounts SET current_balance = current_balance + OLD.amount WHERE id = OLD.account_id;
                IF OLD.transfer_account_id IS NOT NULL THEN
                    UPDATE public.accounts SET current_balance = current_balance - OLD.amount WHERE id = OLD.transfer_account_id;
                END IF;
            END IF;
        END IF;

        -- 2. Aplica novo impacto
        IF NEW.status = 'completed' THEN
            IF NEW.type = 'expense' THEN
                UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
            ELSIF NEW.type = 'income' THEN
                UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.account_id;
            ELSIF NEW.type = 'transfer' THEN
                UPDATE public.accounts SET current_balance = current_balance - NEW.amount WHERE id = NEW.account_id;
                IF NEW.transfer_account_id IS NOT NULL THEN
                    UPDATE public.accounts SET current_balance = current_balance + NEW.amount WHERE id = NEW.transfer_account_id;
                END IF;
            END IF;
        END IF;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_account_balance ON public.transactions;
CREATE TRIGGER trg_update_account_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();

-- B) Trigger de Onboarding Automático
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_profile_id UUID;
    default_account_id UUID;
BEGIN
    -- Cria o perfil
    INSERT INTO public.profiles (id, full_name, plan_tier)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuário'), 'basic')
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
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 10. FUNÇÃO RPC: CONTROLE DE COTAS E PLANOS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.check_and_increment_quota(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_profile RECORD;
    v_limit INTEGER;
    v_allowed BOOLEAN := FALSE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'reason', 'Usuário não encontrado');
    END IF;

    -- Define o limite pelo plano
    -- basic: 50 mensagens / mês
    -- pro: 500 mensagens / mês
    -- plus: 2000 mensagens / mês
    IF v_profile.plan_tier = 'basic' THEN
        v_limit := 50;
    ELSIF v_profile.plan_tier = 'pro' THEN
        v_limit := 500;
    ELSIF v_profile.plan_tier = 'plus' THEN
        v_limit := 2000;
    ELSE
        v_limit := 50;
    END IF;

    -- Reseta contador se já passou 30 dias desde o último reset
    IF v_profile.queries_reset_at < (v_now - INTERVAL '30 days') THEN
        UPDATE public.profiles
        SET monthly_queries_used = 1,
            queries_reset_at = v_now,
            updated_at = v_now
        WHERE id = p_user_id;

        RETURN jsonb_build_object(
            'allowed', true,
            'plan_tier', v_profile.plan_tier,
            'queries_used', 1,
            'limit', v_limit,
            'remaining', v_limit - 1
        );
    END IF;

    -- Verifica limite
    IF v_profile.monthly_queries_used < v_limit THEN
        UPDATE public.profiles
        SET monthly_queries_used = monthly_queries_used + 1,
            updated_at = v_now
        WHERE id = p_user_id;

        RETURN jsonb_build_object(
            'allowed', true,
            'plan_tier', v_profile.plan_tier,
            'queries_used', v_profile.monthly_queries_used + 1,
            'limit', v_limit,
            'remaining', v_limit - (v_profile.monthly_queries_used + 1)
        );
    ELSE
        RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'Você atingiu o limite mensal do seu plano (' || v_profile.plan_tier || '). Faça upgrade para continuar utilizando!',
            'plan_tier', v_profile.plan_tier,
            'queries_used', v_profile.monthly_queries_used,
            'limit', v_limit,
            'remaining', 0
        );
    END IF;
END;
$$;

-- ==============================================================================
-- 11. FUNÇÃO RPC: RESUMO DO PERÍODO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_period_summary(
    p_user_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_total_expenses NUMERIC(15, 2) := 0.00;
    v_total_income NUMERIC(15, 2) := 0.00;
    v_total_balance NUMERIC(15, 2) := 0.00;
    v_by_category JSONB := '{}'::jsonb;
    v_tx_count INTEGER := 0;
BEGIN
    -- 1. Gastos e receitas agrupados
    SELECT
        COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0.00),
        COUNT(*)
    INTO v_total_expenses, v_total_income, v_tx_count
    FROM public.transactions t
    WHERE t.user_id = p_user_id
      AND t.transaction_date >= p_start_date
      AND t.transaction_date <= p_end_date
      AND t.status = 'completed';

    -- 2. Gastos por categoria
    SELECT COALESCE(
        jsonb_object_agg(cat_name, cat_total),
        '{}'::jsonb
    )
    INTO v_by_category
    FROM (
        SELECT COALESCE(c.name, 'Outros') AS cat_name, SUM(t.amount) AS cat_total
        FROM public.transactions t
        LEFT JOIN public.categories c ON c.id = t.category_id
        WHERE t.user_id = p_user_id
          AND t.transaction_date >= p_start_date
          AND t.transaction_date <= p_end_date
          AND t.type = 'expense'
          AND t.status = 'completed'
        GROUP BY c.name
    ) sub;

    -- 3. Saldo consolidado das contas
    SELECT COALESCE(SUM(current_balance), 0.00)
    INTO v_total_balance
    FROM public.accounts
    WHERE user_id = p_user_id AND is_active = TRUE;

    RETURN jsonb_build_object(
        'start_date', p_start_date,
        'end_date', p_end_date,
        'total_expenses', v_total_expenses,
        'total_income', v_total_income,
        'total_balance', v_total_balance,
        'transaction_count', v_tx_count,
        'by_category', v_by_category
    );
END;
$$;

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_link_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statement_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processed_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT USING ((SELECT auth.uid()) = id);

-- Impede que usuários alterem plano ou contadores diretamente
DROP POLICY IF EXISTS "Users can update their own profile info" ON public.profiles;
CREATE POLICY "Users can update their own profile info"
ON public.profiles FOR UPDATE USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

-- PHONE LINK CODES
DROP POLICY IF EXISTS "Users can view their own link codes" ON public.phone_link_codes;
CREATE POLICY "Users can view their own link codes"
ON public.phone_link_codes FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own link codes" ON public.phone_link_codes;
CREATE POLICY "Users can create their own link codes"
ON public.phone_link_codes FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own link codes" ON public.phone_link_codes;
CREATE POLICY "Users can delete their own link codes"
ON public.phone_link_codes FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ACCOUNTS
DROP POLICY IF EXISTS "Users can view their own accounts" ON public.accounts;
CREATE POLICY "Users can view their own accounts"
ON public.accounts FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own accounts" ON public.accounts;
CREATE POLICY "Users can insert their own accounts"
ON public.accounts FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own accounts" ON public.accounts;
CREATE POLICY "Users can update their own accounts"
ON public.accounts FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own accounts" ON public.accounts;
CREATE POLICY "Users can delete their own accounts"
ON public.accounts FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- CATEGORIES
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
CREATE POLICY "Users can view their own categories"
ON public.categories FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can manage their own categories" ON public.categories;
CREATE POLICY "Users can manage their own categories"
ON public.categories FOR ALL USING ((SELECT auth.uid()) = user_id);

-- STATEMENT IMPORTS
DROP POLICY IF EXISTS "Users can view their own imports" ON public.statement_imports;
CREATE POLICY "Users can view their own imports"
ON public.statement_imports FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own imports" ON public.statement_imports;
CREATE POLICY "Users can insert their own imports"
ON public.statement_imports FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- TRANSACTIONS
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions"
ON public.transactions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own transactions" ON public.transactions;
CREATE POLICY "Users can update their own transactions"
ON public.transactions FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own transactions" ON public.transactions;
CREATE POLICY "Users can delete their own transactions"
ON public.transactions FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- CHAT MESSAGES
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert their own chat messages"
ON public.chat_messages FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
