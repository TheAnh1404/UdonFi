import React from 'react';

interface FaucetViewProps {
  connected: boolean;
  connectWallet: () => void;
  loadingFaucet: boolean;
  handleXlmFaucet: () => void;
  handleMockAssetFaucet: (symbol: string, amount: number) => void;
  mockLoading: { [key: string]: boolean };
}

export const FaucetView: React.FC<FaucetViewProps> = ({
  connected,
  connectWallet,
  loadingFaucet,
  handleXlmFaucet,
  handleMockAssetFaucet,
  mockLoading,
}) => {
  return (
    <div className="faucet-view">
      {!connected ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
          <h2 className="glass-title" style={{ justifyContent: 'center', marginBottom: '12px' }}>
            Kết nối ví để nhận tài sản thử nghiệm
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '480px', margin: '0 auto 30px auto' }}>
            Vui lòng kết nối ví Freighter của bạn để hệ thống có thể xác định địa chỉ công khai Stellar và gửi tiền thử nghiệm miễn phí.
          </p>
          <button className="btn btn-primary" style={{ maxWidth: '280px', margin: '0 auto' }} onClick={connectWallet}>
            Kết nối ví Freighter
          </button>
        </div>
      ) : (
        <div className="faucet-content">
          <div className="glass-panel">
            <h2 className="glass-title">🚰 Bể vòi tài sản thử nghiệm (Testnet Faucets)</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '24px', marginTop: '-10px' }}>
              Nhận ngay các tài sản thử nghiệm miễn phí để bắt đầu thử nghiệm các tính năng cho vay, nợ thế chấp và quản trị rủi ro trên UdonFi Stellar Lending.
            </p>

            <div className="faucet-grid">
              {/* Native Stellar XLM Faucet */}
              <div className="faucet-card">
                <div>
                  <div className="faucet-header">
                    <div className="faucet-asset">
                      <span style={{ fontSize: '24px' }}>🚀</span>
                      <strong style={{ fontSize: '16px', color: '#fff' }}>Stellar Native</strong>
                    </div>
                    <span className="badge-testnet" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderColor: 'rgba(59,130,246,0.3)' }}>
                      XLM
                    </span>
                  </div>
                  <div className="faucet-amount">10,000 XLM</div>
                  <div className="faucet-desc">
                    Gọi API Friendbot chính thức từ Stellar để nạp 10k XLM Testnet vào ví của bạn. Kích hoạt tài khoản mới tạo.
                  </div>
                </div>
                <button 
                  className="btn btn-primary" 
                  onClick={handleXlmFaucet} 
                  disabled={loadingFaucet}
                  style={{ fontSize: '13px', padding: '10px' }}
                >
                  {loadingFaucet ? <span className="btn-spinner" /> : 'Nhận XLM Faucet'}
                </button>
              </div>

              {/* Mock USDC Faucet */}
              <div className="faucet-card">
                <div>
                  <div className="faucet-header">
                    <div className="faucet-asset">
                      <span style={{ fontSize: '24px' }}>💵</span>
                      <strong style={{ fontSize: '16px', color: '#fff' }}>USD Coin</strong>
                    </div>
                    <span className="badge-testnet" style={{ background: 'rgba(37, 99, 235, 0.15)', color: '#3b82f6', borderColor: 'rgba(37,99,235,0.3)' }}>
                      USDC
                    </span>
                  </div>
                  <div className="faucet-amount">5,000 USDC</div>
                  <div className="faucet-desc">
                    Mint ngay 5,000 mock USDC vào tài khoản thử nghiệm của bạn để làm tài sản ký gửi thế chấp chính.
                  </div>
                </div>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleMockAssetFaucet('USDC', 5000)} 
                  disabled={mockLoading['USDC']}
                  style={{ fontSize: '13px', padding: '10px' }}
                >
                  {mockLoading['USDC'] ? <span className="btn-spinner" /> : 'Mint Mock USDC'}
                </button>
              </div>

              {/* Mock EURC Faucet */}
              <div className="faucet-card">
                <div>
                  <div className="faucet-header">
                    <div className="faucet-asset">
                      <span style={{ fontSize: '24px' }}>💶</span>
                      <strong style={{ fontSize: '16px', color: '#fff' }}>Euro Coin</strong>
                    </div>
                    <span className="badge-testnet" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', borderColor: 'rgba(16,185,129,0.3)' }}>
                      EURC
                    </span>
                  </div>
                  <div className="faucet-amount">5,000 EURC</div>
                  <div className="faucet-desc">
                    Đồng Euro kỹ thuật số ổn định trên Stellar. Rất tốt để thử nghiệm đa dạng hóa rủi ro tiền tệ.
                  </div>
                </div>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleMockAssetFaucet('EURC', 5000)} 
                  disabled={mockLoading['EURC']}
                  style={{ fontSize: '13px', padding: '10px' }}
                >
                  {mockLoading['EURC'] ? <span className="btn-spinner" /> : 'Mint Mock EURC'}
                </button>
              </div>

              {/* Mock USDT Faucet */}
              <div className="faucet-card">
                <div>
                  <div className="faucet-header">
                    <div className="faucet-asset">
                      <span style={{ fontSize: '24px' }}>₮</span>
                      <strong style={{ fontSize: '16px', color: '#fff' }}>Tether</strong>
                    </div>
                    <span className="badge-testnet" style={{ background: 'rgba(13, 148, 136, 0.15)', color: '#2dd4bf', borderColor: 'rgba(13,148,136,0.3)' }}>
                      USDT
                    </span>
                  </div>
                  <div className="faucet-amount">5,000 USDT</div>
                  <div className="faucet-desc">
                    Đồng Tether đô la phổ biến. Đảm bảo tỷ lệ vay cao với lãi suất tối ưu.
                  </div>
                </div>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => handleMockAssetFaucet('USDT', 5000)} 
                  disabled={mockLoading['USDT']}
                  style={{ fontSize: '13px', padding: '10px' }}
                >
                  {mockLoading['USDT'] ? <span className="btn-spinner" /> : 'Mint Mock USDT'}
                </button>
              </div>
            </div>
          </div>

          {/* Tutorial / Guides Panel */}
          <div className="glass-panel" style={{ marginBottom: 0 }}>
            <h2 className="glass-title">📚 Hướng dẫn tương tác Giao thức Stellar Lending</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
              Hãy tuân thủ quy trình 5 bước đơn giản để trải nghiệm trọn vẹn sức mạnh của dApp UdonFi Stellar:
            </p>

            <div className="guide-list">
              <div className="guide-item">
                <div className="guide-step">1</div>
                <div>
                  <strong>Mint đồng USD thế chấp:</strong> Hãy click nút <strong>"Mint Mock USDC"</strong> ở trên để nhận 5,000 USDC vào ví.
                </div>
              </div>
              <div className="guide-item">
                <div className="guide-step">2</div>
                <div>
                  <strong>Cung cấp thanh khoản kiếm lãi:</strong> Sang tab <strong>Supply</strong>, bấm <strong>📥 Cung cấp</strong> cho USDC, nhập 3,000 USDC và hoàn thành giao dịch ký để gửi tiền vào bể tạo lợi tức.
                </div>
              </div>
              <div className="guide-item">
                <div className="guide-step">3</div>
                <div>
                  <strong>Bật cơ chế ký gửi thế chấp:</strong> Trong tab <strong>Supply</strong>, tìm đến dòng USDC và <strong>BẬT công tắc "Sử dụng làm thế chấp"</strong>. Thao tác này sẽ cập nhật Borrow Limit và mở khóa khả năng vay cho tài khoản của bạn.
                </div>
              </div>
              <div className="guide-item">
                <div className="guide-step">4</div>
                <div>
                  <strong>Vay tài sản khác:</strong> Sang tab <strong>Borrow</strong>, bấm <strong>⚡ Vay</strong> cho XLM hoặc EURC để rút nợ. Hãy vay ở mức an toàn (dưới 60% hạn mức) để tránh nguy cơ biến động giá dẫn đến thanh lý tài sản.
                </div>
              </div>
              <div className="guide-item">
                <div className="guide-step">5</div>
                <div>
                  <strong>Quản lý Danh mục:</strong> Truy cập tab <strong>Portfolio</strong> để giám sát Chỉ số Sức khỏe. Bạn có thể <strong>"Cung cấp thêm"</strong> để tăng độ an toàn, hoặc bấm <strong>"Trả nợ"</strong> để thanh toán dứt điểm khoản vay của mình.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
