/**
 * Definições das Ferramentas (Tool Calling) para a IA financeira
 */

export const financialTools = [
  {
    type: 'function',
    name: 'create_transaction',
    description: 'Registra uma nova transação financeira (despesa ou receita) para o usuário no banco de dados.',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: 'Valor monetário estritamente positivo da transação (ex: 42.50, 15, 200).',
        },
        type: {
          type: 'string',
          enum: ['expense', 'income'],
          description: 'Tipo da transação: expense (despesa, gasto, saída, compra) ou income (receita, ganho, entrada, salário).',
        },
        description: {
          type: 'string',
          description: 'Breve descrição do que foi comprado ou recebido (ex: Almoço no quilo, Padaria, Uber, Conta de Luz, Salário).',
        },
        category_name: {
          type: 'string',
          description: 'Nome da categoria sugerida (ex: Alimentação, Transporte, Moradia, Lazer, Saúde, Salário, etc.).',
        },
        account_name: {
          type: 'string',
          description: 'Nome da conta ou método utilizado se citado (ex: Carteira, Dinheiro, Conta Principal, Nubank, Cartão).',
        },
        date: {
          type: 'string',
          description: 'Data no formato YYYY-MM-DD. Se o usuário falar "ontem", calcule a data correta baseada no dia de hoje.',
        },
      },
      required: ['amount', 'type', 'description'],
    },
  },
  {
    type: 'function',
    name: 'get_financial_summary',
    description: 'Consulta o resumo de gastos, receitas ou saldo geral das contas do usuário.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['today', 'current_week', 'current_month'],
          description: 'Período desejado da consulta: today (hoje), current_week (esta semana), current_month (este mês).',
        },
        category_name: {
          type: 'string',
          description: 'Opcional: nome da categoria específica que o usuário quer consultar gastos.',
        },
      },
      required: ['period'],
    },
  },
  {
    type: 'function',
    name: 'cancel_last_transaction',
    description: 'Cancela ou apaga a última transação registrada quando o usuário pedir para desfazer ou avisar que errou o lançamento.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description: 'Motivo informado pelo usuário para o cancelamento.',
        },
      },
    },
  },
];
