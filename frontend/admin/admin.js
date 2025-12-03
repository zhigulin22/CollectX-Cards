// Admin Panel
let adminId = null;
let data = { collections: [], cards: [], boxes: [], users: [], stats: {} };

// Initialize - get admin ID from URL or use default
async function init() {
    const params = new URLSearchParams(window.location.search);
    adminId = params.get('admin') || localStorage.getItem('adminId');
    
    if (!adminId) {
        // Try to auth as default admin
        const auth = await fetch('/api/users/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ telegramId: 123456789, username: 'admin' })
        }).then(r => r.json());
        
        if (auth.user?.is_admin) {
            adminId = auth.user.id;
            localStorage.setItem('adminId', adminId);
        } else {
            alert('Access denied. Admin privileges required.');
            return;
        }
    }
    
    document.getElementById('admin-id').textContent = `ID: ${adminId.slice(0, 8)}...`;
    await loadData();
}

async function api(url, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const fullUrl = url.includes('?') ? `${url}&adminId=${adminId}` : `${url}?adminId=${adminId}`;
    return fetch('/api/admin' + fullUrl, opts).then(r => r.json());
}

async function loadData() {
    const result = await api('/dashboard');
    if (result.error) { alert(result.error); return; }
    data = result;
    render();
}

function render() {
    renderStats();
    renderCollections();
    renderCards();
    renderBoxes();
    renderUsers();
}

function renderStats() {
    document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card"><div class="label">Users</div><div class="value">${data.stats.totalUsers}</div></div>
        <div class="stat-card"><div class="label">Collections</div><div class="value">${data.stats.totalCollections}</div></div>
        <div class="stat-card"><div class="label">Cards</div><div class="value">${data.stats.totalCards}</div></div>
        <div class="stat-card"><div class="label">Minted</div><div class="value">${data.stats.totalMinted}</div></div>
    `;
}

function renderCollections() {
    const tbody = document.querySelector('#collections-table tbody');
    tbody.innerHTML = data.collections.map(c => `
        <tr>
            <td><strong>${c.name}</strong><br><small style="color:var(--muted)">${c.description || '-'}</small></td>
            <td>${c.symbol}</td>
            <td>${c.total_cards || 0}</td>
            <td>
                <button class="btn-sm btn-edit" onclick="editCollection('${c.id}')">Edit</button>
                <button class="btn-sm btn-delete" onclick="deleteCollection('${c.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderCards() {
    const colFilter = document.getElementById('cards-filter-col');
    colFilter.innerHTML = '<option value="">All Collections</option>' + 
        data.collections.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    filterCards();
}

function filterCards() {
    const col = document.getElementById('cards-filter-col').value;
    const rarity = document.getElementById('cards-filter-rarity').value;
    
    let cards = data.cards;
    if (col) cards = cards.filter(c => c.collection_id === col);
    if (rarity) cards = cards.filter(c => c.rarity === rarity);
    
    document.getElementById('cards-grid').innerHTML = cards.map(c => `
        <div class="admin-card ${c.rarity}">
            <div class="card-image">🎴</div>
            <div class="card-name">${c.name}</div>
            <div class="card-meta">
                <span class="badge ${c.rarity}">${c.rarity}</span>
                Supply: ${c.total_supply || '∞'} | Minted: ${c.minted_count || 0}
            </div>
            <div class="card-actions">
                <button class="btn-sm btn-edit" onclick="editCard('${c.id}')">Edit</button>
                <button class="btn-sm btn-delete" onclick="deleteCard('${c.id}')">Delete</button>
            </div>
        </div>
    `).join('');
}

function renderBoxes() {
    document.getElementById('boxes-list').innerHTML = data.boxes.map(b => `
        <div class="admin-box">
            <div class="box-header">
                <div>
                    <div class="box-name">${b.name}</div>
                    <div class="box-desc">${b.description || '-'}</div>
                </div>
                <div class="box-icon">${b.price === 0 ? '🎁' : '📦'}</div>
            </div>
            <div class="box-stats">
                <span>Price: ${b.price || 'Free'}</span>
                <span>Cards: ${b.cards_count}</span>
            </div>
        </div>
    `).join('');
}

function renderUsers() {
    const tbody = document.querySelector('#users-table tbody');
    tbody.innerHTML = data.users.map(u => `
        <tr>
            <td><strong>${u.username}</strong><br><small style="color:var(--muted)">TG: ${u.telegram_id}</small></td>
            <td><span class="badge ${u.rank}">${u.rank}</span></td>
            <td>${u.xp || 0}</td>
            <td>🪙 ${u.coins}</td>
            <td>
                <div class="toggle ${u.is_admin ? 'active' : ''}" onclick="toggleAdmin('${u.id}', ${!u.is_admin})"></div>
            </td>
            <td>
                <button class="btn-sm btn-success" onclick="giveCoins('${u.id}')">+Coins</button>
                <button class="btn-sm btn-edit" onclick="giveXp('${u.id}')">+XP</button>
            </td>
        </tr>
    `).join('');
}

