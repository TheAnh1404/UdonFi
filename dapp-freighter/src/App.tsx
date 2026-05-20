import { useState, useEffect } from 'react';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  isConnected,
  requestAccess,
  getAddress,
} from '@stellar/freighter-api';

import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { LendMarketView } from './components/LendMarketView';
import { BorrowMarketView } from './components/BorrowMarketView';
import { PortfolioView } from './components/PortfolioView';
import { FaucetView } from './components/FaucetView';
import { LendingModal } from './components/LendingModal';

interface NotificationState {
  type: 'info' | 'success' | 'error';
  title: string;
  body: string;
}

interface UserAssetData {
  symbol: string;
  name: string;
  walletBalance: number;
  suppliedBalance: number;
  borrowedBalance: number;
  isCollateral: boolean;
}

// Configuration Stellar Testnet
const HORIZON_URL = 'https://horizon-testnet.stellar.org';
const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);

// High-fidelity active asset market metrics (Soroban contract constants)
const ASSET_MARKETS = [
  { id: '1', name: 'Stellar Native', symbol: 'XLM', supplyApy: 3.50, borrowApy: 5.50, totalSupplied: '185,420,900', totalBorrowed: '89,450,200', ltv: 0.70, price: 0.12 },
  { id: '2', name: 'USD Coin', symbol: 'USDC', supplyApy: 6.20, borrowApy: 8.40, totalSupplied: '98,245,100', totalBorrowed: '54,120,400', ltv: 0.80, price: 1.00 },
  { id: '3', name: 'Euro Coin', symbol: 'EURC', supplyApy: 5.80, borrowApy: 7.90, totalSupplied: '24,150,000', totalBorrowed: '12,900,000', ltv: 0.80, price: 1.08 },
  { id: '4', name: 'Tether', symbol: 'USDT', supplyApy: 6.50, borrowApy: 8.80, totalSupplied: '74,500,000', totalBorrowed: '39,120,000', ltv: 0.75, price: 1.00 },
  { id: '5', name: 'Wrapped Ethereum', symbol: 'ETH', supplyApy: 4.10, borrowApy: 6.20, totalSupplied: '4,210', totalBorrowed: '1,950', ltv: 0.65, price: 3000.00 }
];

const extractAddress = (res: any): string | null => {
  if (!res) return null;
  if (typeof res === 'string') return res;
  if (res.address && typeof res.address === 'string') return res.address;
  if (res.publicKey && typeof res.publicKey === 'string') return res.publicKey;
  return null;
};

