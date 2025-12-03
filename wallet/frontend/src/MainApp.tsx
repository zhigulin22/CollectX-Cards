import { useState } from 'react';
import App from './App';

type Tab = 'wallet' | 'cards';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('wallet');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0A0A0A' }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        background: '#0A0A0A',
        padding: '0 16px',
        flexShrink: 0
      }}>
        <button
          onClick={() => setActiveTab('wallet')}
          style={{
            flex: 1,
            padding: '16px',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'wallet' ? '#a855f7' : 'rgba(255,255,255,0.5)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'wallet' ? '2px solid #a855f7' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          💰 Кошелёк
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          style={{
            flex: 1,
            padding: '16px',
            background: 'transparent',
            border: 'none',
            color: activeTab === 'cards' ? '#a855f7' : 'rgba(255,255,255,0.5)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            borderBottom: activeTab === 'cards' ? '2px solid #a855f7' : '2px solid transparent',
            transition: 'all 0.2s'
          }}
        >
          🃏 Карты
        </button>
      </nav>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Wallet Tab */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: activeTab === 'wallet' ? 'block' : 'none',
          overflow: 'auto'
        }}>
          <App />
        </div>

        {/* Cards Tab */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: activeTab === 'cards' ? 'block' : 'none'
        }}>
          <iframe
            src="/cards/"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#0A0A0A'
            }}
            title="CollectX Cards"
          />
        </div>
      </div>
    </div>
  );
}

