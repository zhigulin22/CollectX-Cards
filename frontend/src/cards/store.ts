import { create } from 'zustand';

// Types
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface CardTemplate {
  id: string;
  name: string;
  collectionId: string;
  rarity: Rarity;
  imageUrl?: string;
  imageThumb?: string;
  emoji: string;
  description: string;
  sellPrice: { usdt: number; x: number };
}

export interface Card extends CardTemplate {
  templateId: string;
  serialNumber: number;
  mintedAt: string;
  collectionName?: string;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
  imageUrl?: string;
  description: string;
  totalCards: number;
}

export interface Pack {
  id: string;
  name: string;
  description: string;
  price: { usdt: number; x: number } | null;
  priceUsdt?: string;
  priceX?: string;
  cardsCount: number;
  guaranteedRarity?: Rarity;
  cooldown?: number;
  cooldownSeconds?: number;
  icon: string;
  gradient: string;
}

interface CardsStore {
  // State
  myCards: Card[];
  collections: Collection[];
  packs: Pack[];
  selectedCard: Card | null;
  openedCards: Card[];
  lastFreePack: number | null;
  isOpening: boolean;
  isLoading: boolean;

  // Actions
  loadCollections: () => Promise<void>;
  loadPacks: () => Promise<void>;
  loadInventory: () => Promise<void>;
  setSelectedCard: (card: Card | null) => void;
  openPack: (packId: string, payWith: 'usdt' | 'x') => Promise<Card[]>;
  sellCard: (cardId: string, currency: 'usdt' | 'x') => Promise<{ usdt: string; x: string }>;
  clearOpenedCards: () => void;
  canOpenFreePack: (packId?: string) => boolean;
  getTimeUntilFreePack: (packId?: string) => number;
}

// API
const API_BASE = '/api/v1/cards';

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

  const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Store
export const useCardsStore = create<CardsStore>((set, get) => ({
  myCards: [],
  collections: [],
  packs: [],
  selectedCard: null,
  openedCards: [],
  lastFreePack: localStorage.getItem('lastFreePack') ? parseInt(localStorage.getItem('lastFreePack')!) : null,
  isOpening: false,
  isLoading: false,

  loadCollections: async () => {
    try {
      const data = await request<{ collections: any[] }>('/collections');
      set({
        collections: data.collections.map(c => ({
          id: c.id,
          name: c.name,
          icon: c.icon,
          imageUrl: c.imageUrl,
          description: c.description || '',
          totalCards: c.totalCards || 0,
        })),
      });
    } catch (e) {
      console.error('Failed to load collections:', e);
    }
  },

  loadPacks: async () => {
    try {
      const data = await request<{ packs: any[] }>('/packs');
      set({
        packs: data.packs.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: p.priceUsdt || p.priceX ? {
            usdt: parseFloat(p.priceUsdt) || 0,
            x: parseFloat(p.priceX) || 0,
          } : null,
          priceUsdt: p.priceUsdt,
          priceX: p.priceX,
          cardsCount: p.cardsCount,
          guaranteedRarity: p.guaranteedRarity?.toLowerCase() as Rarity | undefined,
          cooldown: p.cooldownSeconds,
          cooldownSeconds: p.cooldownSeconds,
          icon: p.icon,
          gradient: p.gradient,
        })),
      });
    } catch (e) {
      console.error('Failed to load packs:', e);
    }
  },

  loadInventory: async () => {
    set({ isLoading: true });
    try {
      const data = await request<{ items: any[] }>('/inventory');
      set({
        myCards: data.items.map(c => ({
          id: c.id,
          templateId: c.templateId,
          name: c.name,
          description: c.description || '',
          imageUrl: c.imageUrl,
          imageThumb: c.imageThumb,
          emoji: c.emoji,
          rarity: c.rarity as Rarity,
          collectionId: c.collectionId,
          collectionName: c.collectionName,
          serialNumber: c.serialNumber,
          mintedAt: c.mintedAt,
          sellPrice: c.sellPrice,
        })),
        isLoading: false,
      });
    } catch (e) {
      console.error('Failed to load inventory:', e);
      set({ isLoading: false });
    }
  },

  setSelectedCard: (card) => set({ selectedCard: card }),

  openPack: async (packId, payWith) => {
    const pack = get().packs.find(p => p.id === packId);
    if (!pack) throw new Error('Pack not found');

    set({ isOpening: true });

    try {
      const data = await request<{ success: boolean; cards: any[] }>(`/packs/${packId}/open`, {
        method: 'POST',
        body: JSON.stringify({ payWith }),
      });

      // Update last free pack time if it was free
      if (!pack.price) {
        localStorage.setItem('lastFreePack', Date.now().toString());
        set({ lastFreePack: Date.now() });
      }

      const cards: Card[] = data.cards.map(c => ({
        id: c.id,
        templateId: c.templateId,
        name: c.name,
        description: c.description || '',
        imageUrl: c.imageUrl,
        emoji: c.emoji,
        rarity: c.rarity as Rarity,
        collectionId: c.collectionId,
        collectionName: c.collectionName,
        serialNumber: c.serialNumber,
        mintedAt: c.mintedAt,
        sellPrice: c.sellPrice,
      }));

      set(state => ({
        myCards: [...state.myCards, ...cards],
        openedCards: cards,
        isOpening: false,
      }));

      return cards;
    } catch (e) {
      set({ isOpening: false });
      throw e;
    }
  },

  sellCard: async (cardId, currency) => {
    const data = await request<{ 
      success: boolean; 
      balanceUsdt: string; 
      balanceX: string;
    }>(`/cards/${cardId}/sell`, {
      method: 'POST',
      body: JSON.stringify({ currency }),
    });

    set(state => ({
      myCards: state.myCards.filter(c => c.id !== cardId),
      selectedCard: null,
    }));

    return { usdt: data.balanceUsdt, x: data.balanceX };
  },

  clearOpenedCards: () => set({ openedCards: [] }),

  canOpenFreePack: (packId?: string) => {
    const lastFreePack = get().lastFreePack;
    if (!lastFreePack) return true;
    
    let pack;
    if (packId) {
      pack = get().packs.find(p => p.id === packId);
    } else {
      pack = get().packs.find(p => !p.price && p.cooldown);
    }
    const cooldown = pack?.cooldown || 24 * 60 * 60;
    
    return Date.now() - lastFreePack >= cooldown * 1000;
  },

  getTimeUntilFreePack: (packId?: string) => {
    const lastFreePack = get().lastFreePack;
    if (!lastFreePack) return 0;
    
    let pack;
    if (packId) {
      pack = get().packs.find(p => p.id === packId);
    } else {
      pack = get().packs.find(p => !p.price && p.cooldown);
    }
    const cooldown = pack?.cooldown || 24 * 60 * 60;
    
    const remaining = (lastFreePack + cooldown * 1000) - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  },
}));
