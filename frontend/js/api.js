// API Client
const API = '/api';

const api = {
  async request(endpoint, method = 'GET', body = null) {
    try {
      const opts = { method, headers: { 'Content-Type': 'application/json' } };
      if (body) opts.body = JSON.stringify(body);
      const res = await fetch(API + endpoint, opts);
      const data = await res.json();
      if (!res.ok && !data.error) data.error = 'Request failed';
      return data;
    } catch (e) {
      console.error('API Error:', e);
      return { error: 'Network error' };
    }
  },
  
  // Auth
  auth: (telegramId, username) => api.request('/users/auth', 'POST', { telegramId, username }),
  
  // Users
  getUser: (id) => api.request(`/users/${id}`),
  getInventory: (userId, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.collection) params.set('collection', filters.collection);
    if (filters.rarity) params.set('rarity', filters.rarity);
    if (filters.sort) params.set('sort', filters.sort);
    return api.request(`/users/${userId}/inventory?${params}`);
  },
  getFreeBox: (userId) => api.request(`/users/${userId}/free-box`),
  
  // Collections
  getCollections: () => api.request('/collections'),
  getCollection: (id) => api.request(`/collections/${id}`),
  getCollectionProgress: (colId, userId) => api.request(`/collections/${colId}/progress/${userId}`),
  
  // Cards
  getCard: (id) => api.request(`/cards/${id}`),
  
  // Boxes
  getBoxes: () => api.request('/boxes'),
  openBox: (boxId, userId, isFree) => api.request(`/boxes/${boxId}/open`, 'POST', { userId, isFree })
};
