import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { TonConnectAppProvider } from './ton/TonConnectProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TonConnectAppProvider>
      <App />
    </TonConnectAppProvider>
  </React.StrictMode>
);


