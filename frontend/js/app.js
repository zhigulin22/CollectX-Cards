// CollectX App - Production Version
let state = {
  user: null,
  collections: [],
  inventory: [],
  boxes: [],
  stats: null,
  ranks: {},
  freeBox: { available: false, remaining: 0 }
};

// Collection icons mapping
const ICONS = {
  'Pudgy Penguins': '🐧',
  'Doodles': '🎨',
  'CryptoPunks': '👾',
  'Bored Ape': '🦍',
  'Azuki': '👺',
  'Cool Cats': '🐱',
  'World of Women': '👩',
  'Moonbirds': '🦉',
  'Clone X': '🤖',
  'Meebits': '🧱'
};

function getIcon(name) {
  for (const [key, icon] of Object.entries(ICONS)) {
    if (name && name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return '🎴';
}

// Initialize App
async function init() {
  console.log('🚀 CollectX initializing...');
  
  const tg = window.Telegram?.WebApp;
  const telegramId = tg?.initDataUnsafe?.user?.id || 123456789;
  const username = tg?.initDataUnsafe?.user?.username || 'admin';
  
  if (tg) {
    tg.expand();
    tg.ready();
    tg.setHeaderColor('#000000');
    tg.setBackgroundColor('#000000');
  }
  
  try {
    console.log('📡 Authenticating...');
    const auth = await api.auth(telegramId, username);
    console.log('Auth response:', auth);
    
    if (auth.error) { 
      console.error('Auth error:', auth.error);
      showToast(auth.error, 'error'); 
      return; 
    }
    
    state.user = auth.user;
    state.stats = auth.stats;
    state.ranks = auth.ranks || {};
    
    console.log('📦 Loading data...');
    await Promise.all([loadCollections(), loadInventory(), loadBoxes(), checkFreeBox()]);
    
    console.log('🎨 Rendering UI...');
    render();
    
    console.log('✅ CollectX ready!');
    
    // Update free box timer every second
    setInterval(() => {
      if (state.freeBox.remaining > 0) {
        state.freeBox.remaining--;
        if (state.freeBox.remaining <= 0) {
          state.freeBox.available = true;
          updatePackButton();
        }
      }
    }, 1000);
    
  } catch (err) {
    console.error('Init error:', err);
    showToast('Connection error', 'error');
  }
}

async function loadCollections() {
  state.collections = await api.getCollections() || [];
  updateCollectionFilter();
}

async function loadInventory() {
  const filters = {
    collection: document.getElementById('filter-collection')?.value || '',
    rarity: document.getElementById('filter-rarity')?.value || '',
    sort: document.getElementById('filter-sort')?.value || 'newest'
  };
  state.inventory = await api.getInventory(state.user.id, filters) || [];
}

async function loadBoxes() { state.boxes = await api.getBoxes() || []; }

async function checkFreeBox() {
  const res = await api.getFreeBox(state.user.id);
  state.freeBox = res || { available: false, remaining: 0 };
  updatePackButton();
}

// Render all UI
function render() {
  renderHeader();
  renderButtons();
  renderCollections();
  renderCards();
}

function renderHeader() {
  const rank = state.user?.rank || 'bronze';
  document.getElementById('username').textContent = state.user?.username || 'Guest';
  document.getElementById('balance').textContent = `🪙 ${(state.user?.coins || 0).toLocaleString()}`;
  
  const avatar = document.getElementById('avatar');
  avatar.className = `avatar ${rank}`;
  
  const badge = document.getElementById('rank-badge');
  badge.textContent = rank.charAt(0).toUpperCase() + rank.slice(1);
  badge.className = `rank-badge ${rank}`;
  
  document.getElementById('cards-total').textContent = `${state.inventory?.length || 0} NFTs`;
  document.getElementById('collections-count').textContent = state.collections.length;
}

function renderButtons() {
  const container = document.getElementById('buttons-row');
  const isAdmin = state.user?.is_admin === 1 || state.user?.is_admin === true;
  
  if (isAdmin) {
    container.innerHTML = `
      <button class="main-button pack-button" onclick="openPacksModal()">
        <span class="btn-icon">📦</span>
        <span class="btn-text">Open Packs</span>
        <span class="pack-badge" id="pack-badge" style="display:${state.freeBox.available ? 'block' : 'none'}">FREE</span>
      </button>
      <button class="main-button admin-button" onclick="openAdminPanel()">
        <span class="btn-icon">⚙️</span>
        <span class="btn-text">Admin</span>
      </button>
    `;
  } else {
    container.innerHTML = `
      <button class="main-button pack-button" onclick="openPacksModal()">
        <span class="btn-icon">📦</span>
        <span class="btn-text">Open Packs</span>
        <span class="pack-badge" id="pack-badge" style="display:${state.freeBox.available ? 'block' : 'none'}">FREE</span>
      </button>
    `;
  }
}

function renderCollections() {
  const container = document.getElementById('collections');
  if (!state.collections.length) {
    container.innerHTML = '<div style="color:var(--text-tertiary);font-size:14px;padding:20px">No collections yet</div>';
    return;
  }
  
  container.innerHTML = state.collections.map(col => {
    const progress = state.stats?.collections?.find(c => c.id === col.id);
    const owned = progress?.owned || 0;
    const total = col.total_cards || 0;
    const pct = total > 0 ? Math.round(owned / total * 100) : 0;
    
    return `
      <div class="collection-card" onclick="openAlbum('${col.id}')">
        <div class="collection-icon">${getIcon(col.name)}</div>
        <div class="collection-name">${col.name}</div>
        <div class="collection-progress">
          <span>${owned}/${total}</span>
          <span>${pct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill ${pct === 100 ? 'complete' : ''}" style="width:${pct}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

function renderCards() {
  const grid = document.getElementById('cards-grid');
  
  if (!state.inventory || state.inventory.length === 0) {
    grid.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <p>No cards yet. Open a pack to start collecting!</p>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = state.inventory.map(card => {
    const value = calculateValue(card);
    const cardId = card.card_id || card.id;
    const imageHtml = card.image_url 
      ? `<img src="${card.image_url}" alt="${card.name}" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`
      : getIcon(card.collection_name || card.name);
    
    return `
      <div class="card-item ${card.rarity}" onclick="viewCard('${cardId}', '${card.id}')">
        <span class="card-serial">#${card.serial_number || '?'}</span>
        <div class="card-image">${imageHtml}</div>
        <div class="card-name">${card.name}</div>
        <div class="card-meta">
          <span class="rarity-dot ${card.rarity}"></span>
          <span class="card-value">🪙 ${value}</span>
        </div>
      </div>
    `;
  }).join('');
}

function calculateValue(card) {
  const base = card.base_value || 10;
  const mult = { common: 1, rare: 5, epic: 20, legendary: 100 }[card.rarity] || 1;
  const serialMult = card.serial_number <= 10 ? 2 : card.serial_number <= 100 ? 1.5 : 1;
  return Math.round(base * mult * serialMult);
}

function updateCollectionFilter() {
  const select = document.getElementById('filter-collection');
  if (!select) return;
  select.innerHTML = '<option value="">All</option>' +
    state.collections.map(c => `<option value="${c.id}">${c.symbol || c.name}</option>`).join('');
}

function updatePackButton() {
  const badge = document.getElementById('pack-badge');
  if (badge) badge.style.display = state.freeBox.available ? 'block' : 'none';
}

// Filters
async function applyFilters() {
  await loadInventory();
  renderCards();
}

// ============ MODALS ============
function showModal(content) {
  document.getElementById('modal').innerHTML = `<div class="modal-handle"></div>${content}`;
  document.getElementById('modal-overlay').classList.add('active');
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.getElementById('modal').classList.remove('active');
}

document.getElementById('modal-overlay').addEventListener('click', closeModal);

// Toast notifications
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ============ PROFILE ============
function showProfile() {
  const rank = state.user?.rank || 'bronze';
  const xp = state.user?.xp || 0;
  const nextRank = getNextRankXp(rank);
  const prevRank = state.ranks[rank]?.min || 0;
  const progress = nextRank ? Math.min(100, ((xp - prevRank) / (nextRank - prevRank)) * 100) : 100;
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Profile</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="profile-modal">
      <div class="profile-avatar-large avatar ${rank}">👤</div>
      <div class="profile-name">${state.user?.username || 'Guest'}</div>
      <span class="rank-badge ${rank}" style="margin-bottom:16px;display:inline-block;font-size:12px">${rank.toUpperCase()}</span>
      <div class="profile-xp">
        <div class="xp-bar"><div class="xp-fill" style="width:${progress}%"></div></div>
        <div class="xp-text">${xp.toLocaleString()} ${nextRank ? `/ ${nextRank.toLocaleString()}` : ''} XP</div>
      </div>
      <div class="profile-stats-row">
        <div class="profile-stat">
          <div class="profile-stat-value">${state.inventory?.length || 0}</div>
          <div class="profile-stat-label">Cards</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${(state.user?.coins || 0).toLocaleString()}</div>
          <div class="profile-stat-label">Coins</div>
        </div>
        <div class="profile-stat">
          <div class="profile-stat-value">${state.stats?.totalValue || 0}</div>
          <div class="profile-stat-label">Value</div>
        </div>
      </div>
    </div>
  `);
}

function getNextRankXp(current) {
  const order = ['bronze', 'silver', 'gold', 'platinum', 'diamond', 'master', 'legend'];
  const idx = order.indexOf(current);
  return idx < order.length - 1 ? state.ranks[order[idx + 1]]?.min : null;
}

// ============ PACKS ============
function openPacksModal() {
  const balanceDisplay = (state.user?.coins || 0).toLocaleString();
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Open Packs</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:28px;font-weight:700;color:var(--gold)">🪙 ${balanceDisplay}</div>
      <div style="font-size:13px;color:var(--text-tertiary);margin-top:4px">Your balance</div>
    </div>
    <div class="packs-grid">
      ${state.boxes.map(box => {
        const isFree = box.price === 0;
        const canOpen = isFree ? state.freeBox.available : (state.user?.coins || 0) >= box.price;
        const timeStr = !state.freeBox.available && isFree ? formatTime(state.freeBox.remaining) : '';
        
        return `
          <div class="pack-item ${isFree ? 'free' : ''} ${!canOpen ? 'disabled' : ''}" 
               onclick="${canOpen ? `selectPack('${box.id}')` : ''}">
            <div class="pack-item-icon">${isFree ? '🎁' : '📦'}</div>
            <div class="pack-item-name">${box.name}</div>
            <div class="pack-item-desc">${box.cards_count} cards</div>
            <div class="pack-item-price ${isFree ? 'free' : 'coins'}">
              ${isFree ? (state.freeBox.available ? 'FREE!' : timeStr) : `🪙 ${box.price}`}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `);
}

function selectPack(boxId) {
  const box = state.boxes.find(b => b.id === boxId);
  if (!box) return;
  
  const isFree = box.price === 0;
  const canOpen = isFree ? state.freeBox.available : (state.user?.coins || 0) >= box.price;
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">${box.name}</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div style="text-align:center;padding:30px 0">
      <div style="font-size:90px;margin-bottom:20px">${isFree ? '🎁' : '📦'}</div>
      <div style="font-size:15px;color:var(--text-secondary);margin-bottom:16px;line-height:1.5">
        ${box.description || `Contains ${box.cards_count} random NFT cards`}
      </div>
      <div style="font-size:32px;font-weight:700;color:${isFree ? 'var(--success)' : 'var(--gold)'}">
        ${isFree ? 'FREE' : `🪙 ${box.price}`}
      </div>
    </div>
    <button class="btn ${isFree ? 'btn-success' : ''}" ${!canOpen ? 'disabled' : ''} onclick="openPack('${boxId}', ${isFree})">
      ${isFree ? 'Claim Now!' : 'Open Pack'}
    </button>
  `);
}

async function openPack(boxId, isFree) {
  showModal(`
    <div class="pack-opening">
      <div class="pack-opening-icon">📦</div>
      <div class="pack-opening-text">Opening your pack...</div>
    </div>
  `);
  
  try {
    const result = await api.openBox(boxId, state.user.id, isFree);
    if (!result.success) {
      showToast(result.error || 'Failed to open pack', 'error');
      closeModal();
      return;
    }
    
    await new Promise(r => setTimeout(r, 1500));
    
    showModal(`
      <div class="modal-header">
        <span class="modal-title">🎉 You got ${result.cards.length} cards!</span>
        <button class="modal-close" onclick="closeAndRefresh()">×</button>
      </div>
      <div class="cards-reveal">
        ${result.cards.map((c, i) => `
          <div class="reveal-card ${c.rarity}" style="animation-delay:${0.1 + i * 0.15}s">
            <div class="reveal-card-image">${getIcon(c.name)}</div>
            <div class="reveal-card-name">${c.name.split(' - ')[1] || c.name}</div>
            <div class="reveal-card-rarity">${c.rarity}</div>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-success" onclick="closeAndRefresh()">Awesome!</button>
    `);
    
  } catch (err) {
    console.error('Open pack error:', err);
    showToast('Error opening pack', 'error');
    closeModal();
  }
}

async function closeAndRefresh() {
  closeModal();
  const auth = await api.auth(state.user.telegram_id || 123456789, state.user.username);
  state.user = auth.user;
  state.stats = auth.stats;
  await Promise.all([loadInventory(), checkFreeBox()]);
  render();
}

// ============ VIEW CARD DETAIL ============
async function viewCard(cardId, inventoryId) {
  try {
    const card = await api.getCard(cardId);
    if (card.error) {
      showToast(card.error, 'error');
      return;
    }
    
    // Find this specific inventory item
    const invItem = state.inventory.find(i => i.id === inventoryId || i.card_id === cardId);
    const serial = invItem?.serial_number || '?';
    
    const imageHtml = card.image_url
      ? `<img src="${card.image_url}" alt="${card.name}" style="width:100%;height:100%;object-fit:cover;border-radius:20px">`
      : getIcon(card.name);
    
    showModal(`
      <div class="modal-header">
        <span class="modal-title">Card Details</span>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="card-detail">
        <div class="card-detail-image ${card.rarity}">${imageHtml}</div>
        <div class="card-detail-name">${card.name}</div>
        <div class="card-detail-collection">${card.collection_name || 'Unknown Collection'}</div>
        <span class="card-detail-rarity ${card.rarity}">${card.rarity}</span>
        <div class="card-detail-desc">${card.description || 'A unique digital collectible NFT card.'}</div>
        <div class="card-stats-grid">
          <div class="card-stat">
            <div class="card-stat-label">Market Value</div>
            <div class="card-stat-value" style="color:var(--gold)">🪙 ${card.marketValue || 0}</div>
          </div>
          <div class="card-stat">
            <div class="card-stat-label">Uniqueness</div>
            <div class="card-stat-value">${card.uniqueness || 0}%</div>
          </div>
          <div class="card-stat">
            <div class="card-stat-label">Serial #</div>
            <div class="card-stat-value">#${serial}</div>
          </div>
          <div class="card-stat">
            <div class="card-stat-label">Total Minted</div>
            <div class="card-stat-value">${card.minted || 0}</div>
          </div>
        </div>
      </div>
    `);
    
  } catch (err) {
    console.error('View card error:', err);
    showToast('Error loading card', 'error');
  }
}

// ============ ALBUM ============
async function openAlbum(collectionId) {
  try {
    const col = await api.getCollection(collectionId);
    const progress = await api.getCollectionProgress(collectionId, state.user.id);
    const ownedIds = new Set((progress.ownedCards || []).map(c => c.id));
    
    showModal(`
      <div class="modal-header">
        <span class="modal-title">Album</span>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="album-header">
        <div class="album-icon">${getIcon(col.name)}</div>
        <div class="album-info">
          <h2>${col.name}</h2>
          <p>${progress.owned || 0}/${progress.total || 0} cards • ${progress.progress || 0}% complete</p>
        </div>
      </div>
      <div class="album-cards-grid">
        ${(col.cards || []).map(card => {
          const owned = ownedIds.has(card.id);
          const shortName = card.name.split(' - ')[1] || card.name;
          return `
            <div class="album-card ${owned ? 'owned' : 'missing'}" ${owned ? `onclick="viewCard('${card.id}', '')"` : ''}>
              ${owned ? '<span class="owned-badge">✓</span>' : ''}
              <div class="album-card-image">${owned ? getIcon(col.name) : '❓'}</div>
              <div class="album-card-name">${owned ? shortName : '???'}</div>
            </div>
          `;
        }).join('')}
      </div>
    `);
    
  } catch (err) {
    console.error('Open album error:', err);
    showToast('Error loading album', 'error');
  }
}

// ============ ADMIN PANEL ============
function openAdminPanel() {
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Admin Panel</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="admin-panel-grid">
      <div class="admin-panel-btn" onclick="showCreateCollection()">
        <div class="admin-panel-btn-icon">✨</div>
        <div class="admin-panel-btn-info">
          <div class="admin-panel-btn-title">Create Collection</div>
          <div class="admin-panel-btn-desc">Add a new NFT collection</div>
        </div>
      </div>
      <div class="admin-panel-btn" onclick="showCreateCard()">
        <div class="admin-panel-btn-icon">🎴</div>
        <div class="admin-panel-btn-info">
          <div class="admin-panel-btn-title">Add Card</div>
          <div class="admin-panel-btn-desc">Create new cards for collections</div>
        </div>
      </div>
      <div class="admin-panel-btn" onclick="showDeleteCollection()" style="border-color:var(--error)">
        <div class="admin-panel-btn-icon">🗑️</div>
        <div class="admin-panel-btn-info">
          <div class="admin-panel-btn-title" style="color:var(--error)">Delete Collection</div>
          <div class="admin-panel-btn-desc">Remove collection and all cards</div>
        </div>
      </div>
      <div class="admin-panel-btn" onclick="showDeleteCard()" style="border-color:var(--error)">
        <div class="admin-panel-btn-icon">❌</div>
        <div class="admin-panel-btn-info">
          <div class="admin-panel-btn-title" style="color:var(--error)">Delete Card</div>
          <div class="admin-panel-btn-desc">Remove specific card</div>
        </div>
      </div>
      <div class="admin-panel-btn" onclick="window.open('/admin','_blank')">
        <div class="admin-panel-btn-icon">📊</div>
        <div class="admin-panel-btn-info">
          <div class="admin-panel-btn-title">Full Dashboard</div>
          <div class="admin-panel-btn-desc">Complete admin panel</div>
        </div>
      </div>
    </div>
  `);
}

// Delete Collection
function showDeleteCollection() {
  if (state.collections.length === 0) {
    showToast('No collections to delete', 'error');
    return;
  }
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">🗑️ Delete Collection</span>
      <button class="modal-close" onclick="openAdminPanel()">←</button>
    </div>
    <p style="color:var(--error);margin-bottom:16px;font-size:13px">⚠️ This will delete ALL cards in the collection!</p>
    <div class="form-group">
      <label class="form-label">Select Collection</label>
      <select class="form-input" id="delete-collection-select">
        ${state.collections.map(c => `<option value="${c.id}">${c.name} (${c.total_cards} cards)</option>`).join('')}
      </select>
    </div>
    <button class="btn" style="background:var(--error)" onclick="confirmDeleteCollection()">🗑️ Delete Collection</button>
  `);
}

async function confirmDeleteCollection() {
  const colId = document.getElementById('delete-collection-select').value;
  const col = state.collections.find(c => c.id === colId);
  
  if (!confirm(`Are you sure you want to delete "${col?.name}"? This cannot be undone!`)) return;
  
  try {
    const result = await api.request(`/collections/${colId}`, 'DELETE');
    if (result.error) {
      showToast(result.error, 'error');
    } else {
      showToast('Collection deleted!');
      await loadCollections();
      await loadInventory();
      render();
      openAdminPanel();
    }
  } catch (err) {
    showToast('Error deleting collection', 'error');
  }
}

// Delete Card
function showDeleteCard() {
  if (state.collections.length === 0) {
    showToast('No collections available', 'error');
    return;
  }
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">❌ Delete Card</span>
      <button class="modal-close" onclick="openAdminPanel()">←</button>
    </div>
    <div class="form-group">
      <label class="form-label">Select Collection</label>
      <select class="form-input" id="delete-card-collection" onchange="loadCardsForDelete()">
        ${state.collections.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Select Card</label>
      <select class="form-input" id="delete-card-select">
        <option>Loading...</option>
      </select>
    </div>
    <button class="btn" style="background:var(--error)" onclick="confirmDeleteCard()">❌ Delete Card</button>
  `);
  
  loadCardsForDelete();
}

async function loadCardsForDelete() {
  const colId = document.getElementById('delete-card-collection').value;
  const col = await api.getCollection(colId);
  const select = document.getElementById('delete-card-select');
  
  if (col.cards && col.cards.length > 0) {
    select.innerHTML = col.cards.map(c => 
      `<option value="${c.id}">${c.name} (${c.rarity})</option>`
    ).join('');
  } else {
    select.innerHTML = '<option value="">No cards in this collection</option>';
  }
}

async function confirmDeleteCard() {
  const cardId = document.getElementById('delete-card-select').value;
  if (!cardId) {
    showToast('Select a card first', 'error');
    return;
  }
  
  if (!confirm('Are you sure you want to delete this card? This cannot be undone!')) return;
  
  try {
    const result = await api.request(`/cards/${cardId}`, 'DELETE');
    if (result.error) {
      showToast(result.error, 'error');
    } else {
      showToast('Card deleted!');
      await loadCollections();
      await loadInventory();
      render();
      showDeleteCard(); // Stay on delete screen
    }
  } catch (err) {
    showToast('Error deleting card', 'error');
  }
}

// Create Collection with beautiful form and image upload
let collectionImage = null;

function showCreateCollection() {
  collectionImage = null;
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Create Collection</span>
      <button class="modal-close" onclick="openAdminPanel()">←</button>
    </div>
    <form onsubmit="createCollection(event)" id="create-collection-form">
      <div class="form-group">
        <label class="form-label">Collection Image</label>
        <div class="image-upload" onclick="document.getElementById('collection-image').click()">
          <input type="file" id="collection-image" accept="image/*" style="display:none" onchange="previewCollectionImage(this)">
          <div id="image-preview">
            <div class="image-upload-icon">📷</div>
            <div class="image-upload-text">Click to upload cover image</div>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Collection Name</label>
        <input class="form-input" name="name" placeholder="e.g. Bored Ape Yacht Club" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Symbol</label>
          <input class="form-input" name="symbol" placeholder="BAYC" required maxlength="10" style="text-transform:uppercase">
        </div>
        <div class="form-group">
          <label class="form-label">Floor Price</label>
          <input class="form-input" name="floorPrice" type="number" value="100" min="0">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input class="form-input" name="description" placeholder="A collection of unique digital art...">
      </div>
      <button type="submit" class="btn">✨ Create Collection</button>
    </form>
  `);
}

function previewCollectionImage(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      collectionImage = e.target.result;
      document.getElementById('image-preview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function createCollection(e) {
  e.preventDefault();
  const form = e.target;
  
  // Upload image first if exists
  let coverUrl = null;
  if (collectionImage) {
    showToast('Uploading image...', 'success');
    const uploadRes = await api.request('/uploads/image', 'POST', { 
      image: collectionImage, 
      type: 'collection' 
    });
    if (uploadRes.url) {
      coverUrl = uploadRes.url;
    }
  }
  
  const data = {
    name: form.name.value,
    symbol: form.symbol.value.toUpperCase(),
    description: form.description.value,
    floorPrice: parseInt(form.floorPrice.value) || 100,
    coverUrl
  };
  
  try {
    const result = await api.request('/collections', 'POST', data);
    if (result.error) {
      showToast(result.error, 'error');
    } else {
      showToast('Collection created successfully!');
      await loadCollections();
      render();
      openAdminPanel();
    }
  } catch (err) {
    showToast('Error creating collection', 'error');
  }
}

// Create Card with beautiful form
let cardImage = null;

function showCreateCard() {
  if (state.collections.length === 0) {
    showToast('Create a collection first!', 'error');
    return;
  }
  cardImage = null;
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Add New Card</span>
      <button class="modal-close" onclick="openAdminPanel()">←</button>
    </div>
    <form onsubmit="createCard(event)" id="create-card-form">
      <div class="form-group">
        <label class="form-label">Card Image</label>
        <div class="image-upload" onclick="document.getElementById('card-image').click()" style="aspect-ratio:1">
          <input type="file" id="card-image" accept="image/*" style="display:none" onchange="previewCardImage(this)">
          <div id="card-image-preview">
            <div class="image-upload-icon">🎨</div>
            <div class="image-upload-text">Upload card artwork</div>
          </div>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Collection</label>
        <select class="form-input" name="collectionId" required>
          ${state.collections.map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Card Name</label>
        <input class="form-input" name="name" placeholder="e.g. BAYC #1234 - Golden Fur" required>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Rarity</label>
          <select class="form-input" name="rarity" required>
            <option value="common">⚪ Common</option>
            <option value="rare">💙 Rare</option>
            <option value="epic">💜 Epic</option>
            <option value="legendary">⭐ Legendary</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Supply</label>
          <input class="form-input" name="totalSupply" type="number" value="100" min="1" placeholder="0 = unlimited">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Base Value</label>
          <input class="form-input" name="baseValue" type="number" value="10" min="1">
        </div>
        <div class="form-group">
          <label class="form-label">Drop Rate %</label>
          <input class="form-input" name="dropRate" type="number" value="10" min="1" max="100">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input class="form-input" name="description" placeholder="Card description...">
      </div>
      <button type="submit" class="btn">🎴 Add Card</button>
    </form>
  `);
}

function previewCardImage(input) {
  if (input.files && input.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      cardImage = e.target.result;
      document.getElementById('card-image-preview').innerHTML = `<img src="${e.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(input.files[0]);
  }
}

async function createCard(e) {
  e.preventDefault();
  const form = e.target;
  
  // Upload image first if exists
  let imageUrl = null;
  if (cardImage) {
    showToast('Uploading image...', 'success');
    const uploadRes = await api.request('/uploads/image', 'POST', { 
      image: cardImage, 
      type: 'card' 
    });
    if (uploadRes.url) {
      imageUrl = uploadRes.url;
    }
  }
  
  const data = {
    collectionId: form.collectionId.value,
    name: form.name.value,
    description: form.description.value,
    rarity: form.rarity.value,
    totalSupply: parseInt(form.totalSupply.value) || 0,
    baseValue: parseInt(form.baseValue.value) || 10,
    dropRate: parseInt(form.dropRate.value) || 10,
    imageUrl
  };
  
  try {
    const result = await api.request('/cards', 'POST', data);
    if (result.error) {
      showToast(result.error, 'error');
    } else {
      showToast('Card added successfully!');
      await loadCollections();
      render();
      // Stay on form to add more cards
      showCreateCard();
    }
  } catch (err) {
    showToast('Error adding card', 'error');
  }
}

// ============ UTILITIES ============
function formatTime(seconds) {
  if (!seconds || seconds <= 0) return 'Ready!';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// Start the app
init();
