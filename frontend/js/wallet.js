// Wallet Module for CollectX - Full Implementation
const RATE = 100; // 100 $X = 1 USDT

let walletState = {
  balanceUsdt: '0.00',
  balanceX: 0,
  rate: RATE,
  swapFee: 2,
  sendFee: 1,
  transactions: [],
  hideBalance: false
};

// Load wallet data
async function loadWallet() {
  if (!state.user) return;
  
  try {
    const data = await api.request(`/wallet/balance/${state.user.id}`);
    walletState.balanceUsdt = data.balanceUsdt || '0.00';
    walletState.balanceX = parseInt(data.balanceX) || state.user.coins || 0;
    walletState.rate = data.rate || RATE;
    walletState.swapFee = data.swapFee || 2;
    
    renderWallet();
    loadWalletHistory();
  } catch (e) {
    console.error('Load wallet error:', e);
  }
}

// Load transaction history
async function loadWalletHistory() {
  if (!state.user) return;
  
  try {
    const data = await api.request(`/wallet/history/${state.user.id}?limit=5`);
    walletState.transactions = data.items || [];
    renderWalletHistory();
  } catch (e) {
    console.error('Load history error:', e);
  }
}

// Render wallet balances
function renderWallet() {
  const usdt = parseFloat(walletState.balanceUsdt) || 0;
  const x = walletState.balanceX || state.user?.coins || 0;
  const xInUsdt = x / walletState.rate;
  const total = usdt + xInUsdt;
  
  const hidden = '••••••';
  
  const portfolioEl = document.getElementById('portfolio-total');
  const walletUsdtEl = document.getElementById('wallet-usdt');
  const walletUsdtUsdEl = document.getElementById('wallet-usdt-usd');
  const walletXEl = document.getElementById('wallet-x');
  const walletXUsdEl = document.getElementById('wallet-x-usd');
  
  if (portfolioEl) portfolioEl.textContent = walletState.hideBalance ? hidden : `$${total.toFixed(2)}`;
  if (walletUsdtEl) walletUsdtEl.textContent = walletState.hideBalance ? hidden : usdt.toFixed(2);
  if (walletUsdtUsdEl) walletUsdtUsdEl.textContent = walletState.hideBalance ? hidden : usdt.toFixed(2);
  if (walletXEl) walletXEl.textContent = walletState.hideBalance ? hidden : x.toLocaleString();
  if (walletXUsdEl) walletXUsdEl.textContent = walletState.hideBalance ? hidden : xInUsdt.toFixed(2);
}

