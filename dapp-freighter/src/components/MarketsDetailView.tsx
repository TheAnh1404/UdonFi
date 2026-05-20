import React, { useState } from 'react';
import { ACTIVE_MARKETS } from '../services/contracts';
import type { AssetMarketConfig } from '../services/contracts';
import { InterestRateChart } from './InterestRateChart';

interface MarketsDetailViewProps {
  onNavigate: (tab: string) => void;
}

export const MarketsDetailView: React.FC<MarketsDetailViewProps> = ({ onNavigate }) => {
  const [selectedAsset, setSelectedAsset] = useState<AssetMarketConfig>(ACTIVE_MARKETS[0]);
  const [utilization, setUtilization] = useState<number>(0.58); // default mock utilization for detailed preview

  const getApyForUtilization = (u: number, config: AssetMarketConfig) => {
    const base = config.baseApy;
    const slope1 = config.slope1;
    const slope2 = config.slope2;
    const kink = config.optimalUtilization;

    if (u < kink) {
      return base + (u / kink) * slope1;
    } else {
      return base + slope1 + ((u - kink) / (1 - kink)) * slope2;
    }
  };

  const selectedBorrowApy = getApyForUtilization(utilization, selectedAsset);
  const selectedSupplyApy = selectedBorrowApy * utilization * 0.9; // 10% reserve factor

  return (
    <div className="markets-detail-view">
      <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginBottom: '24px' }}>
        {ACTIVE_MARKETS.map(market => {
          const isActive = selectedAsset.symbol === market.symbol;
          return (
            <div 
              key={market.id}
              className={`summary-card ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedAsset(market)}
              style={{
                cursor: 'pointer',
                border: isActive ? '1.5px solid var(--color-primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                background: isActive ? 'rgba(139, 92, 246, 0.08)' : 'var(--bg-surface)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '20px' }}>{market.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, color: '#fff' }}>{market.symbol}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{market.name}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        {/* Detail Panel */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>{selectedAsset.icon}</span>
              <div>
                <h2 className="glass-title" style={{ margin: 0 }}>{selectedAsset.name} ({selectedAsset.symbol})</h2>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Mô hình lãi suất Kinked Curve và Tham số rủi ro</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-action-sm supply" onClick={() => onNavigate('lend')}>Cung cấp</button>
              <button className="btn-action-sm borrow" onClick={() => onNavigate('borrow')}>Vay thế chấp</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '30px' }}>
            <div className="summary-card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="summary-label">LTV Tối Đa (Max Loan-To-Value)</div>
              <div className="summary-value success">{selectedAsset.ltv * 100}%</div>
              <div className="summary-sub">Tỷ lệ vay tối đa trên giá trị thế chấp</div>
            </div>
            <div className="summary-card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="summary-label">Ngưỡng Thanh Lý (Liquidation Threshold)</div>
              <div className="summary-value secondary">{selectedAsset.liqThreshold * 100}%</div>
              <div className="summary-sub">Tài khoản bị thanh lý nếu nợ vượt ngưỡng này</div>
            </div>
            <div className="summary-card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="summary-label">Thưởng Thanh Lý (Liquidation Bonus)</div>
              <div className="summary-value purple">{selectedAsset.liqBonus * 100}%</div>
              <div className="summary-sub">Chiết khấu tài sản thế chấp cho người thanh lý</div>
            </div>
            <div className="summary-card" style={{ background: 'rgba(0,0,0,0.2)' }}>
              <div className="summary-label">Hệ số dự trữ (Reserve Factor)</div>
              <div className="summary-value">10.00%</div>
              <div className="summary-sub">Phần trăm lãi suất chuyển về quỹ dự trữ</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
            {/* Chart section */}
            <div>
              <h3 style={{ fontSize: '15px', color: '#fff', marginBottom: '16px', fontWeight: 700 }}>
                📊 Đồ thị lãi suất tối ưu (Borrow APY: {selectedBorrowApy.toFixed(2)}%, Supply APY: {selectedSupplyApy.toFixed(2)}%)
              </h3>
              <InterestRateChart config={selectedAsset} currentUtilization={utilization} />
              
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  <span>Tùy chỉnh tỷ lệ sử dụng giả định (Utilization): {(utilization * 100).toFixed(0)}%</span>
                  <span>Optimal: {selectedAsset.optimalUtilization * 100}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={utilization * 100}
                  onChange={(e) => setUtilization(parseInt(e.target.value) / 100)}
                  style={{
                    width: '100%',
                    accentColor: 'var(--color-primary)',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '4px',
                    height: '6px',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </div>

            {/* Interest parameters description */}
            <div style={{ padding: '16px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 700, color: '#fff', marginBottom: '8px' }}>📖 Cơ chế Kinked Rate Model của UdonFi:</div>
              Protocol sử dụng mô hình tối ưu hóa thanh khoản để bảo vệ người cung cấp. Khi nhu cầu vay vượt quá <strong>{selectedAsset.optimalUtilization * 100}% (Kink Point)</strong>, Borrow APY tăng dốc đứng từ <strong>{(selectedAsset.baseApy + selectedAsset.slope1).toFixed(2)}%</strong> lên tối đa <strong>{(selectedAsset.baseApy + selectedAsset.slope1 + selectedAsset.slope2).toFixed(2)}%</strong> nhằm khuyến khích trả nợ hoặc bổ sung thanh khoản vào bể.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
