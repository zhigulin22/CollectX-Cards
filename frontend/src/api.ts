// API base URL with versioning
// В production используем относительный путь (тот же домен)
// В dev режиме Vite proxy перенаправляет на localhost:3001
const API_BASE = import.meta.env.VITE_API_URL || '';
const API_VERSION = 'v1';
const API = `${API_BASE}/api/${API_VERSION}`;

function getToken(): string | null {
  return localStorage.getItem('token');
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  // Auth
  // Use first test user (alex_crypto) with balance for dev mode
  authDev: () => request<AuthResponse>('/auth/dev', { method: 'POST', body: JSON.stringify({ telegramId: 100000000 }) }),
  authTelegram: (initData: string) =>
    request<AuthResponse>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData }),
    }),
  getMe: () => request<AuthResponse>('/auth/me'),

  // Wallet
  getBalance: () => request<BalanceResponse>('/wallet/balance'),
  getDeposit: () => request<DepositResponse>('/wallet/deposit'),
  swap: (amount: string, direction: 'usdt_to_x' | 'x_to_usdt' = 'usdt_to_x') =>
    request<SwapResponse>('/wallet/swap', {
      method: 'POST',
      body: JSON.stringify({ amount, direction }),
    }),
  getSendInfo: () => request<SendInfoResponse>('/wallet/send/info'),
  
  // NEW: Two-step send with confirmation
  sendPreview: (toUserId: string, amount: string) =>
    request<SendPreviewResponse>('/wallet/send/preview', {
      method: 'POST',
      body: JSON.stringify({ toUserId, amount }),
    }),
  sendConfirm: (confirmationToken: string) =>
    request<SendConfirmResponse>('/wallet/send/confirm', {
      method: 'POST',
      body: JSON.stringify({ confirmationToken }),
    }),
  
  // Legacy (deprecated)
  send: (toUserId: string, amount: string) =>
    request<SendResponse>('/wallet/send', {
      method: 'POST',
      body: JSON.stringify({ toUserId, amount }),
    }),
  searchUsers: (query: string) =>
    request<SearchUsersResponse>(`/wallet/users/search?query=${encodeURIComponent(query)}`),
  getHistory: (page = 1, limit = 20, currency = 'all', type = 'all') =>
    request<HistoryResponse>(`/wallet/history?page=${page}&limit=${limit}&currency=${currency}&type=${type}`),
  
  // Withdraw
  getWithdrawInfo: () => request<WithdrawInfoResponse>('/wallet/withdraw/info'),
  createWithdraw: (amount: string, toAddress: string) =>
    request<WithdrawResponse>('/wallet/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount, toAddress }),
    }),
  getWithdrawHistory: () => request<WithdrawHistoryResponse>('/wallet/withdraw/history'),
  linkTonAddress: (address: string) =>
    request<{ success: boolean }>('/wallet/ton/link', {
      method: 'POST',
      body: JSON.stringify({ address }),
    }),
};

// Types
export interface AuthResponse {
  token?: string;
  user: { id: string; telegramId: string; username: string | null; firstName: string | null };
  wallet: { balanceUsdt: string; balanceX: string } | null;
}

export interface BalanceResponse {
  balanceUsdt: string;
  balanceX: string;
  rate: number;
  swapFee: number;
}

export interface DepositResponse {
  address: string;
  memo: string;
  currency: string;
  network: string;
  note: string;
}

export interface SwapResponse {
  success: boolean;
  direction: string;
  swapped: string;
  fee: string;
  received: string;
  balanceUsdt: string;
  balanceX: string;
}

export interface SendResponse {
  success: boolean;
  sent: string;
  fee: string;
  total: string;
  newBalance: string;
}

export interface SendPreviewResponse {
  confirmationToken: string;
  preview: {
    toUserId: string;
    receiverName: string;
    receiverUsername: string | null;
    amount: string;
    fee: string;
    total: string;
    currency: string;
    expiresIn: number;
  };
}

export interface SendConfirmResponse {
  success: boolean;
  sent: string;
  fee: string;
  total: string;
  newBalance: string;
  recipient: string;
}

export interface SendInfoResponse {
  minAmount: number;
  fee: number;
  currency: string;
}

export interface SearchUser {
  id: string;
  username: string | null;
  firstName: string | null;
  telegramId: string;
}

export interface SearchUsersResponse {
  users: SearchUser[];
}

export interface Transaction {
  id: string;
  type: string;
  currency: string;
  amount: string;
  balanceAfter: string;
  fee: string | null;
  description: string | null;
  relatedUser: { id: string; username: string | null; firstName: string | null } | null;
  createdAt: string;
}

export interface HistoryResponse {
  items: Transaction[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface WithdrawInfoResponse {
  minAmount: number;
  maxAmount: number;
  fee: number;
  currency: string;
  network: string;
}

export interface WithdrawResponse {
  id: string;
  status: string;
  amount: string;
  fee: string;
  netAmount: string;
  toAddress: string;
}

export interface WithdrawHistoryItem {
  id: string;
  amount: string;
  fee: string;
  status: string;
  description: string | null;
  createdAt: string;
}

export interface WithdrawHistoryResponse extends Array<WithdrawHistoryItem> {}

