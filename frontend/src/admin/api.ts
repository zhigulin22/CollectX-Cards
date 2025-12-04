// Admin API with versioning
const API_BASE = import.meta.env.VITE_API_URL || '';
const API_VERSION = 'v1';
const API = `${API_BASE}/api/${API_VERSION}`;

function getAdminKey(): string | null {
  return localStorage.getItem('adminKey');
}

async function adminRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const adminKey = getAdminKey();
  if (!adminKey) {
    throw new Error('Not authorized');
  }

  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
      ...options?.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const adminApi = {
  // Auth check
  checkAuth: () => adminRequest<StatsResponse>('/admin/stats'),

  // Statistics
  getStats: () => adminRequest<StatsResponse>('/admin/stats'),

  // Revenue (заработок на комиссиях)
  getRevenue: () => adminRequest<RevenueResponse>('/admin/revenue'),

  // Users
  getUsers: (page = 1, limit = 20, search?: string) => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return adminRequest<UsersResponse>(`/admin/users?${params}`);
  },

  getUser: (id: string) => adminRequest<UserDetails>(`/admin/users/${id}`),

  getUserActivity: (id: string, page = 1, limit = 50, type = 'all') =>
    adminRequest<UserActivityResponse>(`/admin/users/${id}/activity?page=${page}&limit=${limit}&type=${type}`),

  // Block/Unblock
  blockUser: (userId: string, blocked: boolean, reason?: string) =>
    adminRequest<{ success: boolean }>('/admin/users/block', {
      method: 'POST',
      body: JSON.stringify({ userId, blocked, reason }),
    }),

  // Admin Notes
  updateUserNotes: (userId: string, notes: string) =>
    adminRequest<{ success: boolean }>('/admin/users/notes', {
      method: 'POST',
      body: JSON.stringify({ userId, notes }),
    }),

  // Balance
  adjustBalance: (userId: string, currency: 'USDT' | 'X', amount: string, reason: string) =>
    adminRequest<{ success: boolean }>('/admin/balance/adjust', {
      method: 'POST',
      body: JSON.stringify({ userId, currency, amount, reason }),
    }),

  // Withdrawals
  getPendingWithdrawals: () => adminRequest<WithdrawalItem[]>('/admin/withdrawals/pending'),

  updateWithdrawal: (withdrawId: string, status: string, txHash?: string, failReason?: string) =>
    adminRequest<{ success: boolean }>('/admin/withdrawals/update', {
      method: 'POST',
      body: JSON.stringify({ withdrawId, status, txHash, failReason }),
    }),

  // Audit
  getAuditLog: (page = 1, limit = 50) =>
    adminRequest<AuditResponse>(`/admin/audit?page=${page}&limit=${limit}`),

  // Settings
  getSettings: () => adminRequest<Record<string, string>>('/admin/settings'),

  updateSetting: (key: string, value: string) =>
    adminRequest<{ success: boolean }>('/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ key, value }),
    }),
};

// Types
export interface StatsResponse {
  users: { total: number };
  wallets: { total: number; totalUsdt: string; totalX: string };
  transactions: { total: number; byType: { type: string; count: number; sum: string }[] };
  withdrawals: { pending: number };
}

export interface UserItem {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  isBlocked: boolean;
  balanceUsdt: string;
  balanceX: string;
  createdAt: string;
}

export interface UsersResponse {
  items: UserItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface UserDetails {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string | null;
  isBlocked: boolean;
  blockReason: string | null;
  adminNotes: string | null;
  wallet: { balanceUsdt: string; balanceX: string } | null;
  recentWithdrawals: { id: string; amount: string; status: string; createdAt: string }[];
  createdAt: string;
}

export interface WithdrawalItem {
  id: string;
  amount: string;
  fee: string;
  netAmount: string;
  toAddress: string;
  status: string;
  txHash: string | null;
  user: { id: string; username: string | null; firstName: string | null; telegramId: string } | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: any;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditResponse {
  items: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// User Activity
export interface ActivityItem {
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

export interface ActivityStat {
  type: string;
  count: number;
  totalAmount: string;
}

export interface UserActivityResponse {
  items: ActivityItem[];
  stats: ActivityStat[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// Revenue (заработок на комиссиях)
export interface RevenueBreakdown {
  swap: { usdt: string; count: number; totalTxs?: number };
  send: { x: string; usdt: string; count: number; totalTxs?: number };
  withdraw: { usdt: string; count: number; note: string };
}

export interface RevenueResponse {
  total: {
    usdt: string;
    breakdown: RevenueBreakdown;
  };
  today: { usdt: string };
  week: { usdt: string };
  rate: { xToUsdt: number };
}

