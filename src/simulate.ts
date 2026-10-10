import { getOrCreateUserByPhone } from './services/userService.js';
import { processUserMessage } from './ai/agent.js';

async function runSimulation() {
  console.log('====================================================');
  console.log('🤖 SIMULADOR DE MENSAGENS DO WHATSAPP - FINBOT SAAS');
  console.log('====================================================\n');

  const testPhone = '5511999999999';
  console.log(`📱 Conectando usuário de teste: +${testPhone} (João Silva)...`);

  const userContext = await getOrCreateUserByPhone(testPhone, 'João Silva');
  console.log(`✅ Usuário autenticado com sucesso! ID: ${userContext.userId}`);
  console.log(`💼 Contas ativas: ${userContext.accounts.map((a) => `${a.name} (Saldo: R$ ${Number(a.current_balance).toFixed(2)})`).join(', ')}`);
  console.log(`🏷️ Categorias carregadas: ${userContext.categories.length} categorias disponíveis.\n`);

  const testMessages = [
    'Recebi 3500 de salário hoje',
    'Gastei 45,90 no almoço no quilo',
    'Paguei 180 na conta de luz',
    'Cinquentão de pizza ontem à noite',
    'Quanto gastei hoje?',
    'Qual meu saldo atual?',
    'Opa, cancela o último lançamento que foi errado',
    'Qual meu saldo agora?',
  ];

  for (const msg of testMessages) {
    console.log(`\n----------------------------------------------------`);
    console.log(`💬 [WHATSAPP RECEBIDO] Usuário: "${msg}"`);
    console.log(`⚙️ Processando com IA...`);

    // Atualiza o contexto do usuário a cada interação para refletir novos saldos
    const updatedContext = await getOrCreateUserByPhone(testPhone, 'João Silva');

    const result = await processUserMessage({
      userContext: updatedContext,
      messageText: msg,
    });

    console.log(`\n🤖 [RESPOSTA WHATSAPP]:`);
    console.log(result.replyText);
    if (result.toolExecuted) {
      console.log(`🔧 [FERRAMENTA EXECUTADA]: ${result.toolExecuted}`);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 SIMULAÇÃO CONCLUÍDA COM SUCESSO!');
  console.log('====================================================');
}

runSimulation().catch((err) => {
  console.error('❌ Erro na simulação:', err);
  process.exit(1);
});
