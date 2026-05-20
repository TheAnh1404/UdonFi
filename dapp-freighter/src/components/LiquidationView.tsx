import React, { useState, useEffect } from 'react';
import { soroban } from '../services/soroban';
import { formatUSD } from '../utils/format';

interface AtRiskPosition {
  borrower: string;
  healthFactor: number;
  totalDebtUsd: number;
  collateralUsd: number;
  debtAsset: string;
  collateralAsset: string;
  isLiquidatable: boolean;
}

interface LiquidationSession {
  id: string;
  borrower: string;
  debtAsset: string;
  collateralAsset: string;
  debtToCover: number;
  collateralToSeize: number;
  expiresInSeconds: number;
}

interface LiquidationViewProps {
  connected: boolean;
  connectWallet: () => void;
}

export const LiquidationView: React.FC<LiquidationViewProps> = ({
  connected,
  connectWallet,
}) => {
  const [positions, setPositions] = useState<AtRiskPosition[]>([]);
  const [session, setSession] = useState<LiquidationSession | null>(null);
  
  const [loadingPrepare, setLoadingPrepare] = useState<string | null>(null);
  const [loadingExecute, setLoadingExecute] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);

  // Fetch at-risk list
  useEffect(() => {
    setPositions(soroban.getMockAtRiskPositions());
  }, []);

  // Timer countdown for active liquidation session
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      setSession(prev => {
        if (!prev) return null;
        if (prev.expiresInSeconds <= 1) {
          addLog(`⚠️ Session ${prev.id.slice(0, 8)} đã hết hạn (quá 20 ledgers).`);
          return null;
        }
        return {
          ...prev,
          expiresInSeconds: prev.expiresInSeconds - 1
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session]);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 9)]);
  };

  // Step 1: Prepare Liquidation session
  const handlePrepare = async (pos: AtRiskPosition) => {
    setLoadingPrepare(pos.borrower);
    addLog(`⏳ Khởi tạo chuẩn bị thanh lý vị thế ${pos.borrower.slice(0, 8)}...`);
    
    try {
      await soroban.simulateDelay(1200);
      
      const mockSessionId = '0x' + Array.from({ length: 32 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      const debtToCover = pos.totalDebtUsd * 0.5; // repaying half of debt
      const collateralToSeize = (debtToCover * 1.05); // seizing collateral with 5% bonus

      setSession({
        id: mockSessionId,
        borrower: pos.borrower,
        debtAsset: pos.debtAsset,
        collateralAsset: pos.collateralAsset,
        debtToCover,
        collateralToSeize,
        expiresInSeconds: 100 // 20 ledgers approximation
      });

      addLog(`✅ Đã chuẩn bị thành công! Tạo Session ID: ${mockSessionId.slice(0, 10)}...`);
      addLog(`ℹ️ Khóa bảo vệ CPU Soroban: Vui lòng thực thi thanh toán trong vòng 20 ledgers tiếp theo.`);
    } catch (err) {
      addLog(`❌ Lỗi chuẩn bị thanh lý.`);
    } finally {
      setLoadingPrepare(null);
    }
  };

  // Step 2: Execute Liquidation session
  const handleExecute = async () => {
    if (!session) return;
    setLoadingExecute(true);
    addLog(`⏳ Đang thực thi thanh lý session ${session.id.slice(0, 8)} trên Stellar Testnet...`);

    try {
      // simulate signing and executing
      const receipt = await soroban.submitSorobanTx('liquidate', session.debtAsset, session.debtToCover);
      
      addLog(`🎉 Giao dịch thành công! Hash: ${receipt.txHash.slice(0, 16)}...`);
      addLog(`💰 Đã chuyển ${formatUSD(session.debtToCover)} ${session.debtAsset} để nhận lại ${formatUSD(session.collateralToSeize)} ${session.collateralAsset} (Bao gồm 5% thưởng thanh lý).`);
      
      // Update position list
      setPositions(prev => prev.filter(p => p.borrower !== session.borrower));
      setSession(null);
    } catch (err) {
      addLog(`❌ Thực thi thanh lý thất bại.`);
    } finally {
      setLoadingExecute(false);
    }
  };

  return (
    <div className="liquidation-view">
      {!connected ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚡</div>
          <h2 className="glass-title" style={{ justifyContent: 'center', marginBottom: '12px' }}>
            Kết nối ví để tham gia thanh lý nợ xấu
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '480px', margin: '0 auto 30px auto' }}>
            Thanh lý nợ là một tính năng nâng cao giúp ổn định giao thức. Liquidators có thể trả nợ hộ các tài khoản Distressed (HF &lt; 1.0) và nhận lại tài sản thế chấp với chiết khấu thưởng 5%.
          </p>
          <button className="btn btn-primary" style={{ maxWidth: '280px', margin: '0 auto' }} onClick={connectWallet}>
            Kết nối ví Freighter
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
          
          {/* Active At-Risk Positions */}
          <div className="glass-panel">
            <div className="glass-title">
              <span>⚠️ Danh sách vị thế có rủi ro thanh lý (Health Factor &lt; 1.1)</span>
              <span className="badge-testnet" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-error)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Cảnh báo nợ xấu</span>
            </div>
            
            <div className="market-table-container">
              <table className="market-table">
                <thead>
                  <tr>
                    <th>Tài khoản Borrower</th>
                    <th>Health Factor</th>
                    <th>Tổng khoản nợ (USD)</th>
                    <th>Thế chấp đảm bảo (USD)</th>
                    <th>Chi tiết nợ / thế chấp</th>
                    <th style={{ textAlign: 'right' }}>Hành động (Two-Step)</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, idx) => (
                    <tr key={idx}>
                      <td style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
                        {pos.borrower}
                      </td>
                      <td>
                        <span 
                          style={{ 
                            fontWeight: 800, 
                            color: pos.healthFactor < 1.0 ? 'var(--color-error)' : 'var(--color-warning)',
                            background: pos.healthFactor < 1.0 ? 'var(--color-error-bg)' : 'var(--color-warning-bg)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: `1px solid ${pos.healthFactor < 1.0 ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`
                          }}
                        >
                          {pos.healthFactor.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {formatUSD(pos.totalDebtUsd)}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--color-success)' }}>
                        {formatUSD(pos.collateralUsd)}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px' }}>Nợ: <strong>{pos.debtAsset}</strong></div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thế chấp: <strong>{pos.collateralAsset}</strong></div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {pos.isLiquidatable ? (
                          <button
                            className="btn-action-sm"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: 'var(--color-error)',
                              border: '1px solid rgba(239, 68, 68, 0.2)'
                            }}
                            disabled={loadingPrepare !== null || session !== null}
                            onClick={() => handlePrepare(pos)}
                          >
                            {loadingPrepare === pos.borrower ? 'Đang mô phỏng...' : '⚡ Chuẩn bị thanh lý'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>An toàn (&gt; 1.0)</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic 2-Step Liquidation Session panel */}
          {session && (
            <div className="glass-panel" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(139, 92, 246, 0.05) 100%)', borderColor: 'var(--color-error)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="glass-title" style={{ margin: 0, color: 'var(--color-error)' }}>
                  ⚡ Phiên thanh lý khả dụng (Liquidation Session ID: {session.id.slice(0, 12)}...)
                </h3>
                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--color-warning)' }}>
                  ⏳ Hết hạn trong: {session.expiresInSeconds} giây
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                <div className="summary-card" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="summary-label">Khoản nợ cần thanh toán</div>
                  <div className="summary-value secondary">{formatUSD(session.debtToCover)}</div>
                  <div className="summary-sub">{session.debtAsset} (50% max)</div>
                </div>
                <div className="summary-card" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <div className="summary-label">Thế chấp nhận về (+5% bonus)</div>
                  <div className="summary-value success">{formatUSD(session.collateralToSeize)}</div>
                  <div className="summary-sub">{session.collateralAsset}</div>
                </div>
              </div>

              <button 
                className="btn-action-full" 
                style={{ background: 'linear-gradient(135deg, var(--color-error) 0%, #dc2626 100%)', color: '#fff' }}
                disabled={loadingExecute}
                onClick={handleExecute}
              >
                {loadingExecute ? 'Đang thực thi trên Soroban...' : '🚀 Thực thi thanh lý (Execute Two-Step)'}
              </button>
            </div>
          )}

          {/* Action Simulation Console */}
          <div className="glass-panel" style={{ background: '#05040a', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="status-indicator-dot active" style={{ width: '8px', height: '8px' }} />
              Console logs - Soroban Liquidation Simulation
            </h3>
            <div 
              style={{ 
                fontFamily: 'var(--font-mono)', 
                fontSize: '12px', 
                color: 'var(--color-success)', 
                lineHeight: '1.8',
                background: 'rgba(0,0,0,0.5)',
                padding: '16px',
                borderRadius: '8px',
                minHeight: '120px'
              }}
            >
              {logs.length === 0 ? (
                <div style={{ color: 'var(--text-muted)' }}>Chưa có sự kiện nào. Hãy click "Chuẩn bị thanh lý" để bắt đầu quy trình 2 bước.</div>
              ) : (
                logs.map((log, idx) => <div key={idx}>{log}</div>)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
