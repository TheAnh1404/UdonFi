import { soroban } from '../services/soroban';

interface AssetData {
  id: string;
  name: string;
  symbol: string;
  supplyApy: number;
  borrowApy: number;
  totalSupplied: string;
  totalBorrowed: string;
  ltv: number;
}

interface DashboardViewProps {
  assets: AssetData[];
  onNavigate: (tab: string) => void;
  connected: boolean;
  totalSuppliedUsd: number;
  totalBorrowedUsd: number;
  netApy: number;
  healthFactor: string;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  assets,
  onNavigate,
  connected,
  totalSuppliedUsd,
  totalBorrowedUsd,
  netApy,
  healthFactor,
}) => {
  // Compute global active stats using soroban service
  const globalStats = soroban.getProtocolGlobalStats();
  const globalTotalSupplied = globalStats.globalTotalSupplied;
  const globalTotalBorrowed = globalStats.globalTotalBorrowed;
  const globalLiquidity = globalStats.globalLiquidity;

  return (
    <div className="dashboard-view">
      {/* Welcome & User Quick Stats */}
      {connected && (
        <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(6, 182, 212, 0.05) 100%)', borderColor: 'rgba(139, 92, 246, 0.25)' }}>
          <h2 className="glass-title" style={{ marginBottom: '12px' }}>
            <span>👋 Chào mừng quay trở lại!</span>
            <span className="badge-testnet">Thử nghiệm Stellar Soroban</span>
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
            Dưới đây là tóm tắt danh mục đầu tư tín dụng của bạn trên UdonFi Stellar Lending. Tất cả các tham số đều được cập nhật thời gian thực.
          </p>
          <div className="summary-grid" style={{ marginBottom: 0 }}>
            <div className="summary-card" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="summary-label">Bạn đã cung cấp</div>
              <div className="summary-value success">${totalSuppliedUsd.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="summary-sub">Tài sản tạo lãi suất</div>
            </div>
            <div className="summary-card" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="summary-label">Bạn đã vay</div>
              <div className="summary-value secondary">${totalBorrowedUsd.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="summary-sub">Tài sản thế chấp đảm bảo</div>
            </div>
            <div className="summary-card" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="summary-label">Chỉ số Sức khỏe</div>
              <div className={`summary-value ${healthFactor === '∞' || parseFloat(healthFactor) > 1.5 ? 'success' : parseFloat(healthFactor) > 1.1 ? 'purple' : 'error'}`}>
                {healthFactor}
              </div>
              <div className="summary-sub">Yêu cầu duy trì &gt; 1.0</div>
            </div>
            <div className="summary-card" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
              <div className="summary-label">APY ròng của bạn</div>
              <div className="summary-value purple">
                {netApy >= 0 ? `+${netApy.toFixed(2)}%` : `${netApy.toFixed(2)}%`}
              </div>
              <div className="summary-sub">Lãi suất thực tế nhận</div>
            </div>
          </div>
        </div>
      )}

      {/* Global Protocol Stats */}
      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', fontWeight: 800, margin: '30px 0 16px 0', letterSpacing: '-0.5px' }}>
        📈 Tổng quan thị trường UdonFi Stellar
      </h2>

      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">Tổng giá trị cung cấp (TVL)</div>
          <div className="summary-value">${globalTotalSupplied.toLocaleString('vi-VN')}</div>
          <div className="summary-sub">Tích lũy từ tất cả các bể Stellar Soroban</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Tổng giá trị vay thế chấp</div>
          <div className="summary-value secondary">${globalTotalBorrowed.toLocaleString('vi-VN')}</div>
          <div className="summary-sub">Được đảm bảo bằng hợp đồng thông minh</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Thanh khoản khả dụng</div>
          <div className="summary-value success">${globalLiquidity.toLocaleString('vi-VN')}</div>
          <div className="summary-sub">Dòng tiền sẵn sàng cho vay</div>
        </div>
      </div>

      {/* Market Assets Table */}
      <div className="glass-panel">
        <div className="glass-title">
          <span>🌟 Các thị trường Stellar đang hoạt động</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-action-sm supply" onClick={() => onNavigate('lend')}>Cung cấp kiếm APY</button>
            <button className="btn-action-sm borrow" onClick={() => onNavigate('borrow')}>Vay thế chấp</button>
          </div>
        </div>
        <div className="market-table-container">
          <table className="market-table">
            <thead>
              <tr>
                <th>Tài sản</th>
                <th>Quy mô thị trường</th>
                <th>Supply APY</th>
                <th>Tổng vay</th>
                <th>Borrow APY</th>
                <th>LTV tối đa</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
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
                    <div style={{ fontWeight: 600 }}>{asset.totalSupplied}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mức trần mở rộng</div>
                  </td>
                  <td>
                    <div className="apy-value">📈 {asset.supplyApy.toFixed(2)}%</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{asset.totalBorrowed}</div>
                  </td>
                  <td>
                    <div className="apy-value borrow">⚡ {asset.borrowApy.toFixed(2)}%</div>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {asset.ltv * 100}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