// Panel switching
function showPanel(name) {
    document.querySelectorAll('.nav-item, .panel').forEach(el => el.classList.remove('active'));
    document.querySelector(`.nav-item:nth-child(${['dashboard','collections','cards','boxes','users'].indexOf(name)+1})`).classList.add('active');
    document.getElementById(`panel-${name}`).classList.add('active');
}

// Modal
function showModal(html) {
    const modal = document.getElementById('modal');
    modal.innerHTML = `<div class="modal-content">${html}</div>`;
    modal.classList.add('active');
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

// Forms
function showForm(type, item = null) {
    let html = `<div class="modal-header"><h2>${item ? 'Edit' : 'New'} ${type}</h2><button class="modal-close" onclick="closeModal()">×</button></div>`;
    
    if (type === 'collection') {
        html += `<form onsubmit="saveCollection(event, '${item?.id || ''}')">
            <div class="form-group"><label>Name</label><input name="name" value="${item?.name || ''}" required></div>
            <div class="form-group"><label>Symbol</label><input name="symbol" value="${item?.symbol || ''}" required placeholder="e.g. BAYC"></div>
            <div class="form-group"><label>Description</label><textarea name="description">${item?.description || ''}</textarea></div>
            <button type="submit" class="btn-primary form-submit">Save Collection</button>
        </form>`;
    }
    
    if (type === 'card') {
        html += `<form onsubmit="saveCard(event, '${item?.id || ''}')">
            <div class="form-group"><label>Collection</label><select name="collectionId" required>
                ${data.collections.map(c => `<option value="${c.id}" ${item?.collection_id === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
            </select></div>
            <div class="form-group"><label>Name</label><input name="name" value="${item?.name || ''}" required placeholder="e.g. BAYC #1234"></div>
            <div class="form-row">
                <div class="form-group"><label>Rarity</label><select name="rarity">
                    ${['common','rare','epic','legendary'].map(r => `<option value="${r}" ${item?.rarity === r ? 'selected' : ''}>${r}</option>`).join('')}
                </select></div>
                <div class="form-group"><label>Total Supply (0=∞)</label><input type="number" name="totalSupply" value="${item?.total_supply || 0}"></div>
            </div>
            <button type="submit" class="btn-primary form-submit">Save Card</button>
        </form>`;
    }
    
    if (type === 'box') {
        html += `<form onsubmit="saveBox(event, '${item?.id || ''}')">
            <div class="form-group"><label>Name</label><input name="name" value="${item?.name || ''}" required></div>
            <div class="form-group"><label>Description</label><textarea name="description">${item?.description || ''}</textarea></div>
            <div class="form-row">
                <div class="form-group"><label>Price (0=Free)</label><input type="number" name="price" value="${item?.price || 0}"></div>
                <div class="form-group"><label>Cards Count</label><input type="number" name="cardsCount" value="${item?.cards_count || 3}"></div>
            </div>
            <button type="submit" class="btn-primary form-submit">Save Box</button>
        </form>`;
    }
    
    showModal(html);
}

// CRUD Operations
async function saveCollection(e, id) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    await api(id ? `/collections/${id}` : '/collections', id ? 'PUT' : 'POST', d);
    closeModal(); loadData();
}

async function saveCard(e, id) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    await api(id ? `/cards/${id}` : '/cards', id ? 'PUT' : 'POST', d);
    closeModal(); loadData();
}

async function saveBox(e, id) {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(e.target));
    await api(id ? `/boxes/${id}` : '/boxes', id ? 'PUT' : 'POST', d);
    closeModal(); loadData();
}

function editCollection(id) { showForm('collection', data.collections.find(c => c.id === id)); }
function editCard(id) { showForm('card', data.cards.find(c => c.id === id)); }

async function deleteCollection(id) {
    if (confirm('Delete this collection and ALL its cards?')) {
        await api(`/collections/${id}`, 'DELETE');
        loadData();
    }
}

async function deleteCard(id) {
    if (confirm('Delete this card?')) {
        await api(`/cards/${id}`, 'DELETE');
        loadData();
    }
}

async function toggleAdmin(userId, isAdmin) {
    await api(`/users/${userId}/admin`, 'POST', { isAdmin });
    loadData();
}

async function giveCoins(userId) {
    const amount = prompt('How many coins to give?', '100');
    if (amount) {
        await api(`/users/${userId}/coins`, 'POST', { amount: parseInt(amount) });
        loadData();
    }
}

async function giveXp(userId) {
    const amount = prompt('How much XP to give?', '100');
    if (amount) {
        await api(`/users/${userId}/xp`, 'POST', { amount: parseInt(amount) });
        loadData();
    }
}

// Init
init();

