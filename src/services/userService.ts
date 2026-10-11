import { supabaseAdmin } from '../config/supabase.js';

export interface UserContext {
  userId: string;
  fullName: string;
  phoneNumber: string;
  planTier: 'basic' | 'pro' | 'plus';
  currency: string;
  timezone: string;
  monthlyQueriesUsed: number;
  accounts: Array<{ id: string; name: string; type: string; current_balance: number }>;
  categories: Array<{ id: string; name: string; type: string; icon: string | null }>;
}

/**
 * Normaliza número de telefone para apenas dígitos
 */
export function normalizePhoneNumber(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  // Se veio no formato whatsapp JID como 5511999999999@s.whatsapp.net
  if (clean.includes('@')) {
    clean = clean.split('@')[0];
  }
  return clean;
}

/**
 * Busca perfil pelo número de telefone cadastrado
 */
export async function getUserByPhoneNumber(phoneNumber: string): Promise<UserContext | null> {
  const clean = normalizePhoneNumber(phoneNumber);
  if (!clean) return null;

  // Busca exata ou variações comuns com/sem o 9º dígito
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('phone_number', clean)
    .maybeSingle();

  if (error || !profile) {
    return null;
  }

  return await getUserContext(profile.id);
}

/**
 * Carrega o contexto completo do usuário (contas e categorias ativas)
 */
export async function getUserContext(userId: string): Promise<UserContext> {
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileErr || !profile) {
    throw new Error(`Perfil não encontrado para o usuário ${userId}`);
  }

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabaseAdmin
      .from('accounts')
      .select('id, name, type, current_balance')
      .eq('user_id', userId)
      .eq('is_active', true),
    supabaseAdmin
      .from('categories')
      .select('id, name, type, icon')
      .eq('user_id', userId),
  ]);

  return {
    userId: profile.id,
    fullName: profile.full_name || 'Usuário',
    phoneNumber: profile.phone_number || '',
    planTier: (profile.plan_tier as any) || 'basic',
    currency: profile.currency || 'BRL',
    timezone: profile.timezone || 'America/Sao_Paulo',
    monthlyQueriesUsed: profile.monthly_queries_used || 0,
    accounts: accounts || [],
    categories: categories || [],
  };
}

/**
 * Gera um código de 6 dígitos para o usuário vincular sua conta ao WhatsApp
 */
export async function generatePhoneLinkCode(userId: string): Promise<{ code: string; expiresAt: string }> {
  // Gera código aleatório de 6 dígitos numéricos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutos

  // Remove códigos antigos do mesmo usuário
  await supabaseAdmin
    .from('phone_link_codes')
    .delete()
    .eq('user_id', userId);

  const { error } = await supabaseAdmin
    .from('phone_link_codes')
    .insert({
      code,
      user_id: userId,
      expires_at: expiresAt,
    });

  if (error) {
    throw new Error(`Erro ao gerar código de vínculo: ${error.message}`);
  }

  return { code, expiresAt };
}

/**
 * Valida o código enviado pelo WhatsApp e vincula o número ao perfil correspondente
 */
export async function linkPhoneWithCode(
  rawCode: string,
  phoneNumber: string
): Promise<{ success: boolean; message: string; userContext?: UserContext }> {
  const code = rawCode.trim().toUpperCase();
  const cleanPhone = normalizePhoneNumber(phoneNumber);

  const { data: linkRecord, error } = await supabaseAdmin
    .from('phone_link_codes')
    .select('*, profiles(id, full_name)')
    .eq('code', code)
    .maybeSingle();

  if (error || !linkRecord) {
    return {
      success: false,
      message: 'Código inválido ou não encontrado. Gere um novo código no painel web em Configurações.',
    };
  }

  if (new Date(linkRecord.expires_at) < new Date()) {
    await supabaseAdmin.from('phone_link_codes').delete().eq('code', code);
    return {
      success: false,
      message: 'Este código expirou. Por favor, gere um novo código no painel web.',
    };
  }

  // Atualiza o telefone no perfil
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({
      phone_number: cleanPhone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', linkRecord.user_id);

  if (updateError) {
    return {
      success: false,
      message: `Erro ao vincular telefone: ${updateError.message}`,
    };
  }

  // Remove o código já utilizado
  await supabaseAdmin.from('phone_link_codes').delete().eq('code', code);

  const context = await getUserContext(linkRecord.user_id);
  return {
    success: true,
    message: `Conta vinculada com sucesso! Olá, ${context.fullName}. Seu FinBot já está pronto para uso.`,
    userContext: context,
  };
}

/**
 * Verifica e incrementa a cota de uso mensal do usuário
 */
export async function checkAndConsumeUserQuota(userId: string): Promise<{ allowed: boolean; reason?: string; remaining?: number }> {
  // Tenta via RPC
  const { data: rpcResult, error: rpcError } = await supabaseAdmin.rpc('check_and_increment_quota', {
    p_user_id: userId,
  });

  if (!rpcError && rpcResult) {
    return rpcResult as any;
  }

  // Fallback caso a RPC ainda não esteja ativa
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('plan_tier, monthly_queries_used')
    .eq('id', userId)
    .single();

  if (!profile) return { allowed: true };

  const limits: Record<string, number> = { basic: 50, pro: 500, plus: 2000 };
  const maxQueries = limits[profile.plan_tier] || 50;

  if (profile.monthly_queries_used >= maxQueries) {
    return {
      allowed: false,
      reason: `Você atingiu o limite mensal do seu plano (${profile.plan_tier}). Atualize seu plano para continuar!`,
      remaining: 0,
    };
  }

  await supabaseAdmin
    .from('profiles')
    .update({ monthly_queries_used: profile.monthly_queries_used + 1 })
    .eq('id', userId);

  return {
    allowed: true,
    remaining: maxQueries - (profile.monthly_queries_used + 1),
  };
}

/**
 * Obtém ou cria um usuário pelo telefone (utilizado para simulação e onboarding inicial)
 */
export async function getOrCreateUserByPhone(phoneNumber: string, fullName: string = 'Usuário'): Promise<UserContext> {
  const existing = await getUserByPhoneNumber(phoneNumber);
  if (existing) return existing;

  const cleanPhone = normalizePhoneNumber(phoneNumber);
  const mockEmail = `${cleanPhone}@whatsapp.finbot.local`;
  const mockPassword = `finbot_${cleanPhone}_${Date.now()}`;

  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: mockEmail,
    password: mockPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
    },
  });

  if (authError || !authData.user) {
    throw new Error(`Erro ao criar usuário no Auth: ${authError?.message}`);
  }

  const userId = authData.user.id;

  // Atualiza telefone no perfil
  await supabaseAdmin
    .from('profiles')
    .update({ phone_number: cleanPhone })
    .eq('id', userId);

  return await getUserContext(userId);
}

