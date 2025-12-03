// Wallet Module for CollectX
const RATE = 100; // 100 $X = 1 USDT

let walletState = {
  balanceUsdt: '0.00',
  balanceX: 0,
  rate: RATE,
  swapFee: 2,
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
  
  document.getElementById('portfolio-total').textContent = 
    walletState.hideBalance ? hidden : `$${total.toFixed(2)}`;
  
  document.getElementById('wallet-usdt').textContent = 
    walletState.hideBalance ? hidden : usdt.toFixed(2);
  document.getElementById('wallet-usdt-usd').textContent = 
    walletState.hideBalance ? hidden : usdt.toFixed(2);
  
  document.getElementById('wallet-x').textContent = 
    walletState.hideBalance ? hidden : x.toLocaleString();
  document.getElementById('wallet-x-usd').textContent = 
    walletState.hideBalance ? hidden : xInUsdt.toFixed(2);
}

// Render transaction history
function renderWalletHistory() {
  const container = document.getElementById('wallet-history');
  
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
  const icons = {
    swap: '⇄',
    send: '↑',
    receive: '↓',
    deposit: '↓',
    withdraw: '↑'
  };
  return icons[type] || '•';
}

function formatTxType(type) {
  const types = {
    swap: 'Swap',
    send: 'Sent',
    receive: 'Received',
    deposit: 'Deposit',
    withdraw: 'Withdraw'
  };
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

// Show Swap Modal
function showSwapModal() {
  const usdt = parseFloat(walletState.balanceUsdt) || 0;
  const x = walletState.balanceX || state.user?.coins || 0;
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Swap</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="swap-container">
      <div class="swap-direction" id="swap-direction" data-direction="usdt_to_x">
        <div class="swap-from">
          <p class="swap-label">From</p>
          <div class="swap-asset">
            <span>💵 USDT</span>
            <span class="swap-balance">Balance: ${usdt.toFixed(2)}</span>
          </div>
          <input type="number" class="swap-input" id="swap-amount" placeholder="0.00" oninput="updateSwapPreview()">
        </div>
        
        <button class="swap-switch" onclick="switchSwapDirection()">⇅</button>
        
        <div class="swap-to">
          <p class="swap-label">To</p>
          <div class="swap-asset">
            <span>🪙 $X</span>
          </div>
          <p class="swap-receive" id="swap-receive">≈ 0 $X</p>
        </div>
      </div>
      
      <div class="swap-info">
        <p>Rate: 1 USDT = ${walletState.rate} $X</p>
        <p>Fee: ${walletState.swapFee}%</p>
      </div>
      
      <button class="btn btn-success" onclick="executeSwap()">Swap</button>
    </div>
  `);
}

let swapDirection = 'usdt_to_x';

function switchSwapDirection() {
  swapDirection = swapDirection === 'usdt_to_x' ? 'x_to_usdt' : 'usdt_to_x';
  const usdt = parseFloat(walletState.balanceUsdt) || 0;
  const x = walletState.balanceX || state.user?.coins || 0;
  
  const fromAsset = swapDirection === 'usdt_to_x' 
    ? `💵 USDT</span><span class="swap-balance">Balance: ${usdt.toFixed(2)}`
    : `🪙 $X</span><span class="swap-balance">Balance: ${x.toLocaleString()}`;
  
  const toAsset = swapDirection === 'usdt_to_x' ? '🪙 $X' : '💵 USDT';
  
  document.querySelector('.swap-from .swap-asset').innerHTML = `<span>${fromAsset}</span>`;
  document.querySelector('.swap-to .swap-asset span').textContent = toAsset;
  
  updateSwapPreview();
}

function updateSwapPreview() {
  const amount = parseFloat(document.getElementById('swap-amount').value) || 0;
  const fee = amount * (walletState.swapFee / 100);
  const net = amount - fee;
  
  let receive;
  if (swapDirection === 'usdt_to_x') {
    receive = `≈ ${Math.floor(net * walletState.rate).toLocaleString()} $X`;
  } else {
    receive = `≈ ${(net / walletState.rate).toFixed(2)} USDT`;
  }
  
  document.getElementById('swap-receive').textContent = receive;
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
      showToast(`Swapped! Received ${result.received} ${swapDirection === 'usdt_to_x' ? '$X' : 'USDT'}`);
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

// Show Send Modal
function showSendModal() {
  const x = walletState.balanceX || state.user?.coins || 0;
  
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Send $X</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="send-container">
      <div class="form-group">
        <label class="form-label">Recipient Username or ID</label>
        <input type="text" class="form-input" id="send-recipient" placeholder="@username or telegram ID">
      </div>
      
      <div class="form-group">
        <label class="form-label">Amount ($X)</label>
        <input type="number" class="form-input" id="send-amount" placeholder="0" min="1">
        <p class="form-hint">Balance: ${x.toLocaleString()} $X • Fee: 1%</p>
      </div>
      
      <button class="btn" onclick="executeSend()">Send $X</button>
    </div>
  `);
}

