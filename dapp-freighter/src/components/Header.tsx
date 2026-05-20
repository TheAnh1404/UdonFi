import React from 'react';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  connected: boolean;
  publicKey: string | null;
  balance: string | null;
  loadingBalance: boolean;
  connectWallet: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  setCurrentTab,
  connected,
  publicKey,
  balance,
  loadingBalance,
  connectWallet,
}) => {
  
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  const copyToClipboard = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      alert('Đã sao chép địa chỉ ví vào bộ nhớ tạm!');
    }
  };

  return (
    <header className="app-header">
      <div className="logo-section">
        <div className="logo-icon">🍜</div>
        <div>
          <div className="logo-text">UdonFi</div>
          <span className="badge-testnet" style={{ fontSize: '9px', marginTop: '2px' }}>
            Stellar Lending
          </span>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab ${currentTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentTab('dashboard')}
        >
          📊 Dashboard
        </button>
        <button
          className={`nav-tab ${currentTab === 'lend' ? 'active' : ''}`}
          onClick={() => setCurrentTab('lend')}
        >
          💰 Supply
        </button>
        <button
          className={`nav-tab ${currentTab === 'borrow' ? 'active' : ''}`}
          onClick={() => setCurrentTab('borrow')}
        >
          ⚡ Borrow
        </button>
        <button
          className={`nav-tab ${currentTab === 'portfolio' ? 'active' : ''}`}
          onClick={() => setCurrentTab('portfolio')}
        >
          💼 Portfolio
        </button>
        <button
          className={`nav-tab ${currentTab === 'faucet' ? 'active' : ''}`}
          onClick={() => setCurrentTab('faucet')}
        >
          🚰 Faucet
        </button>
      </nav>

      <div className="header-actions">
        <div className="wallet-widget">
          {!connected ? (
            <button className="btn-wallet-connect" onClick={connectWallet}>
              <span className="status-indicator-dot inactive"></span>
              Kết nối ví Freighter
            </button>
          ) : (
            <div className="wallet-details">
              <span className="status-indicator-dot active" style={{ marginLeft: '4px' }}></span>
              <span className="wallet-xlm">
                {loadingBalance ? (
                  '...'
                ) : (
                  `${balance || '0'} XLM`
                )}
              </span>
              <span 
                className="wallet-addr" 
                onClick={copyToClipboard} 
                title="Click để sao chép địa chỉ ví"
              >
                {publicKey ? truncateAddress(publicKey) : ''} 📋
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
