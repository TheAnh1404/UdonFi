import { useState, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  isConnected,
  requestAccess,
  getAddress,
  signTransaction,
} from '@stellar/freighter-api';

interface NotificationState {
  type: 'info' | 'success' | 'error';
  title: string;
  body: string;
}

// Cấu hình Stellar Testnet
const NETWORK_PASSPHRASE = StellarSdk.Networks.TESTNET;
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const RPC_URL = 'https://soroban-testnet.stellar.org';

const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);
const rpc = new StellarSdk.rpc.Server(RPC_URL);

// Một contract Hello đã được deploy sẵn trên Testnet của Stellar để người dùng có thể thử ngay lập tức!
const DEFAULT_CONTRACT_ID = 'CDX22EAVPGLIDRMTDOWUGLFY3YCW5A2W5W5C6CDKGLJ6C4V3B3O3O3O3';

// Hàm helper để trích xuất địa chỉ ví an toàn từ Freighter API phản hồi (hỗ trợ cả đối tượng và chuỗi)
const extractAddress = (res: any): string | null => {
  if (!res) return null;
  if (typeof res === 'string') return res;
  if (res.address && typeof res.address === 'string') return res.address;
  if (res.publicKey && typeof res.publicKey === 'string') return res.publicKey;
  return null;
};