// Render transaction history
function renderWalletHistory() {
  const container = document.getElementById('wallet-history');
  if (!container) return;
  
  if (!walletState.transactions.length) {
    container.innerHTML = `
      <div class="history-empty">
        <span class="history-empty-icon">⇄</span>
        <p>No transactions yet</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = walletState.transactions.map(tx => {
    const isPositive = tx.amount.startsWith('+');
    const icon = getTransactionIcon(tx.type);
    const time = formatTxTime(tx.created_at);
    
    return `
      <div class="history-item">
        <div class="history-item-left">
          <span class="history-icon ${tx.type}">${icon}</span>
          <div class="history-info">
            <p class="history-title">${formatTxType(tx.type)}</p>
            <p class="history-desc">${tx.description || tx.currency}</p>
          </div>
        </div>
        <div class="history-item-right">
          <p class="history-amount ${isPositive ? 'positive' : 'negative'}">${tx.amount} ${tx.currency === 'X' ? '$X' : tx.currency}</p>
          <p class="history-time">${time}</p>
        </div>
      </div>
    `;
  }).join('');
}

function getTransactionIcon(type) {
  const icons = { swap: '⇄', send: '↑', receive: '↓', deposit: '↓', withdraw: '↑' };
  return icons[type] || '•';
}

function formatTxType(type) {
  const types = { swap: 'Swap', send: 'Sent', receive: 'Received', deposit: 'Deposit', withdraw: 'Withdraw' };
  return types[type] || type;
}

function formatTxTime(timestamp) {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diff = now - date;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
}

// Toggle hide balance
function toggleHideBalance() {
  walletState.hideBalance = !walletState.hideBalance;
  renderWallet();
}

// ============ SWAP MODAL ============
let swapDirection = 'usdt_to_x';

function showSwapModal() {
  const usdt = parseFloat(walletState.balanceUsdt) || 0;
  const x = walletState.balanceX || state.user?.coins || 0;
  swapDirection = 'usdt_to_x';
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">⇄ Swap</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    
    <div class="swap-container">
      <!-- From -->
      <div class="swap-card from" id="swap-from">
        <div class="swap-card-header">
          <span class="swap-label">From</span>
          <span class="swap-balance">Balance: <span id="swap-from-balance">${usdt.toFixed(2)}</span></span>
        </div>
        <div class="swap-card-body">
          <div class="swap-asset" id="swap-from-asset">
            <span class="swap-asset-icon">💵</span>
            <span class="swap-asset-name">USDT</span>
          </div>
          <input type="number" class="swap-amount-input" id="swap-amount" placeholder="0.00" 
                 oninput="updateSwapPreview()" step="0.01" min="0">
        </div>
        <button class="swap-max-btn" onclick="setSwapMax()">MAX</button>
      </div>
      
      <!-- Switch Button -->
      <button class="swap-switch-btn" onclick="switchSwapDirection()">
        <span>⇅</span>
      </button>
      
      <!-- To -->
      <div class="swap-card to" id="swap-to">
        <div class="swap-card-header">
          <span class="swap-label">To</span>
        </div>
        <div class="swap-card-body">
          <div class="swap-asset" id="swap-to-asset">
            <span class="swap-asset-icon">🪙</span>
            <span class="swap-asset-name">$X</span>
          </div>
          <div class="swap-receive-amount" id="swap-receive">0</div>
        </div>
      </div>
      
      <!-- Info -->
      <div class="swap-info-box">
        <div class="swap-info-row">
          <span>Rate</span>
          <span id="swap-rate">1 USDT = ${walletState.rate} $X</span>
        </div>
        <div class="swap-info-row">
          <span>Fee (${walletState.swapFee}%)</span>
          <span id="swap-fee">0</span>
        </div>
      </div>
      
      <button class="btn btn-success swap-confirm-btn" onclick="executeSwap()">
        Swap
      </button>
    </div>
  `);
}

function setSwapMax() {
  const usdt = parseFloat(walletState.balanceUsdt) || 0;
  const x = walletState.balanceX || 0;
  const max = swapDirection === 'usdt_to_x' ? usdt : x;
  document.getElementById('swap-amount').value = swapDirection === 'usdt_to_x' ? max.toFixed(2) : max;
  updateSwapPreview();
}

function switchSwapDirection() {
  swapDirection = swapDirection === 'usdt_to_x' ? 'x_to_usdt' : 'usdt_to_x';
  const usdt = parseFloat(walletState.balanceUsdt) || 0;
  const x = walletState.balanceX || 0;
  
  const fromAsset = document.getElementById('swap-from-asset');
  const toAsset = document.getElementById('swap-to-asset');
  const fromBalance = document.getElementById('swap-from-balance');
  const rateEl = document.getElementById('swap-rate');
  
  if (swapDirection === 'usdt_to_x') {
    fromAsset.innerHTML = '<span class="swap-asset-icon">💵</span><span class="swap-asset-name">USDT</span>';
    toAsset.innerHTML = '<span class="swap-asset-icon">🪙</span><span class="swap-asset-name">$X</span>';
    fromBalance.textContent = usdt.toFixed(2);
    rateEl.textContent = `1 USDT = ${walletState.rate} $X`;
  } else {
    fromAsset.innerHTML = '<span class="swap-asset-icon">🪙</span><span class="swap-asset-name">$X</span>';
    toAsset.innerHTML = '<span class="swap-asset-icon">💵</span><span class="swap-asset-name">USDT</span>';
    fromBalance.textContent = x.toLocaleString();
    rateEl.textContent = `${walletState.rate} $X = 1 USDT`;
  }
  
  document.getElementById('swap-amount').value = '';
  updateSwapPreview();
}

