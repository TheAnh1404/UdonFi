import React from 'react';

interface AssetData {
  id: string;
  name: string;
  symbol: string;
  supplyApy: number;
  ltv: number;
}

interface UserAssetData {
  symbol: string;
  walletBalance: number;
  suppliedBalance: number;
  isCollateral: boolean;
}

interface LendMarketViewProps {
  assets: AssetData[];
  userBalances: { [key: string]: UserAssetData };
  connected: boolean;
  connectWallet: () => void;
  onOpenModal: (actionType: 'supply' | 'withdraw', assetSymbol: string) => void;
  onToggleCollateral: (assetSymbol: string) => void;
}

export const LendMarketView: React.FC<LendMarketViewProps> = ({
  assets,
  userBalances,
  connected,
  connectWallet,
  onOpenModal,
  onToggleCollateral,
}) => {
  return (
    <div className="lend-market-view">
      {!connected ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h2 className="glass-title" style={{ justifyContent: 'center', marginBottom: '12px' }}>
            Kết nối ví để bắt đầu cung cấp
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '480px', margin: '0 auto 30px auto' }}>
            Vui lòng kết nối ví Freighter của bạn để truy xuất số dư XLM, USDC, EURC của bạn và bắt đầu gửi tiền tích lũy lợi nhuận tự động.
          </p>
          <button className="btn btn-primary" style={{ maxWidth: '280px', margin: '0 auto' }} onClick={connectWallet}>
            Kết nối ví Freighter
          </button>
        </div>
      ) : (
        <div className="glass-panel">
          <div className="glass-title">
            <span>💰 Thị trường cung cấp thanh khoản (Supply Market)</span>
            <span className="badge-testnet" style={{ fontSize: '11px' }}>Phí giao dịch mạng cực thấp</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', marginTop: '-10px' }}>
            Bằng việc gửi tài sản vào UdonFi Stellar, bạn sẽ nhận được APY tích lũy tự động sau mỗi sổ cái (ledger). Bạn có thể sử dụng tài sản đó làm tài sản thế chấp để thực hiện vay.
          </p>

          <div className="market-table-container">
            <table className="market-table">
              <thead>
                <tr>
                  <th>Tài sản</th>
                  <th>Supply APY</th>
                  <th>Số dư ví của bạn</th>
                  <th>Bạn đã cung cấp</th>
                  <th>Sử dụng làm thế chấp</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const userData = userBalances[asset.symbol] || {
                    walletBalance: 0,
                    suppliedBalance: 0,
                    isCollateral: false,
                  };

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
                        <div className="apy-value">📈 {asset.supplyApy.toFixed(2)}%</div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Lãi kép tự động</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>
                          {userData.walletBalance.toLocaleString('vi-VN', { maximumFractionDigits: 4 })}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{asset.symbol}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: userData.suppliedBalance > 0 ? 'var(--color-success)' : 'inherit' }}>
                          {userData.suppliedBalance > 0 
                            ? userData.suppliedBalance.toLocaleString('vi-VN', { maximumFractionDigits: 4 })
                            : '0'
                          }
                        </div>
                        {userData.suppliedBalance > 0 && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{asset.symbol}</span>
                        )}
                      </td>
                      <td>
                        <label className="switch-container">
                          <input
                            type="checkbox"
                            className="switch-input"
                            checked={userData.isCollateral}
                            onChange={() => onToggleCollateral(asset.symbol)}
                            disabled={userData.suppliedBalance === 0}
                          />
                          <div className="switch-rail">
                            <div className="switch-knob"></div>
                          </div>
                          <span 
                            style={{ 
                              marginLeft: '10px', 
                              fontSize: '12px', 
                              fontWeight: 600,
                              color: userData.isCollateral && userData.suppliedBalance > 0 ? 'var(--color-success)' : 'var(--text-muted)'
                            }}
                          >
                            {userData.suppliedBalance === 0 
                              ? 'Cần gửi tiền' 
                              : userData.isCollateral ? 'Bật' : 'Tắt'
                            }
                          </span>
                        </label>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn-action-sm supply"
                            onClick={() => onOpenModal('supply', asset.symbol)}
                          >
                            📥 Cung cấp
                          </button>
                          <button
                            className={`btn-action-sm ${userData.suppliedBalance > 0 ? 'withdraw' : 'disabled'}`}
                            onClick={() => userData.suppliedBalance > 0 ? onOpenModal('withdraw', asset.symbol) : null}
                            disabled={userData.suppliedBalance === 0}
                            style={userData.suppliedBalance === 0 ? {} : {
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: '#fff',
                              border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}
                          >
                            📤 Rút tiền
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
      )}
    </div>
  );
};
