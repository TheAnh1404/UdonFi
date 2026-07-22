/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @typescript-eslint/ban-ts-comment, prefer-const, no-useless-assignment, react-hooks/exhaustive-deps, react-hooks/set-state-in-effect */
import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { HealthFactorGauge } from './components/HealthFactorGauge';
import { PositionStats } from './components/PositionStats';
import { SystemReserves } from './components/SystemReserves';
import { Footer } from './components/Footer';
import { TradingViewChart } from './components/TradingViewChart';
import { PoolsPage } from './components/PoolsPage.tsx';
import { CreditMarketPage } from './components/CreditMarketPage.tsx';
import { MoneyFlowOverlay } from './components/MoneyFlowOverlay';
import { SimulatorPage } from './components/SimulatorPage';
import type { Reserve, UserBalances, LogLine, LiqSandbox, Web3Tx } from './types/lending';
import { Coins, Database } from 'lucide-react';

const eventChannel = typeof window !== 'undefined' ? new BroadcastChannel('udonfi_notification_bridge') : null;

// Web3 Integration Imports
import * as StellarSdk from '@stellar/stellar-sdk';
import { connectStellarWallet, signSorobanTx } from './services/walletKit';
import { io } from 'socket.io-client';

const generateMockHash = () => {
    let hash = '';
    while (hash.length < 64) {
        hash += Math.random().toString(16).substring(2);
    }
    return hash.substring(0, 64).toLowerCase();
};

const POOL_CONTRACT_ID = 'CBP6X4XEFDSPJV7DCEQ7M4OEA2PZMXMHWMC3SE26FHOVC2AQQLZMWJY6';
const RPC_URL = 'https://soroban-testnet.stellar.org';

const INITIAL_RESERVES: Record<'XLM' | 'USDC', Reserve> = {
    XLM: {
        index: 0,
        symbol: 'XLM',
        name: 'Stellar Lumens',
        price: 0.15,
        ltv: 70,
        liquidationThreshold: 82.5,
        supplyApy: 1.25,
        borrowApy: 4.5,
        totalSupplied: 500000,
        totalBorrowed: 150000,
        liquidityIndex: 1.00052,
        borrowIndex: 1.00185,
        baseRate: 1,
        slope1: 4,
        slope2: 85,
        uOptimal: 80
    },
    USDC: {
        index: 1,
        symbol: 'USDC',
        name: 'USD Coin',
        price: 1.00,
        ltv: 70,
        liquidationThreshold: 82.5,
        supplyApy: 2.15,
        borrowApy: 5.8,
        totalSupplied: 100000,
        totalBorrowed: 45000,
        liquidityIndex: 1.00024,
        borrowIndex: 1.00142,
        baseRate: 1,
        slope1: 4,
        slope2: 85,
        uOptimal: 80
    }
};

const INITIAL_USER_BALANCES: UserBalances = {
    wallet: {
        XLM: 100000,
        USDC: 1000000
    },
    suppliedScaled: {
        XLM: 0,
        USDC: 0
    },
    debtScaled: {
        XLM: 0,
        USDC: 0
    },
    bitmap: 0n, // u128 bit flags
    ttl: 5850,
    currentLedger: 641829
};

const INITIAL_TX_HISTORY: Web3Tx[] = [
    {
        id: 'tx-1',
        timestamp: '13:58:12',
        type: 'SUPPLY',
        asset: 'USDC',
        amount: 85000,
        hash: 'GCSOROBANLENDINGPOOLSUPPLYUSDC85K8291XDJ19',
        ledger: 641810,
        account: 'GBWHALE7YV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDONFI',
        cpuInstructions: 12000000
    },
    {
        id: 'tx-2',
        timestamp: '13:59:04',
        type: 'SUPPLY',
        asset: 'XLM',
        amount: 320000,
        hash: 'GCSOROBANLENDINGPOOLSUPPLYXLM320K283DJ1983',
        ledger: 641815,
        account: 'GBLPUSER2YV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDONFI',
        cpuInstructions: 12000000
    },
    {
        id: 'tx-3',
        timestamp: '14:01:22',
        type: 'BORROW',
        asset: 'USDC',
        amount: 35000,
        hash: 'GCSOROBANLENDINGPOOLBORROWUSDC35K9281DJX98',
        ledger: 641822,
        account: 'GBINSTITUTIONAL2YV6W42C7G5LXTQ6N5L2G57Q3OULKNGW3S5Q3K36UX',
        cpuInstructions: 18000000
    },
    {
        id: 'tx-4',
        timestamp: '14:02:10',
        type: 'LIQUIDATION_PREPARE',
        asset: 'XLM',
        amount: 2000,
        hash: 'GCSOROBAN2STEPLIQLOCKSESSION772615XJSH8192',
        ledger: 641825,
        account: 'GBKEEPERBOT7YV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDO',
        cpuInstructions: 60000000
    },
    {
        id: 'tx-5',
        timestamp: '14:02:15',
        type: 'LIQUIDATION_EXECUTE',
        asset: 'XLM',
        amount: 2000,
        hash: 'GCSOROBAN2STEPLIQEXECUTESESSION772615XJSH81',
        ledger: 641826,
        account: 'GBKEEPERBOT7YV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDO',
        cpuInstructions: 30000000
    }
];