function updateSwapPreview() {
  const amount = parseFloat(document.getElementById('swap-amount').value) || 0;
  const fee = amount * (walletState.swapFee / 100);
  const net = amount - fee;
  
  let receive;
  if (swapDirection === 'usdt_to_x') {
    receive = Math.floor(net * walletState.rate).toLocaleString() + ' $X';
  } else {
    receive = (net / walletState.rate).toFixed(2) + ' USDT';
  }
  
  document.getElementById('swap-receive').textContent = receive;
  document.getElementById('swap-fee').textContent = swapDirection === 'usdt_to_x' 
    ? fee.toFixed(2) + ' USDT' 
    : Math.floor(fee).toLocaleString() + ' $X';
}

async function executeSwap() {
  const amount = document.getElementById('swap-amount').value;
  if (!amount || parseFloat(amount) <= 0) {
    showToast('Enter amount', 'error');
    return;
  }
  
  try {
    const result = await api.request('/wallet/swap', 'POST', {
      userId: state.user.id,
      amount,
      direction: swapDirection
    });
    
    if (result.success) {
      showToast(`✓ Swapped! Received ${result.received} ${swapDirection === 'usdt_to_x' ? '$X' : 'USDT'}`);
      walletState.balanceUsdt = result.balanceUsdt;
      walletState.balanceX = parseInt(result.balanceX);
      state.user.coins = walletState.balanceX;
      renderWallet();
      renderHeader();
      loadWalletHistory();
      closeModal();
    } else {
      showToast(result.error || 'Swap failed', 'error');
    }
  } catch (e) {
    showToast('Swap failed', 'error');
  }
}

// ============ SEND MODAL ============
let searchTimeout = null;
let selectedRecipient = null;

