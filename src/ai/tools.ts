import OpenAI from 'openai';

export const financialTools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'add_transaction',
      description: 'Registra uma nova transação financeira (despesa, receita ou transferência) na conta do usuário.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Valor monetário da transação (ex: 45.90, 1500, 20.00). Deve ser um número positivo.',
          },
          type: {
            type: 'string',
            enum: ['expense', 'income', 'transfer'],
            description: 'Tipo da transação: expense (despesa/gasto), income (receita/ganho/salário), ou transfer (transferência entre contas).',
          },
          description: {
            type: 'string',
            description: 'Descrição sucinta do gasto ou receita (ex: Almoço no quilo, Uber, Conta de Luz, Salário mensal).',
          },
          category_name: {
            type: 'string',
            description: 'Nome da categoria correspondente (ex: Alimentação, Transporte, Moradia, Lazer, Saúde, Educação, Salário, Outros).',
          },
          account_name: {
            type: 'string',
            description: 'Nome da conta utilizada (ex: Conta Principal, Nubank, Itaú). Se não informada, usa a conta padrão.',
          },
          transfer_account_name: {
            type: 'string',
            description: 'Nome da conta de destino no caso de transferências.',
          },
          date: {
            type: 'string',
            description: 'Data da transação no formato YYYY-MM-DD. Se ocorreu hoje, omita ou use a data atual.',
          },
        },
        required: ['amount', 'type', 'description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_summary',
      description: 'Consulta o resumo financeiro (total gasto, total recebido, saldo geral e detalhamento por categoria) de um período.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
            description: 'Período desejado para a consulta. Padrão: this_month.',
          },
          category_name: {
            type: 'string',
            description: 'Filtrar gastos de uma categoria específica (ex: Alimentação, Transporte).',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_transactions',
      description: 'Lista as transações recentes registradas pelo usuário.',
      parameters: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Quantidade máxima de transações para listar (padrão: 5).',
          },
          period: {
            type: 'string',
            enum: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'],
            description: 'Período das transações.',
          },
          type: {
            type: 'string',
            enum: ['expense', 'income', 'all'],
            description: 'Filtrar por tipo de transação.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_balance',
      description: 'Consulta o saldo financeiro consolidado de todas as contas do usuário.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_last_transaction',
      description: 'Desfaz ou cancela a última transação financeira registrada pelo usuário.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_categories',
      description: 'Lista as categorias de despesas e receitas configuradas pelo usuário.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_accounts',
      description: 'Lista as contas bancárias ou carteiras ativas do usuário e seus saldos.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];
