import { useState } from 'react';
import App from './App';
import { AdminApp } from './admin/AdminApp';

type Tab = 'wallet' | 'cards' | 'admin';

export default function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('wallet');

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      background: '#0A0A0A',
      overflow: 'hidden'
    }}>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Wallet Tab */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: activeTab === 'wallet' ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'auto'
        }}>
          <App />
        </div>

        {/* Cards Tab */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: activeTab === 'cards' ? 'flex' : 'none'
        }}>
          <iframe
            src="http://localhost:3001"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              background: '#0A0A0A'
            }}
            title="CollectX Cards"
          />
        </div>

        {/* Admin Tab */}
        <div style={{
          position: 'absolute',
          inset: 0,
          display: activeTab === 'admin' ? 'flex' : 'none',
          flexDirection: 'column',
          overflow: 'auto'
        }}>
          <AdminApp />
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav style={{
        display: 'flex',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        background: '#0A0A0A',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        flexShrink: 0
      }}>
        {/* Wallet Button */}
        <button
          onClick={() => setActiveTab('wallet')}
          style={{
            flex: 1,
            padding: '12px 0 8px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={activeTab === 'wallet' ? '#a855f7' : 'rgba(255,255,255,0.4)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="6" width="20" height="14" rx="2"/>
            <path d="M22 10H18a2 2 0 0 0 0 4h4"/>
            <path d="M2 6V4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v2"/>
          </svg>
          <span style={{
            fontSize: '10px',
            fontWeight: 500,
            color: activeTab === 'wallet' ? '#a855f7' : 'rgba(255,255,255,0.4)'
          }}>
            Кошелёк
          </span>
        </button>

        {/* Cards Button */}
        <button
          onClick={() => setActiveTab('cards')}
          style={{
            flex: 1,
            padding: '12px 0 8px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={activeTab === 'cards' ? '#a855f7' : 'rgba(255,255,255,0.4)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="14" height="18" rx="2"/>
            <rect x="7" y="3" width="14" height="18" rx="2"/>
          </svg>
          <span style={{
            fontSize: '10px',
            fontWeight: 500,
            color: activeTab === 'cards' ? '#a855f7' : 'rgba(255,255,255,0.4)'
          }}>
            Карты
          </span>
        </button>

        {/* Admin Button */}
        <button
          onClick={() => setActiveTab('admin')}
          style={{
            flex: 1,
            padding: '12px 0 8px',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <svg 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke={activeTab === 'admin' ? '#a855f7' : 'rgba(255,255,255,0.4)'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          <span style={{
            fontSize: '10px',
            fontWeight: 500,
            color: activeTab === 'admin' ? '#a855f7' : 'rgba(255,255,255,0.4)'
          }}>
            Админ
          </span>
        </button>
      </nav>
    </div>
  );
}