function showSendModal() {
  const x = walletState.balanceX || state.user?.coins || 0;
  selectedRecipient = null;
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">↑ Send $X</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    
    <div class="send-container">
      <!-- Recipient Search -->
      <div class="form-group">
        <label class="form-label">Recipient</label>
        <div class="recipient-search">
          <input type="text" class="form-input" id="send-search" 
                 placeholder="Search by username or ID" 
                 oninput="searchRecipients(this.value)">
          <div class="search-results" id="search-results"></div>
        </div>
        <div class="selected-recipient" id="selected-recipient" style="display:none">
          <span class="recipient-name" id="recipient-name"></span>
          <button class="recipient-clear" onclick="clearRecipient()">×</button>
        </div>
      </div>
      
      <!-- Amount -->
      <div class="form-group">
        <label class="form-label">Amount</label>
        <div class="amount-input-wrap">
          <input type="number" class="form-input amount-input" id="send-amount" 
                 placeholder="0" min="1" oninput="updateSendPreview()">
          <span class="amount-currency">$X</span>
          <button class="amount-max" onclick="setSendMax()">MAX</button>
        </div>
        <div class="amount-info">
          <span>Balance: ${x.toLocaleString()} $X</span>
          <span>Fee: ${walletState.sendFee || 1}%</span>
        </div>
      </div>
      
      <!-- Preview -->
      <div class="send-preview" id="send-preview" style="display:none">
        <div class="preview-row">
          <span>Amount</span>
          <span id="preview-amount">0 $X</span>
        </div>
        <div class="preview-row">
          <span>Fee</span>
          <span id="preview-fee">0 $X</span>
        </div>
        <div class="preview-row total">
          <span>Total</span>
          <span id="preview-total">0 $X</span>
        </div>
      </div>
      
      <button class="btn" id="send-btn" onclick="executeSend()" disabled>
        Send $X
      </button>
    </div>
  `);
}

function searchRecipients(query) {
  clearTimeout(searchTimeout);
  const results = document.getElementById('search-results');
  
  if (!query || query.length < 2) {
    results.innerHTML = '';
    results.style.display = 'none';
    return;
  }
  
  searchTimeout = setTimeout(async () => {
    try {
      const data = await api.request(`/wallet/users/search?query=${encodeURIComponent(query)}`);
      
      if (data.users && data.users.length > 0) {
        results.innerHTML = data.users.map(u => `
          <div class="search-result-item" onclick="selectRecipient('${u.id}', '${u.username || u.telegramId}')">
            <span class="result-avatar">👤</span>
            <span class="result-name">${u.username || 'ID: ' + u.telegramId}</span>
          </div>
        `).join('');
        results.style.display = 'block';
      } else {
        results.innerHTML = '<div class="search-no-results">No users found</div>';
        results.style.display = 'block';
      }
    } catch (e) {
      results.innerHTML = '';
      results.style.display = 'none';
    }
  }, 300);
}

function selectRecipient(id, name) {
  selectedRecipient = { id, name };
  document.getElementById('search-results').style.display = 'none';
  document.getElementById('send-search').style.display = 'none';
  document.getElementById('selected-recipient').style.display = 'flex';
  document.getElementById('recipient-name').textContent = '@' + name;
  updateSendPreview();
}

function clearRecipient() {
  selectedRecipient = null;
  document.getElementById('send-search').style.display = 'block';
  document.getElementById('send-search').value = '';
  document.getElementById('selected-recipient').style.display = 'none';
  updateSendPreview();
}

function setSendMax() {
  const x = walletState.balanceX || 0;
  const fee = Math.ceil(x * (walletState.sendFee / 100));
  const max = Math.max(0, x - fee);
  document.getElementById('send-amount').value = max;
  updateSendPreview();
}

function updateSendPreview() {
  const amount = parseInt(document.getElementById('send-amount').value) || 0;
  const preview = document.getElementById('send-preview');
  const btn = document.getElementById('send-btn');
  
  if (amount > 0 && selectedRecipient) {
    const fee = Math.ceil(amount * (walletState.sendFee / 100));
    const total = amount + fee;
    
    document.getElementById('preview-amount').textContent = amount.toLocaleString() + ' $X';
    document.getElementById('preview-fee').textContent = fee.toLocaleString() + ' $X';
    document.getElementById('preview-total').textContent = total.toLocaleString() + ' $X';
    
    preview.style.display = 'block';
    btn.disabled = total > walletState.balanceX;
  } else {
    preview.style.display = 'none';
    btn.disabled = true;
  }
}

async function executeSend() {
  if (!selectedRecipient) {
    showToast('Select recipient', 'error');
    return;
  }
  
  const amount = document.getElementById('send-amount').value;
  if (!amount || parseInt(amount) < 1) {
    showToast('Enter valid amount', 'error');
    return;
  }
  
  try {
    const result = await api.request('/wallet/send', 'POST', {
      fromUserId: state.user.id,
      toUsername: selectedRecipient.name,
      amount
    });
    
    if (result.success) {
      // Show success
      showModal(`
        <div class="send-success">
          <div class="success-icon">✓</div>
          <h2>Sent Successfully!</h2>
          <p class="success-amount">${result.sent} $X</p>
          <p class="success-to">to @${result.recipient}</p>
          <button class="btn btn-success" onclick="closeModal(); loadWallet();">Done</button>
        </div>
      `);
      
      state.user.coins = parseInt(result.newBalance);
      walletState.balanceX = state.user.coins;
      renderHeader();
    } else {
      showToast(result.error || 'Send failed', 'error');
    }
  } catch (e) {
    showToast('Send failed', 'error');
  }
}

// ============ RECEIVE MODAL ============
function showReceiveModal() {
  showModal(`
    <div class="modal-header">
      <span class="modal-title">↓ Receive USDT</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    
    <div class="receive-container">
      <div class="receive-qr" id="receive-qr">
        <div class="qr-loading">Loading...</div>
      </div>
      
      <div class="receive-badge">
        <span>TON Network • USDT</span>
      </div>
      
      <div class="receive-field">
        <div class="field-header">
          <span class="field-label">Deposit Address</span>
          <button class="copy-btn" onclick="copyField('address')">📋 Copy</button>
        </div>
        <div class="field-value mono" id="deposit-address">Loading...</div>
      </div>
      
      <div class="receive-field">
        <div class="field-header">
          <span class="field-label">Memo (Required!)</span>
          <button class="copy-btn" onclick="copyField('memo')">📋 Copy</button>
        </div>
        <div class="field-value large" id="deposit-memo">Loading...</div>
      </div>
      
      <div class="receive-warning">
        ⚠️ Always include the Memo when sending!<br>
        <small>Funds without memo cannot be recovered.</small>
      </div>
    </div>
  `);
  
  loadDepositInfo();
}

async function loadDepositInfo() {
  try {
    const data = await api.request(`/wallet/deposit/${state.user.id}`);
    
    document.getElementById('deposit-address').textContent = data.address;
    document.getElementById('deposit-memo').textContent = data.memo;
    
    // Generate QR code
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(data.address)}&bgcolor=1c1c1e&color=ffffff`;
    document.getElementById('receive-qr').innerHTML = `<img src="${qrUrl}" alt="QR Code" class="qr-image">`;
    
  } catch (e) {
    document.getElementById('deposit-address').textContent = 'Error loading address';
  }
}

