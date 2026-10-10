export interface Transaction {
  id: string;
  user_id: string;
  account_id: string | null;
  category_id: string | null;
  amount: number;
  type: 'expense' | 'income' | 'transfer';
  description: string;
  transaction_date: string;
  status: 'completed' | 'pending';
  source: 'whatsapp' | 'web' | 'manual';
  created_at: string;
  category?: {
    name: string;
    color: string;
    icon: string;
  };
  account?: {
    name: string;
    type: string;
  };
}

export interface Account {
  id: string;
  user_id: string;
  name: string;
  type: string;
  initial_balance: number;
  current_balance: number;
  color?: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string | null;
  color: string | null;
}

export interface FinancialStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
}
