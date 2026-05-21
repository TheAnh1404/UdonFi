import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HealthFactorGauge } from './components/HealthFactorGauge';
import { PositionStats } from './components/PositionStats';
import { MarketTable } from './components/MarketTable';
import { InteractionPanel } from './components/InteractionPanel';
import { SorobanBitmap } from './components/SorobanBitmap';
import { SorobanTtl } from './components/SorobanTtl';
import { SorobanKinked } from './components/SorobanKinked';
import { SorobanLiquidation } from './components/SorobanLiquidation';
import { ConsoleLogger } from './components/ConsoleLogger';
import type { Reserve, UserBalances, LogLine, LiqSandbox } from './types/lending';
import { Cpu, Hourglass, AreaChart, ShieldAlert } from 'lucide-react';

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

function App() {
    const [reserves, setReserves] = useState<Record<'XLM' | 'USDC', Reserve>>(INITIAL_RESERVES);
    const [userBalances, setUserBalances] = useState<UserBalances>(INITIAL_USER_BALANCES);
    const [wallet, setWallet] = useState({ isConnected: false, address: '' });
    const [logs, setLogs] = useState<LogLine[]>([]);
    
    // Tab and modal panel controls
    const [activeTab, setActiveTab] = useState<'BITMAP' | 'TTL' | 'KINKED' | 'LIQUIDATION'>('BITMAP');
    const [isInteractionOpen, setIsInteractionOpen] = useState(false);
    const [activeAction, setActiveAction] = useState<'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY'>('SUPPLY');
    const [activeAsset, setActiveAsset] = useState<'XLM' | 'USDC'>('XLM');

    // Liquidation sandbox state
    const [sandbox, setSandbox] = useState<LiqSandbox>({
        supplyXLM: 2000,
        borrowUSDC: 200,
        xlmPrice: 0.15,
        stepActive: 0,
        sessionId: null
    });

    // Helper to add terminal logs
    const addLog = (type: LogLine['type'], message: string) => {
        const timestamp = new Date().toLocaleTimeString();
        const id = Math.random().toString(36).substring(2, 9);
        setLogs((prev) => [...prev, { id, timestamp, type, message }].slice(-50));
    };

    // Freighter connect simulator
    const handleConnectWallet = () => {
        const mockAddress = 'GBUDONFIYV6W42C7G5LXTQ6N5L2G57Q36OULKNGW3S5Q3K36UXUDONFI';
        setWallet({ isConnected: true, address: mockAddress });
        addLog('SYSTEM', 'Đã kết nối Ví Freighter. Địa chỉ ví: ' + mockAddress.slice(0, 8) + '...');
        addLog('INFO', 'Đang nạp trạng thái tài khoản từ Stellar Soroban RPC...');
    };

    const handleDisconnectWallet = () => {
        setWallet({ isConnected: false, address: '' });
        setUserBalances((prev) => ({
            ...prev,
            suppliedScaled: { XLM: 0, USDC: 0 },
            debtScaled: { XLM: 0, USDC: 0 },
            bitmap: 0n
        }));
        setIsInteractionOpen(false);
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
        if (!wallet.isConnected) return;

        const interval = setInterval(() => {
            setReserves((prev) => {
                const xlm = prev.XLM;
                const usdc = prev.USDC;

                // Accrue a tiny fraction of interest (1 block is ~5 seconds)
                // Index = Index * (1 + APY / (Blocks per Year))
                const blocksPerYear = 365 * 24 * 720; // 5s block time
                
                const newXlmLiqIndex = xlm.liquidityIndex * (1 + (xlm.supplyApy / 100) / blocksPerYear);
                const newXlmBorrowIndex = xlm.borrowIndex * (1 + (xlm.borrowApy / 100) / blocksPerYear);

                const newUsdcLiqIndex = usdc.liquidityIndex * (1 + (usdc.supplyApy / 100) / blocksPerYear);
                const newUsdcBorrowIndex = usdc.borrowIndex * (1 + (usdc.borrowApy / 100) / blocksPerYear);

                return {
                    XLM: { ...xlm, liquidityIndex: newXlmLiqIndex, borrowIndex: newXlmBorrowIndex },
                    USDC: { ...usdc, liquidityIndex: newUsdcLiqIndex, borrowIndex: newUsdcBorrowIndex }
                };
            });

            // Count down TTL & count up Ledger
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
        }, 5000);

        return () => clearInterval(interval);
    }, [wallet.isConnected]);

    // Handle Quick Action Click
    const handleActionClick = (action: typeof activeAction, asset: typeof activeAsset) => {
        if (!wallet.isConnected) {
            handleConnectWallet();
            return;
        }
        setActiveAction(action);
        setActiveAsset(asset);
        setIsInteractionOpen(true);
    };

    // Process Transaction Submission
    const handleTransactionSubmit = (
        action: typeof activeAction,
        asset: typeof activeAsset,
        amount: number
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
                logMessage = `Gọi thành công supply() trong LendingPool: Nạp ${amount.toFixed(2)} ${asset}.`;
                
                // Update bitmap: turn on collateral bit (XLM bit 0, USDC bit 2)
                const bitToTurnOn = asset === 'XLM' ? 0n : 2n;
                newBitmap |= (1n << bitToTurnOn);

                // Update pool total supplied
                setReserves((prevRes) => ({
                    ...prevRes,
                    [asset]: getUpdatedReserveRates(prevRes[asset], prevRes[asset].totalSupplied + amount, prevRes[asset].totalBorrowed)
                }));
            } else if (action === 'WITHDRAW') {
                newSuppliedScaled[asset] -= changeScaled;
                newWallet[asset] += amount;
                logMessage = `Gọi thành công withdraw() trong LendingPool: Rút ${amount.toFixed(2)} ${asset} về ví.`;

                // Update bitmap: if supplied balance becomes 0, turn off collateral flag
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
                logMessage = `Gọi thành công borrow() trong LendingPool: Vay ${amount.toFixed(2)} ${asset} về ví.`;

                // Update bitmap: turn on borrow flag (XLM bit 1, USDC bit 3)
                const bitToTurnOn = asset === 'XLM' ? 1n : 3n;
                newBitmap |= (1n << bitToTurnOn);

                setReserves((prevRes) => ({
                    ...prevRes,
                    [asset]: getUpdatedReserveRates(prevRes[asset], prevRes[asset].totalSupplied, prevRes[asset].totalBorrowed + amount)
                }));
            } else if (action === 'REPAY') {
                newWallet[asset] -= amount;
                newDebtScaled[asset] -= changeScaled;
                logMessage = `Gọi thành công repay() trong LendingPool: Trả nợ ${amount.toFixed(2)} ${asset}.`;

                // Update bitmap: if debt balance becomes 0, turn off borrow flag
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
            }

            addLog('SUCCESS', logMessage);
            addLog('EVENT', `Soroban VM: Đã cập nhật bitmap u128 tài khoản thành 0x${newBitmap.toString(16).toUpperCase()}`);
            
            // Auto renew TTL on user action (standard Soroban UX)
            const renewedTtl = Math.min(6000, prev.ttl + 500);
            addLog('INFO', `Gia hạn thời gian sống dữ liệu TTL thêm 500 Ledgers (Mới: ${renewedTtl})`);

            return {
                ...prev,
                wallet: newWallet,
                suppliedScaled: newSuppliedScaled,
                debtScaled: newDebtScaled,
                bitmap: newBitmap,
                ttl: renewedTtl
            };
        });
        
        setIsInteractionOpen(false);
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

    // Two-step liquidation sandbox callbacks
    const handleSlideSandboxPrice = (price: number) => {
        setSandbox((prev) => ({ ...prev, xlmPrice: price }));
        addLog('INFO', `Mô phỏng Oracle: Giá XLM thay đổi thành $${price.toFixed(3)}`);
    };

    const handlePrepareLiquidation = () => {
        const mockSessionId = '0x' + Math.random().toString(16).substring(2, 10).toUpperCase() + 'BE89';
        setSandbox((prev) => ({
            ...prev,
            stepActive: 1,
            sessionId: mockSessionId
        }));
        addLog('EVENT', `[Step 1] Kích hoạt prepare_liquidation() thành công.`);
        addLog('INFO', `Soroban: Session được đăng ký tại ledger với ID: ${mockSessionId}. Khóa 2,000 XLM thế chấp. Tiêu thụ 60,000,000 CPU instructions.`);
    };

    const handleExecuteLiquidation = () => {
        const debtPaid = sandbox.borrowUSDC; // pays off all 200 USDC debt
        const requiredCollateralValue = debtPaid * 1.05; // 210 USD
        const seizedXlm = requiredCollateralValue / sandbox.xlmPrice; // at current XLM price
        const actualSeized = Math.min(sandbox.supplyXLM, seizedXlm);

        setSandbox((prev) => ({
            ...prev,
            stepActive: 2,
            supplyXLM: Math.max(0, prev.supplyXLM - actualSeized),
            borrowUSDC: 0
        }));

        addLog('SUCCESS', `[Step 2] Kích hoạt execute_liquidation() thành công.`);
        addLog('SUCCESS', `Đã thanh toán nợ: ${debtPaid} USDC. Tịch thu ${actualSeized.toFixed(1)} XLM thế chấp (Bao gồm 5% thưởng thanh lý).`);
        addLog('INFO', `Soroban VM: Giải phóng phiên ID ${sandbox.sessionId}. Tiêu thụ 30,000,000 CPU instructions. Tổng CPU 2 bước: 90,000,000 (Dưới ngưỡng 100M).`);
    };

    const handleResetSandbox = () => {
        setSandbox({
            supplyXLM: 2000,
            borrowUSDC: 200,
            xlmPrice: 0.15,
            stepActive: 0,
            sessionId: null
        });
        addLog('SYSTEM', 'Sandbox thanh lý đã được khôi phục về giá trị ban đầu.');
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

    return (
        <div className="app-container">
            {/* Ambient Background Glows */}
            <div className="bg-glow bg-glow-1"></div>
            <div className="bg-glow bg-glow-2"></div>
            <div className="bg-glow bg-glow-3"></div>

            {/* Header Component */}
            <Header
                reserves={reserves}
                wallet={wallet}
                onConnect={handleConnectWallet}
                onDisconnect={handleDisconnectWallet}
            />

            {/* Top row: Health Factor and Position Stats */}
            <div className="dashboard-row pos-row">
                <HealthFactorGauge healthFactor={mainHealthFactor} />
                <PositionStats reserves={reserves} userBalances={userBalances} />
            </div>

            {/* Middle row: Market Table and Interaction Panel */}
            <div className="dashboard-row market-row">
                <MarketTable
                    reserves={reserves}
                    userBalances={userBalances}
                    onAction={handleActionClick}
                    onToggleCollateral={handleToggleCollateral}
                />
                
                {isInteractionOpen && (
                    <InteractionPanel
                        reserves={reserves}
                        userBalances={userBalances}
                        activeAction={activeAction}
                        activeAsset={activeAsset}
                        onClose={() => setIsInteractionOpen(false)}
                        onSubmit={handleTransactionSubmit}
                    />
                )}
            </div>

            {/* Bottom Row: Soroban Specials Tabs */}
            <div className="card glass-card soroban-row">
                <div className="soroban-header">
                    <div className="tab-pill-container">
                        <button
                            onClick={() => setActiveTab('BITMAP')}
                            className={`soroban-tab-btn ${activeTab === 'BITMAP' ? 'active' : ''}`}
                        >
                            <Cpu size={14} />
                            <span>128-bit Bitmap Matrix</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('TTL')}
                            className={`soroban-tab-btn ${activeTab === 'TTL' ? 'active' : ''}`}
                        >
                            <Hourglass size={14} />
                            <span>TTL Storage Life</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('KINKED')}
                            className={`soroban-tab-btn ${activeTab === 'KINKED' ? 'active' : ''}`}
                        >
                            <AreaChart size={14} />
                            <span>Kinked APY Curve</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('LIQUIDATION')}
                            className={`soroban-tab-btn ${activeTab === 'LIQUIDATION' ? 'active' : ''}`}
                        >
                            <ShieldAlert size={14} />
                            <span>2-Step Liquidation Sandbox</span>
                        </button>
                    </div>
                </div>
                <div className="card-body">
                    {activeTab === 'BITMAP' && (
                        <SorobanBitmap
                            bitmap={userBalances.bitmap}
                            onToggleBit={handleToggleBit}
                        />
                    )}
                    {activeTab === 'TTL' && (
                        <SorobanTtl
                            ttl={userBalances.ttl}
                            currentLedger={userBalances.currentLedger}
                            onExtendTtl={handleExtendTtl}
                        />
                    )}
                    {activeTab === 'KINKED' && (
                        <SorobanKinked reserves={reserves} />
                    )}
                    {activeTab === 'LIQUIDATION' && (
                        <SorobanLiquidation
                            reserves={reserves}
                            sandbox={sandbox}
                            onSlidePrice={handleSlideSandboxPrice}
                            onPrepare={handlePrepareLiquidation}
                            onExecute={handleExecuteLiquidation}
                            onReset={handleResetSandbox}
                        />
                    )}
                </div>
            </div>

            {/* Logging terminal console */}
            <ConsoleLogger
                logs={logs}
                onClear={() => setLogs([])}
            />

            {/* Footer */}
            <footer className="app-footer">
                <p>© 2026 UdonFi Protocol. Designed for Stellar Soroban Network with advanced Web3 UX standards.</p>
            </footer>
        </div>
    );
}

export default App;