function copyField(field) {
  const el = document.getElementById(field === 'address' ? 'deposit-address' : 'deposit-memo');
  navigator.clipboard.writeText(el.textContent);
  showToast('Copied!');
}

// ============ HISTORY MODAL ============
function showFullHistory() {
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Transaction History</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="history-filters">
      <button class="filter-btn active" data-type="all" onclick="filterHistoryType('all', this)">All</button>
      <button class="filter-btn" data-type="swap" onclick="filterHistoryType('swap', this)">Swaps</button>
      <button class="filter-btn" data-type="send" onclick="filterHistoryType('send', this)">Sent</button>
      <button class="filter-btn" data-type="receive" onclick="filterHistoryType('receive', this)">Received</button>
    </div>
    <div class="full-history" id="full-history">
      <div class="history-loading">Loading...</div>
    </div>
  `);
  
  loadFullHistory('all');
}

async function loadFullHistory(type = 'all') {
  try {
    const data = await api.request(`/wallet/history/${state.user.id}?limit=50&type=${type}`);
    const container = document.getElementById('full-history');
    
    if (!data.items?.length) {
      container.innerHTML = '<div class="history-empty"><p>No transactions</p></div>';
      return;
    }
    
    container.innerHTML = data.items.map(tx => {
      const isPositive = tx.amount.startsWith('+');
      return `
        <div class="history-item">
          <div class="history-item-left">
            <span class="history-icon ${tx.type}">${getTransactionIcon(tx.type)}</span>
            <div class="history-info">
              <p class="history-title">${formatTxType(tx.type)}</p>
              <p class="history-desc">${tx.description || ''}</p>
            </div>
          </div>
          <div class="history-item-right">
            <p class="history-amount ${isPositive ? 'positive' : 'negative'}">${tx.amount} ${tx.currency === 'X' ? '$X' : tx.currency}</p>
            <p class="history-time">${formatTxTime(tx.created_at)}</p>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    document.getElementById('full-history').innerHTML = '<div class="history-empty"><p>Error loading history</p></div>';
  }
}

function filterHistoryType(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('full-history').innerHTML = '<div class="history-loading">Loading...</div>';
  loadFullHistory(type);
}

// ============ TAB SWITCHING ============
function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tab}`);
  });
  
  if (tab === 'wallet') {
    loadWallet();
  }
}
