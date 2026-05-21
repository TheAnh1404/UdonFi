import React from 'react';
import { AlertTriangle, ArrowUp } from 'lucide-react';

interface SorobanTtlProps {
    ttl: number;
    currentLedger: number;
    onExtendTtl: () => void;
}

export const SorobanTtl: React.FC<SorobanTtlProps> = ({ ttl, currentLedger, onExtendTtl }) => {
    const maxTtl = 6000;
    const pct = Math.max(0, Math.min(100, (ttl / maxTtl) * 100));

    // Determine status colors & alerts
    const isLow = ttl < 1500;
    
    return (
        <div className="soroban-tab-content active">
            <div className="ttl-container">
                <div className="ttl-info">
                    <h3>Quản Lý Chu Kỳ Sống Dữ Liệu (TTL Storage)</h3>
                    <p>
                        Trên mạng lưới Stellar Soroban, việc lưu trữ dữ liệu trạng thái (State Storage) yêu cầu chi phí gas để giữ dữ liệu tồn tại trên Sổ cái (Ledger). 
                        Mỗi biến dữ liệu của bạn có chỉ số <strong>Time-to-Live (TTL)</strong> tính bằng số block sổ cái.
                    </p>
                    <p>
                        Nếu bộ đếm ngược TTL chạm mức 0, dữ liệu số dư và vị thế của bạn sẽ bị <strong>truy thu (evicted)</strong> khỏi mạng lưới để giải phóng không gian lưu trữ. 
                        Người dùng hoặc bot lập chỉ mục phải kích hoạt hàm <code>extend_ttl</code> để gia hạn.
                    </p>

                    <div className="ttl-timer-box">
                        <div className="ttl-countdown">
                            <span className="ttl-num text-cyan">{ttl.toLocaleString()}</span>
                            <span className="ttl-unit">Ledgers Còn Lại</span>
                        </div>
                        <div className="ttl-progress">
                            <div 
                                className="ttl-progress-fill" 
                                style={{ 
                                    width: `${pct}%`,
                                    background: isLow ? 'var(--red)' : ttl < 3000 ? 'var(--yellow)' : 'linear-gradient(90deg, var(--red), var(--yellow), var(--cyan))'
                                }}
                            ></div>
                        </div>
                        <div className="ttl-status-text">
                            <span>Sổ cái hiện tại: #{currentLedger.toLocaleString()}</span>
                            <span>Trạng thái: {isLow ? <strong className="text-red">Nguy Hiểm</strong> : <strong className="text-green">An Toàn</strong>}</span>
                        </div>
                    </div>
                </div>

                <div className="ttl-action-panel">
                    {isLow ? (
                        <div className="ttl-alert warning pulse-icon">
                            <AlertTriangle size={18} />
                            <div>
                                <strong>CẢNH BÁO BỊ XÓA DỮ LIỆU!</strong>
                                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#ffe082' }}>
                                    Số dư Ledger còn lại dưới mức an toàn. Hãy gọi hàm <code>extend_ttl</code> để khôi phục trạng thái.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '12px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <p>💡 <strong>Mẹo Web3:</strong> Trong thực tế, các ứng dụng DApp hoặc Lenders sẽ tự động gia hạn TTL thay cho bạn khi bạn thực hiện bất kỳ giao dịch nào (nạp, vay, trả). Bạn cũng có thể chủ động gia hạn để bảo toàn trạng thái.</p>
                        </div>
                    )}

                    <button 
                        onClick={onExtendTtl} 
                        className="btn btn-cyan"
                        style={{ display: 'flex', gap: '0.5rem', width: '100%' }}
                    >
                        <ArrowUp size={16} />
                        <span>Kích Hoạt extend_ttl() (Gia Hạn TTL)</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
