import { supabaseAdmin } from '../config/supabase.js';

export interface UserContext {
  userId: string;
  fullName: string;
  phoneNumber: string;
  planTier: string;
  currency: string;
  timezone: string;
  accounts: Array<{ id: string; name: string; type: string; current_balance: number }>;
  categories: Array<{ id: string; name: string; type: string; icon: string | null }>;
}

/**
 * Obtém ou cria um usuário de teste/onboarding pelo número de telefone do WhatsApp
 */
export async function getOrCreateUserByPhone(phoneNumber: string, fullName: string = 'Usuário WhatsApp'): Promise<UserContext> {
  // Limpa o número (apenas dígitos)
  const cleanPhone = phoneNumber.replace(/\D/g, '');

  // 1. Tenta buscar usuário existente pelo telefone
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('phone_number', cleanPhone)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar perfil por telefone: ${error.message}`);
  }

  let userId: string;

  if (!profile) {
    // 2. Cria usuário anônimo no Supabase Auth para disparar o trigger on_auth_user_created
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

    userId = authData.user.id;

    // Atualiza o telefone no perfil criado pelo trigger
    await supabaseAdmin
      .from('profiles')
      .update({ phone_number: cleanPhone })
      .eq('id', userId);
  } else {
    userId = profile.id;
  }

  // 3. Carrega o contexto completo (contas e categorias)
  return await getUserContext(userId);
}

/**
 * Carrega o contexto atualizado do usuário (contas e categorias)
 */
export async function getUserContext(userId: string): Promise<UserContext> {
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profileErr) throw new Error(`Perfil não encontrado: ${profileErr.message}`);

  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabaseAdmin.from('accounts').select('id, name, type, current_balance').eq('user_id', userId).eq('is_active', true),
    supabaseAdmin.from('categories').select('id, name, type, icon').eq('user_id', userId),
  ]);

  return {
    userId: profile.id,
    fullName: profile.full_name || 'Usuário',
    phoneNumber: profile.phone_number || '',
    planTier: profile.plan_tier || 'free',
    currency: profile.currency || 'BRL',
    timezone: profile.timezone || 'America/Sao_Paulo',
    accounts: accounts || [],
    categories: categories || [],
  };
}
