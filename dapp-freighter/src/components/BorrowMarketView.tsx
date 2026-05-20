import React from 'react';

interface AssetData {
  id: string;
  name: string;
  symbol: string;
  borrowApy: number;
  totalBorrowed: string;
}

interface UserAssetData {
  symbol: string;
  walletBalance: number;
  borrowedBalance: number;
}

interface BorrowMarketViewProps {
  assets: AssetData[];
  userBalances: { [key: string]: UserAssetData };
  connected: boolean;
  connectWallet: () => void;
  onOpenModal: (actionType: 'borrow' | 'repay', assetSymbol: string) => void;
  borrowCapacityUsd: number;
  totalBorrowedUsd: number;
}

export const BorrowMarketView: React.FC<BorrowMarketViewProps> = ({
  assets,
  userBalances,
  connected,
  connectWallet,
  onOpenModal,
  borrowCapacityUsd,
  totalBorrowedUsd,
}) => {
  // Borrow limit used percentage
  const limitUsedPercent = borrowCapacityUsd > 0 
    ? Math.min((totalBorrowedUsd / borrowCapacityUsd) * 100, 100) 
    : 0;

  // Determine progress bar color based on risk levels
  const getProgressBarColor = () => {
    if (limitUsedPercent > 85) return 'var(--color-error)';
    if (limitUsedPercent > 60) return 'var(--color-warning)';
    return 'var(--color-secondary)';
  };

  return (
    <div className="borrow-market-view">
      {!connected ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h2 className="glass-title" style={{ justifyContent: 'center', marginBottom: '12px' }}>
            Kết nối ví để thực hiện vay
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '480px', margin: '0 auto 30px auto' }}>
            Vui lòng kết nối ví Freighter của bạn để kiểm tra khả năng vay thế chấp của bạn dựa trên tài sản ký gửi và kích hoạt nguồn vốn tức thì.
          </p>
          <button className="btn btn-primary" style={{ maxWidth: '280px', margin: '0 auto' }} onClick={connectWallet}>
            Kết nối ví Freighter
          </button>
        </div>
      ) : (
        <div className="borrow-content">
          {/* Borrow Limit / Capacity progress bar panel */}
          <div className="glass-panel">
            <h2 className="glass-title">🛡️ Giới hạn khoản vay thế chấp (Borrow Limit)</h2>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Bạn đã sử dụng:</span>
              <span style={{ fontWeight: 700, color: getProgressBarColor() }}>
                {limitUsedPercent.toFixed(1)}% (${totalBorrowedUsd.toFixed(2)} / ${borrowCapacityUsd.toFixed(2)})
              </span>
            </div>

            <div style={{ 
              width: '100%', 
              height: '10px', 
              background: 'rgba(255,255,255,0.03)', 
              borderRadius: '6px', 
              overflow: 'hidden', 
              border: '1px solid rgba(255,255,255,0.05)',
              marginBottom: '16px'
            }}>
              <div style={{ 
                width: `${limitUsedPercent}%`, 
                height: '100%', 
                background: getProgressBarColor(), 
                borderRadius: '6px',
                transition: 'width 0.5s ease-in-out',
                boxShadow: `0 0 10px ${getProgressBarColor()}`
              }} />
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              ⚠️ <strong>Cảnh báo thanh lý:</strong> Nếu giới hạn khoản vay của bạn vượt quá <strong>100%</strong> (tương ứng Health Factor &lt; 1.0) do biến động giá trị tài sản thế chấp hoặc tích lũy lãi suất vay, tài sản thế chấp của bạn có thể bị thanh lý một phần để đảm bảo an toàn cho giao thức.
            </p>
          </div>

          {/* Borrow Assets Table */}
          <div className="glass-panel">
            <div className="glass-title">
              <span>⚡ Thị trường vay thế chấp (Borrow Market)</span>
              <span className="badge-testnet" style={{ fontSize: '11px' }}>Hỗ trợ Flash Loan</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', marginTop: '-10px' }}>
              Hãy vay các tài sản Stellar khác nhau chống lại tài sản thế chấp của bạn. Tỷ lệ LTV càng cao, khả năng vay của bạn càng lớn. Lãi suất vay tích lũy trực tiếp vào khoản nợ của bạn.
            </p>

            <div className="market-table-container">
              <table className="market-table">
                <thead>
                  <tr>
                    <th>Tài sản</th>
                    <th>Borrow APY</th>
                    <th>Tính thanh khoản</th>
                    <th>Khoản nợ của bạn</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const userData = userBalances[asset.symbol] || {
                      walletBalance: 0,
                      borrowedBalance: 0,
                    };

                    // Check if borrowable (user must have collateral and borrow capacity remaining)
                    const canBorrow = borrowCapacityUsd > 0 && totalBorrowedUsd < borrowCapacityUsd;

                    return (
                      <tr key={asset.id}>
                        <td className="asset-cell">
                          <div className={`asset-icon-box ${asset.symbol.toLowerCase()}`}>
                            {asset.symbol === 'XLM' && '🚀'}
                            {asset.symbol === 'USDC' && '💵'}
                            {asset.symbol === 'EURC' && '💶'}
                            {asset.symbol === 'USDT' && '₮'}
                            {asset.symbol === 'ETH' && '🔷'}
                          </div>
                          <div>
                            <div className="asset-name">{asset.name}</div>
                            <div className="asset-symbol">{asset.symbol}</div>
                          </div>
                        </td>
                        <td>
                          <div className="apy-value borrow">⚡ {asset.borrowApy.toFixed(2)}%</div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tính theo khối</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{asset.totalBorrowed}</div>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Khả dụng tức thì</span>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: userData.borrowedBalance > 0 ? 'var(--color-warning)' : 'inherit' }}>
                            {userData.borrowedBalance > 0 
                              ? userData.borrowedBalance.toLocaleString('vi-VN', { maximumFractionDigits: 4 })
                              : '0'
                            }
                          </div>
                          {userData.borrowedBalance > 0 && (
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{asset.symbol}</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              className={`btn-action-sm ${canBorrow ? 'borrow' : 'disabled'}`}
                              onClick={() => canBorrow ? onOpenModal('borrow', asset.symbol) : null}
                              disabled={!canBorrow}
                            >
                              ⚡ Vay
                            </button>
                            <button
                              className={`btn-action-sm ${userData.borrowedBalance > 0 ? 'supply' : 'disabled'}`}
                              onClick={() => userData.borrowedBalance > 0 ? onOpenModal('repay', asset.symbol) : null}
                              disabled={userData.borrowedBalance === 0}
                              style={userData.borrowedBalance === 0 ? {} : {
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              🔑 Trả nợ
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
