import { useEffect, useState, useCallback } from 'react';

const API_BASE = '/api/v1/admin/cards';

// API Client
function getAdminKey(): string {
  return localStorage.getItem('adminKey') || '';
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': getAdminKey(),
      ...options?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Types
interface Collection {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  icon: string;
  isActive: boolean;
  sortOrder: number;
  totalCards?: number;
}

interface CardTemplate {
  id: string;
  collectionId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  emoji: string;
  rarity: string;
  sellPriceUsdt: string;
  sellPriceX: string;
  dropWeight: number;
  isActive: boolean;
  totalMinted: number;
  maxSupply: number | null;
  collectionName?: string;
}

interface Pack {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  priceUsdt: string | null;
  priceX: string | null;
  cardsCount: number;
  guaranteedRarity: string | null;
  cooldownSeconds: number | null;
  gradient: string;
  isActive: boolean;
  sortOrder: number;
}

type SubTab = 'collections' | 'cards' | 'packs' | 'stats';

export function CardsAdmin() {
  const [subTab, setSubTab] = useState<SubTab>('collections');

  return (
    <div className="space-y-6">
      {/* Sub Navigation */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-xl">
        {[
          { id: 'collections', label: '📁 Collections' },
          { id: 'cards', label: '🃏 Cards' },
          { id: 'packs', label: '📦 Packs' },
          { id: 'stats', label: '📊 Stats' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id as SubTab)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              subTab === t.id
                ? 'bg-violet-500 text-white'
                : 'text-white/50 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'collections' && <CollectionsTab />}
      {subTab === 'cards' && <CardsTab />}
      {subTab === 'packs' && <PacksTab />}
      {subTab === 'stats' && <StatsTab />}
    </div>
  );
}

// Collections Tab
function CollectionsTab() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '🃏',
    isActive: true,
    sortOrder: 0,
  });

  const loadCollections = useCallback(async () => {
    try {
      const res = await request<{ collections: Collection[] }>('/collections');
      setCollections(res.collections);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await request(`/collections/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
      } else {
        await request('/collections', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', description: '', icon: '🃏', isActive: true, sortOrder: 0 });
      loadCollections();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this collection? This cannot be undone.')) return;
    try {
      await request(`/collections/${id}`, { method: 'DELETE' });
      loadCollections();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleEdit = (col: Collection) => {
    setEditingId(col.id);
    setFormData({
      name: col.name,
      description: col.description || '',
      icon: col.icon,
      isActive: col.isActive,
      sortOrder: col.sortOrder,
    });
    setShowForm(true);
  };

  const handleImageUpload = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/collections/${id}/image`, {
      method: 'POST',
      headers: { 'X-Admin-Key': getAdminKey() },
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Upload failed');
    }

    loadCollections();
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-medium">Collections ({collections.length})</h2>
        <button
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', description: '', icon: '🃏', isActive: true, sortOrder: 0 }); }}
          className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium rounded-xl transition-colors"
        >
          + Add Collection
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-3xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingId ? 'Edit Collection' : 'New Collection'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-white/60 text-sm mb-1 block">Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  placeholder="Collection name"
                />
              </div>
              
              <div>
                <label className="text-white/60 text-sm mb-1 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white h-24 resize-none"
                  placeholder="Description..."
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Icon (emoji)</label>
                  <input
                    value={formData.icon}
                    onChange={(e) => setFormData(f => ({ ...f, icon: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-5 h-5 rounded"
                />
                <span className="text-white">Active</span>
              </label>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 py-3 bg-violet-500 text-white rounded-xl font-medium"
              >
                {editingId ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collections List */}
      <div className="space-y-3">
        {collections.map((col) => (
          <div
            key={col.id}
            className="bg-white/[0.02] rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden">
                {col.imageUrl ? (
                  <img src={col.imageUrl} alt={col.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{col.icon}</span>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{col.name}</h3>
                  {!col.isActive && (
                    <span className="px-2 py-0.5 bg-white/10 text-white/40 text-xs rounded">Inactive</span>
                  )}
                </div>
                <p className="text-white/40 text-sm">{col.description || 'No description'}</p>
                <p className="text-white/30 text-xs mt-1">{col.totalCards || 0} cards • Order: {col.sortOrder}</p>
              </div>
              
              <div className="flex gap-2">
                <label className="px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm rounded-lg cursor-pointer transition-colors">
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(col.id, e.target.files[0])}
                  />
                </label>
                <button
                  onClick={() => handleEdit(col)}
                  className="px-3 py-2 bg-white/5 hover:bg-white/10 text-white/60 text-sm rounded-lg transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(col.id)}
                  className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-sm rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Cards Tab
function CardsTab() {
  const [cards, setCards] = useState<CardTemplate[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState({ collectionId: '', rarity: '' });
  const [formData, setFormData] = useState({
    collectionId: '',
    name: '',
    description: '',
    emoji: '🃏',
    rarity: 'COMMON',
    sellPriceUsdt: 1,
    sellPriceX: 100,
    dropWeight: 100,
    isActive: true,
    maxSupply: undefined as number | undefined,
  });

  const loadData = useCallback(async () => {
    try {
      const [cardsRes, colsRes] = await Promise.all([
        request<{ cards: CardTemplate[] }>(`/cards?${new URLSearchParams(filter).toString()}`),
        request<{ collections: Collection[] }>('/collections'),
      ]);
      setCards(cardsRes.cards);
      setCollections(colsRes.collections);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSubmit = async () => {
    try {
      const payload = { ...formData };
      if (editingId) {
        await request(`/cards/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request('/cards', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this card?')) return;
    try {
      await request(`/cards/${id}`, { method: 'DELETE' });
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleImageUpload = async (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/cards/${id}/image`, {
      method: 'POST',
      headers: { 'X-Admin-Key': getAdminKey() },
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Upload failed');
    }
    loadData();
  };

  const rarityColors: Record<string, string> = {
    COMMON: 'bg-slate-500',
    RARE: 'bg-blue-500',
    EPIC: 'bg-purple-500',
    LEGENDARY: 'bg-gradient-to-r from-amber-500 to-orange-500',
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-medium">Card Templates ({cards.length})</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              collectionId: collections[0]?.id || '',
              name: '',
              description: '',
              emoji: '🃏',
              rarity: 'COMMON',
              sellPriceUsdt: 1,
              sellPriceX: 100,
              dropWeight: 100,
              isActive: true,
              maxSupply: undefined,
            });
          }}
          className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium rounded-xl transition-colors"
        >
          + Add Card
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={filter.collectionId}
          onChange={(e) => setFilter(f => ({ ...f, collectionId: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="">All Collections</option>
          {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select
          value={filter.rarity}
          onChange={(e) => setFilter(f => ({ ...f, rarity: e.target.value }))}
          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
        >
          <option value="">All Rarities</option>
          <option value="COMMON">Common</option>
          <option value="RARE">Rare</option>
          <option value="EPIC">Epic</option>
          <option value="LEGENDARY">Legendary</option>
        </select>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-[#1A1A1A] rounded-3xl p-6 w-full max-w-lg my-8">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingId ? 'Edit Card' : 'New Card'}
            </h3>
            
            <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
              <div>
                <label className="text-white/60 text-sm mb-1 block">Collection</label>
                <select
                  value={formData.collectionId}
                  onChange={(e) => setFormData(f => ({ ...f, collectionId: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                >
                  {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              
              <div>
                <label className="text-white/60 text-sm mb-1 block">Name</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  placeholder="Card name"
                />
              </div>
              
              <div>
                <label className="text-white/60 text-sm mb-1 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white h-20 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Emoji</label>
                  <input
                    value={formData.emoji}
                    onChange={(e) => setFormData(f => ({ ...f, emoji: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Rarity</label>
                  <select
                    value={formData.rarity}
                    onChange={(e) => setFormData(f => ({ ...f, rarity: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  >
                    <option value="COMMON">Common</option>
                    <option value="RARE">Rare</option>
                    <option value="EPIC">Epic</option>
                    <option value="LEGENDARY">Legendary</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Sell Price (USDT)</label>
                  <input
                    type="number"
                    value={formData.sellPriceUsdt}
                    onChange={(e) => setFormData(f => ({ ...f, sellPriceUsdt: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Sell Price ($X)</label>
                  <input
                    type="number"
                    value={formData.sellPriceX}
                    onChange={(e) => setFormData(f => ({ ...f, sellPriceX: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Drop Weight</label>
                  <input
                    type="number"
                    value={formData.dropWeight}
                    onChange={(e) => setFormData(f => ({ ...f, dropWeight: parseInt(e.target.value) || 100 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Max Supply (empty=∞)</label>
                  <input
                    type="number"
                    value={formData.maxSupply || ''}
                    onChange={(e) => setFormData(f => ({ ...f, maxSupply: e.target.value ? parseInt(e.target.value) : undefined }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-5 h-5 rounded"
                />
                <span className="text-white">Active</span>
              </label>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium">
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 py-3 bg-violet-500 text-white rounded-xl font-medium">
                {editingId ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-white/[0.02] rounded-2xl overflow-hidden border border-white/5 hover:border-white/10 transition-colors group"
          >
            <div className="aspect-square bg-white/5 flex items-center justify-center relative overflow-hidden">
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-5xl">{card.emoji}</span>
              )}
              <div className={`absolute top-2 left-2 ${rarityColors[card.rarity]} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                {card.rarity}
              </div>
              {!card.isActive && (
                <div className="absolute top-2 right-2 bg-black/60 text-white/60 text-[10px] px-2 py-0.5 rounded-full">
                  Inactive
                </div>
              )}
              
              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <label className="p-2 bg-blue-500 rounded-lg cursor-pointer hover:bg-blue-400 transition-colors">
                  📷
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleImageUpload(card.id, e.target.files[0])}
                  />
                </label>
                <button
                  onClick={() => {
                    setEditingId(card.id);
                    setFormData({
                      collectionId: card.collectionId,
                      name: card.name,
                      description: card.description || '',
                      emoji: card.emoji,
                      rarity: card.rarity,
                      sellPriceUsdt: parseFloat(card.sellPriceUsdt),
                      sellPriceX: parseFloat(card.sellPriceX),
                      dropWeight: card.dropWeight,
                      isActive: card.isActive,
                      maxSupply: card.maxSupply || undefined,
                    });
                    setShowForm(true);
                  }}
                  className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(card.id)}
                  className="p-2 bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
            
            <div className="p-3">
              <h3 className="text-white font-medium text-sm truncate">{card.name}</h3>
              <p className="text-white/40 text-xs truncate">{card.collectionName}</p>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className="text-emerald-400">${card.sellPriceUsdt}</span>
                <span className="text-white/30">Minted: {card.totalMinted}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Packs Tab
function PacksTab() {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    icon: '📦',
    priceUsdt: undefined as number | undefined,
    priceX: undefined as number | undefined,
    cardsCount: 3,
    guaranteedRarity: '' as string,
    cooldownSeconds: undefined as number | undefined,
    gradient: 'from-violet-500 to-purple-600',
    isActive: true,
    sortOrder: 0,
  });

  const loadPacks = useCallback(async () => {
    try {
      const res = await request<{ packs: Pack[] }>('/packs');
      setPacks(res.packs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const handleSubmit = async () => {
    try {
      const payload = {
        ...formData,
        guaranteedRarity: formData.guaranteedRarity || undefined,
      };
      if (editingId) {
        await request(`/packs/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request('/packs', { method: 'POST', body: JSON.stringify(payload) });
      }
      setShowForm(false);
      setEditingId(null);
      loadPacks();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this pack?')) return;
    try {
      await request(`/packs/${id}`, { method: 'DELETE' });
      loadPacks();
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-white font-medium">Packs ({packs.length})</h2>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingId(null);
            setFormData({
              name: '',
              description: '',
              icon: '📦',
              priceUsdt: undefined,
              priceX: undefined,
              cardsCount: 3,
              guaranteedRarity: '',
              cooldownSeconds: undefined,
              gradient: 'from-violet-500 to-purple-600',
              isActive: true,
              sortOrder: 0,
            });
          }}
          className="px-4 py-2 bg-violet-500 hover:bg-violet-400 text-white text-sm font-medium rounded-xl transition-colors"
        >
          + Add Pack
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1A1A1A] rounded-3xl p-6 w-full max-w-lg">
            <h3 className="text-xl font-bold text-white mb-4">
              {editingId ? 'Edit Pack' : 'New Pack'}
            </h3>
            
            <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Icon</label>
                  <input
                    value={formData.icon}
                    onChange={(e) => setFormData(f => ({ ...f, icon: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-white/60 text-sm mb-1 block">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white h-20 resize-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Price USDT (empty=free)</label>
                  <input
                    type="number"
                    value={formData.priceUsdt || ''}
                    onChange={(e) => setFormData(f => ({ ...f, priceUsdt: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                    placeholder="Free"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Price $X (empty=free)</label>
                  <input
                    type="number"
                    value={formData.priceX || ''}
                    onChange={(e) => setFormData(f => ({ ...f, priceX: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                    placeholder="Free"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Cards Count</label>
                  <input
                    type="number"
                    value={formData.cardsCount}
                    onChange={(e) => setFormData(f => ({ ...f, cardsCount: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-white/60 text-sm mb-1 block">Guaranteed Rarity</label>
                  <select
                    value={formData.guaranteedRarity}
                    onChange={(e) => setFormData(f => ({ ...f, guaranteedRarity: e.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  >
                    <option value="">None</option>
                    <option value="RARE">Rare+</option>
                    <option value="EPIC">Epic+</option>
                    <option value="LEGENDARY">Legendary</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="text-white/60 text-sm mb-1 block">Cooldown (seconds, for free packs)</label>
                <input
                  type="number"
                  value={formData.cooldownSeconds || ''}
                  onChange={(e) => setFormData(f => ({ ...f, cooldownSeconds: e.target.value ? parseInt(e.target.value) : undefined }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                  placeholder="No cooldown"
                />
              </div>
              
              <div>
                <label className="text-white/60 text-sm mb-1 block">Gradient (Tailwind classes)</label>
                <input
                  value={formData.gradient}
                  onChange={(e) => setFormData(f => ({ ...f, gradient: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white"
                />
              </div>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData(f => ({ ...f, isActive: e.target.checked }))}
                  className="w-5 h-5 rounded"
                />
                <span className="text-white">Active</span>
              </label>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-3 bg-white/10 text-white rounded-xl font-medium">
                Cancel
              </button>
              <button onClick={handleSubmit} className="flex-1 py-3 bg-violet-500 text-white rounded-xl font-medium">
                {editingId ? 'Save' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Packs List */}
      <div className="space-y-3">
        {packs.map((pack) => (
          <div
            key={pack.id}
            className={`bg-gradient-to-r ${pack.gradient} rounded-2xl p-[1px]`}
          >
            <div className="bg-black/80 rounded-2xl p-4 flex items-center gap-4">
              <span className="text-4xl">{pack.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-medium">{pack.name}</h3>
                  {!pack.isActive && (
                    <span className="px-2 py-0.5 bg-white/10 text-white/40 text-xs rounded">Inactive</span>
                  )}
                </div>
                <p className="text-white/60 text-sm">{pack.description || 'No description'}</p>
                <div className="flex gap-4 mt-2 text-xs text-white/40">
                  <span>{pack.cardsCount} cards</span>
                  {pack.priceUsdt && <span>${pack.priceUsdt} USDT</span>}
                  {pack.priceX && <span>{pack.priceX} $X</span>}
                  {!pack.priceUsdt && !pack.priceX && <span className="text-emerald-400">FREE</span>}
                  {pack.guaranteedRarity && <span className="text-purple-400">{pack.guaranteedRarity}+</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(pack.id);
                    setFormData({
                      name: pack.name,
                      description: pack.description || '',
                      icon: pack.icon,
                      priceUsdt: pack.priceUsdt ? parseFloat(pack.priceUsdt) : undefined,
                      priceX: pack.priceX ? parseFloat(pack.priceX) : undefined,
                      cardsCount: pack.cardsCount,
                      guaranteedRarity: pack.guaranteedRarity || '',
                      cooldownSeconds: pack.cooldownSeconds || undefined,
                      gradient: pack.gradient,
                      isActive: pack.isActive,
                      sortOrder: pack.sortOrder,
                    });
                    setShowForm(true);
                  }}
                  className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(pack.id)}
                  className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 text-sm rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Stats Tab
function StatsTab() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    request<any>('/stats')
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!stats) return <div className="text-white/40">Failed to load stats</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Collections" value={stats.collections} icon="📁" />
        <StatCard label="Card Templates" value={stats.cardTemplates} icon="🃏" />
        <StatCard label="Packs" value={stats.packs} icon="📦" />
        <StatCard label="Cards Owned" value={stats.userCards} icon="💎" />
        <StatCard label="Packs Opened" value={stats.packOpenings} icon="🎁" />
      </div>

      {stats.recentOpenings?.length > 0 && (
        <div className="bg-white/[0.02] rounded-2xl p-5 border border-white/5">
          <h3 className="text-white font-medium mb-4">Recent Pack Openings</h3>
          <div className="space-y-2">
            {stats.recentOpenings.slice(0, 5).map((o: any) => (
              <div key={o.id} className="flex items-center justify-between text-sm">
                <span className="text-white/60">{o.userId.slice(0, 8)}...</span>
                <span className="text-white/40">{o.cardIds.length} cards</span>
                <span className="text-white/30">{new Date(o.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/5 text-center">
      <span className="text-2xl">{icon}</span>
      <p className="text-white text-2xl font-light mt-2">{value}</p>
      <p className="text-white/40 text-sm">{label}</p>
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );
}

