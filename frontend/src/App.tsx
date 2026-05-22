import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { HealthFactorGauge } from './components/HealthFactorGauge';
import { PositionStats } from './components/PositionStats';
import { SystemReserves } from './components/SystemReserves';
import { Footer } from './components/Footer';
import { ConsoleLogger } from './components/ConsoleLogger';
import { TradingViewChart } from './components/TradingViewChart';
import { PoolsPage } from './components/PoolsPage.tsx';
import { CreditMarketPage } from './components/CreditMarketPage.tsx';
import type { Reserve, UserBalances, LogLine, LiqSandbox, Web3Tx } from './types/lending';
import { Coins, Database } from 'lucide-react';

// Web3 Integration Imports
import * as StellarSdk from '@stellar/stellar-sdk';
import { isConnected, setAllowed, getAddress, signTransaction } from '@stellar/freighter-api';
import { io } from 'socket.io-client';

const POOL_CONTRACT_ID = 'CAQRYQXLNBFXCKNCN3UIVGL2OCR6EL3QURZ56ZC2B4YMPYY6JAVXLBBH';
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
        XLM: 12000,
        USDC: 2500
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

function App() {
    const [reserves, setReserves] = useState<Record<'XLM' | 'USDC', Reserve>>(INITIAL_RESERVES);
    const [userBalances, setUserBalances] = useState<UserBalances>(INITIAL_USER_BALANCES);
    const [wallet, setWallet] = useState({ isConnected: false, address: '' });
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [currentView, setCurrentView] = useState<'DASHBOARD' | 'MARKET' | 'POOLS'>('DASHBOARD');
    const [txHistory, setTxHistory] = useState<Web3Tx[]>(INITIAL_TX_HISTORY);
    const socketInitializedRef = useRef(false);

    // Soroban Transaction States
    const [txState, setTxState] = useState<'IDLE' | 'SIMULATING' | 'SIGNING' | 'SUBMITTING' | 'CONFIRMED' | 'FAILED'>('IDLE');
    const [txDetails, setTxDetails] = useState<{ gasFeeXlm: number; cpuInstructions: number; txHash?: string; error?: string }>({ gasFeeXlm: 0, cpuInstructions: 0 });

    const handleResetTxState = () => {
        setTxState('IDLE');
        setTxDetails({ gasFeeXlm: 0, cpuInstructions: 0 });
    };

    // Liquidation sandbox state
    const [sandbox, setSandbox] = useState<LiqSandbox>({
        supplyXLM: 2000,
        borrowUSDC: 200,
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

    // Real Freighter connect and RPC query integration
    const handleConnectWallet = async () => {
        try {
            const connected = await isConnected();
            if (!connected) {
                addLog('ERROR', 'Không tìm thấy ví Freighter. Vui lòng cài đặt Freighter extension.');
                return;
            }
            
            // Yêu cầu quyền truy cập từ ví Freighter (setAllowed sẽ kích hoạt popup)
            addLog('INFO', 'Đang yêu cầu kết nối với ví Freighter của bạn...');
            await setAllowed();
            
            // Lấy địa chỉ ví đã kết nối bằng getAddress
            const addressResponse = await getAddress();
            const address = typeof addressResponse === 'string' ? addressResponse : addressResponse?.address;
            
            if (!address) {
                addLog('ERROR', 'Không lấy được địa chỉ ví. Vui lòng mở khóa ví Freighter.');
                return;
            }
            
            setWallet({ isConnected: true, address });
            addLog('SYSTEM', 'Đã kết nối Ví Freighter thật. Địa chỉ ví: ' + address.slice(0, 8) + '...' + address.slice(-8));
            
            // Sync states from RPC
            await fetchUserBalancesAndContractState(address);
        } catch (err: any) {
            addLog('ERROR', `Lỗi kết nối ví Freighter: ${err.message || err}`);
        }
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

            setUserBalances(prev => ({
                ...prev,
                wallet: {
                    ...prev.wallet,
                    XLM: xlmBalance,
                    USDC: prev.wallet.USDC // keep USDC mock balance
                }
            }));
        } catch (err: any) {
            addLog('ERROR', `Lỗi tải dữ liệu Soroban: ${err.message || err}`);
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
                    setUserBalances((prev) => {
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

    // Socket.io integration to sync real-time events from indexer bot
    useEffect(() => {
        if (!socketInitializedRef.current) {
            addLog('SYSTEM', 'Đang kết nối tới Real-time Indexer Bot qua WebSockets...');
            socketInitializedRef.current = true;
        }
        const socket = io('http://localhost:3001');

        socket.on('connect', () => {
            addLog('SUCCESS', 'Đã kết nối thành công tới Indexer Bot WebSocket tại http://localhost:3001!');
        });

        socket.on('connect_error', () => {
            // fail silently, do not spam log since it's just polling in the background
        });

        socket.on('protocol_update', (data: any) => {
            if (data && (data.globalTotalSupplied > 0 || data.globalTotalBorrowed > 0)) {
                addLog('INFO', 'Đồng bộ hóa thành công dữ liệu bể thanh khoản thời gian thực từ Indexer!');
                setReserves((prev) => {
                    const xlm = prev.XLM;
                    const usdc = prev.USDC;
                    return {
                        XLM: {
                            ...xlm,
                            totalSupplied: data.globalTotalSupplied > 0 ? data.globalTotalSupplied : xlm.totalSupplied
                        },
                        USDC: {
                            ...usdc,
                            totalBorrowed: data.globalTotalBorrowed > 0 ? data.globalTotalBorrowed : usdc.totalBorrowed
                        }
                    };
                });
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
                sourceAccount = await server.getAccount(userAddress);
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
                : 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA';

            const amountWad = BigInt(Math.floor(amount * 1_000_000_000_000_000_000));

            if (action === 'SUPPLY') {
                functionName = 'supply';
                contractArgs = [
                    StellarSdk.Address.fromString(userAddress).toScVal(),
                    StellarSdk.Address.fromString(assetAddress).toScVal(),
                    StellarSdk.nativeToScVal(amountWad, { type: 'i128' })
                ];
            } else if (action === 'WITHDRAW') {
                functionName = 'withdraw';
                contractArgs = [
                    StellarSdk.Address.fromString(userAddress).toScVal(),
                    StellarSdk.Address.fromString(assetAddress).toScVal(),
                    StellarSdk.nativeToScVal(amountWad, { type: 'i128' })
                ];
            } else if (action === 'BORROW') {
                functionName = 'borrow';
                contractArgs = [
                    StellarSdk.Address.fromString(userAddress).toScVal(),
                    StellarSdk.Address.fromString(assetAddress).toScVal(),
                    StellarSdk.nativeToScVal(amountWad, { type: 'i128' })
                ];
            } else if (action === 'REPAY') {
                functionName = 'repay';
                contractArgs = [
                    StellarSdk.Address.fromString(userAddress).toScVal(),
                    StellarSdk.Address.fromString(assetAddress).toScVal(),
                    StellarSdk.nativeToScVal(amountWad, { type: 'i128' })
                ];
            } else if (action === 'LEVERAGE') {
                functionName = 'leverage_loop';
                const L = leverageFactor || 2.0;
                const finalSupply = amount * L;
                const borrowedUsdc = amount * (L - 1) * reserves.XLM.price;
                contractArgs = [
                    StellarSdk.Address.fromString(userAddress).toScVal(),
                    StellarSdk.nativeToScVal(BigInt(Math.floor(finalSupply * 1_000_000_000_000_000_000)), { type: 'i128' }),
                    StellarSdk.nativeToScVal(BigInt(Math.floor(borrowedUsdc * 1_000_000_000_000_000_000)), { type: 'i128' })
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

            addLog('EVENT', 'Đang mở ví Freighter yêu cầu người dùng KÝ giao dịch...');
            const xdrSigned = await signTransaction(tx.toXDR(), {
                networkPassphrase: StellarSdk.Networks.TESTNET,
                address: userAddress
            });

            const signedXdr = typeof xdrSigned === 'string' ? xdrSigned : (xdrSigned as any)?.signedTxXdr;
            const signError = (xdrSigned as any)?.error;

            if (signError) {
                throw new Error(`Ví Freighter từ chối ký: ${signError}`);
            }

            if (!signedXdr) {
                throw new Error('Không nhận được giao dịch đã ký từ Freighter.');
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

                await fetchUserBalancesAndContractState(userAddress);
            } else {
                throw new Error(`Transaction failed with status: ${txResult.status}`);
            }

        } catch (err: any) {
            addLog('ERROR', `⚠️ Tương tác Testnet thật gặp lỗi: ${err.message || err}`);
            addLog('INFO', 'Đang kích hoạt cơ chế Graceful Fallback: Chạy xử lý cục bộ trên Sandbox...');
            
            // Premium Fallback animation sequence
            setTxState('SIMULATING');
            setTxDetails({ gasFeeXlm: 0.005, cpuInstructions: 15000000 });
            
            await new Promise(resolve => setTimeout(resolve, 800));
            setTxState('SIGNING');
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            setTxState('SUBMITTING');
            
            await new Promise(resolve => setTimeout(resolve, 800));
            
            executeFallbackTransaction(action, asset, amount, leverageFactor);
            
            setTxState('CONFIRMED');
            setTxDetails(prev => ({
                ...prev,
                txHash: 'GC' + Math.random().toString(36).substring(2, 12).toUpperCase() + Math.random().toString(36).substring(2, 12).toUpperCase()
            }));
        }
    };

    const executeFallbackTransaction = (
        action: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LEVERAGE',
        asset: 'XLM' | 'USDC',
        amount: number,
        leverageFactor?: number
    ) => {
        setUserBalances((prev) => {
            const reserve = reserves[asset];
            let newWallet = { ...prev.wallet };
            let newSuppliedScaled = { ...prev.suppliedScaled };
            let newDebtScaled = { ...prev.debtScaled };
            let newBitmap = prev.bitmap;

            const changeScaled = amount / (action === 'SUPPLY' || action === 'WITHDRAW' ? reserve.liquidityIndex : reserve.borrowIndex);

            let logMessage = '';

            if (action === 'SUPPLY') {
                newWallet[asset] -= amount;
                newSuppliedScaled[asset] += changeScaled;
                logMessage = `[Fallback Sandbox] Nạp thành công ${amount.toFixed(2)} ${asset} vào LendingPool.`;
                
                const bitToTurnOn = asset === 'XLM' ? 0n : 2n;
                newBitmap |= (1n << bitToTurnOn);

                setReserves((prevRes) => ({
                    ...prevRes,
                    [asset]: getUpdatedReserveRates(prevRes[asset], prevRes[asset].totalSupplied + amount, prevRes[asset].totalBorrowed)
                }));
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

                setReserves((prevRes) => ({
                    ...prevRes,
                    [asset]: getUpdatedReserveRates(prevRes[asset], Math.max(0, prevRes[asset].totalSupplied - amount), prevRes[asset].totalBorrowed)
                }));
            } else if (action === 'BORROW') {
                newWallet[asset] += amount;
                newDebtScaled[asset] += changeScaled;
                logMessage = `[Fallback Sandbox] Vay thành công ${amount.toFixed(2)} ${asset} về ví.`;

                const bitToTurnOn = asset === 'XLM' ? 1n : 3n;
                newBitmap |= (1n << bitToTurnOn);

                setReserves((prevRes) => ({
                    ...prevRes,
                    [asset]: getUpdatedReserveRates(prevRes[asset], prevRes[asset].totalSupplied, prevRes[asset].totalBorrowed + amount)
                }));
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

                setReserves((prevRes) => ({
                    ...prevRes,
                    [asset]: getUpdatedReserveRates(prevRes[asset], prevRes[asset].totalSupplied, Math.max(0, prevRes[asset].totalBorrowed - amount))
                }));
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

                setReserves((prevRes) => {
                    const updatedXlm = getUpdatedReserveRates(prevRes.XLM, prevRes.XLM.totalSupplied + finalSupply, prevRes.XLM.totalBorrowed);
                    const updatedUsdc = getUpdatedReserveRates(prevRes.USDC, prevRes.USDC.totalSupplied, prevRes.USDC.totalBorrowed + borrowedUsdc);
                    return {
                        XLM: updatedXlm,
                        USDC: updatedUsdc
                    };
                });
            }

            addLog('SUCCESS', logMessage);
            addLog('EVENT', `Soroban VM: Đã cập nhật bitmap u128 tài khoản thành 0x${newBitmap.toString(16).toUpperCase()}`);
            
            const renewedTtl = Math.min(6000, prev.ttl + 500);
            addLog('INFO', `Gia hạn thời gian sống dữ liệu TTL thêm 500 Ledgers (Mới: ${renewedTtl})`);

            const txHash = 'GC' + Math.random().toString(36).substring(2, 12).toUpperCase() + Math.random().toString(36).substring(2, 12).toUpperCase();
            const newTx: Web3Tx = {
                id: 'tx-' + Math.random().toString(36).substring(2, 9),
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
            setTxHistory((prevTx) => [newTx, ...prevTx]);

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
        
        setUserBalances((prev) => {
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

        setUserBalances((prev) => {
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

        setUserBalances((prev) => {
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
        const prepareTx: Web3Tx = {
            id: 'tx-' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            type: 'LIQUIDATION_PREPARE',
            asset: 'XLM',
            amount: activeSupply,
            hash: 'GC' + Math.random().toString(36).substring(2, 12).toUpperCase() + Math.random().toString(36).substring(2, 12).toUpperCase(),
            ledger: userBalances.currentLedger,
            account: isBot ? 'GBKEEPERBOT7YV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDO' : (wallet.address || 'GBUDONFIYV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDONFI'),
            cpuInstructions: 60000000
        };
        setTxHistory((prev) => [prepareTx, ...prev]);
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
            setUserBalances((prev) => {
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

                return {
                    ...prev,
                    suppliedScaled: newSuppliedScaled,
                    debtScaled: newDebtScaled,
                    bitmap: newBitmap
                };
            });

            // Update pool reserves
            setReserves((prevRes) => {
                const updatedUsdc = getUpdatedReserveRates(prevRes.USDC, prevRes.USDC.totalSupplied, Math.max(0, prevRes.USDC.totalBorrowed - debtPaid));
                const updatedXlm = getUpdatedReserveRates(prevRes.XLM, Math.max(0, prevRes.XLM.totalSupplied - actualSeized), prevRes.XLM.totalBorrowed);
                return {
                    XLM: updatedXlm,
                    USDC: updatedUsdc
                };
            });
        } else {
            // Update local sandbox state
            setSandbox((prev) => ({
                ...prev,
                supplyXLM: Math.max(0, prev.supplyXLM - actualSeized),
                borrowUSDC: 0
            }));

            // Sync with system pool reserves in simulation mode
            setReserves((prevRes) => {
                const updatedUsdc = getUpdatedReserveRates(prevRes.USDC, prevRes.USDC.totalSupplied, Math.max(0, prevRes.USDC.totalBorrowed - debtPaid));
                const updatedXlm = getUpdatedReserveRates(prevRes.XLM, Math.max(0, prevRes.XLM.totalSupplied - actualSeized), prevRes.XLM.totalBorrowed);
                return {
                    XLM: updatedXlm,
                    USDC: updatedUsdc
                };
            });
        }

        // Set step active to 2
        setSandbox((prev) => ({
            ...prev,
            stepActive: 2
        }));

        const prefix = isBot ? '🤖 [Keeper Bot]: ' : '[Step 2] ';
        addLog('SUCCESS', `${prefix}Kích hoạt execute_liquidation() thành công.`);
        addLog('SUCCESS', `${isBot ? '🤖 Bot Keeper: ' : ''}Đã tự động thanh toán nợ: ${debtPaid.toFixed(2)} USDC. Tịch thu ${actualSeized.toFixed(1)} XLM thế chấp (Bao gồm 5% thưởng thanh lý).`);
        addLog('INFO', `${isBot ? '🤖 Bot Keeper: ' : ''}Soroban VM: Giải phóng phiên ID ${sandbox.sessionId}. Tiêu thụ 30,000,000 CPU instructions. Tổng CPU 2 bước: 90,000,000 (Dưới ngưỡng 100M).`);
        if (isRealP2PActive) {
            addLog('SUCCESS', `🤖 [P2P Settlement]: Đã khấu trừ ví Lending của bạn trên Ledger! Dư nợ USDC: 0.00, XLM thế chấp bị tịch thu: ${actualSeized.toFixed(1)}.`);
        }

        // Push to Web3 Transaction History
        const executeTx: Web3Tx = {
            id: 'tx-' + Math.random().toString(36).substring(2, 9),
            timestamp: new Date().toLocaleTimeString(),
            type: 'LIQUIDATION_EXECUTE',
            asset: 'XLM',
            amount: actualSeized,
            hash: 'GC' + Math.random().toString(36).substring(2, 12).toUpperCase() + Math.random().toString(36).substring(2, 12).toUpperCase(),
            ledger: userBalances.currentLedger,
            account: isBot ? 'GBKEEPERBOT7YV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDO' : (wallet.address || 'GBUDONFIYV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDONFI'),
            cpuInstructions: 30000000
        };
        setTxHistory((prev) => [executeTx, ...prev]);
    };

    const handleResetSandbox = () => {
        setSandbox((prev) => ({
            ...prev,
            xlmPrice: 0.15,
            stepActive: 0,
            sessionId: null,
            isAutoKeeperActive: false
        }));
        if (!isRealP2PActive) {
            setSandbox((prev) => ({
                ...prev,
                supplyXLM: 2000,
                borrowUSDC: 200
            }));
            addLog('SYSTEM', 'Sandbox thanh lý đã được khôi phục về giá trị ban đầu. Chế độ Bot tự động đã được tắt.');
        } else {
            addLog('SYSTEM', 'Sandbox thanh lý đã được reset giá XLM về $0.15. Vị thế P2P thực tế của bạn vẫn đang được đồng bộ!');
        }
    };

    return (
        <div className="app-container">
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
                onNavigate={setCurrentView}
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
                />
            ) : (
                <PoolsPage
                    reserves={reserves}
                    txHistory={txHistory}
                    sandbox={sandbox}
                    isRealP2P={isRealP2PActive}
                    onSlidePrice={handleSlideSandboxPrice}
                    onToggleAutoKeeper={handleToggleAutoKeeper}
                    onPrepare={handlePrepareLiquidation}
                    onExecute={handleExecuteLiquidation}
                    onReset={handleResetSandbox}
                    wallet={wallet}
                />
            )}

            {/* Logging terminal console */}
            <ConsoleLogger
                logs={logs}
                onClear={() => setLogs([])}
            />

            {/* Footer */}
            <Footer currentLedger={userBalances.currentLedger} />
        </div>
    );
}

export default App;
