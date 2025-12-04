import { create } from 'zustand';
import { api, AuthResponse, BalanceResponse, Transaction } from './api';

interface Store {
  // Auth
  token: string | null;
  user: AuthResponse['user'] | null;
  isLoading: boolean;
  error: string | null;

  // Wallet
  balanceUsdt: string;
  balanceX: string;
  rate: number;
  swapFee: number;
  transactions: Transaction[];

  // Actions
  init: () => Promise<void>;
  login: () => Promise<void>;
  logout: () => void;
  fetchBalance: () => Promise<void>;
  refreshBalance: () => Promise<void>; // alias for fetchBalance
  fetchHistory: () => Promise<void>;
  swap: (amount: string, direction?: 'usdt_to_x' | 'x_to_usdt') => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useStore = create<Store>((set, get) => ({
  token: localStorage.getItem('token'),
  user: null,
  isLoading: true,
  error: null,

  balanceUsdt: '0',
  balanceX: '0',
  rate: 100,
  swapFee: 2,
  transactions: [],

  init: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const data = await api.getMe();
      set({
        user: data.user,
        balanceUsdt: data.wallet?.balanceUsdt || '0',
        balanceX: data.wallet?.balanceX || '0',
        isLoading: false,
      });
      get().fetchBalance();
      get().fetchHistory();
    } catch {
      localStorage.removeItem('token');
      set({ token: null, isLoading: false });
    }
  },

  login: async () => {
    set({ isLoading: true, error: null });
    try {
      // Try Telegram WebApp
      const tg = (window as any).Telegram?.WebApp;
      let data: AuthResponse;

      if (tg?.initData) {
        data = await api.authTelegram(tg.initData);
      } else {
        // Dev fallback
        data = await api.authDev();
      }

      if (data.token) {
        localStorage.setItem('token', data.token);
        set({
          token: data.token,
          user: data.user,
          balanceUsdt: data.wallet?.balanceUsdt || '0',
          balanceX: data.wallet?.balanceX || '0',
          isLoading: false,
        });
        get().fetchHistory();
      }
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, balanceUsdt: '0', balanceX: '0', transactions: [] });
  },

  fetchBalance: async () => {
    try {
      const data = await api.getBalance();
      set({
        balanceUsdt: data.balanceUsdt,
        balanceX: data.balanceX,
        rate: data.rate,
        swapFee: data.swapFee,
      });
    } catch (e: any) {
      console.error('Failed to fetch balance:', e);
    }
  },

  fetchHistory: async () => {
    try {
      const data = await api.getHistory();
      set({ transactions: data.items });
    } catch (e: any) {
      console.error('Failed to fetch history:', e);
    }
  },

  swap: async (amount: string, direction: 'usdt_to_x' | 'x_to_usdt' = 'usdt_to_x') => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.swap(amount, direction);
      set({
        balanceUsdt: data.balanceUsdt,
        balanceX: data.balanceX,
        isLoading: false,
      });
      get().fetchHistory();
    } catch (e: any) {
      set({ error: e.message, isLoading: false });
      throw e;
    }
  },

  // Alias for fetchBalance (used by components)
  refreshBalance: async () => {
    await get().fetchBalance();
    await get().fetchHistory();
  },

  setError: (error) => set({ error }),
  setLoading: (loading) => set({ isLoading: loading }),
}));