const ToastItem = ({ toast, onDismiss }: { toast: any; onDismiss: (id: string) => void }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const enterTimer = setTimeout(() => setVisible(true), 50);

        const dismissTimer = setTimeout(() => {
            setVisible(false);
            setTimeout(() => onDismiss(toast.id), 400);
        }, 5500);

        return () => {
            clearTimeout(enterTimer);
            clearTimeout(dismissTimer);
        };
    }, [toast.id, onDismiss]);

    const isLiquidation = toast.action?.includes('LIQUIDATION');
    const accentColor = isLiquidation ? '#ff0055' : 'var(--cyan)';
    const bgGradient = isLiquidation 
        ? 'linear-gradient(135deg, rgba(20, 10, 25, 0.95), rgba(40, 5, 20, 0.9))'
        : 'linear-gradient(135deg, rgba(10, 20, 25, 0.95), rgba(5, 30, 35, 0.9))';
    const shadowGlow = isLiquidation
        ? '0 8px 32px rgba(255, 0, 85, 0.25), inset 0 0 12px rgba(255, 0, 85, 0.1)'
        : '0 8px 32px rgba(0, 242, 254, 0.25), inset 0 0 12px rgba(0, 242, 254, 0.1)';

    return (
        <div style={{
            background: bgGradient,
            border: `1px solid ${accentColor}44`,
            boxShadow: shadowGlow,
            borderRadius: '12px',
            padding: '1rem',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.4rem',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: visible ? 'translateX(0) scale(1)' : 'translateX(120%) scale(0.9)',
            opacity: visible ? 1 : 0,
            pointerEvents: 'auto',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: '4px',
                background: accentColor,
                boxShadow: `0 0 10px ${accentColor}`
            }}></div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '0.03em' }}>
                    {toast.title}
                </span>
                <button 
                    onClick={() => {
                        setVisible(false);
                        setTimeout(() => onDismiss(toast.id), 400);
                    }}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        padding: '0.1rem 0.3rem',
                        transition: 'color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                    ×
                </button>
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.4', margin: 0 }}>
                {toast.message}
            </p>

            {toast.txHash && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tx Hash:</span>
                    <a
                        href={`https://stellar.expert/explorer/testnet/tx/${toast.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ textDecoration: 'none', cursor: 'pointer' }}
                    >
                        <code style={{
                            fontSize: '0.65rem',
                            background: 'rgba(255,255,255,0.05)',
                            padding: '0.1rem 0.3rem',
                            borderRadius: '4px',
                            color: accentColor,
                            textShadow: `0 0 4px ${accentColor}33`,
                            letterSpacing: '0.02em',
                            transition: 'all 0.2s ease',
                            border: '1px solid transparent'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.borderColor = accentColor;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                            e.currentTarget.style.borderColor = 'transparent';
                        }}
                        >
                            {toast.txHash.slice(0, 12)}...{toast.txHash.slice(-8)}
                        </code>
                    </a>
                </div>
            )}

            <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '2px',
                background: accentColor,
                opacity: 0.7,
                transformOrigin: 'left',
                animation: 'toast-progress 5.5s linear forwards'
            }}></div>
        </div>
    );
};

function App() {
    const [reserves, setReserves] = useState<Record<'XLM' | 'USDC', Reserve>>(INITIAL_RESERVES);
    const [userBalances, setUserBalances] = useState<UserBalances>(INITIAL_USER_BALANCES);
    const [wallet, setWallet] = useState({ isConnected: false, address: '' });
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [isResetting, setIsResetting] = useState(false);
    const [resetStatus, setResetStatus] = useState('');
    const [autoResetEnabled, setAutoResetEnabled] = useState(false);

    const handleResetProtocol = async (isAuto = false) => {
        setIsResetting(true);
        setResetStatus(isAuto ? '🔄 Phát hiện giao dịch VAY thành công! Đang tự động reset hệ thống...' : '🔄 Đang kích hoạt tiến trình tái triển khai hợp đồng & reset database...');
        addLog('INFO', isAuto ? 'Đang tự động kích hoạt tiến trình reset giao thức...' : 'Đang kích hoạt tiến trình tái triển khai & reset...');

        try {
            const response = await fetch('http://localhost:3001/api/reset', {
                method: 'POST'
            });
            const data = await response.json();
            if (data.success) {
                setResetStatus('✅ API đã kích hoạt reset! Đang dọn dẹp Firestore & deploy hợp đồng mới (khoảng 15s)...');
                addLog('SUCCESS', 'Đã gửi yêu cầu reset tới API server thành công.');
                
                // Wait 15 seconds for the complete redeployment & reset to finish
                let countdown = 15;
                const interval = setInterval(() => {
                    countdown--;
                    if (countdown > 0) {
                        setResetStatus(`✅ Đang deploy hợp đồng mới & khởi động lại indexer... (${countdown}s)`);
                    } else {
                        clearInterval(interval);
                    }
                }, 1000);

                setTimeout(() => {
                    setResetStatus('🔄 Đang tải lại trang...');
                    addLog('SUCCESS', 'Reset hoàn tất! Trình duyệt đang tải lại...');
                    window.location.reload();
                }, 15000);
            } else {
                throw new Error(data.error || 'API reset trả về lỗi thất bại');
            }
        } catch (err: any) {
            setIsResetting(false);
            addLog('ERROR', `Lỗi kích hoạt reset hệ thống: ${err.message || err}`);
            alert(`Lỗi reset: ${err.message || err}`);
        }
    };

    const [currentView, setCurrentView] = useState<'DASHBOARD' | 'MARKET' | 'POOLS' | 'SIMULATOR'>('DASHBOARD');
    const [toasts, setToasts] = useState<any[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);
    const [txHistory, setTxHistory] = useState<Web3Tx[]>(INITIAL_TX_HISTORY);

    // Unified notification dispatcher (Toasts, Sound Chime and Notification History Dropdown)
    const triggerNotification = (data: {
        type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
        title: string;
        message: string;
        txHash?: string;
        action?: string;
    }) => {
        const id = Math.random().toString(36).substring(2, 9);
        const timestamp = new Date().toLocaleTimeString();

        // Push to toasts popup
        setToasts((prev) => [...prev, { ...data, id, timestamp }]);

        // Push to notifications dropdown history (limited to 30 items)
        setNotifications((prev) => [{ ...data, id, timestamp }, ...prev].slice(0, 30));

        // Synth Web3 premium chime sound using AudioContext
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.type = 'sine';
            const isLiq = data.action?.includes('LIQUIDATION');
            oscillator.frequency.setValueAtTime(isLiq ? 360 : 780, audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.04, audioCtx.currentTime);
            
            oscillator.start();
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (soundError) {
            console.warn('Synthetic chime sound blocked:', soundError);
        }
    };

    const handleNavigate = (view: 'DASHBOARD' | 'MARKET' | 'POOLS' | 'SIMULATOR') => {
        setCurrentView(view);
        if (view === 'DASHBOARD') window.location.hash = 'dashboard';
        else if (view === 'MARKET') window.location.hash = 'market';
        else if (view === 'POOLS') window.location.hash = 'pools';
        else if (view === 'SIMULATOR') window.location.hash = 'simulator';
    };

    // Hash routing handler
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash;
            if (hash === '#simulator') {
                setCurrentView('SIMULATOR');
            } else if (hash === '#market') {
                setCurrentView('MARKET');
            } else if (hash === '#pools') {
                setCurrentView('POOLS');
            } else if (hash === '#dashboard' || !hash) {
                setCurrentView('DASHBOARD');
            }
        };

        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    // BroadcastChannel Notification Receiver
    useEffect(() => {
        if (!eventChannel) return;

        const handleMessage = (event: MessageEvent) => {
            triggerNotification(event.data);
        };

        eventChannel.addEventListener('message', handleMessage);
        return () => eventChannel.removeEventListener('message', handleMessage);
    }, []);
    const socketInitializedRef = useRef(false);
    const socketRef = useRef<any>(null);
    const localSequenceRef = useRef<string | null>(null);

    // Soroban Transaction States
    const [txState, setTxState] = useState<'IDLE' | 'SIMULATING' | 'SIGNING' | 'SUBMITTING' | 'CONFIRMED' | 'FAILED'>('IDLE');
    const [txDetails, setTxDetails] = useState<{ gasFeeXlm: number; cpuInstructions: number; txHash?: string; error?: string }>({ gasFeeXlm: 0, cpuInstructions: 0 });

    const handleResetTxState = () => {
        setTxState('IDLE');
        setTxDetails({ gasFeeXlm: 0, cpuInstructions: 0 });
    };

    // Liquidation sandbox state
    const [sandbox, setSandbox] = useState<LiqSandbox>({
        supplyXLM: 0,
        borrowUSDC: 0,
        xlmPrice: 0.15,
        stepActive: 0,
        sessionId: null,
        isAutoKeeperActive: false
    });


    // Helper to add terminal logs
    const addLog = (type: LogLine['type'], message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const id = Math.random().toString(36).substring(2, 9);
        setLogs((prev) => [...prev, { id, timestamp, type, message }].slice(-50));
    };

    // Save Sandbox/Graceful Fallback Web3 Transaction to Firestore via Socket Proxy
    const saveTxToFirestore = async (tx: Omit<Web3Tx, 'id'>) => {
        try {
            const txData = {
                ...tx,
                id: 'tx-' + Math.random().toString(36).substring(2, 9),
                unit: tx.asset,
                currency: "USD"
            };
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit("save_tx", txData);
                addLog('SYSTEM', `Đang đồng bộ giao dịch ${tx.type} lên Firestore qua socket proxy...`);
            } else {
                throw new Error("Kênh truyền Socket.io chưa kết nối!");
            }
        } catch (error: any) {
            console.error('Lỗi lưu transaction lên Firestore:', error);
            addLog('ERROR', `Lỗi lưu transaction lên Firestore: ${error.message || error}`);
        }
    };

    // Update real-time Pool state inside Firestore pool_state/current document via Socket Proxy
    const updatePoolStateInFirestore = async (suppliedDelta: number, borrowedDelta: number) => {
        try {
            const currentSupplied = reserves.XLM.totalSupplied;
            const currentBorrowed = reserves.USDC.totalBorrowed;
            
            const newSupplied = Math.max(0, currentSupplied + suppliedDelta);
            const newBorrowed = Math.max(0, currentBorrowed + borrowedDelta);

            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit("update_pool_state", {
                    globalTotalSupplied: newSupplied,
                    globalTotalBorrowed: newBorrowed
                });
                addLog('SYSTEM', `Đồng bộ hóa Pool State qua socket: Supplied XLM = ${newSupplied.toLocaleString(undefined, {maximumFractionDigits: 1})}, Borrowed USDC = ${newBorrowed.toLocaleString(undefined, {maximumFractionDigits: 1})}`);
            } else {
                throw new Error("Kênh truyền Socket.io chưa kết nối!");
            }
        } catch (error: any) {
            console.error('Lỗi cập nhật Pool State lên Firestore:', error);
            addLog('ERROR', `Lỗi cập nhật Pool State lên Firestore: ${error.message || error}`);
        }
    };

    // Real Freighter & StellarWalletsKit connect and RPC query integration
    const handleConnectWallet = async () => {
        try {
            addLog('INFO', 'Đang kích hoạt quy trình kết nối ví (Freighter / StellarWalletsKit)...');
            const connection = await connectStellarWallet();
            const address = connection.publicKey;
            
            if (!address) {
                addLog('ERROR', 'Không lấy được địa chỉ ví. Vui lòng phê duyệt quyền kết nối ví.');
                return;
            }
            
            setWallet({ isConnected: true, address });
            addLog('SYSTEM', `Đã kết nối Ví Stellar thành công (${connection.walletType.toUpperCase()}). Địa chỉ ví: ${address.slice(0, 8)}...${address.slice(-8)}`);
            
            // Sync states from Soroban RPC
            await fetchUserBalancesAndContractState(address);
        } catch (err: any) {
            addLog('ERROR', `Lỗi kết nối ví Stellar: ${err.message || err}`);
        }
    };

    const saveUserBalancesToFirestore = async (userAddress: string, balances: UserBalances) => {
        if (!userAddress) return;
        try {
            const formattedBalances = {
                wallet: balances.wallet,
                suppliedScaled: balances.suppliedScaled,
                debtScaled: balances.debtScaled,
                bitmap: balances.bitmap.toString(),
                ttl: Number(balances.ttl) || 6000,
                currentLedger: Number(balances.currentLedger) || 641829
            };
            if (socketRef.current && socketRef.current.connected) {
                socketRef.current.emit("save_user_balance", { userAddress, balances: formattedBalances });
            } else {
                throw new Error("Kênh truyền Socket.io chưa kết nối!");
            }
        } catch (error: any) {
            console.error('Lỗi lưu vị thế ví lên Firestore:', error);
            addLog('ERROR', `Lỗi lưu vị thế ví lên Firestore: ${error.message || error}`);
        }
    };

    const updateUserBalances = (updater: UserBalances | ((prev: UserBalances) => UserBalances)) => {
        setUserBalances((prev) => {
            const next = typeof updater === 'function' ? updater(prev) : updater;
            if (wallet.isConnected && wallet.address) {
                saveUserBalancesToFirestore(wallet.address, next);
            }
            return next;
        });
    };

    const fetchUserBalancesAndContractState = async (userAddress: string) => {
        addLog('INFO', 'Đang kết nối tới Soroban RPC Testnet để tải dữ liệu tài khoản...');
        try {
            const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
            
            // 1. Fetch user's native XLM balance on Stellar network
            addLog('INFO', `Đang truy vấn số dư XLM của ví ${userAddress.slice(0, 8)}...`);
            let xlmBalance = 10000; // default fallback if account is new or not funded
            try {
                const account = await horizonServer.loadAccount(userAddress);
                const nativeBalance = account.balances.find((b: any) => b.asset_type === 'native');
                if (nativeBalance) {
                    xlmBalance = Number(nativeBalance.balance);
                    addLog('SUCCESS', `Tải thành công số dư XLM thực tế: ${xlmBalance.toFixed(2)} XLM`);
                } else {
                    addLog('INFO', 'Tài khoản chưa được kích hoạt trên Testnet. Đang tự động nạp 10,000 XLM qua Friendbot Faucet...');
                    try {
                        await fetch(`https://friendbot.stellar.org?addr=${userAddress}`);
                        addLog('SUCCESS', 'Đã nạp thành công 10,000 XLM qua Friendbot! Số dư XLM: 10000');
                        xlmBalance = 10000;
                    } catch (friendbotErr) {
                        addLog('INFO', 'Không thể gọi Friendbot. Sử dụng số dư XLM mặc định.');
                    }
                }
            } catch (err: any) {
                console.error(err);
                if (err.response?.status === 404) {
                    addLog('INFO', 'Tài khoản chưa tồn tại trên Testnet. Đang gọi Friendbot để kích hoạt...');
                } else {
                    addLog('INFO', 'Không thể truy cập Horizon. Đang gọi Friendbot để kích hoạt...');
                }
                try {
                    await fetch(`https://friendbot.stellar.org?addr=${userAddress}`);
                    addLog('SUCCESS', 'Đã kích hoạt và nạp thành công 10,000 XLM qua Friendbot!');
                    xlmBalance = 10000;
                } catch (friendbotErr) {
                    addLog('INFO', 'Không thể gọi Friendbot. Sử dụng số dư XLM mặc định.');
                }
            }

            // 2. Fetch User position from Firestore via Socket Proxy Callback
            addLog('INFO', 'Đang truy vấn vị thế người dùng (Supplied, Borrowed, Bitmap, TTL) qua Socket Proxy...');
            let balancesToUse = INITIAL_USER_BALANCES;
            
            if (socketRef.current && socketRef.current.connected) {
                try {
                    const response: any = await new Promise((resolve, reject) => {
                        socketRef.current.emit("get_user_balances", { userAddress }, (res: any) => {
                            if (res && res.success) {
                                resolve(res.data);
                            } else {
                                reject(new Error(res ? res.error : "Không nhận được phản hồi từ Socket Server"));
                            }
                        });
                    });
                    
                    if (response) {
                        balancesToUse = {
                            wallet: {
                                XLM: xlmBalance,
                                USDC: response.wallet?.USDC !== undefined ? Number(response.wallet.USDC) : INITIAL_USER_BALANCES.wallet.USDC
                            },
                            suppliedScaled: {
                                XLM: response.suppliedScaled?.XLM !== undefined ? Number(response.suppliedScaled.XLM) : 0,
                                USDC: response.suppliedScaled?.USDC !== undefined ? Number(response.suppliedScaled.USDC) : 0
                            },
                            debtScaled: {
                                XLM: response.debtScaled?.XLM !== undefined ? Number(response.debtScaled.XLM) : 0,
                                USDC: response.debtScaled?.USDC !== undefined ? Number(response.debtScaled.USDC) : 0
                            },
                            bitmap: response.bitmap ? BigInt(response.bitmap) : 0n,
                            ttl: response.ttl !== undefined ? Number(response.ttl) : 5850,
                            currentLedger: response.currentLedger !== undefined ? Number(response.currentLedger) : 641829
                        };
                        addLog('SUCCESS', 'Tải thành công vị thế người dùng từ Firestore qua Socket Proxy!');
                    } else {
                        addLog('INFO', 'Ví mới chưa có vị thế trên Firestore. Đang khởi tạo vị thế mặc định...');
                        balancesToUse = {
                            ...INITIAL_USER_BALANCES,
                            wallet: {
                                XLM: xlmBalance,
                                USDC: INITIAL_USER_BALANCES.wallet.USDC
                            }
                        };
                        await saveUserBalancesToFirestore(userAddress, balancesToUse);
                    }
                } catch (socketErr: any) {
                    console.error("Lỗi socket get_user_balances:", socketErr);
                    addLog('ERROR', `Lỗi socket proxy khi lấy vị thế: ${socketErr.message || socketErr}`);
                    // Fallback to local
                    balancesToUse = {
                        ...INITIAL_USER_BALANCES,
                        wallet: {
                            XLM: xlmBalance,
                            USDC: INITIAL_USER_BALANCES.wallet.USDC
                        }
                    };
                }
            } else {
                addLog('INFO', 'Kênh truyền Socket.io chưa sẵn sàng. Sử dụng vị thế mặc định.');
                balancesToUse = {
                    ...INITIAL_USER_BALANCES,
                    wallet: {
                        XLM: xlmBalance,
                        USDC: INITIAL_USER_BALANCES.wallet.USDC
                    }
                };
            }
            setUserBalances(balancesToUse);
        } catch (err: any) {
            addLog('ERROR', `Lỗi tải dữ liệu Soroban/Firestore: ${err.message || err}`);
        }
    };

    const handleDisconnectWallet = () => {
        setWallet({ isConnected: false, address: '' });
        setUserBalances((prev) => ({
            ...prev,
            suppliedScaled: { XLM: 0, USDC: 0 },
            debtScaled: { XLM: 0, USDC: 0 },
            bitmap: 0n
        }));
        addLog('SYSTEM', 'Đã ngắt kết nối ví Freighter.');
    };

    // Calculate dynamic rates using Kinked Curve formula
    const getUpdatedReserveRates = (res: Reserve, updatedSupplied: number, updatedBorrowed: number): Reserve => {
        const totalS = updatedSupplied;
        const totalB = updatedBorrowed;
        const u = totalS > 0 ? totalB / totalS : 0;
        const uPct = u * 100;

        let borrowApy = res.baseRate;
        if (uPct <= res.uOptimal) {
            borrowApy = res.baseRate + (uPct / res.uOptimal) * res.slope1;
        } else {
            borrowApy = res.baseRate + res.slope1 + ((uPct - res.uOptimal) / (100 - res.uOptimal)) * res.slope2;
        }

        // Supply APY = Borrow APY * Utilization * (1 - Reserve Factor 10%)
        const supplyApy = borrowApy * u * 0.9;

        return {
            ...res,
            totalSupplied: totalS,
            totalBorrowed: totalB,
            borrowApy,
            supplyApy
        };
    };

    // Accrue interest live (Visual Wow Factor!)
    useEffect(() => {
        let tickCount = 0;
        const interval = setInterval(() => {
            setReserves((prev) => {
                const xlm = prev.XLM;
                const usdc = prev.USDC;

                // Accrue interest smoothly every 1 second
                // ticksPerYear = 365 days * 24 hours * 3600 seconds
                const ticksPerYear = 365 * 24 * 3600;
                
                const newXlmLiqIndex = xlm.liquidityIndex * (1 + (xlm.supplyApy / 100) / ticksPerYear);
                const newXlmBorrowIndex = xlm.borrowIndex * (1 + (xlm.borrowApy / 100) / ticksPerYear);

                const newUsdcLiqIndex = usdc.liquidityIndex * (1 + (usdc.supplyApy / 100) / ticksPerYear);
                const newUsdcBorrowIndex = usdc.borrowIndex * (1 + (usdc.borrowApy / 100) / ticksPerYear);

                // Live tick the total supplied and borrowed assets visually to make TVL tick!
                const newXlmSupplied = xlm.totalSupplied * (1 + (xlm.supplyApy / 100) / ticksPerYear);
                const newXlmBorrowed = xlm.totalBorrowed * (1 + (xlm.borrowApy / 100) / ticksPerYear);

                const newUsdcSupplied = usdc.totalSupplied * (1 + (usdc.supplyApy / 100) / ticksPerYear);
                const newUsdcBorrowed = usdc.totalBorrowed * (1 + (usdc.borrowApy / 100) / ticksPerYear);

                return {
                    XLM: { 
                        ...xlm, 
                        liquidityIndex: newXlmLiqIndex, 
                        borrowIndex: newXlmBorrowIndex,
                        totalSupplied: newXlmSupplied,
                        totalBorrowed: newXlmBorrowed
                    },
                    USDC: { 
                        ...usdc, 
                        liquidityIndex: newUsdcLiqIndex, 
                        borrowIndex: newUsdcBorrowIndex,
                        totalSupplied: newUsdcSupplied,
                        totalBorrowed: newUsdcBorrowed
                    }
                };
            });

            // Count down TTL & count up Ledger only if wallet is connected (every 5 seconds = 1 block)
            if (wallet.isConnected) {
                tickCount++;
                if (tickCount >= 5) {
                    tickCount = 0;
                    updateUserBalances((prev) => {
                        if (prev.ttl <= 1) {
                            addLog('ERROR', '⚠️ SỰ CỐ: Ledger TTL chạm 0! Dữ liệu tài khoản bị EVICITED khỏi Soroban Ledger.');
                            addLog('INFO', 'Vui lòng nhấn "Gia hạn TTL" hoặc nạp tài sản để khôi phục.');
                            return {
                                ...prev,
                                ttl: 0,
                                suppliedScaled: { XLM: 0, USDC: 0 },
                                debtScaled: { XLM: 0, USDC: 0 },
                                bitmap: 0n
                            };
                        }
                        return {
                            ...prev,
                            ttl: prev.ttl - 1,
                            currentLedger: prev.currentLedger + 1
                        };
                    });
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [wallet.isConnected]);

    // Tự động đồng bộ số dư nạp/vay thật của người dùng vào Sandbox khi ví Freighter đã kết nối
    useEffect(() => {
        if (wallet.isConnected) {
            const realSupplyXLM = userBalances.suppliedScaled.XLM * reserves.XLM.liquidityIndex;
            const realBorrowUSDC = userBalances.debtScaled.USDC * reserves.USDC.borrowIndex;
            const realBorrowXLM = userBalances.debtScaled.XLM * reserves.XLM.borrowIndex;
            const totalDebtInUsd = realBorrowUSDC + (realBorrowXLM * reserves.XLM.price);
            setSandbox((prev) => ({
                ...prev,
                supplyXLM: realSupplyXLM,
                borrowUSDC: totalDebtInUsd
            }));
        } else {
            setSandbox((prev) => ({
                ...prev,
                supplyXLM: 0,
                borrowUSDC: 0
            }));
        }
    }, [
        wallet.isConnected, 
        userBalances.suppliedScaled.XLM, 
        userBalances.debtScaled.USDC, 
        userBalances.debtScaled.XLM,
        reserves.XLM.liquidityIndex, 
        reserves.USDC.borrowIndex,
        reserves.XLM.borrowIndex,
        reserves.XLM.price
    ]);

    // Socket.io integration to sync real-time events from indexer bot (Forwarded from Firestore via Admin SDK)
    useEffect(() => {
        if (!socketInitializedRef.current) {
            addLog('SYSTEM', 'Đang kết nối tới Real-time Indexer Bot qua WebSockets...');
            socketInitializedRef.current = true;
        }
        const socket = io('http://localhost:3001');
        socketRef.current = socket;

        let lastSuppliedXlm = 0;
        let lastBorrowedUsdc = 0;
        let isFirstPoolSync = true;

        socket.on('connect', () => {
            addLog('SUCCESS', 'Đã kết nối thành công tới Indexer Bot WebSocket tại http://localhost:3001!');
        });

        socket.on('connect_error', () => {
            // fail silently, do not spam log since it's just polling in the background
        });

        // 1. Listen to Real-time Pool State updates from Socket Server
        socket.on('pool_state_update', (data: any) => {
            if (data) {
                const suppliedXlm = data.globalTotalSupplied > 0 ? Number(data.globalTotalSupplied) : 0;
                const borrowedUsdc = data.globalTotalBorrowed > 0 ? Number(data.globalTotalBorrowed) : 0;

                // Only check for changes larger than a minimal threshold to avoid noise
                const hasChanged = Math.abs(suppliedXlm - lastSuppliedXlm) > 0.1 || Math.abs(borrowedUsdc - lastBorrowedUsdc) > 0.1;

                if (isFirstPoolSync) {
                    addLog('SUCCESS', 'Đồng bộ hóa thành công bể thanh khoản thời gian thực qua Socket Proxy!');
                    isFirstPoolSync = false;
                    lastSuppliedXlm = suppliedXlm;
                    lastBorrowedUsdc = borrowedUsdc;
                } else if (hasChanged) {
                    addLog('INFO', `Bể thanh khoản cập nhật: Supplied XLM = ${suppliedXlm.toLocaleString(undefined, {maximumFractionDigits: 1})}, Borrowed USDC = ${borrowedUsdc.toLocaleString(undefined, {maximumFractionDigits: 1})}`);
                    lastSuppliedXlm = suppliedXlm;
                    lastBorrowedUsdc = borrowedUsdc;
                }

                setReserves((prev) => {
                    const xlm = prev.XLM;
                    const usdc = prev.USDC;
                    
                    const nextSuppliedXlm = data.globalTotalSupplied > 0 ? Number(data.globalTotalSupplied) : xlm.totalSupplied;
                    const nextBorrowedUsdc = data.globalTotalBorrowed > 0 ? Number(data.globalTotalBorrowed) : usdc.totalBorrowed;
                    
                    // Recalculate dynamic APYs using Kinked APY Curve logic for the updated values
                    const updatedXlm = getUpdatedReserveRates(xlm, nextSuppliedXlm, xlm.totalBorrowed);
                    const updatedUsdc = getUpdatedReserveRates(usdc, usdc.totalSupplied, nextBorrowedUsdc);
                    
                    return {
                        XLM: updatedXlm,
                        USDC: updatedUsdc
                    };
                });
            }
        });

        // 2. Listen to Real-time Transactions updates from Socket Server
        socket.on('transactions_update', (txs: Web3Tx[]) => {
            if (txs && txs.length > 0) {
                setTxHistory(txs);
            }
        });

        // 3. Listen to New Transaction events to trigger Money Flow animation overlay
        socket.on('new_transaction_added', (data: any) => {
            if (data) {
                window.dispatchEvent(new CustomEvent('defi-money-flow', {
                    detail: {
                        type: data.type,
                        asset: data.asset,
                        amount: Number(data.amount) || 0
                    }
                }));
            }
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    // Process Real Web3 / Soroban Transaction Submission with High-Fidelity Fallback
    const handleTransactionSubmit = async (
        action: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LEVERAGE',
        asset: 'XLM' | 'USDC',
        amount: number,
        leverageFactor?: number
    ) => {
        if (!wallet.isConnected) {
            addLog('ERROR', 'Vui lòng kết nối ví Freighter trước!');
            return;
        }

        addLog('INFO', `[Soroban Web3] Đang chuẩn bị giao dịch ${action} ${amount} ${asset}...`);
        
        try {
            const server = new StellarSdk.rpc.Server(RPC_URL);
            const userAddress = wallet.address;
            
            setTxState('SIMULATING');
            setTxDetails({ gasFeeXlm: 0, cpuInstructions: 0 });

            addLog('INFO', 'Đang tải thông tin tài khoản từ Stellar để lấy Sequence Number...');
            let sourceAccount;
            try {
                const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
                const horizonAccount = await horizonServer.loadAccount(userAddress);
                const horizonSeq = BigInt(horizonAccount.sequence);

                // Sequence Lock Cache Comparison
                let seqToUse = horizonSeq;
                if (localSequenceRef.current) {
                    const cachedSeq = BigInt(localSequenceRef.current);
                    if (cachedSeq >= horizonSeq) {
                        seqToUse = cachedSeq + 1n;
                        addLog('SUCCESS', `🔒 [Sequence Lock] Phát hiện Horizon trễ. Sử dụng Sequence cục bộ tự tăng: ${seqToUse}`);
                    } else {
                        addLog('INFO', `Sử dụng Sequence mới từ Horizon: ${seqToUse}`);
                    }
                } else {
                    addLog('INFO', `Sử dụng Sequence từ Horizon: ${seqToUse}`);
                }

                // Tạm thời set cache với sequence hiện tại để chuẩn bị build tx (sequence tiếp theo là seqToUse + 1)
                localSequenceRef.current = seqToUse.toString();
                sourceAccount = new StellarSdk.Account(userAddress, seqToUse.toString());
            } catch (e) {
                addLog('ERROR', 'Tài khoản chưa được kích hoạt trên Testnet. Vui lòng nạp XLM qua Faucet (Friendbot).');
                setTxState('FAILED');
                setTxDetails({ gasFeeXlm: 0, cpuInstructions: 0, error: 'Tài khoản chưa kích hoạt trên Stellar Testnet. Vui lòng Faucet XLM.' });
                return;
            }

            let functionName = '';
            let contractArgs: any[] = [];
            
            const assetAddress = asset === 'XLM' 
                ? 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC' 
                : 'CAO2VFOWACEHKUJXGFDX5MOYFDGL2OANBOB3AK33CUR6R3A2Y5IC65XQ';

            const amountStroop = BigInt(Math.floor(amount * 10_000_000));

            if (action === 'SUPPLY') {
                functionName = 'supply';
                contractArgs = [
                    StellarSdk.nativeToScVal(StellarSdk.Address.fromString(userAddress)),
                    StellarSdk.nativeToScVal(StellarSdk.Address.fromString(assetAddress)),
                    StellarSdk.nativeToScVal(amountStroop, { type: 'i128' })
                ];
            } else if (action === 'WITHDRAW') {
                functionName = 'withdraw';
                contractArgs = [
                    StellarSdk.nativeToScVal(StellarSdk.Address.fromString(userAddress)),
                    StellarSdk.nativeToScVal(StellarSdk.Address.fromString(assetAddress)),
                    StellarSdk.nativeToScVal(amountStroop, { type: 'i128' })
                ];
            } else if (action === 'BORROW') {
                functionName = 'borrow';
                contractArgs = [
                    StellarSdk.nativeToScVal(StellarSdk.Address.fromString(userAddress)),
                    StellarSdk.nativeToScVal(StellarSdk.Address.fromString(assetAddress)),
                    StellarSdk.nativeToScVal(amountStroop, { type: 'i128' })
                ];
            } else if (action === 'REPAY') {
                functionName = 'repay';
                contractArgs = [
                    StellarSdk.nativeToScVal(StellarSdk.Address.fromString(userAddress)),
                    StellarSdk.nativeToScVal(StellarSdk.Address.fromString(assetAddress)),
                    StellarSdk.nativeToScVal(amountStroop, { type: 'i128' })
                ];
            } else if (action === 'LEVERAGE') {
                functionName = 'leverage_loop';
                const L = leverageFactor || 2.0;
                const finalSupply = amount * L;
                const borrowedUsdc = amount * (L - 1) * reserves.XLM.price;
                contractArgs = [
                    StellarSdk.nativeToScVal(StellarSdk.Address.fromString(userAddress)),
                    StellarSdk.nativeToScVal(BigInt(Math.floor(finalSupply * 10_000_000)), { type: 'i128' }),
                    StellarSdk.nativeToScVal(BigInt(Math.floor(borrowedUsdc * 10_000_000)), { type: 'i128' })
                ];
            }

            const poolContract = new StellarSdk.Contract(POOL_CONTRACT_ID);
            const operation = poolContract.call(functionName, ...contractArgs);

            addLog('INFO', 'Đang xây dựng giao dịch Soroban...');
            let tx = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarSdk.Networks.TESTNET
            })
            .addOperation(operation)
            .setTimeout(30)
            .build();

            // Cập nhật Sequence cache cục bộ bằng sequence đã dùng trong giao dịch này (seqToUse + 1)
            localSequenceRef.current = sourceAccount.sequenceNumber();

            addLog('INFO', 'Đang mô phỏng giao dịch (Simulate Transaction) trên Soroban RPC...');
            let simulated = await server.simulateTransaction(tx);
            
            let cpuInstructions = 12000000;
            let gasFeeXlm = 0.01;
            if (StellarSdk.rpc.Api.isSimulationSuccess(simulated)) {
                addLog('SUCCESS', 'Mô phỏng giao dịch THÀNH CÔNG trên Soroban VM!');
                tx = StellarSdk.rpc.assembleTransaction(tx, simulated).build();
                cpuInstructions = Number(simulated.minResourceFee) * 1000 || 12000000;
                gasFeeXlm = (Number(simulated.minResourceFee) + 100) / 10_000_000 || 0.01;
                setTxDetails({ gasFeeXlm, cpuInstructions });
            } else {
                const rawError = (simulated as any).error || '';
                let errorDetail = 'Lỗi không xác định từ RPC';
                if (typeof rawError === 'string') {
                    errorDetail = rawError;
                } else if (rawError && typeof rawError === 'object') {
                    errorDetail = rawError.message || JSON.stringify(rawError);
                }
                addLog('ERROR', `Mô phỏng giao dịch thất bại: ${errorDetail}`);
                throw new Error(`Mô phỏng giao dịch thất bại: ${errorDetail} (Gợi ý: Hợp đồng có thể chưa được khởi tạo/add_reserve đầy đủ trên Testnet)`);
            }

            setTxState('SIGNING');
            addLog('EVENT', 'Đang mở ví (Freighter / StellarWalletsKit) yêu cầu ký giao dịch...');
            const signedXdr = await signSorobanTx(
                tx.toXDR(),
                StellarSdk.Networks.TESTNET,
                userAddress
            );

            if (!signedXdr) {
                throw new Error('Không nhận được giao dịch đã ký từ ví Stellar.');
            }

            setTxState('SUBMITTING');

            addLog('INFO', 'Đang gửi giao dịch lên Stellar Testnet Ledger...');
            const txSubmit = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET);
            const submitResponse = await server.sendTransaction(txSubmit);

            if (submitResponse.status !== 'PENDING') {
                throw new Error(`RPC submit error: ${submitResponse.status}`);
            }

            addLog('INFO', `Giao dịch đã gửi thành công. Tx Hash: ${submitResponse.hash}. Đang chờ xác nhận từ sổ cái...`);
            
            let txResult = await server.getTransaction(submitResponse.hash);
            let attempts = 0;
            while (txResult.status === 'NOT_FOUND' && attempts < 10) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                txResult = await server.getTransaction(submitResponse.hash);
                attempts++;
            }

            if (txResult.status === 'SUCCESS') {
                addLog('SUCCESS', `Chúc mừng! Giao dịch ${action} đã được xác nhận thành công tại Ledger #${txResult.ledger}!`);
                addLog('EVENT', `Mã giao dịch (Tx Hash): ${submitResponse.hash}`);
                addLog('INFO', `Tiêu thụ ga Soroban: ${cpuInstructions.toLocaleString()} CPU Instructions.`);
                
                setTxState('CONFIRMED');
                setTxDetails(prev => ({ ...prev, txHash: submitResponse.hash }));

                // Save real transaction to Firestore immediately (Instantly sync history UI)
                const newRealTx = {
                    timestamp: new Date().toLocaleTimeString(),
                    type: action === 'LEVERAGE' ? 'SUPPLY' : action,
                    asset: asset,
                    amount: amount,
                    hash: submitResponse.hash,
                    ledger: txResult.ledger,
                    account: userAddress,
                    cpuInstructions: cpuInstructions
                };
                saveTxToFirestore(newRealTx);

                // Fetch fresh XLM balance from Horizon network
                let xlmBalance = amount;
                try {
                    const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
                    const account = await horizonServer.loadAccount(userAddress);
                    const nativeBalance = account.balances.find((b: any) => b.asset_type === 'native');
                    if (nativeBalance) {
                        xlmBalance = Number(nativeBalance.balance);
                    }
                } catch (e) {
                    console.error("Horizon error post-tx:", e);
                }

                // Update user balances in state and Firestore database immediately!
                updateUserBalances((prev) => {
                    const reserve = reserves[asset];
                    let newWallet = { ...prev.wallet };
                    newWallet.XLM = xlmBalance; // Sync fresh XLM balance
                    
                    let newSuppliedScaled = { ...prev.suppliedScaled };
                    let newDebtScaled = { ...prev.debtScaled };
                    let newBitmap = prev.bitmap;

                    const changeScaled = amount / (action === 'SUPPLY' || action === 'WITHDRAW' ? reserve.liquidityIndex : reserve.borrowIndex);

                    if (action === 'SUPPLY') {
                        if (asset === 'USDC') newWallet.USDC -= amount;
                        newSuppliedScaled[asset] += changeScaled;
                        
                        const bitToTurnOn = asset === 'XLM' ? 0n : 2n;
                        newBitmap |= (1n << bitToTurnOn);
                    } else if (action === 'WITHDRAW') {
                        newSuppliedScaled[asset] -= changeScaled;
                        if (asset === 'USDC') newWallet.USDC += amount;
                        
                        const actualSuppliedRemaining = newSuppliedScaled[asset] * reserve.liquidityIndex;
                        if (actualSuppliedRemaining < 0.01) {
                            newSuppliedScaled[asset] = 0;
                            const bitToTurnOff = asset === 'XLM' ? 0n : 2n;
                            newBitmap &= ~(1n << bitToTurnOff);
                        }
                    } else if (action === 'BORROW') {
                        if (asset === 'USDC') newWallet.USDC += amount;
                        newDebtScaled[asset] += changeScaled;
                        
                        const bitToTurnOn = asset === 'XLM' ? 1n : 3n;
                        newBitmap |= (1n << bitToTurnOn);
                    } else if (action === 'REPAY') {
                        if (asset === 'USDC') newWallet.USDC -= amount;
                        newDebtScaled[asset] -= changeScaled;
                        
                        const actualDebtRemaining = newDebtScaled[asset] * reserve.borrowIndex;
                        if (actualDebtRemaining < 0.01) {
                            newDebtScaled[asset] = 0;
                            const bitToTurnOff = asset === 'XLM' ? 1n : 3n;
                            newBitmap &= ~(1n << bitToTurnOff);
                        }
                    } else if (action === 'LEVERAGE') {
                        const L = leverageFactor || 2.0;
                        const initialSupply = amount;
                        const finalSupply = initialSupply * L;
                        const borrowedUsdc = initialSupply * (L - 1) * reserves.XLM.price;

                        if (asset === 'USDC') newWallet.USDC -= initialSupply;
                        
                        const changeSuppliedScaled = finalSupply / reserves.XLM.liquidityIndex;
                        newSuppliedScaled.XLM += changeSuppliedScaled;

                        const changeDebtScaled = borrowedUsdc / reserves.USDC.borrowIndex;
                        newDebtScaled.USDC += changeDebtScaled;

                        newBitmap |= (1n << 0n) | (1n << 3n);
                    }

                    return {
                        wallet: newWallet,
                        suppliedScaled: newSuppliedScaled,
                        debtScaled: newDebtScaled,
                        bitmap: newBitmap,
                        ttl: Math.min(6000, prev.ttl + 500),
                        currentLedger: txResult.ledger || prev.currentLedger
                    };
                });

                // Trigger UI money flow animation
                window.dispatchEvent(new CustomEvent('defi-money-flow', {
                    detail: { type: action, asset, amount }
                }));

                // Automatically reset protocol after any successful transaction (if enabled)
                if (autoResetEnabled) {
                    const actionMap: Record<string, string> = {
                        SUPPLY: 'NẠP',
                        WITHDRAW: 'RÚT',
                        BORROW: 'VAY',
                        REPAY: 'TRẢ NỢ',
                        LEVERAGE: 'LEVERAGE'
                    };
                    const actionName = actionMap[action] || action;
                    addLog('SYSTEM', `🔥 TỰ ĐỘNG RESET: Giao dịch ${actionName} thành công! Hệ thống sẽ tự động kích hoạt Redeploy & Reset sau 6 giây...`);
                    setTimeout(() => {
                        handleResetProtocol(true);
                    }, 6000);
                } else {
                    addLog('SYSTEM', `ℹ️ Tự động reset đang tắt. Vị thế giao dịch ${action} được giữ lại để bạn tiếp tục thử nghiệm!`);
                }
            } else {
                throw new Error(`Transaction failed with status: ${txResult.status}`);
            }

        } catch (err: any) {
            console.error('Real Testnet Transaction Error:', err);
            let userFriendlyError = err.message || String(err);
            
            // Reset local sequence cache on failure so the next action pulls fresh from Horizon (Self-Healing)
            localSequenceRef.current = null;
            
            // Suggest trustline if USDC fails and mentions trustline/missing entry
            if (asset === 'USDC' && (userFriendlyError.toLowerCase().includes('trustline') || userFriendlyError.toLowerCase().includes('missing') || userFriendlyError.toLowerCase().includes('failed host function'))) {
                userFriendlyError += ' (Gợi ý: Địa chỉ ví của bạn có thể chưa đăng ký Trustline USDC trên Stellar Testnet. Vui lòng mở ví Freighter và thêm Token USDC với Issuer: GCHCL7SUEVO2N46TPIVPAMQPK5BETF46RNAGN6Y5TKICVCZOWTHTNWQ4)';
            }
            
            addLog('ERROR', `⚠️ Tương tác blockchain thật thất bại: ${userFriendlyError}`);
            setTxState('FAILED');
            setTxDetails({ 
                gasFeeXlm: 0, 
                cpuInstructions: 0, 
                error: userFriendlyError 
            });
        }
    };

    const handleRegisterTrustline = async () => {
        if (!wallet.isConnected || !wallet.address) {
            addLog('ERROR', 'Vui lòng kết nối ví Freighter trước!');
            return;
        }

        addLog('INFO', '[Stellar Web3] Đang chuẩn bị đăng ký Trustline USDC...');
        setTxState('SIMULATING');
        setTxDetails({ gasFeeXlm: 0, cpuInstructions: 0 });

        try {
            const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
            
            // Tải thông tin tài khoản và sequence mới nhất (áp dụng Sequence Lock)
            const horizonAccount = await horizonServer.loadAccount(wallet.address);
            const horizonSeq = BigInt(horizonAccount.sequence);
            
            let seqToUse = horizonSeq;
            if (localSequenceRef.current) {
                const cachedSeq = BigInt(localSequenceRef.current);
                if (cachedSeq >= horizonSeq) {
                    seqToUse = cachedSeq + 1n;
                }
            }
            localSequenceRef.current = seqToUse.toString();

            const sourceAccount = new StellarSdk.Account(wallet.address, seqToUse.toString());

            // Build changeTrust operation for USDC Testnet
            const usdcClassicAsset = new StellarSdk.Asset(
                'USDC',
                'GCHCL7SUEVO2N46TPIVPAMQPK5BETF46RNAGN6Y5TKICVCZOWTHTNWQ4'
            );

            const operation = StellarSdk.Operation.changeTrust({
                asset: usdcClassicAsset
            });

            let tx = new StellarSdk.TransactionBuilder(sourceAccount, {
                fee: StellarSdk.BASE_FEE,
                networkPassphrase: StellarSdk.Networks.TESTNET
            })
            .addOperation(operation)
            .setTimeout(30)
            .build();

            // Cập nhật sequence cache cục bộ
            localSequenceRef.current = sourceAccount.sequenceNumber();

            setTxState('SIGNING');
            addLog('EVENT', 'Đang mở ví (Freighter / StellarWalletsKit) yêu cầu ký duyệt Trustline USDC...');
            
            const signedXdr = await signSorobanTx(
                tx.toXDR(),
                StellarSdk.Networks.TESTNET,
                wallet.address
            );

            if (!signedXdr) throw new Error('Không nhận được giao dịch đã ký từ ví Stellar.');

            setTxState('SUBMITTING');
            addLog('INFO', 'Đang phát giao dịch Trustline lên Stellar ledger...');
            
            const txSubmit = StellarSdk.TransactionBuilder.fromXDR(signedXdr, StellarSdk.Networks.TESTNET);
            const submitResponse = await horizonServer.submitTransaction(txSubmit);

            addLog('SUCCESS', `Đăng ký Trustline USDC thành công! Mã giao dịch: ${submitResponse.hash}`);
            setTxState('CONFIRMED');
            setTxDetails({ gasFeeXlm: 0.01, cpuInstructions: 0, txHash: submitResponse.hash });
            
            // Cập nhật lại số dư
            await fetchUserBalancesAndContractState(wallet.address);
        } catch (err: any) {
            console.error('USDC Trustline Error:', err);
            localSequenceRef.current = null;
            let errMsg = err.message || String(err);
            addLog('ERROR', `⚠️ Đăng ký Trustline thất bại: ${errMsg}`);
            setTxState('FAILED');
            setTxDetails({ gasFeeXlm: 0, cpuInstructions: 0, error: errMsg });
        }
    };

    // @ts-ignore
    const executeFallbackTransaction = (
        action: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LEVERAGE',
        asset: 'XLM' | 'USDC',
        amount: number,
        leverageFactor?: number
    ) => {
        updateUserBalances((prev) => {
            const reserve = reserves[asset];
            let newWallet = { ...prev.wallet };
            let newSuppliedScaled = { ...prev.suppliedScaled };
            let newDebtScaled = { ...prev.debtScaled };
            let newBitmap = prev.bitmap;

            const changeScaled = amount / (action === 'SUPPLY' || action === 'WITHDRAW' ? reserve.liquidityIndex : reserve.borrowIndex);

            let logMessage = '';
            let suppliedDelta = 0;
            let borrowedDelta = 0;

            if (action === 'SUPPLY') {
                newWallet[asset] -= amount;
                newSuppliedScaled[asset] += changeScaled;
                logMessage = `[Fallback Sandbox] Nạp thành công ${amount.toFixed(2)} ${asset} vào LendingPool.`;
                
                const bitToTurnOn = asset === 'XLM' ? 0n : 2n;
                newBitmap |= (1n << bitToTurnOn);

                if (asset === 'XLM') suppliedDelta = amount;
            } else if (action === 'WITHDRAW') {
                newSuppliedScaled[asset] -= changeScaled;
                newWallet[asset] += amount;
                logMessage = `[Fallback Sandbox] Rút thành công ${amount.toFixed(2)} ${asset} về ví.`;

                const actualSuppliedRemaining = newSuppliedScaled[asset] * reserve.liquidityIndex;
                if (actualSuppliedRemaining < 0.01) {
                    newSuppliedScaled[asset] = 0;
                    const bitToTurnOff = asset === 'XLM' ? 0n : 2n;
                    newBitmap &= ~(1n << bitToTurnOff);
                }

                if (asset === 'XLM') suppliedDelta = -amount;
            } else if (action === 'BORROW') {
                newWallet[asset] += amount;
                newDebtScaled[asset] += changeScaled;
                logMessage = `[Fallback Sandbox] Vay thành công ${amount.toFixed(2)} ${asset} về ví.`;

                const bitToTurnOn = asset === 'XLM' ? 1n : 3n;
                newBitmap |= (1n << bitToTurnOn);

                if (asset === 'USDC') borrowedDelta = amount;
            } else if (action === 'REPAY') {
                newWallet[asset] -= amount;
                newDebtScaled[asset] -= changeScaled;
                logMessage = `[Fallback Sandbox] Trả thành công ${amount.toFixed(2)} ${asset} nợ.`;

                const actualDebtRemaining = newDebtScaled[asset] * reserve.borrowIndex;
                if (actualDebtRemaining < 0.01) {
                    newDebtScaled[asset] = 0;
                    const bitToTurnOff = asset === 'XLM' ? 1n : 3n;
                    newBitmap &= ~(1n << bitToTurnOff);
                }

                if (asset === 'USDC') borrowedDelta = -amount;
            } else if (action === 'LEVERAGE') {
                const L = leverageFactor || 2.0;
                const initialSupply = amount;
                const finalSupply = initialSupply * L;
                const borrowedUsdc = initialSupply * (L - 1) * reserves.XLM.price;

                newWallet.XLM -= initialSupply;
                
                const changeSuppliedScaled = finalSupply / reserves.XLM.liquidityIndex;
                newSuppliedScaled.XLM += changeSuppliedScaled;

                const changeDebtScaled = borrowedUsdc / reserves.USDC.borrowIndex;
                newDebtScaled.USDC += changeDebtScaled;

                logMessage = `[Fallback Sandbox] Kích hoạt Vòng lặp đòn bẩy ${L.toFixed(1)}x: Thế chấp nâng lên ${finalSupply.toFixed(2)} XLM, nợ ${borrowedUsdc.toFixed(2)} USDC.`;

                newBitmap |= (1n << 0n) | (1n << 3n);

                suppliedDelta = finalSupply;
                borrowedDelta = borrowedUsdc;
            }

            addLog('SUCCESS', logMessage);
            addLog('EVENT', `Soroban VM: Đã cập nhật bitmap u128 tài khoản thành 0x${newBitmap.toString(16).toUpperCase()}`);
            
            const renewedTtl = Math.min(6000, prev.ttl + 500);
            addLog('INFO', `Gia hạn thời gian sống dữ liệu TTL thêm 500 Ledgers (Mới: ${renewedTtl})`);

            const txHash = generateMockHash();
            const newTx = {
                timestamp: new Date().toLocaleTimeString(),
                type: action === 'LEVERAGE' ? 'SUPPLY' : action,
                asset: asset,
                amount: amount,
                hash: txHash,
                ledger: prev.currentLedger,
                account: wallet.address || 'GBUDONFIYV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDONFI',
                cpuInstructions: action === 'SUPPLY' ? 12000000 
                    : action === 'WITHDRAW' ? 15000000 
                    : action === 'BORROW' ? 18000000 
                    : action === 'REPAY' ? 14000000 
                    : 35000000
            };
            
            // Save transaction to Firestore (Real-time synced)
            saveTxToFirestore(newTx);
            
            const messageData = {
                type: 'SUCCESS' as const,
                title: action === 'SUPPLY' ? `🎉 NẠP THẾ CHẤP THÀNH CÔNG` 
                    : action === 'WITHDRAW' ? `💸 RÚT TIỀN THÀNH CÔNG` 
                    : action === 'BORROW' ? `💰 VAY TIỀN THÀNH CÔNG` 
                    : action === 'REPAY' ? `💸 TRẢ NỢ THÀNH CÔNG` 
                    : `⚡ KÍCH HOẠT ĐÒN BẨY THÀNH CÔNG`,
                message: logMessage,
                txHash: txHash,
                action: action
            };
            
            // Broadcast successful transaction to all tabs
            eventChannel?.postMessage(messageData);
            
            // Trigger local Toast and add to notification history
            triggerNotification(messageData);
            
            // Trigger instant UI money flow animation
            window.dispatchEvent(new CustomEvent('defi-money-flow', {
                detail: { type: action, asset, amount }
            }));
            
            // Sync current reserve changes directly to Firestore
            if (suppliedDelta !== 0 || borrowedDelta !== 0) {
                updatePoolStateInFirestore(suppliedDelta, borrowedDelta);
            }

            return {
                ...prev,
                wallet: newWallet,
                suppliedScaled: newSuppliedScaled,
                debtScaled: newDebtScaled,
                bitmap: newBitmap,
                ttl: renewedTtl
            };
        });
    };

    // Toggle bitmap bits (Simulate direct contract bitmap updates)
    const handleToggleBit = (bitIndex: number) => {
        if (!wallet.isConnected) return;
        
        updateUserBalances((prev) => {
            const isBitOn = ((prev.bitmap >> BigInt(bitIndex)) & 1n) === 1n;
            const newBitmap = isBitOn ? prev.bitmap & ~(1n << BigInt(bitIndex)) : prev.bitmap | (1n << BigInt(bitIndex));
            
            addLog('EVENT', `Tác động trực tiếp Ledger: Toggled Bit #${bitIndex} sang ${isBitOn ? '0' : '1'}`);
            addLog('INFO', `Giá trị u128 mới: ${newBitmap.toString()}`);

            return {
                ...prev,
                bitmap: newBitmap
            };
        });
    };

    // Call extend_ttl manually
    const handleExtendTtl = () => {
        if (!wallet.isConnected) {
            handleConnectWallet();
            return;
        }

        updateUserBalances((prev) => {
            const restoredTtl = 6000;
            addLog('SUCCESS', `Gọi hàm extend_ttl() thành công! Gia hạn bộ nhớ lưu trữ về tối đa: ${restoredTtl} Ledgers.`);
            return {
                ...prev,
                ttl: restoredTtl
            };
        });
    };

    // Toggle collateral switch
    const handleToggleCollateral = (symbol: 'XLM' | 'USDC', useAsCollateral: boolean) => {
        if (!wallet.isConnected) {
            handleConnectWallet();
            return;
        }

        updateUserBalances((prev) => {
            // If turning off collateral, verify simulated health factor remains safe
            if (!useAsCollateral) {
                const xlmSupplied = prev.suppliedScaled.XLM * reserves.XLM.liquidityIndex;
                const usdcSupplied = prev.suppliedScaled.USDC * reserves.USDC.liquidityIndex;
                const xlmDebt = prev.debtScaled.XLM * reserves.XLM.borrowIndex;
                const usdcDebt = prev.debtScaled.USDC * reserves.USDC.borrowIndex;

                const xlmSuppliedValue = xlmSupplied * reserves.XLM.price;
                const usdcSuppliedValue = usdcSupplied * reserves.USDC.price;
                const xlmDebtValue = xlmDebt * reserves.XLM.price;
                const usdcDebtValue = usdcDebt * reserves.USDC.price;

                const isXlmCol = symbol === 'XLM' ? false : ((prev.bitmap & 1n) === 1n);
                const isUsdcCol = symbol === 'USDC' ? false : ((prev.bitmap & 4n) === 4n);

                const totalCollateralVal = (isXlmCol ? xlmSuppliedValue : 0) + (isUsdcCol ? usdcSuppliedValue : 0);
                const totalDebtVal = xlmDebtValue + usdcDebtValue;

                const simHf = totalDebtVal > 0 ? (totalCollateralVal * 0.825) / totalDebtVal : Infinity;

                if (simHf < 1.0) {
                    addLog('ERROR', `⚠️ LỖI REVERT: Không thể tắt thế chấp cho ${symbol}!`);
                    addLog('INFO', `Hệ số sức khỏe HF mô phỏng sẽ giảm xuống ${simHf.toFixed(2)} (nguy hiểm < 1.0). Giao dịch bị Soroban VM từ chối.`);
                    return prev;
                }
            }

            // Toggle bitmap: XLM collateral is bit 0, USDC collateral is bit 2
            const bitIndex = symbol === 'XLM' ? 0n : 2n;
            const newBitmap = useAsCollateral 
                ? prev.bitmap | (1n << bitIndex) 
                : prev.bitmap & ~(1n << bitIndex);

            addLog('EVENT', `Gọi thành công toggle_collateral() trong LendingPool cho ${symbol}.`);
            addLog('SUCCESS', `Đã ${useAsCollateral ? 'KÍCH HOẠT' : 'HỦY KÍCH HOẠT'} thế chấp tài sản ${symbol} trên Ledger.`);
            addLog('EVENT', `Soroban VM: Đã cập nhật bitmap u128 tài khoản thành 0x${newBitmap.toString(16).toUpperCase()}`);
            
            const renewedTtl = Math.min(6000, prev.ttl + 200);
            addLog('INFO', `Gia hạn thời gian sống dữ liệu TTL thêm 200 Ledgers (Mới: ${renewedTtl})`);

            return {
                ...prev,
                bitmap: newBitmap,
                ttl: renewedTtl
            };
        });
    };

    // Calculate user health factor for main dashboard
    const xlmSupplied = userBalances.suppliedScaled.XLM * reserves.XLM.liquidityIndex;
    const usdcSupplied = userBalances.suppliedScaled.USDC * reserves.USDC.liquidityIndex;
    const xlmDebt = userBalances.debtScaled.XLM * reserves.XLM.borrowIndex;
    const usdcDebt = userBalances.debtScaled.USDC * reserves.USDC.borrowIndex;

    const isXlmCollateral = ((userBalances.bitmap & 1n) === 1n);
    const isUsdcCollateral = ((userBalances.bitmap & 4n) === 4n);

    const xlmSuppliedValue = xlmSupplied * reserves.XLM.price;
    const usdcSuppliedValue = usdcSupplied * reserves.USDC.price;
    const xlmDebtValue = xlmDebt * reserves.XLM.price;
    const usdcDebtValue = usdcDebt * reserves.USDC.price;

    const totalCollateralValue = (isXlmCollateral ? xlmSuppliedValue : 0) + (isUsdcCollateral ? usdcSuppliedValue : 0);
    const totalDebtValue = xlmDebtValue + usdcDebtValue;

    const mainHealthFactor = totalDebtValue > 0 ? (totalCollateralValue * 0.825) / totalDebtValue : Infinity;

    // Check if real-time P2P mode is active (user has an actual position supplied or borrowed)
    const isRealP2PActive = wallet.isConnected && (xlmSupplied > 0 || usdcDebt > 0);

    // Two-step liquidation sandbox callbacks
    const handleSlideSandboxPrice = (price: number) => {
        setSandbox((prev) => ({ ...prev, xlmPrice: price }));
        addLog('INFO', `Mô phỏng Oracle: Giá XLM thay đổi thành $${price.toFixed(3)}`);
    };

    const handleToggleAutoKeeper = (active: boolean) => {
        setSandbox((prev) => ({ ...prev, isAutoKeeperActive: active }));
        addLog('SYSTEM', active 
            ? '🤖 Bot Keeper Tự Động: ĐÃ KÍCH HOẠT. Đang quét Ledger nền tìm kiếm các vị thế dưới mức an toàn (HF < 1.0)...' 
            : '🤖 Bot Keeper Tự Động: ĐÃ TẮT. Chuyển sang chế độ thanh lý thủ công.'
        );
    };

    const handlePrepareLiquidation = () => {
        const mockSessionId = '0x' + Math.random().toString(16).substring(2, 10).toUpperCase() + 'BE89';
        const isBot = sandbox.isAutoKeeperActive;
        setSandbox((prev) => ({
            ...prev,
            stepActive: 1,
            sessionId: mockSessionId
        }));
        
        const activeSupply = isRealP2PActive ? xlmSupplied : sandbox.supplyXLM;
        const prefix = isBot ? '🤖 [Keeper Bot]: ' : '[Step 1] ';
        addLog(isBot ? 'SUCCESS' : 'EVENT', `${prefix}Kích hoạt prepare_liquidation() thành công.`);
        addLog('INFO', `${isBot ? '🤖 Bot Keeper: ' : ''}Soroban Session được đăng ký tại ledger với ID: ${mockSessionId}. Đã khóa ${activeSupply.toLocaleString(undefined, {maximumFractionDigits: 1})} XLM thế chấp. Tiêu thụ 60,000,000 CPU instructions.`);

        // Push to Web3 Transaction History
        const prepareTx = {
            timestamp: new Date().toLocaleTimeString(),
            type: 'LIQUIDATION_PREPARE' as const,
            asset: 'XLM' as const,
            amount: activeSupply,
            hash: generateMockHash(),
            ledger: userBalances.currentLedger,
            account: isBot ? 'GBKEEPERBOT7YV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDO' : (wallet.address || 'GBUDONFIYV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDONFI'),
            cpuInstructions: 60000000
        };
        saveTxToFirestore(prepareTx);

        const prepareMessageData = {
            type: 'SUCCESS' as const,
            title: isBot ? '🤖 KEEPER: KHÓA PHIÊN THANH LÝ' : '⚡ KHÓA PHIÊN THANH LÝ (PREPARE)',
            message: `${isBot ? 'Bot Keeper' : 'Bạn'} đã kích hoạt thành công prepare_liquidation(). Đăng ký phiên ID: ${mockSessionId}. Khóa ${activeSupply.toLocaleString(undefined, {maximumFractionDigits: 1})} XLM thế chấp.`,
            txHash: prepareTx.hash,
            action: 'LIQUIDATION_PREPARE'
        };

        // Broadcast Prepare Liquidation success
        eventChannel?.postMessage(prepareMessageData);

        // Trigger local Toast and add to notification history
        triggerNotification(prepareMessageData);

        // Trigger UI money flow animation
        window.dispatchEvent(new CustomEvent('defi-money-flow', {
            detail: { type: 'LIQUIDATION_PREPARE', asset: 'XLM', amount: activeSupply }
        }));
    };

    const handleExecuteLiquidation = () => {
        const activeSupply = isRealP2PActive ? xlmSupplied : sandbox.supplyXLM;
        const activeBorrow = isRealP2PActive ? usdcDebt : sandbox.borrowUSDC;

        const debtPaid = activeBorrow; // pays off all USDC debt
        const requiredCollateralValue = debtPaid * 1.05; // 210 USD (with 5% liquidation bonus)
        const seizedXlm = requiredCollateralValue / sandbox.xlmPrice; // at current XLM price
        const actualSeized = Math.min(activeSupply, seizedXlm);
        const isBot = sandbox.isAutoKeeperActive;

        if (isRealP2PActive) {
            updateUserBalances((prev) => {
                const newDebtScaled = { ...prev.debtScaled, USDC: 0 };
                const seizedScaled = actualSeized / reserves.XLM.liquidityIndex;
                const newSuppliedScaled = {
                    ...prev.suppliedScaled,
                    XLM: Math.max(0, prev.suppliedScaled.XLM - seizedScaled)
                };

                // Update bitmap: turn off USDC borrow (bit 3) since debt is 0
                let newBitmap = prev.bitmap;
                newBitmap &= ~(1n << 3n);

                // turn off XLM supply (bit 0) if remaining supplied XLM is 0
                const remainingXlmSupply = newSuppliedScaled.XLM * reserves.XLM.liquidityIndex;
                if (remainingXlmSupply < 0.01) {
                    newSuppliedScaled.XLM = 0;
                    newBitmap &= ~(1n << 0n);
                }

                // Update wallet balances (paid USDC, received XLM)
                let newWallet = { ...prev.wallet };
                newWallet.USDC = Math.max(0, newWallet.USDC - debtPaid);
                newWallet.XLM = Math.max(0, newWallet.XLM + actualSeized);

                return {
                    ...prev,
                    wallet: newWallet,
                    suppliedScaled: newSuppliedScaled,
                    debtScaled: newDebtScaled,
                    bitmap: newBitmap
                };
            });
        } else {
            // Update local sandbox state
            setSandbox((prev) => ({
                ...prev,
                supplyXLM: Math.max(0, prev.supplyXLM - actualSeized),
                borrowUSDC: 0
            }));

            // Also update the user's wallet balances in mock simulation!
            updateUserBalances((prev) => {
                let newWallet = { ...prev.wallet };
                newWallet.USDC = Math.max(0, newWallet.USDC - debtPaid);
                newWallet.XLM = Math.max(0, newWallet.XLM + actualSeized);
                return {
                    ...prev,
                    wallet: newWallet
                };
            });
        }

        // Sync pool reserves dynamically with Firestore pool state
        updatePoolStateInFirestore(-actualSeized, -debtPaid);

        // Set step active to 2
        setSandbox((prev) => ({
            ...prev,
            stepActive: 2
        }));

        const prefix = isBot ? '🤖 [Keeper Bot]: ' : '[Step 2] ';
        addLog('SUCCESS', `${prefix}Kích hoạt execute_liquidation() thành công.`);
        addLog('SUCCESS', `${isBot ? '🤖 Bot Keeper: ' : ''}Đã tự động thanh toán nợ: ${debtPaid.toFixed(2)} USDC. Tịch thu ${actualSeized.toFixed(1)} XLM thế chấp (Bao gồm 5% thưởng thanh lý).`);
        addLog('SUCCESS', `💰 [Cập nhật ví]: Ví của bạn đã được cập nhật: -${debtPaid.toFixed(2)} USDC (thanh toán nợ) và +${actualSeized.toFixed(1)} XLM (tịch thu thế chấp).`);
        addLog('INFO', `${isBot ? '🤖 Bot Keeper: ' : ''}Soroban VM: Giải phóng phiên ID ${sandbox.sessionId}. Tiêu thụ 30,000,000 CPU instructions. Tổng CPU 2 bước: 90,000,000 (Dưới ngưỡng 100M).`);
        if (isRealP2PActive) {
            addLog('SUCCESS', `🤖 [P2P Settlement]: Đã khấu trừ ví Lending của bạn trên Ledger! Dư nợ USDC: 0.00, XLM thế chấp bị tịch thu: ${actualSeized.toFixed(1)}.`);
        }

        // Push to Web3 Transaction History
        const executeTx = {
            timestamp: new Date().toLocaleTimeString(),
            type: 'LIQUIDATION_EXECUTE' as const,
            asset: 'XLM' as const,
            amount: actualSeized,
            hash: generateMockHash(),
            ledger: userBalances.currentLedger,
            account: isBot ? 'GBKEEPERBOT7YV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDO' : (wallet.address || 'GBUDONFIYV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDONFI'),
            cpuInstructions: 30000000
        };
        saveTxToFirestore(executeTx);

        const executeMessageData = {
            type: 'SUCCESS' as const,
            title: isBot ? '🤖 KEEPER: THANH LÝ THÀNH CÔNG' : '🔥 THANH LÝ THÀNH CÔNG (EXECUTE)',
            message: `Thanh lý hoàn tất! Đã thanh toán nợ: ${debtPaid.toFixed(2)} USDC. Tịch thu ${actualSeized.toFixed(1)} XLM thế chấp (Bao gồm 5% thưởng).`,
            txHash: executeTx.hash,
            action: 'LIQUIDATION_EXECUTE'
        };

        // Broadcast Execute Liquidation success
        eventChannel?.postMessage(executeMessageData);

        // Trigger local Toast and add to notification history
        triggerNotification(executeMessageData);

        // Trigger UI money flow animation
        window.dispatchEvent(new CustomEvent('defi-money-flow', {
            detail: { type: 'LIQUIDATION_EXECUTE', asset: 'XLM', amount: actualSeized }
        }));
    };

    const handleResetSandbox = () => {
        const realSupplyXLM = wallet.isConnected ? userBalances.suppliedScaled.XLM * reserves.XLM.liquidityIndex : 0;
        const realBorrowUSDC = wallet.isConnected ? userBalances.debtScaled.USDC * reserves.USDC.borrowIndex : 0;
        const realBorrowXLM = wallet.isConnected ? userBalances.debtScaled.XLM * reserves.XLM.borrowIndex : 0;
        const totalDebtInUsd = realBorrowUSDC + (realBorrowXLM * reserves.XLM.price);
        
        setSandbox((prev) => ({
            ...prev,
            xlmPrice: 0.15,
            stepActive: 0,
            sessionId: null,
            isAutoKeeperActive: false,
            supplyXLM: realSupplyXLM,
            borrowUSDC: totalDebtInUsd
        }));
        
        if (wallet.isConnected && (realSupplyXLM > 0 || realBorrowUSDC > 0)) {
            addLog('SYSTEM', 'Sandbox thanh lý đã được reset giá XLM về $0.15. Vị thế P2P thực tế của bạn vẫn đang được đồng bộ!');
        } else {
            addLog('SYSTEM', 'Sandbox thanh lý đã được khôi phục về giá trị ban đầu (vị thế trống). Chế độ Bot tự động đã được tắt.');
        }
    };

    return (
        <div className="app-container">
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes spin-reverse {
                    0% { transform: rotate(360deg); }
                    100% { transform: rotate(0deg); }
                }
            `}</style>

            {isResetting && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    background: 'rgba(8, 12, 28, 0.95)',
                    backdropFilter: 'blur(30px)',
                    zIndex: 99999,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    gap: '1.5rem',
                    fontFamily: "'Outfit', 'Inter', sans-serif"
                }}>
                    {/* Glowing Spin Loader */}
                    <div style={{
                        position: 'relative',
                        width: '80px',
                        height: '80px'
                    }}>
                        <div style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            border: '4px solid rgba(0, 242, 254, 0.1)',
                            borderTop: '4px solid var(--cyan)',
                            borderRadius: '50%',
                            animation: 'spin 1.2s linear infinite',
                            boxShadow: '0 0 15px rgba(0, 242, 254, 0.2)'
                        }}></div>
                        <div style={{
                            position: 'absolute',
                            width: '70%',
                            height: '70%',
                            top: '15%',
                            left: '15%',
                            border: '4px solid rgba(155, 81, 224, 0.1)',
                            borderBottom: '4px solid var(--purple)',
                            borderRadius: '50%',
                            animation: 'spin-reverse 1.5s linear infinite',
                            boxShadow: '0 0 15px rgba(155, 81, 224, 0.2)'
                        }}></div>
                    </div>

                    <div style={{ textAlign: 'center', maxWidth: '500px', padding: '0 2rem' }}>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg, var(--cyan), var(--purple))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            marginBottom: '0.75rem',
                            letterSpacing: '-0.02em'
                        }}>
                            RESETTING PROTOCOL ENVIRONMENT
                        </h2>
                        <p style={{
                            fontSize: '0.9rem',
                            color: 'var(--text-bright)',
                            lineHeight: '1.6',
                            margin: 0,
                            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                        }}>
                            {resetStatus}
                        </p>
                    </div>

                    <div style={{
                        fontSize: '0.7rem',
                        color: 'var(--text-muted)',
                        letterSpacing: '0.05em',
                        textTransform: 'uppercase',
                        marginTop: '1rem',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        paddingTop: '0.8rem',
                        width: '260px',
                        textAlign: 'center'
                    }}>
                        UdonFi Developer Toolkit
                    </div>
                </div>
            )}

            <MoneyFlowOverlay />
            {/* Ambient Background Glows */}
            <div className="bg-glow-container">
                <div className="bg-glow bg-glow-1"></div>
                <div className="bg-glow bg-glow-2"></div>
                <div className="bg-glow bg-glow-3"></div>
            </div>

            {/* Header Component */}
            <Header
                reserves={reserves}
                wallet={wallet}
                onConnect={handleConnectWallet}
                onDisconnect={handleDisconnectWallet}
                currentView={currentView}
                onNavigate={handleNavigate}
                notifications={notifications}
                onClearNotifications={() => setNotifications([])}
                onResetProtocol={handleResetProtocol}
                autoResetEnabled={autoResetEnabled}
                onToggleAutoReset={() => setAutoResetEnabled(prev => !prev)}
            />

            {currentView === 'DASHBOARD' ? (
                <>
                    {/* Live real-time TradingView Chart */}
                    <TradingViewChart />

                    {/* Top row: Position Stats and Health Factor */}
                    <div className="dashboard-row pos-row">
                        <PositionStats reserves={reserves} userBalances={userBalances} wallet={wallet} />
                        <HealthFactorGauge healthFactor={mainHealthFactor} />
                    </div>

                    {/* System Reserves Pool State - Nằm riêng biệt bên dưới */}
                    <SystemReserves reserves={reserves} onNavigate={() => setCurrentView('POOLS')} />

                    {/* DeFi Action Gateway (Tập trung điều hướng) */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                        gap: '1.25rem',
                        marginTop: '1.25rem',
                        marginBottom: '1.25rem'
                    }}>
                        {/* Gateway Card 1: Credit Market */}
                        <div className="card glass-card" style={{
                            padding: '1.25rem',
                            border: '1px solid rgba(155, 81, 224, 0.15)',
                            boxShadow: '0 8px 32px rgba(155, 81, 224, 0.03)',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '180px'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <div style={{
                                        background: 'rgba(155, 81, 224, 0.1)',
                                        border: '1px solid rgba(155, 81, 224, 0.2)',
                                        padding: '0.4rem',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--purple)',
                                        boxShadow: '0 0 10px rgba(155,81,224,0.15)'
                                    }}>
                                        <Coins size={18} />
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '0.05em' }}>THỊ TRƯỜNG TÍN DỤNG UDONFI</span>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.45', margin: 0 }}>
                                    Không gian thao tác DeFi chuyên biệt. Thực hiện nạp tài sản thế chấp (Supply), vay nợ an toàn (Borrow), quản lý rủi ro vị thế với Health Factor Gauge, và truy cập các tác vụ cấu trúc Soroban nâng cao.
                                </p>
                            </div>
                            <button
                                onClick={() => setCurrentView('MARKET')}
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, var(--purple), #7b2cbf)',
                                    border: 'none',
                                    color: '#fff',
                                    borderRadius: '8px',
                                    padding: '0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.35rem',
                                    marginTop: '1rem',
                                    boxShadow: '0 4px 12px rgba(155,81,224,0.3)',
                                    transition: 'var(--transition-smooth)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                            >
                                <Coins size={12} />
                                <span>Bắt Đầu Giao Dịch & Vay Vốn ↗</span>
                            </button>
                            <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.02, pointerEvents: 'none' }}>
                                <Coins size={120} color="var(--purple)" />
                            </div>
                        </div>

                        {/* Gateway Card 2: Pools Detail */}
                        <div className="card glass-card" style={{
                            padding: '1.25rem',
                            border: '1px solid rgba(0, 242, 254, 0.15)',
                            boxShadow: '0 8px 32px rgba(0, 242, 254, 0.03)',
                            position: 'relative',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            minHeight: '180px'
                        }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                    <div style={{
                                        background: 'rgba(0, 242, 254, 0.1)',
                                        border: '1px solid rgba(0, 242, 254, 0.2)',
                                        padding: '0.4rem',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--cyan)',
                                        boxShadow: '0 0 10px rgba(0,242,254,0.15)'
                                    }}>
                                        <Database size={18} />
                                    </div>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '0.05em' }}>HỆ THỐNG BỂ THANH KHOẢN (POOLS)</span>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.45', margin: 0 }}>
                                    Trung tâm phân tích tài chính sâu rộng. Quan sát biểu đồ Kinked APY Curve phi tuyến tính theo thời gian thực, giám sát sổ cái dòng tiền Web3 Flow Ledger liên thông trực tiếp, và trải nghiệm mô phỏng thanh lý 2 bước.
                                </p>
                            </div>
                            <button
                                onClick={() => setCurrentView('POOLS')}
                                style={{
                                    width: '100%',
                                    background: 'linear-gradient(135deg, var(--cyan), #00b4d8)',
                                    border: 'none',
                                    color: '#070a13',
                                    borderRadius: '8px',
                                    padding: '0.6rem',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.35rem',
                                    marginTop: '1rem',
                                    boxShadow: '0 4px 12px rgba(0,242,254,0.3)',
                                    transition: 'var(--transition-smooth)'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.filter = 'none'}
                            >
                                <Database size={12} />
                                <span>Khám Phá Các Bể Thanh Khoản ↗</span>
                            </button>
                            <div style={{ position: 'absolute', right: '-15px', bottom: '-15px', opacity: 0.02, pointerEvents: 'none' }}>
                                <Database size={120} color="var(--cyan)" />
                            </div>
                        </div>
                    </div>
                </>
                    ) : currentView === 'MARKET' ? (
                <CreditMarketPage
                    reserves={reserves}
                    userBalances={userBalances}
                    wallet={wallet}
                    onConnect={handleConnectWallet}
                    onTransactionSubmit={handleTransactionSubmit}
                    onToggleCollateral={handleToggleCollateral}
                    onToggleBit={handleToggleBit}
                    onExtendTtl={handleExtendTtl}
                    txState={txState}
                    txDetails={txDetails}
                    onResetTxState={handleResetTxState}
                    onRegisterTrustline={handleRegisterTrustline}
                />
            ) : currentView === 'POOLS' ? (
                <PoolsPage
                    reserves={reserves}
                    txHistory={txHistory}
                />
            ) : (
                <SimulatorPage
                    reserves={reserves}
                    sandbox={sandbox}
                    isRealP2P={isRealP2PActive}
                    onSlidePrice={handleSlideSandboxPrice}
                    onToggleAutoKeeper={handleToggleAutoKeeper}
                    onPrepare={handlePrepareLiquidation}
                    onExecute={handleExecuteLiquidation}
                    onReset={handleResetSandbox}
                    logs={logs}
                    onClearLogs={() => setLogs([])}
                />
            )}

            {/* Floating Premium Neon Toast Container */}
            <div className="toast-container" style={{
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                zIndex: 10000,
                maxWidth: '420px',
                width: 'calc(100% - 4rem)',
                pointerEvents: 'none'
            }}>
                {toasts.map((toast) => (
                    <ToastItem 
                        key={toast.id} 
                        toast={toast} 
                        onDismiss={(id) => setToasts((prev) => prev.filter(t => t.id !== id))} 
                    />
                ))}
            </div>

            {/* Footer */}
            <Footer currentLedger={userBalances.currentLedger} />
        </div>
    );
}

export default App;
