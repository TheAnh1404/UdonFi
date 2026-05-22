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
import { InteractionPanel } from './InteractionPanel';

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
    txState?: 'IDLE' | 'SIMULATING' | 'SIGNING' | 'SUBMITTING' | 'CONFIRMED' | 'FAILED';
    txDetails?: { gasFeeXlm: number; cpuInstructions: number; txHash?: string; error?: string };
    onResetTxState?: () => void;
}

export const CreditMarketPage: React.FC<CreditMarketPageProps> = ({
    reserves,
    userBalances,
    wallet,
    onConnect,
    onTransactionSubmit,
    onToggleCollateral,
    onToggleBit,
    onExtendTtl,
    txState = 'IDLE',
    txDetails = { gasFeeXlm: 0, cpuInstructions: 0 },
    onResetTxState = () => {}
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

            {/* Full-width Live TradingView Price Widget */}
            <div style={{ marginBottom: '1.25rem' }}>
                <TradingViewChart />
            </div>

            {/* Split Operations Panel */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
                gap: '1.25rem',
                alignItems: 'start'
            }}>
                {/* Left Column: Lending Assets Market Table */}
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

                {/* Right Column: Wallet Operation Terminal (Premium Dashboard) */}
                {!wallet.isConnected ? (
                    <div className="card glass-card" style={{ padding: '1.5rem', border: '1px solid rgba(155, 81, 224, 0.15)', boxShadow: '0 8px 32px rgba(155, 81, 224, 0.03)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '350px' }}>
                        <Wallet size={36} className="highlight-purple animate-pulse" style={{ marginBottom: '1rem', filter: 'drop-shadow(0 0 8px rgba(155,81,224,0.4))' }} />
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-bright)', fontWeight: 700, marginBottom: '0.5rem', letterSpacing: '0.05em' }}>VUI LÒNG KẾT NỐI VÍ FREIGHTER</h3>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.45', maxWidth: '280px', marginBottom: '1.25rem' }}>
                            UdonFi yêu cầu kết nối với ví Freighter của bạn trên Stellar Testnet để tải thông số tài khoản và thực thi giao dịch.
                        </p>
                        <button onClick={onConnect} className="btn-connect" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
                            <Wallet size={14} />
                            <span>Kết Nối Ví Freighter</span>
                        </button>
                    </div>
                ) : (
                    <InteractionPanel
                        reserves={reserves}
                        userBalances={userBalances}
                        activeAction={activeAction}
                        activeAsset={activeAsset}
                        onClose={() => {}}
                        onSubmit={onTransactionSubmit}
                        onToggleCollateral={onToggleCollateral}
                        txState={txState}
                        txDetails={txDetails}
                        onResetTxState={onResetTxState}
                        onExtendTtl={onExtendTtl}
                        showCloseButton={false}
                    />
                )}
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
