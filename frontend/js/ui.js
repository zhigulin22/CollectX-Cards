// UI Helpers
const collectionCovers = {
    bayc: '🐵', azuki: '👺', ppg: '🐧', doodle: '🎨', punk: '👾', default: '🎴'
};

const collectionColors = {
    bayc: '#1a1a1a', azuki: '#c53030', ppg: '#3b82f6', doodle: '#f59e0b'
};

function getIcon(name) {
    const n = (name || '').toLowerCase();
    for (const [k, v] of Object.entries(collectionCovers)) if (n.includes(k)) return v;
    return collectionCovers.default;
}

function getSymbol(name) {
    const n = (name || '').toLowerCase();
    if (n.includes('bored') || n.includes('bayc')) return 'BAYC';
    if (n.includes('azuki')) return 'AZUKI';
    if (n.includes('pudgy') || n.includes('ppg')) return 'PPG';
    if (n.includes('doodle')) return 'DOODLE';
    return 'NFT';
}

function showModal(html) {
    const modal = document.getElementById('modal');
    modal.innerHTML = `<div class="modal-content" onclick="event.stopPropagation()">${html}</div>`;
    modal.classList.add('active');
    modal.onclick = closeModal;
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function switchTab(name) {
    const cardsSection = document.querySelector('.collections-wrap');
    const filtersSection = document.querySelector('.filters');
    const cardsHeader = document.querySelector('.cards-header');
    const inventoryGrid = document.getElementById('inventory');
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    
    // Show selected
    event?.target?.classList.add('active') || document.querySelector(`.tab:nth-child(${name === 'cards' ? 1 : name === 'market' ? 2 : 3})`).classList.add('active');
    
    if (name === 'cards') {
        cardsSection.style.display = 'block';
        filtersSection.style.display = 'flex';
        cardsHeader.style.display = 'flex';
        inventoryGrid.style.display = 'grid';
    } else {
        cardsSection.style.display = 'none';
        filtersSection.style.display = 'none';
        cardsHeader.style.display = 'none';
        inventoryGrid.style.display = 'none';
        document.getElementById(`tab-${name}`).classList.add('active');
    }
}

function renderCollection(col, stats) {
    const owned = stats?.owned || 0;
    const total = stats?.total || col.total_cards || 0;
    const pct = total > 0 ? Math.round(owned / total * 100) : 0;
    const complete = pct === 100;
    
    return `
        <div class="collection" onclick="filterByCollection('${col.id}')">
            <div class="collection-cover">
                <span class="placeholder">${getIcon(col.name)}</span>
            </div>
            <div class="collection-name">${col.name}</div>
            <div class="collection-stats">
                <span class="collection-count">${owned}/${total}</span>
            </div>
            <div class="progress">
                <div class="progress-fill ${complete ? 'complete' : ''}" style="width:${pct}%"></div>
            </div>
        </div>
    `;
}

function renderCard(card) {
    const symbol = getSymbol(card.collection_name || card.name);
    return `
        <div class="card-item ${card.rarity}" onclick="viewCard('${card.id}')">
            ${card.serial_number ? `<span class="card-serial">#${card.serial_number}</span>` : ''}
            <div class="card-image">
                <span class="placeholder">${getIcon(card.collection_name || card.name)}</span>
            </div>
            <div class="card-footer">
                <div class="card-name">${card.name}</div>
                <div class="card-meta">
                    <span class="rarity-dot ${card.rarity}"></span>
                    <span class="card-collection">${symbol}</span>
                </div>
            </div>
        </div>
    `;
}

function renderBox(box) {
    const isFree = box.price === 0;
    return `
        <div class="box-item ${isFree ? 'free' : ''}" onclick="selectBox('${box.id}')">
            <div class="box-icon">${isFree ? '🎁' : '📦'}</div>
            <div class="box-name">${box.name}</div>
            <div class="box-desc">${box.cards_count} card${box.cards_count > 1 ? 's' : ''}</div>
            <div class="box-price ${isFree ? 'free' : 'coins'}">${isFree ? 'FREE' : `🪙 ${box.price}`}</div>
        </div>
    `;
}

function toast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    const t = document.createElement('div');
    t.className = 'toast';
    if (type === 'error') t.style.background = '#ef4444';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}
