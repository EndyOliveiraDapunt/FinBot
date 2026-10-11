import { supabaseAdmin } from './config/supabase.js';

async function testDatabase() {
  console.log('🔍 Testando conexão com o Supabase...\n');

  const tables = ['profiles', 'accounts', 'categories', 'transactions', 'statement_imports', 'chat_messages'];

  for (const table of tables) {
    const { data, count, error } = await supabaseAdmin
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log(`❌ Tabela [${table}]: Erro - ${error.message}`);
    } else {
      console.log(`✅ Tabela [${table}]: Conectada (Registros: ${count ?? 0})`);
    }
  }

  console.log('\n✨ Conexão com o Supabase validada!');
}

testDatabase().catch((err) => {
  console.error('Falha no teste de banco:', err);
  process.exit(1);
});
