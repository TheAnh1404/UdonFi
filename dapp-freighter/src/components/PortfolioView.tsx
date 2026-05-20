import React from 'react';

interface UserAssetData {
  symbol: string;
  name: string;
  walletBalance: number;
  suppliedBalance: number;
  borrowedBalance: number;
  isCollateral: boolean;
}

interface PortfolioViewProps {
  userBalances: { [key: string]: UserAssetData };
  connected: boolean;
  connectWallet: () => void;
  onOpenModal: (actionType: 'supply' | 'withdraw' | 'borrow' | 'repay', assetSymbol: string) => void;
  onToggleCollateral: (assetSymbol: string) => void;
  totalSuppliedUsd: number;
  totalBorrowedUsd: number;
  borrowCapacityUsd: number;
  healthFactor: string;
  netApy: number;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  userBalances,
  connected,
  connectWallet,
  onOpenModal,
  onToggleCollateral,
  totalSuppliedUsd,
  totalBorrowedUsd,
  borrowCapacityUsd,
  healthFactor,
  netApy,
}) => {
  
  // Calculate SVG Health Gauge variables
  const radius = 80;
  const circumference = 2 * Math.PI * radius; // ~502.65
  
  let strokeDashoffset = 0;
  let gaugeColor = 'var(--color-success)';

  const parsedHealth = parseFloat(healthFactor);

  if (healthFactor === '∞') {
    strokeDashoffset = 0; // Full circle
    gaugeColor = 'var(--color-success)';
  } else if (!isNaN(parsedHealth)) {
    // Map health factor [1.0 to 3.0] to [0% to 100%] representation on gauge
    const minH = 1.0;
    const maxH = 3.0;
    const ratio = Math.max(0, Math.min((parsedHealth - minH) / (maxH - minH), 1));
    strokeDashoffset = circumference * (1 - ratio);

    if (parsedHealth > 1.5) {
      gaugeColor = 'var(--color-success)'; // Safe
    } else if (parsedHealth > 1.1) {
      gaugeColor = 'var(--color-warning)'; // Warning
    } else {
      gaugeColor = 'var(--color-error)'; // Critical
    }
  } else {
    strokeDashoffset = circumference; // Empty
  }

  // Filter lists of active positions
  const suppliedPositions = Object.values(userBalances).filter(b => b.suppliedBalance > 0);
  const borrowedPositions = Object.values(userBalances).filter(b => b.borrowedBalance > 0);

  return (
    <div className="portfolio-view">
      {!connected ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h2 className="glass-title" style={{ justifyContent: 'center', marginBottom: '12px' }}>
            Kết nối ví để xem tài sản của bạn
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '480px', margin: '0 auto 30px auto' }}>
            Vui lòng kết nối ví Freighter để thống kê đầy đủ các khoản nợ, lãi suất, sức khỏe tín dụng và quyền sở hữu trong giao thức.
          </p>
          <button className="btn btn-primary" style={{ maxWidth: '280px', margin: '0 auto' }} onClick={connectWallet}>
            Kết nối ví Freighter
          </button>
        </div>
      ) : (
        <div className="portfolio-content">
          {/* Health factor and asset summaries */}
          <div className="glass-panel">
            <h2 className="glass-title">💼 Phân tích sức khỏe & Vốn thế chấp</h2>
            <div className="health-overview">
              <div className="health-gauge-container">
                <svg className="gauge-svg">
                  <circle className="gauge-bg" cx="100" cy="100" r={radius} />
                  <circle
                    className="gauge-fill"
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke={gaugeColor}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="gauge-center-text">
                  <span className="gauge-value" style={{ color: gaugeColor }}>{healthFactor}</span>
                  <span className="gauge-label">Sức khỏe</span>
                </div>
              </div>

              <div className="health-details-grid">
                <div className="summary-card">
                  <div className="summary-label">Tổng thế chấp (USD)</div>
                  <div className="summary-value success">${totalSuppliedUsd.toFixed(2)}</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cơ sở tính toán vay</span>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Tổng nợ thế chấp (USD)</div>
                  <div className="summary-value secondary">${totalBorrowedUsd.toFixed(2)}</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Tích lũy lãi suất vay hàng giờ</span>
                </div>
                <div className="summary-card">
                  <div className="summary-label">Hạn mức vay khả dụng</div>
                  <div className="summary-value purple">${(borrowCapacityUsd - totalBorrowedUsd).toFixed(2)}</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Khoản có thể vay thêm</span>
                </div>
                <div className="summary-card">
                  <div className="summary-label">APY ròng trung bình</div>
                  <div className="summary-value">
                    {netApy >= 0 ? `+${netApy.toFixed(2)}%` : `${netApy.toFixed(2)}%`}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Chênh lệch Supply / Borrow APY</span>
                </div>
              </div>
            </div>
          </div>

          {/* User Active Supplies */}
          <div className="glass-panel">
            <h2 className="glass-title">📥 Vị thế cung cấp của bạn (Supplied Balances)</h2>
            {suppliedPositions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '14px', marginBottom: '16px' }}>Bạn chưa cung cấp thanh khoản nào.</p>
                <button 
                  className="btn btn-secondary" 
                  style={{ display: 'inline-flex', width: 'auto', padding: '8px 20px', fontSize: '13px' }}
                  onClick={() => onOpenModal('supply', 'USDC')}
                >
                  Gửi tiền ngay
                </button>
              </div>
            ) : (
              <div className="market-table-container">
                <table className="market-table">
                  <thead>
                    <tr>
                      <th>Tài sản</th>
                      <th>Lợi tức tích lũy</th>
                      <th>Số tiền ký gửi</th>
                      <th>Kích hoạt thế chấp</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliedPositions.map((position) => (
                      <tr key={position.symbol}>
                        <td className="asset-cell">
                          <div className={`asset-icon-box ${position.symbol.toLowerCase()}`}>
                            {position.symbol === 'XLM' && '🚀'}
                            {position.symbol === 'USDC' && '💵'}
                            {position.symbol === 'EURC' && '💶'}
                            {position.symbol === 'USDT' && '₮'}
                            {position.symbol === 'ETH' && '🔷'}
                          </div>
                          <div>
                            <div className="asset-name">{position.name}</div>
                            <div className="asset-symbol">{position.symbol}</div>
                          </div>
                        </td>
                        <td>
                          <div className="apy-value">📈 +{(position.symbol === 'XLM' ? 3.5 : position.symbol === 'USDC' ? 6.2 : position.symbol === 'EURC' ? 5.8 : position.symbol === 'USDT' ? 6.5 : 4.1).toFixed(2)}% APY</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                            {position.suppliedBalance.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} {position.symbol}
                          </div>
                        </td>
                        <td>
                          <label className="switch-container">
                            <input
                              type="checkbox"
                              className="switch-input"
                              checked={position.isCollateral}
                              onChange={() => onToggleCollateral(position.symbol)}
                            />
                            <div className="switch-rail">
                              <div className="switch-knob"></div>
                            </div>
                            <span style={{ marginLeft: '10px', fontSize: '12px', fontWeight: 600 }}>
                              {position.isCollateral ? 'Đang bật' : 'Đang tắt'}
                            </span>
                          </label>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn-action-sm supply"
                              onClick={() => onOpenModal('supply', position.symbol)}
                            >
                              Cung cấp thêm
                            </button>
                            <button
                              className="btn-action-sm"
                              onClick={() => onOpenModal('withdraw', position.symbol)}
                              style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: '#fff',
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                              }}
                            >
                              Rút bớt
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* User Active Loans */}
          <div className="glass-panel" style={{ marginBottom: 0 }}>
            <h2 className="glass-title">⚡ Vị thế nợ của bạn (Borrowed Balances)</h2>
            {borrowedPositions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <p style={{ fontSize: '14px', marginBottom: '16px' }}>Bạn chưa có khoản vay nào đang hoạt động.</p>
                <button 
                  className="btn btn-secondary" 
                  style={{ display: 'inline-flex', width: 'auto', padding: '8px 20px', fontSize: '13px' }}
                  onClick={() => onOpenModal('borrow', 'USDC')}
                >
                  Thực hiện vay ngay
                </button>
              </div>
            ) : (
              <div className="market-table-container">
                <table className="market-table">
                  <thead>
                    <tr>
                      <th>Tài sản</th>
                      <th>Lãi suất nợ</th>
                      <th>Khoản vay hiện tại</th>
                      <th style={{ textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {borrowedPositions.map((position) => (
                      <tr key={position.symbol}>
                        <td className="asset-cell">
                          <div className={`asset-icon-box ${position.symbol.toLowerCase()}`}>
                            {position.symbol === 'XLM' && '🚀'}
                            {position.symbol === 'USDC' && '💵'}
                            {position.symbol === 'EURC' && '💶'}
                            {position.symbol === 'USDT' && '₮'}
                            {position.symbol === 'ETH' && '🔷'}
                          </div>
                          <div>
                            <div className="asset-name">{position.name}</div>
                            <div className="asset-symbol">{position.symbol}</div>
                          </div>
                        </td>
                        <td>
                          <div className="apy-value borrow">⚡ {(position.symbol === 'XLM' ? 5.5 : position.symbol === 'USDC' ? 8.4 : position.symbol === 'EURC' ? 7.9 : position.symbol === 'USDT' ? 8.8 : 6.2).toFixed(2)}% APY</div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 700, color: 'var(--color-warning)' }}>
                            {position.borrowedBalance.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} {position.symbol}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              className="btn-action-sm borrow"
                              onClick={() => onOpenModal('borrow', position.symbol)}
                            >
                              Vay thêm
                            </button>
                            <button
                              className="btn-action-sm supply"
                              onClick={() => onOpenModal('repay', position.symbol)}
                            >
                              🔒 Trả nợ
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