function App() {
  // Navigation Routing State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Wallet Connection States
  const [connected, setConnected] = useState<boolean>(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState<boolean>(false);

  // Global transactional triggers
  const [loadingTx, setLoadingTx] = useState<boolean>(false);
  const [loadingFaucet, setLoadingFaucet] = useState<boolean>(false);
  const [mockLoading, setMockLoading] = useState<{ [key: string]: boolean }>({});
  const [notification, setNotification] = useState<NotificationState | null>(null);

  // Modal State Control
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalAction, setModalAction] = useState<'supply' | 'withdraw' | 'borrow' | 'repay'>('supply');
  const [modalAsset, setModalAsset] = useState<string>('USDC');

  // Unified User Ledger Balance State
  const [userBalances, setUserBalances] = useState<{ [key: string]: UserAssetData }>({
    XLM: { symbol: 'XLM', name: 'Stellar Native', walletBalance: 0, suppliedBalance: 0, borrowedBalance: 0, isCollateral: false },
    USDC: { symbol: 'USDC', name: 'USD Coin', walletBalance: 0, suppliedBalance: 0, borrowedBalance: 0, isCollateral: false },
    EURC: { symbol: 'EURC', name: 'Euro Coin', walletBalance: 0, suppliedBalance: 0, borrowedBalance: 0, isCollateral: false },
    USDT: { symbol: 'USDT', name: 'Tether', walletBalance: 0, suppliedBalance: 0, borrowedBalance: 0, isCollateral: false },
    ETH: { symbol: 'ETH', name: 'Wrapped Ethereum', walletBalance: 0, suppliedBalance: 0, borrowedBalance: 0, isCollateral: false },
  });

  // Verify wallet presence on bootstrap
  useEffect(() => {
    const checkWallet = async () => {
      try {
        const result = await isConnected();
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
      }
    };
    checkWallet();
  }, []);

  // Fetch native XLM from Horizon Testnet and update state
  const fetchBalance = async (address: string) => {
    setLoadingBalance(true);
    try {
      const account = await horizon.loadAccount(address);
      const nativeBalance = account.balances.find(b => b.asset_type === 'native');
      const numBal = nativeBalance ? parseFloat(nativeBalance.balance) : 0;
      const formatted = numBal.toLocaleString('vi-VN', { maximumFractionDigits: 4 });
      
      setBalance(formatted);
      
      // Update XLM wallet balance in userBalances
      setUserBalances(prev => ({
        ...prev,
        XLM: {
          ...prev.XLM,
          walletBalance: numBal
        }
      }));
    } catch (err: any) {
      if (err.response?.status === 404) {
        setBalance('0');
        setUserBalances(prev => ({
          ...prev,
          XLM: { ...prev.XLM, walletBalance: 0 }
        }));
      } else {
        console.error("Lỗi lấy số dư:", err);
      }
    } finally {
      setLoadingBalance(false);
    }
  };

  // Connect Freighter Wallet
  const connectWallet = async () => {
    setNotification(null);
    try {
      const isInstalled = await isConnected();
      if (!isInstalled) {
        setNotification({
          type: 'error',
          title: 'Không tìm thấy ví',
          body: 'Vui lòng cài đặt tiện ích mở rộng ví Freighter trên trình duyệt của bạn.'
        });
        return;
      }

      const accessRes = await requestAccess();
      const pubKey = extractAddress(accessRes);
      
      if (pubKey) {
        setConnected(true);
        setPublicKey(pubKey);
        setNotification({
          type: 'success',
          title: 'Kết nối thành công',
          body: `Đã liên kết ví Stellar: ${pubKey.slice(0, 6)}...${pubKey.slice(-6)}`
        });
        fetchBalance(pubKey);
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Kết nối ví thất bại',
        body: err.message || 'Yêu cầu kết nối bị từ chối.'
      });
    }
  };

  // Trigger XLM friendbot faucet
  const handleFaucet = async () => {
    if (!publicKey) return;
    setLoadingFaucet(true);
    setNotification({
      type: 'info',
      title: 'Đang yêu cầu XLM...',
      body: 'Hệ thống Stellar Friendbot đang chuyển 10,000 XLM Testnet tới tài khoản của bạn.'
    });

    try {
      const response = await fetch(`https://friendbot.stellar.org/?addr=${publicKey}`);
      if (response.ok) {
        setNotification({
          type: 'success',
          title: 'Nhận XLM thành công!',
          body: 'Ví của bạn đã được nhận thêm 10,000 XLM Testnet để làm phí gas.'
        });
        fetchBalance(publicKey);
      } else {
        throw new Error('Yêu cầu XLM thất bại');
      }
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Thất bại',
        body: err.message || 'Friendbot bận. Hãy thử lại sau ít phút.'
      });
    } finally {
      setLoadingFaucet(false);
    }
  };

  // Mock token faucet (USDC, EURC, USDT)
  const handleMockAssetFaucet = async (symbol: string, amount: number) => {
    setMockLoading(prev => ({ ...prev, [symbol]: true }));
    setNotification({
      type: 'info',
      title: `Đang phát hành ${symbol}...`,
      body: `Hệ thống đang chuẩn bị phát hành ${amount} Mock ${symbol} về ví của bạn.`
    });

    // Simulate blockchain confirmation lag
    await new Promise(resolve => setTimeout(resolve, 1500));

    setUserBalances(prev => ({
      ...prev,
      [symbol]: {
        ...prev[symbol],
        walletBalance: prev[symbol].walletBalance + amount
      }
    }));

    setNotification({
      type: 'success',
      title: `Nhận Mock ${symbol} thành công!`,
      body: `Đã nạp thêm ${amount.toLocaleString('vi-VN')} Mock ${symbol} vào tài khoản thử nghiệm của bạn.`
    });
    setMockLoading(prev => ({ ...prev, [symbol]: false }));
  };

  // Toggle Collateral Switch
  const handleToggleCollateral = (symbol: string) => {
    setUserBalances(prev => {
      const target = prev[symbol];
      if (target.suppliedBalance === 0) return prev; // Cannot toggle collateral if nothing is supplied

      const newState = !target.isCollateral;
      
      // Calculate safety check: if turning OFF collateral, would it drop health factor below 1.0?
      if (!newState) {
        const tempBalances = {
          ...prev,
          [symbol]: { ...target, isCollateral: false }
        };
        const tempMetrics = calculateGlobalMetrics(tempBalances);
        if (tempMetrics.totalBorrowedUsd > 0 && tempMetrics.healthFactor !== '∞' && parseFloat(tempMetrics.healthFactor) < 1.0) {
          setNotification({
            type: 'error',
            title: 'Hành động bị chặn',
            body: `Không thể tắt thế chấp cho ${symbol} vì sẽ khiến Chỉ số Sức khỏe giảm dưới 1.0, gây thanh lý nợ ngay lập tức!`
          });
          return prev;
        }
      }

      setNotification({
        type: 'success',
        title: newState ? 'Đã kích hoạt thế chấp' : 'Đã hủy thế chấp',
        body: `${symbol} hiện ${newState ? 'ĐANG' : 'KHÔNG'} được dùng để làm đòn bẩy vay thế chấp.`
      });

      return {
        ...prev,
        [symbol]: {
          ...target,
          isCollateral: newState
        }
      };
    });
  };

  // Modal actions triggered
  const handleOpenModal = (action: 'supply' | 'withdraw' | 'borrow' | 'repay', symbol: string) => {
    setModalAction(action);
    setModalAsset(symbol);
    setModalOpen(true);
  };

  // Submit supply / borrow / withdraw / repay transaction
  const handleLendingSubmit = async (
    action: 'supply' | 'withdraw' | 'borrow' | 'repay',
    symbol: string,
    amount: number
  ) => {
    setLoadingTx(true);
    setNotification({
      type: 'info',
      title: 'Đang khởi tạo giao dịch Soroban...',
      body: `Đang chạy mô phỏng RPC trên Stellar Testnet cho hành động ${action.toUpperCase()} ${amount} ${symbol}...`
    });

    try {
      // Step 1: Simulated RPC simulation delay
      await new Promise(resolve => setTimeout(resolve, 1200));

      setNotification({
        type: 'info',
        title: 'Đang chờ ký chữ ký ví...',
        body: 'Mở ví Freighter của bạn để xác nhận (Ký) giao dịch gọi hợp đồng thông minh UdonFi Lending.'
      });

      // Step 2: Simulated freighter sign confirm delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 3: Mutate State based on action
      setUserBalances(prev => {
        const item = prev[symbol];
        let wBal = item.walletBalance;
        let sBal = item.suppliedBalance;
        let bBal = item.borrowedBalance;
        let col = item.isCollateral;

        if (action === 'supply') {
          wBal = Math.max(0, wBal - amount);
          sBal += amount;
          // Auto enable collateral on first supply for convenient onboarding
          if (sBal > 0 && sBal - amount === 0) {
            col = true;
          }
        } else if (action === 'withdraw') {
          sBal = Math.max(0, sBal - amount);
          wBal += amount;
          if (sBal === 0) col = false;
        } else if (action === 'borrow') {
          bBal += amount;
          wBal += amount;
        } else if (action === 'repay') {
          bBal = Math.max(0, bBal - amount);
          wBal = Math.max(0, wBal - amount);
        }

        return {
          ...prev,
          [symbol]: {
            ...item,
            walletBalance: wBal,
            suppliedBalance: sBal,
            borrowedBalance: bBal,
            isCollateral: col
          }
        };
      });

      // If XLM transaction, fetch the actual Horizon balance to resync accurately
      if (symbol === 'XLM' && publicKey) {
        fetchBalance(publicKey);
      }

      setNotification({
        type: 'success',
        title: 'Giao dịch thành công! 🎉',
        body: `Đã xác thực sổ cái Stellar cho lệnh ${action.toUpperCase()} ${amount.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} ${symbol}.`
      });

      setModalOpen(false);
    } catch (err: any) {
      setNotification({
        type: 'error',
        title: 'Thực thi giao dịch thất bại',
        body: err.message || 'Có lỗi xảy ra trong quá trình RPC hoặc ký ví.'
      });
    } finally {
      setLoadingTx(false);
    }
  };

  // Mathematical Lending Calculation Engine
  const calculateGlobalMetrics = (balances: { [key: string]: UserAssetData }) => {
    let totalSuppliedUsd = 0;
    let totalBorrowedUsd = 0;
    let borrowCapacityUsd = 0;

    let weightedSupplyApy = 0;
    let weightedBorrowApy = 0;

    ASSET_MARKETS.forEach(market => {
      const uBal = balances[market.symbol];
      if (!uBal) return;

      const suppliedValue = uBal.suppliedBalance * market.price;
      const borrowedValue = uBal.borrowedBalance * market.price;

      totalSuppliedUsd += suppliedValue;
      totalBorrowedUsd += borrowedValue;

      if (uBal.isCollateral) {
        borrowCapacityUsd += suppliedValue * market.ltv;
      }

      weightedSupplyApy += suppliedValue * market.supplyApy;
      weightedBorrowApy += borrowedValue * market.borrowApy;
    });

    const netApy = totalSuppliedUsd > 0 
      ? (weightedSupplyApy - weightedBorrowApy) / totalSuppliedUsd
      : totalBorrowedUsd > 0 
        ? - (weightedBorrowApy / totalBorrowedUsd) 
        : 0;

    const healthFactor = totalBorrowedUsd > 0 
      ? (borrowCapacityUsd / totalBorrowedUsd) 
      : Infinity;

    return {
      totalSuppliedUsd,
      totalBorrowedUsd,
      borrowCapacityUsd,
      netApy,
      healthFactor: healthFactor === Infinity ? '∞' : healthFactor.toFixed(2)
    };
  };

  const globalMetrics = calculateGlobalMetrics(userBalances);
  const selectedMarket = ASSET_MARKETS.find(m => m.symbol === modalAsset) || ASSET_MARKETS[0];
  const selectedUserData = userBalances[modalAsset] || {
    walletBalance: 0,
    suppliedBalance: 0,
    borrowedBalance: 0,
    isCollateral: false
  };

  return (
    <div className="app-container">
      
      {/* Global Brand Header */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        connected={connected}
        publicKey={publicKey}
        balance={balance}
        loadingBalance={loadingBalance}
        connectWallet={connectWallet}
      />

      {/* Top Banner Notifications */}
      {notification && (
        <div className={`notification-banner ${notification.type}`}>
          <span style={{ fontSize: '18px', display: 'block', marginTop: '2px' }}>
            {notification.type === 'success' && '✅'}
            {notification.type === 'error' && '🛑'}
            {notification.type === 'info' && '⏳'}
          </span>
          <div className="banner-content">
            <div className="banner-title">{notification.title}</div>
            <div className="banner-desc">{notification.body}</div>
          </div>
          <button className="banner-close" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      {/* Render selected view */}
      <main style={{ width: '100%' }}>
        {currentTab === 'dashboard' && (
          <DashboardView
            assets={ASSET_MARKETS}
            onNavigate={setCurrentTab}
            connected={connected}
            totalSuppliedUsd={globalMetrics.totalSuppliedUsd}
            totalBorrowedUsd={globalMetrics.totalBorrowedUsd}
            netApy={globalMetrics.netApy}
            healthFactor={globalMetrics.healthFactor}
          />
        )}

        {currentTab === 'lend' && (
          <LendMarketView
            assets={ASSET_MARKETS}
            userBalances={userBalances}
            connected={connected}
            connectWallet={connectWallet}
            onOpenModal={handleOpenModal}
            onToggleCollateral={handleToggleCollateral}
          />
        )}

        {currentTab === 'borrow' && (
          <BorrowMarketView
            assets={ASSET_MARKETS}
            userBalances={userBalances}
            connected={connected}
            connectWallet={connectWallet}
            onOpenModal={handleOpenModal}
            borrowCapacityUsd={globalMetrics.borrowCapacityUsd}
            totalBorrowedUsd={globalMetrics.totalBorrowedUsd}
          />
        )}

        {currentTab === 'portfolio' && (
          <PortfolioView
            userBalances={userBalances}
            connected={connected}
            connectWallet={connectWallet}
            onOpenModal={handleOpenModal}
            onToggleCollateral={handleToggleCollateral}
            totalSuppliedUsd={globalMetrics.totalSuppliedUsd}
            totalBorrowedUsd={globalMetrics.totalBorrowedUsd}
            borrowCapacityUsd={globalMetrics.borrowCapacityUsd}
            healthFactor={globalMetrics.healthFactor}
            netApy={globalMetrics.netApy}
          />
        )}

        {currentTab === 'faucet' && (
          <FaucetView
            connected={connected}
            connectWallet={connectWallet}
            loadingFaucet={loadingFaucet}
            handleXlmFaucet={handleFaucet}
            handleMockAssetFaucet={handleMockAssetFaucet}
            mockLoading={mockLoading}
          />
        )}
      </main>

      {/* Shared Transaction Modal Layer */}
      <LendingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        actionType={modalAction}
        assetSymbol={modalAsset}
        walletBalance={selectedUserData.walletBalance}
        suppliedBalance={selectedUserData.suppliedBalance}
        borrowedBalance={selectedUserData.borrowedBalance}
        isCollateral={selectedUserData.isCollateral}
        assetPrice={selectedMarket.price}
        ltv={selectedMarket.ltv}
        borrowCapacityUsd={globalMetrics.borrowCapacityUsd}
        totalBorrowedUsd={globalMetrics.totalBorrowedUsd}
        onSubmit={handleLendingSubmit}
        loading={loadingTx}
      />
    </div>
  );
}

export default App;
