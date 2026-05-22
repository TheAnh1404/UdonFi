import React, { useState, useEffect } from 'react';
import { 
    Coins, 
    ArrowUpRight, 
    ArrowDownLeft, 
    ShieldAlert, 
    Activity, 
    Cpu, 
    Hourglass, 
    AreaChart, 
    TrendingUp, 
    User, 
    Wallet, 
    Zap,
    RefreshCw
} from 'lucide-react';
import type { Reserve, UserBalances } from '../types/lending';
import { SorobanBitmap } from './SorobanBitmap';
import { SorobanTtl } from './SorobanTtl';
import { SorobanKinked } from './SorobanKinked';
import { TradingViewChart } from './TradingViewChart';
import { MarketTable } from './MarketTable';

interface CreditMarketPageProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    userBalances: UserBalances;
    wallet: { isConnected: boolean; address: string };
    onConnect: () => void;
    onTransactionSubmit: (
        action: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LEVERAGE',
        asset: 'XLM' | 'USDC',
        amount: number,
        leverageFactor?: number
    ) => void;
    onToggleCollateral: (symbol: 'XLM' | 'USDC', useAsCollateral: boolean) => void;
    onToggleBit: (bitIndex: number) => void;
    onExtendTtl: () => void;
}

export const CreditMarketPage: React.FC<CreditMarketPageProps> = ({
    reserves,
    userBalances,
    wallet,
    onConnect,
    onTransactionSubmit,
    onToggleCollateral,
    onToggleBit,
    onExtendTtl
}) => {
    // Current operation state inside the wallet terminal
    const [activeAction, setActiveAction] = useState<'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LEVERAGE'>('SUPPLY');
    const [activeAsset, setActiveAsset] = useState<'XLM' | 'USDC'>('XLM');
    const [amountInput, setAmountInput] = useState<string>('');
    const [leverageVal, setLeverageVal] = useState<number>(2.0);

    // Active tab in Soroban Panel
    const [activeSorobanTab, setActiveSorobanTab] = useState<'BITMAP' | 'TTL' | 'KINKED'>('BITMAP');

    // Calculate current user position values
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

    const currentTotalSuppliedVal = (isXlmCollateral ? xlmSuppliedValue : 0) + (isUsdcCollateral ? usdcSuppliedValue : 0);
    const currentTotalDebtVal = xlmDebtValue + usdcDebtValue;
    const currentHealthFactor = currentTotalDebtVal > 0 ? (currentTotalSuppliedVal * 0.825) / currentTotalDebtVal : Infinity;

    // Borrow Power / Collateral Cap at 70% LTV
    const currentBorrowPower = currentTotalSuppliedVal * 0.70;
    const currentBorrowLimitPercent = currentTotalSuppliedVal > 0 ? (currentTotalDebtVal / currentBorrowPower) * 100 : 0;

    // ----------------------------------------------------
    // BEFORE / AFTER SIMULATION LOGIC
    // ----------------------------------------------------
    const [simulatedHealthFactor, setSimulatedHealthFactor] = useState<number>(Infinity);
    const [simulatedBorrowLimitPercent, setSimulatedBorrowLimitPercent] = useState<number>(0);
    const [simulatedWalletBalance, setSimulatedWalletBalance] = useState<number>(0);

    useEffect(() => {
        const amt = parseFloat(amountInput) || 0;
        const reserve = reserves[activeAsset];

        let nextWallet = wallet.isConnected ? (userBalances.wallet[activeAsset] || 0) : 0;
        let nextSuppliedScaled = { ...userBalances.suppliedScaled };
        let nextDebtScaled = { ...userBalances.debtScaled };
        let nextBitmap = userBalances.bitmap;

        const changeScaled = amt / (activeAction === 'SUPPLY' || activeAction === 'WITHDRAW' ? reserve.liquidityIndex : reserve.borrowIndex);

        if (activeAction === 'SUPPLY') {
            nextWallet = Math.max(0, nextWallet - amt);
            nextSuppliedScaled[activeAsset] += changeScaled;
            const bitToTurnOn = activeAsset === 'XLM' ? 0n : 2n;
            nextBitmap |= (1n << bitToTurnOn);
        } else if (activeAction === 'WITHDRAW') {
            nextSuppliedScaled[activeAsset] = Math.max(0, nextSuppliedScaled[activeAsset] - changeScaled);
            nextWallet += amt;
            const remainingSupplied = nextSuppliedScaled[activeAsset] * reserve.liquidityIndex;
            if (remainingSupplied < 0.01) {
                nextSuppliedScaled[activeAsset] = 0;
                const bitToTurnOff = activeAsset === 'XLM' ? 0n : 2n;
                nextBitmap &= ~(1n << bitToTurnOff);
            }
        } else if (activeAction === 'BORROW') {
            nextWallet += amt;
            nextDebtScaled[activeAsset] += changeScaled;
            const bitToTurnOn = activeAsset === 'XLM' ? 1n : 3n;
            nextBitmap |= (1n << bitToTurnOn);
        } else if (activeAction === 'REPAY') {
            nextWallet = Math.max(0, nextWallet - amt);
            nextDebtScaled[activeAsset] = Math.max(0, nextDebtScaled[activeAsset] - changeScaled);
            const remainingDebt = nextDebtScaled[activeAsset] * reserve.borrowIndex;
            if (remainingDebt < 0.01) {
                nextDebtScaled[activeAsset] = 0;
                const bitToTurnOff = activeAsset === 'XLM' ? 1n : 3n;
                nextBitmap &= ~(1n << bitToTurnOff);
            }
        } else if (activeAction === 'LEVERAGE') {
            const L = leverageVal;
            const initialSupply = amt;
            const finalSupply = initialSupply * L;
            const borrowedUsdc = initialSupply * (L - 1) * reserves.XLM.price;

            if (activeAsset === 'XLM') {
                nextWallet = Math.max(0, nextWallet - initialSupply);
                nextSuppliedScaled.XLM += finalSupply / reserves.XLM.liquidityIndex;
                nextDebtScaled.USDC += borrowedUsdc / reserves.USDC.borrowIndex;
                nextBitmap |= (1n << 0n) | (1n << 3n);
            }
        }

        // Compute simulated position
        const simXlmSupplied = nextSuppliedScaled.XLM * reserves.XLM.liquidityIndex;
        const simUsdcSupplied = nextSuppliedScaled.USDC * reserves.USDC.liquidityIndex;
        const simXlmDebt = nextDebtScaled.XLM * reserves.XLM.borrowIndex;
        const simUsdcDebt = nextDebtScaled.USDC * reserves.USDC.borrowIndex;

        const simIsXlmCollateral = ((nextBitmap & 1n) === 1n);
        const simIsUsdcCollateral = ((nextBitmap & 4n) === 4n);

        const simXlmSuppliedValue = simXlmSupplied * reserves.XLM.price;
        const simUsdcSuppliedValue = simUsdcSupplied * reserves.USDC.price;
        const simXlmDebtValue = simXlmDebt * reserves.XLM.price;
        const simUsdcDebtValue = simUsdcDebt * reserves.USDC.price;

        const simTotalSuppliedVal = (simIsXlmCollateral ? simXlmSuppliedValue : 0) + (simIsUsdcCollateral ? simUsdcSuppliedValue : 0);
        const simTotalDebtVal = simXlmDebtValue + simUsdcDebtValue;

        const simHf = simTotalDebtVal > 0 ? (simTotalSuppliedVal * 0.825) / simTotalDebtVal : Infinity;
        const simPower = simTotalSuppliedVal * 0.70;
        const simLimitPct = simTotalSuppliedVal > 0 ? (simTotalDebtVal / simPower) * 100 : 0;

        setSimulatedHealthFactor(simHf);
        setSimulatedBorrowLimitPercent(simLimitPct);
        setSimulatedWalletBalance(nextWallet);

    }, [amountInput, activeAction, activeAsset, leverageVal, userBalances, reserves, wallet.isConnected]);

    const handleActionChange = (action: typeof activeAction) => {
        setActiveAction(action);
        setAmountInput('');
        // Leverage only supports XLM initially
        if (action === 'LEVERAGE') {
            setActiveAsset('XLM');
        }
    };

    const handleAssetChange = (asset: 'XLM' | 'USDC') => {
        setActiveAsset(asset);
        setAmountInput('');
    };

    const handleMaxClick = () => {
        if (!wallet.isConnected) return;
        const bal = userBalances.wallet[activeAsset] || 0;
        if (activeAction === 'SUPPLY') {
            setAmountInput(bal.toString());
        } else if (activeAction === 'WITHDRAW') {
            const supplied = activeAsset === 'XLM' ? xlmSupplied : usdcSupplied;
            setAmountInput(supplied.toFixed(4));
        } else if (activeAction === 'BORROW') {
            // Borrow max calculation (80% of remaining borrow power to stay safe)
            const remainingPower = Math.max(0, currentBorrowPower - currentTotalDebtVal);
            const maxBorrowVal = remainingPower * 0.80;
            const maxBorrowAmt = maxBorrowVal / reserves[activeAsset].price;
            setAmountInput(maxBorrowAmt.toFixed(4));
        } else if (activeAction === 'REPAY') {
            const debt = activeAsset === 'XLM' ? xlmDebt : usdcDebt;
            const maxRepay = Math.min(bal, debt);
            setAmountInput(maxRepay.toFixed(4));
        } else if (activeAction === 'LEVERAGE') {
            setAmountInput(bal.toString());
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(amountInput);
        if (!wallet.isConnected || isNaN(amt) || amt <= 0) return;
        onTransactionSubmit(activeAction, activeAsset, amt, activeAction === 'LEVERAGE' ? leverageVal : undefined);
        setAmountInput('');
    };

    const isInputValid = () => {
        const amt = parseFloat(amountInput);
        if (isNaN(amt) || amt <= 0) return false;
        if (!wallet.isConnected) return false;

        const bal = userBalances.wallet[activeAsset] || 0;
        if (activeAction === 'SUPPLY' && amt > bal) return false;
        if (activeAction === 'REPAY' && amt > bal) return false;
        if (activeAction === 'WITHDRAW') {
            const supplied = activeAsset === 'XLM' ? xlmSupplied : usdcSupplied;
            if (amt > supplied) return false;
            // Guard against making health factor nợ xấu khi rút tài sản thế chấp
            if (simulatedHealthFactor < 1.0) return false;
        }
        if (activeAction === 'BORROW') {
            if (simulatedBorrowLimitPercent > 100 || simulatedHealthFactor < 1.0) return false;
        }
        if (activeAction === 'LEVERAGE') {
            if (amt > bal) return false;
            if (simulatedBorrowLimitPercent > 100 || simulatedHealthFactor < 1.0) return false;
        }

        return true;
    };

    // Style helper for Health Factor
    const getHealthFactorColor = (hf: number) => {
        if (hf === Infinity) return 'var(--cyan)';
        if (hf > 1.5) return '#00e676'; // An toàn lá cây
        if (hf >= 1.0) return '#ffb300'; // Cảnh báo cam
        return '#ff1744'; // Nguy hiểm đỏ
    };

    const healthFactorText = (hf: number) => {
        if (hf === Infinity) return '∞';
        return hf.toFixed(2);
    };

    return (
        <div style={{ paddingBottom: '2rem' }}>
            {/* My Position Hub Header */}
            <div className="card glass-card" style={{ marginBottom: '1.25rem', padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.5rem' }}>
                    <User size={16} className="highlight-purple" style={{ filter: 'drop-shadow(0 0 6px rgba(155,81,224,0.4))' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-bright)', letterSpacing: '0.05em' }}>TRUNG TÂM VỊ THẾ CÁ NHÂN</span>
                    {wallet.isConnected && (
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(0, 242, 254, 0.05)', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.65rem', color: 'var(--cyan)' }}>
                            <Wallet size={10} />
                            <span>freighter://active</span>
                        </div>
                    )}
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '1rem'
                }}>
                    {/* Stat Item: Total Supplied */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>TỔNG THẾ CHẤP NẠP</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--cyan)', marginTop: '0.25rem', textShadow: '0 0 10px rgba(0, 242, 254, 0.2)' }}>
                            ${currentTotalSuppliedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', gap: '0.5rem' }}>
                            <span>{xlmSupplied.toFixed(1)} XLM</span>
                            <span>•</span>
                            <span>{usdcSupplied.toFixed(1)} USDC</span>
                        </div>
                        <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.03 }}>
                            <ArrowUpRight size={80} color="var(--cyan)" />
                        </div>
                    </div>

                    {/* Stat Item: Total Borrowed */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>TỔNG DƯ NỢ VAY</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--purple)', marginTop: '0.25rem', textShadow: '0 0 10px rgba(155, 81, 224, 0.2)' }}>
                            ${currentTotalDebtVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', gap: '0.5rem' }}>
                            <span>{xlmDebt.toFixed(1)} XLM</span>
                            <span>•</span>
                            <span>{usdcDebt.toFixed(1)} USDC</span>
                        </div>
                        <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.03 }}>
                            <ArrowDownLeft size={80} color="var(--purple)" />
                        </div>
                    </div>

                    {/* Stat Item: Borrow Limit Percent */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                            <span>GIỚI HẠN VAY ĐÃ DÙNG</span>
                            <span style={{ color: currentBorrowLimitPercent > 80 ? 'var(--red)' : 'var(--text-bright)' }}>{currentBorrowLimitPercent.toFixed(1)}%</span>
                        </div>
                        
                        {/* Custom Neon Progress Bar */}
                        <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', marginTop: '0.6rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <div style={{ 
                                height: '100%', 
                                width: `${Math.min(100, currentBorrowLimitPercent)}%`, 
                                background: currentBorrowLimitPercent > 80 
                                    ? 'linear-gradient(90deg, #ff1744, #d50000)' 
                                    : 'linear-gradient(90deg, var(--cyan), var(--purple))',
                                boxShadow: currentBorrowLimitPercent > 80
                                    ? '0 0 8px rgba(255, 23, 68, 0.6)'
                                    : '0 0 8px rgba(0, 242, 254, 0.4)',
                                borderRadius: '3px',
                                transition: 'width 0.4s cubic-bezier(0.1, 0.8, 0.25, 1)'
                            }}></div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                            <span>Vay tối đa LTV (70%): ${currentBorrowPower.toFixed(1)}</span>
                            <span>Còn lại: ${(Math.max(0, currentBorrowPower - currentTotalDebtVal)).toFixed(1)} USD</span>
                        </div>
                    </div>

                    {/* Stat Item: Health Factor Gauge */}
                    <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 600 }}>HỆ SỐ SỨC KHỎE (HF)</div>
                            <div style={{ 
                                fontSize: '1.4rem', 
                                fontWeight: 800, 
                                color: getHealthFactorColor(currentHealthFactor),
                                textShadow: `0 0 10px ${getHealthFactorColor(currentHealthFactor)}33`,
                                marginTop: '0.25rem' 
                            }}>
                                {healthFactorText(currentHealthFactor)}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                Ngưỡng thanh lý: &lt; 1.0 (82.5% LTV)
                            </div>
                        </div>

                        {/* Circular progress simulated visual */}
                        <div style={{ width: '42px', height: '42px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <svg width="42" height="42" viewBox="0 0 42 42" style={{ transform: 'rotate(-90deg)' }}>
                                <circle cx="21" cy="21" r="17" stroke="rgba(255,255,255,0.03)" strokeWidth="4" fill="transparent" />
                                {currentHealthFactor !== Infinity && (
                                    <circle 
                                        cx="21" 
                                        cy="21" 
                                        r="17" 
                                        stroke={getHealthFactorColor(currentHealthFactor)} 
                                        strokeWidth="4" 
                                        fill="transparent" 
                                        strokeDasharray="106.8" 
                                        strokeDashoffset={Math.max(0, 106.8 - (Math.min(3, currentHealthFactor) / 3) * 106.8)}
                                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                                    />
                                )}
                            </svg>
                            <div style={{ position: 'absolute', fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                                <Activity size={12} style={{ color: getHealthFactorColor(currentHealthFactor) }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Split Operations Panel */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
                gap: '1.25rem',
                alignItems: 'start'
            }}>
                {/* Left Column: Market Table and Charts */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Live TradingView Price Widget */}
                    <div className="card glass-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem 0 1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <TrendingUp size={14} className="highlight-cyan" />
                                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-bright)' }}>ĐỒ THỊ GIÁ TRỰC TUYẾN</span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                                <button 
                                    onClick={() => handleAssetChange('XLM')}
                                    style={{
                                        background: activeAsset === 'XLM' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                                        border: '1px solid ' + (activeAsset === 'XLM' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)'),
                                        color: activeAsset === 'XLM' ? 'var(--cyan)' : 'var(--text-dim)',
                                        borderRadius: '4px',
                                        fontSize: '0.65rem',
                                        padding: '0.15rem 0.4rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    XLM/USD
                                </button>
                                <button 
                                    onClick={() => handleAssetChange('USDC')}
                                    style={{
                                        background: activeAsset === 'USDC' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                                        border: '1px solid ' + (activeAsset === 'USDC' ? 'rgba(0, 242, 254, 0.2)' : 'rgba(255,255,255,0.05)'),
                                        color: activeAsset === 'USDC' ? 'var(--cyan)' : 'var(--text-dim)',
                                        borderRadius: '4px',
                                        fontSize: '0.65rem',
                                        padding: '0.15rem 0.4rem',
                                        fontWeight: 600,
                                        cursor: 'pointer'
                                    }}
                                >
                                    USDC/USD
                                </button>
                            </div>
                        </div>
                        <div style={{ height: '240px', padding: '0.5rem' }}>
                            <TradingViewChart />
                        </div>
                    </div>

                    {/* Lending Assets Market Table */}
                    <div className="card glass-card" style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.85rem' }}>
                            <Coins size={14} className="highlight-purple" />
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-bright)' }}>DANH SÁCH TÀI SẢN TÍN DỤNG</span>
                        </div>
                        <MarketTable 
                            reserves={reserves} 
                            userBalances={userBalances} 
                            onAction={(act, ast) => {
                                handleActionChange(act);
                                handleAssetChange(ast);
                            }}
                            onToggleCollateral={onToggleCollateral}
                        />
                    </div>
                </div>

                {/* Right Column: Wallet Operation Terminal (Premium Dashboard) */}
                <div className="card glass-card" style={{ padding: '1rem', border: '1px solid rgba(155, 81, 224, 0.15)', boxShadow: '0 8px 32px rgba(155, 81, 224, 0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.6rem', marginBottom: '0.75rem' }}>
                        <Zap size={14} style={{ color: 'var(--purple)', filter: 'drop-shadow(0 0 6px rgba(155,81,224,0.4))' }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '0.05em' }}>TRẠM GIAO DỊCH VÍ DEFI</span>
                    </div>

                    {/* Action Tabs Selector */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.2rem', background: 'rgba(255,255,255,0.02)', padding: '0.2rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '1rem' }}>
                        {(['SUPPLY', 'WITHDRAW', 'BORROW', 'REPAY', 'LEVERAGE'] as const).map((action) => (
                            <button
                                key={action}
                                onClick={() => handleActionChange(action)}
                                style={{
                                    background: activeAction === action ? 'var(--purple)' : 'transparent',
                                    border: 'none',
                                    color: activeAction === action ? '#fff' : 'var(--text-dim)',
                                    borderRadius: '5px',
                                    fontSize: '0.58rem',
                                    padding: '0.35rem 0',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    boxShadow: activeAction === action ? '0 0 10px rgba(155,81,224,0.4)' : 'none'
                                }}
                            >
                                {action === 'SUPPLY' ? 'NẠP' : action === 'WITHDRAW' ? 'RÚT' : action === 'BORROW' ? 'VAY' : action === 'REPAY' ? 'TRẢ' : 'LOOP'}
                            </button>
                        ))}
                    </div>

                    {/* Asset Selector */}
                    {activeAction !== 'LEVERAGE' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                            {(['XLM', 'USDC'] as const).map((asset) => (
                                <button
                                    key={asset}
                                    type="button"
                                    onClick={() => handleAssetChange(asset)}
                                    style={{
                                        flex: 1,
                                        background: activeAsset === asset ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                                        border: '1px solid ' + (activeAsset === asset ? 'var(--cyan)' : 'rgba(255,255,255,0.06)'),
                                        borderRadius: '8px',
                                        padding: '0.5rem 0',
                                        color: activeAsset === asset ? 'var(--cyan)' : 'var(--text-dim)',
                                        fontSize: '0.75rem',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.35rem'
                                    }}
                                >
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: asset === 'XLM' ? '#ff9800' : '#2196f3'
                                    }}></span>
                                    {asset}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Wallet Connect Prompt */}
                    {!wallet.isConnected ? (
                        <div style={{ textAlign: 'center', padding: '1.5rem 1rem', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '8px', marginBottom: '1rem' }}>
                            <Wallet size={24} style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }} />
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '0.75rem' }}>VUI LÒNG KẾT NỐI VÍ FREIGHTER</div>
                            <button onClick={onConnect} className="btn-connect" style={{ margin: '0 auto', fontSize: '0.7rem' }}>
                                <Wallet size={12} />
                                <span>Connect Freighter</span>
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* Input details */}
                            <div style={{ marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.25rem', fontWeight: 600 }}>
                                    <span>
                                        {activeAction === 'SUPPLY' ? 'Số dư ví khả dụng' 
                                            : activeAction === 'WITHDRAW' ? 'Tài sản khả dụng để rút'
                                            : activeAction === 'BORROW' ? 'Giới hạn vay an toàn (80%)'
                                            : activeAction === 'REPAY' ? 'Số dư nợ đang vay'
                                            : 'Ví khả dụng (Chỉ XLM)'}
                                    </span>
                                    <span style={{ color: 'var(--text-bright)' }}>
                                        {activeAction === 'SUPPLY' ? `${(userBalances.wallet[activeAsset] || 0).toLocaleString()} ${activeAsset}`
                                            : activeAction === 'WITHDRAW' ? `${(activeAsset === 'XLM' ? xlmSupplied : usdcSupplied).toFixed(2)} ${activeAsset}`
                                            : activeAction === 'BORROW' ? `${((currentBorrowPower - currentTotalDebtVal) * 0.80 / reserves[activeAsset].price).toFixed(2)} ${activeAsset}`
                                            : activeAction === 'REPAY' ? `${(activeAsset === 'XLM' ? xlmDebt : usdcDebt).toFixed(2)} ${activeAsset}`
                                            : `${(userBalances.wallet.XLM || 0).toLocaleString()} XLM`}
                                    </span>
                                </div>

                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        value={amountInput}
                                        onChange={(e) => setAmountInput(e.target.value)}
                                        style={{
                                            width: '100%',
                                            background: 'rgba(0,0,0,0.25)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            borderRadius: '8px',
                                            padding: '0.6rem 2.8rem 0.6rem 0.75rem',
                                            fontSize: '0.9rem',
                                            fontWeight: 600,
                                            color: '#fff',
                                            outline: 'none',
                                            transition: 'border-color 0.2s ease'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = 'var(--purple)'}
                                        onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                                    />
                                    <button
                                        type="button"
                                        onClick={handleMaxClick}
                                        style={{
                                            position: 'absolute',
                                            right: '0.4rem',
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: 'var(--cyan)',
                                            fontSize: '0.6rem',
                                            fontWeight: 700,
                                            padding: '0.2rem 0.4rem',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        MAX
                                    </button>
                                </div>
                            </div>

                            {/* Leverage Factor Selector */}
                            {activeAction === 'LEVERAGE' && (
                                <div style={{ marginBottom: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: '0.5rem' }}>
                                        <span>HỆ SỐ ĐÒN BẨY (LEVERAGE LOOP)</span>
                                        <span style={{ color: 'var(--purple)', fontWeight: 700 }}>{leverageVal.toFixed(1)}x</span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="1.1" 
                                        max="3.0" 
                                        step="0.1" 
                                        value={leverageVal}
                                        onChange={(e) => setLeverageVal(parseFloat(e.target.value))}
                                        style={{
                                            width: '100%',
                                            accentColor: 'var(--purple)',
                                            height: '4px',
                                            background: 'rgba(255,255,255,0.1)',
                                            borderRadius: '2px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                                        <span>1.1x (Ít rủi ro)</span>
                                        <span>2.0x (Tiêu chuẩn)</span>
                                        <span>3.0x (Tối đa)</span>
                                    </div>
                                </div>
                            )}

                            {/* BEFORE / AFTER SIMULATION CARD */}
                            <div style={{
                                background: 'rgba(255,255,255,0.01)',
                                border: '1px solid rgba(255,255,255,0.03)',
                                borderRadius: '8px',
                                padding: '0.65rem',
                                marginBottom: '1rem',
                                fontSize: '0.65rem'
                            }}>
                                <div style={{ color: 'var(--text-dim)', fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <RefreshCw size={10} className="highlight-cyan" />
                                    MÔ PHỎNG SỨC KHỎE TÀI KHOẢN (PRE-EXECUTION)
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Hệ số Sức Khỏe HF:</span>
                                        <div style={{ display: 'flex', gap: '0.35rem', fontWeight: 600 }}>
                                            <span style={{ color: 'var(--text-dim)' }}>{healthFactorText(currentHealthFactor)}</span>
                                            <span style={{ color: 'var(--text-muted)' }}>➔</span>
                                            <span style={{ color: getHealthFactorColor(simulatedHealthFactor) }}>
                                                {healthFactorText(simulatedHealthFactor)}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Giới hạn Vay đã dùng:</span>
                                        <div style={{ display: 'flex', gap: '0.35rem', fontWeight: 600 }}>
                                            <span style={{ color: 'var(--text-dim)' }}>{currentBorrowLimitPercent.toFixed(1)}%</span>
                                            <span style={{ color: 'var(--text-muted)' }}>➔</span>
                                            <span style={{ color: simulatedBorrowLimitPercent > 90 ? 'var(--red)' : 'var(--text-bright)' }}>
                                                {simulatedBorrowLimitPercent.toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Số dư Ví khả dụng:</span>
                                        <div style={{ display: 'flex', gap: '0.35rem', fontWeight: 600 }}>
                                            <span style={{ color: 'var(--text-dim)' }}>
                                                {(userBalances.wallet[activeAsset] || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>➔</span>
                                            <span style={{ color: 'var(--cyan)' }}>
                                                {simulatedWalletBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {activeAsset}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* WARNING BANNERS FOR SAFETY */}
                            {simulatedHealthFactor < 1.0 && (
                                <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255, 23, 68, 0.05)', border: '1px solid rgba(255, 23, 68, 0.15)', borderRadius: '6px', padding: '0.5rem', color: 'var(--red)', fontSize: '0.62rem', marginBottom: '1rem', lineHeight: '1.25' }}>
                                    <ShieldAlert size={14} style={{ flexShrink: 0 }} />
                                    <span>Giao dịch bị Revert! Hệ số sức khỏe HF &lt; 1.0 sẽ kích hoạt thanh lý ngay lập tức. Soroban Smart Contract từ chối thực thi.</span>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                type="submit"
                                disabled={!isInputValid() || simulatedHealthFactor < 1.0}
                                style={{
                                    width: '100%',
                                    background: isInputValid() ? 'linear-gradient(135deg, var(--purple), #7b2cbf)' : 'rgba(255,255,255,0.03)',
                                    border: isInputValid() ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                    color: isInputValid() ? '#fff' : 'var(--text-muted)',
                                    padding: '0.7rem',
                                    borderRadius: '8px',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    cursor: isInputValid() ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: isInputValid() ? '0 4px 15px rgba(155,81,224,0.35)' : 'none',
                                    transition: 'all 0.2s cubic-bezier(0.1, 0.8, 0.25, 1)'
                                }}
                                onMouseEnter={(e) => {
                                    if (isInputValid()) {
                                        e.currentTarget.style.filter = 'brightness(1.15)';
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (isInputValid()) {
                                        e.currentTarget.style.filter = 'none';
                                        e.currentTarget.style.transform = 'none';
                                    }
                                }}
                            >
                                {activeAction === 'SUPPLY' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                                <span>
                                    {activeAction === 'SUPPLY' ? `NẠP THẾ CHẤP ${activeAsset}`
                                        : activeAction === 'WITHDRAW' ? `RÚT TÀI SẢN ${activeAsset}`
                                        : activeAction === 'BORROW' ? `VAY NỢ ${activeAsset}`
                                        : activeAction === 'REPAY' ? `THANH TOÁN NỢ ${activeAsset}`
                                        : `THỰC THI LOOP ${leverageVal.toFixed(1)}x XLM`}
                                </span>
                            </button>
                        </form>
                    )}
                </div>
            </div>

            {/* Bottom Row: Soroban Specials Premium Panel */}
            <div className="card glass-card" style={{ marginTop: '1.25rem', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.65rem', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Cpu size={14} className="highlight-purple" />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-bright)', letterSpacing: '0.05em' }}>TRÌNH GIÁM SÁT HỢP ĐỒNG THÔNG MINH SOROBAN (RPC STATE)</span>
                    </div>

                    {/* Soroban Tabs Selection */}
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.15rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                        <button
                            onClick={() => setActiveSorobanTab('BITMAP')}
                            style={{
                                background: activeSorobanTab === 'BITMAP' ? 'rgba(155, 81, 224, 0.12)' : 'transparent',
                                border: '1px solid ' + (activeSorobanTab === 'BITMAP' ? 'rgba(155, 81, 224, 0.25)' : 'transparent'),
                                color: activeSorobanTab === 'BITMAP' ? 'var(--purple)' : 'var(--text-dim)',
                                borderRadius: '4px',
                                fontSize: '0.62rem',
                                padding: '0.2rem 0.5rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}
                        >
                            <Cpu size={10} />
                            Bitmap (u128)
                        </button>
                        <button
                            onClick={() => setActiveSorobanTab('TTL')}
                            style={{
                                background: activeSorobanTab === 'TTL' ? 'rgba(155, 81, 224, 0.12)' : 'transparent',
                                border: '1px solid ' + (activeSorobanTab === 'TTL' ? 'rgba(155, 81, 224, 0.25)' : 'transparent'),
                                color: activeSorobanTab === 'TTL' ? 'var(--purple)' : 'var(--text-dim)',
                                borderRadius: '4px',
                                fontSize: '0.62rem',
                                padding: '0.2rem 0.5rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}
                        >
                            <Hourglass size={10} />
                            TTL Storage
                        </button>
                        <button
                            onClick={() => setActiveSorobanTab('KINKED')}
                            style={{
                                background: activeSorobanTab === 'KINKED' ? 'rgba(155, 81, 224, 0.12)' : 'transparent',
                                border: '1px solid ' + (activeSorobanTab === 'KINKED' ? 'rgba(155, 81, 224, 0.25)' : 'transparent'),
                                color: activeSorobanTab === 'KINKED' ? 'var(--purple)' : 'var(--text-dim)',
                                borderRadius: '4px',
                                fontSize: '0.62rem',
                                padding: '0.2rem 0.5rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                            }}
                        >
                            <AreaChart size={10} />
                            Lãi suất Kinked
                        </button>
                    </div>
                </div>

                {/* Dynamic Content Panel */}
                <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', padding: '0.75rem', border: '1px solid rgba(255,255,255,0.02)' }}>
                    {activeSorobanTab === 'BITMAP' && (
                        <SorobanBitmap 
                            bitmap={userBalances.bitmap} 
                            onToggleBit={onToggleBit} 
                        />
                    )}
                    {activeSorobanTab === 'TTL' && (
                        <SorobanTtl 
                            ttl={userBalances.ttl} 
                            currentLedger={userBalances.currentLedger} 
                            onExtendTtl={onExtendTtl} 
                        />
                    )}
                    {activeSorobanTab === 'KINKED' && (
                        <SorobanKinked reserves={reserves} />
                    )}
                </div>
            </div>
        </div>
    );
};