async function executeSend() {
  const recipient = document.getElementById('send-recipient').value.trim();
  const amount = document.getElementById('send-amount').value;
  
  if (!recipient) {
    showToast('Enter recipient', 'error');
    return;
  }
  if (!amount || parseInt(amount) < 1) {
    showToast('Enter valid amount', 'error');
    return;
  }
  
  try {
    const result = await api.request('/wallet/send', 'POST', {
      fromUserId: state.user.id,
      toUsername: recipient.replace('@', ''),
      amount
    });
    
    if (result.success) {
      showToast(`Sent ${result.sent} $X to ${result.recipient}!`);
      state.user.coins = parseInt(result.newBalance);
      walletState.balanceX = state.user.coins;
      renderWallet();
      renderHeader();
      loadWalletHistory();
      closeModal();
    } else {
      showToast(result.error || 'Send failed', 'error');
    }
  } catch (e) {
    showToast('Send failed', 'error');
  }
}

// Show Receive Modal
function showReceiveModal() {
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Receive USDT</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="receive-container">
      <div class="receive-qr">
        <div class="qr-placeholder">📱</div>
      </div>
      
      <div class="receive-info">
        <p class="receive-label">Network</p>
        <p class="receive-value">TON (The Open Network)</p>
      </div>
      
      <div class="receive-info">
        <p class="receive-label">Address</p>
        <p class="receive-address" id="receive-address">Loading...</p>
        <button class="copy-btn" onclick="copyAddress()">Copy</button>
      </div>
      
      <div class="receive-info">
        <p class="receive-label">Memo</p>
        <p class="receive-memo" id="receive-memo">${state.user?.id?.slice(0, 8) || ''}</p>
      </div>
      
      <p class="receive-warning">⚠️ Send only USDT (TON network) to this address</p>
    </div>
  `);
  
  loadDepositAddress();
}

async function loadDepositAddress() {
  try {
    const data = await api.request(`/wallet/deposit/${state.user.id}`);
    document.getElementById('receive-address').textContent = data.address;
    document.getElementById('receive-memo').textContent = data.memo;
  } catch (e) {
    document.getElementById('receive-address').textContent = 'Error loading address';
  }
}

function copyAddress() {
  const address = document.getElementById('receive-address').textContent;
  navigator.clipboard.writeText(address);
  showToast('Address copied!');
}

// Show full history
function showFullHistory() {
  showModal(`
    <div class="modal-header">
      <span class="modal-title">Transaction History</span>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="history-filters">
      <select class="filter" onchange="filterHistory(this.value)">
        <option value="all">All</option>
        <option value="swap">Swaps</option>
        <option value="send">Sent</option>
        <option value="receive">Received</option>
      </select>
    </div>
    <div class="full-history" id="full-history">Loading...</div>
  `);
  
  loadFullHistory();
}

async function loadFullHistory(type = 'all') {
  try {
    const data = await api.request(`/wallet/history/${state.user.id}?limit=50&type=${type}`);
    const container = document.getElementById('full-history');
    
    if (!data.items?.length) {
      container.innerHTML = '<p class="history-empty">No transactions</p>';
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
    document.getElementById('full-history').innerHTML = '<p class="history-empty">Error loading history</p>';
  }
}

function filterHistory(type) {
  loadFullHistory(type);
}

// Tab switching
function switchTab(tab) {
  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tab}`);
  });
  
  // Load wallet data when switching to wallet tab
  if (tab === 'wallet') {
    loadWallet();
  }
}