function App() {
  const [hasFreighter, setHasFreighter] = useState<boolean | null>(null);
  const [connected, setConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  
  // States tải dữ liệu và tương tác
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);
  const [loadingTx, setLoadingTx] = useState<boolean>(false);
  const [loadingFaucet, setLoadingFaucet] = useState<boolean>(false);

  // States của form và kết quả
  const [contractId, setContractId] = useState<string>(DEFAULT_CONTRACT_ID);
  const [toName, setToName] = useState<string>('Developer');
  const [resultMessage, setResultMessage] = useState<string[] | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Kiểm tra sự tồn tại của ví Freighter khi load trang
  useEffect(() => {
    const checkWallet = async () => {
      try {
        const result = await isConnected();
        setHasFreighter(!!result);
        
        // Nếu đã được cấp quyền từ trước, tự động lấy địa chỉ ví
        if (result) {
          const addressRes = await getAddress();
          const pubKey = extractAddress(addressRes);
          if (pubKey) {
            setConnected(true);
            setPublicKey(pubKey);
            fetchBalance(pubKey);
          }
        }
      } catch (err) {
        console.error("Lỗi khi kiểm tra ví Freighter:", err);
        setHasFreighter(false);
      }
    };
    checkWallet();
  }, []);

  // Lấy số dư XLM từ Horizon Testnet
  const fetchBalance = async (address: string) => {
    setLoadingBalance(true);
    try {
      const account = await horizon.loadAccount(address);
      const nativeBalance = account.balances.find(b => b.asset_type === 'native');
      setBalance(nativeBalance ? parseFloat(nativeBalance.balance).toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : '0');
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Tài khoản Testnet chưa được nạp tiền (chưa active)
        setBalance('0 (Tài khoản chưa được kích hoạt)');
      } else {
        console.error("Lỗi lấy số dư:", err);
        setBalance('Lỗi khi tải');
      }
    } finally {
      setLoadingBalance(false);
    }
  };

  // Tự động nhận XLM test miễn phí từ Friendbot để kích hoạt tài khoản
  const handleFaucet = async () => {
    if (!publicKey) return;
    setLoadingFaucet(true);
    setNotification({
      type: 'info',
      title: 'Đang yêu cầu XLM...',
      body: 'Hệ thống Friendbot của Stellar đang gửi 10,000 XLM Testnet tới địa chỉ ví của bạn.'
    });

    try {
      const response = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
      if (response.ok) {
        setNotification({
          type: 'success',
          title: 'Nhận XLM thành công!',
          body: 'Tài khoản của bạn đã được nạp 10,000 XLM Testnet. Vui lòng kiểm tra số dư!'
        });
        fetchBalance(publicKey);
      } else {
        throw new Error('Yêu cầu faucet thất bại');
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Nhận XLM thất bại',
        body: err.message || 'Có lỗi xảy ra khi gọi Friendbot. Bạn có thể tự fund ví qua các trang web faucet của Stellar.'
      });
    } finally {
      setLoadingFaucet(false);
    }
  };

  // Kết nối ví Freighter
  const connectWallet = async () => {
    setNotification(null);
    try {
      const isInstalled = await isConnected();
      if (!isInstalled) {
        setNotification({
          type: 'error',
          title: 'Không tìm thấy ví',
          body: 'Vui lòng cài đặt extension ví Freighter trên trình duyệt của bạn.'
        });
        return;
      }

      // Yêu cầu quyền truy cập địa chỉ ví và kết nối
      const accessRes = await requestAccess();
      const pubKey = extractAddress(accessRes);
      
      if (pubKey) {
        setConnected(true);
        setPublicKey(pubKey);
        setNotification({
          type: 'success',
          title: 'Đã kết nối ví',
          body: `Địa chỉ: ${pubKey.slice(0, 6)}...${pubKey.slice(-6)}`
        });
        fetchBalance(pubKey);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Kết nối ví thất bại',
        body: err.message || 'Người dùng đã từ chối yêu cầu kết nối ví.'
      });
    }
  };

  // Ngắt kết nối ví
  const disconnectWallet = () => {
    setConnected(false);
    setPublicKey(null);
    setBalance(null);
    setResultMessage(null);
    setTxHash(null);
    setNotification({
      type: 'info',
      title: 'Đã ngắt kết nối',
      body: 'Bạn đã ngắt kết nối ví Freighter thành công.'
    });
  };

  // Gọi hàm hello trên Smart Contract Soroban
  const callHelloContract = async () => {
    if (!publicKey) return;
    
    // Reset kết quả cũ
    setResultMessage(null);
    setTxHash(null);
    setLoadingTx(true);
    setNotification({
      type: 'info',
      title: 'Khởi tạo giao dịch...',
      body: 'Đang truy vấn thông số tài khoản và chuẩn bị gọi Smart Contract...'
    });

    try {
      // 1. Tải thông tin tài khoản hiện tại từ RPC
      const account = await rpc.getAccount(publicKey);
      
      // 2. Tạo đối tượng Contract
      const contract = new StellarSdk.Contract(contractId);
      
      // 3. Chuẩn bị đối số (Symbol)
      const toVal = StellarSdk.nativeToScVal(toName, { type: 'symbol' });
      
      // 4. Tạo giao dịch Soroban ban đầu
      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call('hello', toVal))
        .setTimeout(180)
        .build();

      // 5. Giả lập giao dịch (Simulation) để ước tính phí tài nguyên và Gas (Soroban yêu cầu bắt buộc)
      setNotification({
        type: 'info',
        title: 'Đang giả lập giao dịch...',
        body: 'Hệ thống đang chạy thử nghiệm giao dịch trên RPC để ước tính dung lượng bộ nhớ, tài nguyên CPU và phí Gas.'
      });
      
      const simulation = await rpc.simulateTransaction(transaction);
      
      if (StellarSdk.rpc.Api.isSimulationError(simulation)) {
        throw new Error(`Giả lập thất bại: ${simulation.error}`);
      }

      // 6. Lắp ghép tài nguyên thực tế từ kết quả giả lập vào giao dịch chính thức
      transaction = StellarSdk.rpc.assembleTransaction(transaction, simulation).build();
      
      // Lấy mã XDR chưa ký
      const unsignedXdr = transaction.toXDR();

      // 7. Gửi yêu cầu ký giao dịch đến ví Freighter
      setNotification({
        type: 'info',
        title: 'Chờ ký giao dịch...',
        body: 'Vui lòng mở ví Freighter và xác nhận (Ký) giao dịch gọi hợp đồng thông minh Hello.'
      });
      
      const signedTxResult = await signTransaction(unsignedXdr, {
        networkPassphrase: NETWORK_PASSPHRASE
      });

      if (!signedTxResult) {
        throw new Error('Không nhận được chữ ký từ ví Freighter.');
      }

      // Xử lý cả dạng chuỗi (legacy) và dạng đối tượng (modern)
      const signedXdr = typeof signedTxResult === 'string' ? signedTxResult : signedTxResult.signedTxXdr;

      // 8. Gửi giao dịch đã ký lên mạng lưới Soroban RPC
      setNotification({
        type: 'info',
        title: 'Đang gửi giao dịch...',
        body: 'Giao dịch đã ký đang được gửi lên Stellar Testnet. Vui lòng chờ xác thực khối...'
      });
      
      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE) as StellarSdk.Transaction;
      const sendResponse = await rpc.sendTransaction(signedTransaction);

      if (sendResponse.status === 'ERROR') {
        throw new Error(`RPC Gửi thất bại: ${sendResponse.errorResult}`);
      }

      // 9. Lấy hash giao dịch và Polling kết quả xác nhận khối từ blockchain
      const hash = sendResponse.hash;
      setTxHash(hash);
      
      let getResponse = await rpc.getTransaction(hash);
      
      while ((getResponse.status as string) === 'PENDING' || (getResponse.status as string) === 'NOT_FOUND') {
        setNotification({
          type: 'info',
          title: 'Đang xác minh khối...',
          body: `Giao dịch ${hash.slice(0, 10)}... đang được lưu vào sổ cái. Vui lòng chờ...`
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
        getResponse = await rpc.getTransaction(hash);
      }

      const rawResponse = getResponse as any;

      if ((rawResponse.status as string) === 'SUCCESS') {
        // 10. Giải mã kết quả trả về từ Smart Contract
        if (rawResponse.returnValue) {
          const rawResult = StellarSdk.scValToNative(rawResponse.returnValue);
          // Smart Contract Hello của chúng ta trả về một Vec<Symbol> = ["Hello", toName]
          if (Array.isArray(rawResult)) {
            setResultMessage(rawResult.map(v => v.toString()));
          } else {
            setResultMessage([rawResult.toString()]);
          }
        } else {
          setResultMessage(['Giao dịch thành công nhưng không có giá trị trả về.']);
        }

        setNotification({
          type: 'success',
          title: 'Gọi Contract thành công!',
          body: 'Yêu cầu của bạn đã được hợp đồng thông minh thực thi hoàn hảo trên chuỗi khối!'
        });
        
        // Cập nhật lại số dư sau khi trừ phí gas
        fetchBalance(publicKey);
      } else {
        throw new Error(`Giao dịch thất bại với trạng thái: ${getResponse.status}`);
      }

    } catch (err: any) {
      console.error(err);
      setNotification({
        type: 'error',
        title: 'Lỗi thực thi giao dịch',
        body: err.message || 'Có lỗi xảy ra khi xây dựng, ký hoặc gửi giao dịch.'
      });
    } finally {
      setLoadingTx(false);
    }
  };

  return (
    <div className="dapp-card">
      <div className="dapp-header">
        <h1 className="dapp-title">UdonFi dApp</h1>
        <p className="dapp-subtitle">Cổng kết nối Stellar Smart Contract của UdonFi</p>
        <div style={{ marginTop: '12px' }}>
          <span className="badge-testnet">Stellar Testnet</span>
        </div>
      </div>

      {/* Thông tin Ví & Trạng thái kết nối */}
      <div className={`status-section ${connected ? 'connected' : ''}`}>
        {!connected ? (
          <>
            <div className="status-badge disconnected">
              <span className="status-indicator"></span>
              Chưa kết nối ví
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', textAlign: 'center' }}>
              Hãy cài đặt tiện ích mở rộng ví <strong>Freighter</strong> trên trình duyệt của bạn, tạo/nhập tài khoản và chuyển mạng sang <strong>Testnet</strong> để bắt đầu.
            </p>
            {hasFreighter === false && (
              <p style={{ color: 'var(--color-error)', fontSize: '13px', fontWeight: '500' }}>
                ⚠️ Không tìm thấy ví Freighter. Vui lòng tải tại <a href="https://www.freighter.app/" target="_blank" rel="noreferrer" style={{color: 'var(--color-secondary)'}}>freighter.app</a>.
              </p>
            )}
            <button className="btn btn-primary" onClick={connectWallet}>
              Kết nối ví Freighter
            </button>
          </>
        ) : (
          <>
            <div className="status-badge connected">
              <span className="status-indicator"></span>
              Đã kết nối ví Freighter
            </div>
            
            <div className="wallet-address">
              {publicKey}
            </div>

            <div className="balance-card">
              <div className="balance-label">Số dư ví của bạn</div>
              <div className="balance-value">
                {loadingBalance ? (
                  <span style={{ fontSize: '16px', color: 'var(--text-muted)' }}>Đang tải...</span>
                ) : (
                  <>
                    <span>{balance}</span>
                    <span className="balance-unit">XLM</span>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleFaucet}
                disabled={loadingFaucet || loadingTx}
              >
                {loadingFaucet ? <div className="spinner" /> : 'Nhận 10,000 XLM Faucet'}
              </button>
              <button className="btn btn-secondary" onClick={disconnectWallet} disabled={loadingTx}>
                Ngắt kết nối
              </button>
            </div>
          </>
        )}
      </div>

      {/* Vùng Tương tác Smart Contract (Chỉ hiển thị khi đã kết nối ví) */}
      {connected && (
        <div className="interactive-section">
          <div className="form-group">
            <label className="form-label" htmlFor="contract-id-input">Địa chỉ Smart Contract (Soroban Contract ID)</label>
            <input 
              id="contract-id-input"
              type="text" 
              className="form-input" 
              value={contractId} 
              onChange={(e) => setContractId(e.target.value)}
              placeholder="Nhập địa chỉ contract bắt đầu bằng chữ C..."
              disabled={loadingTx}
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left', marginTop: '4px' }}>
              💡 Hệ thống đã điền sẵn một Contract Hello mẫu hoạt động ổn định trên Testnet. Bạn có thể sử dụng luôn hoặc đổi sang địa chỉ của bạn sau khi deploy!
            </span>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="name-input">Tên của bạn (Đối số truyền vào hàm 'hello')</label>
            <input 
              id="name-input"
              type="text" 
              className="form-input" 
              value={toName} 
              onChange={(e) => setToName(e.target.value)}
              placeholder="Nhập tên của bạn để gửi vào Contract"
              maxLength={20}
              disabled={loadingTx}
            />
          </div>

          <button 
            className="btn btn-primary" 
            onClick={callHelloContract}
            disabled={loadingTx || !contractId.trim() || !toName.trim()}
          >
            {loadingTx ? (
              <>
                <div className="spinner" />
                <span>Đang thực thi trên Chuỗi...</span>
              </>
            ) : (
              <span>Gửi lời chào tới Smart Contract ('hello')</span>
            )}
          </button>
        </div>
      )}

      {/* Hiển thị Thông báo Trạng thái / Lỗi */}
      {notification && (
        <div style={{ marginTop: '24px' }} className={`notification ${notification.type}`}>
          <div className="notification-title">
            {notification.type === 'success' && '✅ '}
            {notification.type === 'error' && '❌ '}
            {notification.type === 'info' && '⏳ '}
            {notification.title}
          </div>
          <div className="notification-body">
            {notification.body}
          </div>
        </div>
      )}

      {/* Kết quả phản hồi từ Smart Contract sau khi thành công */}
      {resultMessage && (
        <div style={{ 
          marginTop: '24px', 
          background: 'rgba(6, 182, 212, 0.05)', 
          border: '1px solid rgba(6, 182, 212, 0.2)', 
          borderRadius: '16px', 
          padding: '24px',
          textAlign: 'left'
        }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-secondary)', marginBottom: '12px', fontSize: '18px', fontWeight: '700' }}>
            🎉 Kết quả từ Smart Contract:
          </h3>
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '12px' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: '#fff', fontWeight: '600', textAlign: 'center' }}>
              "{resultMessage.join(' ')}"
            </p>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            <strong>Kiểu dữ liệu trả về từ WASM:</strong> Vec&lt;Symbol&gt;
          </p>
          {txHash && (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              <strong>Mã Hash Giao dịch:</strong>{' '}
              <a 
                href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} 
                target="_blank" 
                rel="noreferrer"
                className="tx-link"
              >
                Xem chi tiết trên Stellar.Expert ↗
              </a>
            </p>
          )}
        </div>
      )}

      {/* Chân trang thông tin bổ sung */}
      <div className="dapp-footer">
        <p>Phát triển chuyên nghiệp bởi UdonFi Team & AI Agent</p>
        <p>
          Stellar SDK v25.0.1 | RPC: <a href="https://soroban-testnet.stellar.org" target="_blank" rel="noreferrer">soroban-testnet.stellar.org</a>
        </p>
      </div>
    </div>
  );
}

export default App;
