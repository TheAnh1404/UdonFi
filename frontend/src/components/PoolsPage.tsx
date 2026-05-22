import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Copy, 
    Check, 
    Activity, 
    TrendingUp, 
    Database, 
    Cpu, 
    History, 
    ShieldAlert, 
    RefreshCw, 
    Layers, 
    Zap, 
    Sparkles 
} from 'lucide-react';
import type { Reserve, Web3Tx, LiqSandbox } from '../types/lending';

interface PoolsPageProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    txHistory: Web3Tx[];
    sandbox: LiqSandbox;
    isRealP2P: boolean;
    onSlidePrice: (price: number) => void;
    onToggleAutoKeeper: (active: boolean) => void;
    onPrepare: () => void;
    onExecute: () => void;
    onReset: () => void;
    wallet: { isConnected: boolean; address: string };
}

export const PoolsPage: React.FC<PoolsPageProps> = ({
    reserves,
    txHistory,
    sandbox,
    isRealP2P,
    onSlidePrice,
    onToggleAutoKeeper,
    onPrepare,
    onExecute,
    onReset,
    wallet
}) => {
    const [selectedCurveAsset, setSelectedCurveAsset] = useState<'XLM' | 'USDC'>('XLM');
    const [copiedTxId, setCopiedTxId] = useState<string | null>(null);
    
    // Liquidation sandbox animation states
    const [isPreparing, setIsPreparing] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [prepCpuWidth, setPrepCpuWidth] = useState(0);
    const [execCpuWidth, setExecCpuWidth] = useState(0);

    const activeReserve = reserves[selectedCurveAsset];

    // Compute details for selected pool on the curve
    const curveTotalSupplied = activeReserve.totalSupplied;
    const curveTotalBorrowed = activeReserve.totalBorrowed;
    const curveUtilization = curveTotalSupplied > 0 ? (curveTotalBorrowed / curveTotalSupplied) * 100 : 0;
    const curveCurrentBorrowApy = activeReserve.borrowApy;

    // APY curve calculations & plotting
    const xMin = 45;
    const xMax = 380;
    const yMin = 15;
    const yMax = 165;

    const mapX = (u: number) => xMin + (u / 100) * (xMax - xMin);
    const mapY = (apy: number) => {
        // Scale APY from 0% to 100% on the Y axis
        const scaleMax = 100;
        return yMax - (apy / scaleMax) * (yMax - yMin);
    };

    // APY Curve coordinate mapping
    const ptA = { x: mapX(0), y: mapY(activeReserve.baseRate) };
    const ptKink = { x: mapX(activeReserve.uOptimal), y: mapY(activeReserve.baseRate + activeReserve.slope1) };
    const ptMax = { x: mapX(100), y: mapY(activeReserve.baseRate + activeReserve.slope1 + activeReserve.slope2) };

    const pathStr = `M ${ptA.x},${ptA.y} L ${ptKink.x},${ptKink.y} L ${ptMax.x},${ptMax.y}`;

    let curveDotX = mapX(curveUtilization);
    let curveDotY = mapY(curveCurrentBorrowApy);

    // Sandbox price, collateral, debt and HF computations
    const sandboxSupplyAmt = sandbox.supplyXLM;
    const sandboxDebtAmt = sandbox.borrowUSDC;
    const sandboxXlmPrice = sandbox.xlmPrice;
    
    const sandboxCollateralValue = sandboxSupplyAmt * sandboxXlmPrice;
    const sandboxDebtValue = sandboxDebtAmt * reserves.USDC.price;
    const sandboxHealthFactor = sandboxDebtValue > 0 ? (sandboxCollateralValue * 0.825) / sandboxDebtValue : Infinity;
    const sandboxLiquidatable = sandboxHealthFactor < 1.0;

    // Clipboard Copy Helper
    const copyToClipboard = (text: string, txId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTxId(txId);
        setTimeout(() => setCopiedTxId(null), 2000);
    };

    // Step 1 manually
    const handlePrepareClick = () => {
        setIsPreparing(true);
        setPrepCpuWidth(0);
        setTimeout(() => setPrepCpuWidth(60), 50); // 60M CPU Instructions

        setTimeout(() => {
            onPrepare();
            setIsPreparing(false);
        }, 1200);
    };

    // Step 2 manually
    const handleExecuteClick = () => {
        setIsExecuting(true);
        setExecCpuWidth(0);
        setTimeout(() => setExecCpuWidth(30), 50); // 30M CPU Instructions

        setTimeout(() => {
            onExecute();
            setIsExecuting(false);
        }, 1200);
    };

    // Auto keeper routine
    useEffect(() => {
        if (!sandbox.isAutoKeeperActive) return;

        // Step 1 auto
        if (sandboxLiquidatable && sandbox.stepActive === 0 && !isPreparing && !isExecuting) {
            const timer = setTimeout(() => {
                handlePrepareClick();
            }, 1000);
            return () => clearTimeout(timer);
        }

        // Step 2 auto
        if (sandbox.stepActive === 1 && !isPreparing && !isExecuting) {
            const timer = setTimeout(() => {
                handleExecuteClick();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [sandbox.isAutoKeeperActive, sandboxLiquidatable, sandbox.stepActive, isPreparing, isExecuting]);

    // Back to Dashboard trigger
    const triggerBackToDashboard = () => {
        // Trigger logo click or view state change
        const logo = document.querySelector('.logo-area') as HTMLElement;
        if (logo) logo.click();
    };

    return (
        <div className="pools-page-view" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Top Navigation & Header */}
            <div className="glass-card" style={{ padding: '1.25rem 1.5rem', borderLeft: '4px solid var(--cyan)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button 
                            onClick={triggerBackToDashboard}
                            style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: 'var(--text-main)',
                                padding: '0.5rem 1rem',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(0, 242, 254, 0.08)';
                                e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.3)';
                                e.currentTarget.style.color = 'var(--cyan)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                e.currentTarget.style.color = 'var(--text-main)';
                            }}
                        >
                            <ArrowLeft size={16} />
                            <span>Quay Lại Bảng Điều Khiển</span>
                        </button>
                        <div>
                            <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Database className="text-cyan animate-pulse" size={24} />
                                <span>Phân Tích Chi Tiết Bể Thanh Khoản (UdonFi Pools)</span>
                            </h2>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                                Hệ thống báo cáo toàn diện về các bể XLM/USDC, lịch sử biến động dòng tiền thời gian thực, thuật toán lãi suất gấp khúc và giám sát thanh lý 2 bước Soroban.
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="badge badge-success" style={{
                            padding: '0.35rem 0.75rem',
                            borderRadius: '20px',
                            background: 'rgba(0, 230, 118, 0.08)',
                            border: '1px solid rgba(0, 230, 118, 0.3)',
                            color: 'var(--green)',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem'
                        }}>
                            <Sparkles className="animate-spin" style={{ animationDuration: '4s' }} size={12} />
                            Live Accruing State
                        </span>
                    </div>
                </div>
            </div>

            {/* Overview Reserves Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1.5rem'
            }}>
                {/* XLM Reserve Pool */}
                {(() => {
                    const r = reserves.XLM;
                    const available = Math.max(0, r.totalSupplied - r.totalBorrowed);
                    const utilization = r.totalSupplied > 0 ? (r.totalBorrowed / r.totalSupplied) * 100 : 0;
                    
                    let utilColor = 'var(--cyan)';
                    if (utilization > 85) utilColor = 'var(--red)';
                    else if (utilization > 70) utilColor = 'var(--yellow)';

                    return (
                        <div className="card glass-card glow-cyan" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                            <div className="bg-glow" style={{
                                width: '200px',
                                height: '200px',
                                background: 'radial-gradient(circle, rgba(0, 242, 254, 0.06), transparent 70%)',
                                top: '-30px',
                                right: '-30px',
                                position: 'absolute',
                                pointerEvents: 'none'
                            }}></div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'rgba(0, 242, 254, 0.1)',
                                        border: '1px solid rgba(0, 242, 254, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <span style={{ color: 'var(--cyan)', fontWeight: 'bold', fontSize: '1rem' }}>XLM</span>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>Stellar Lumens Pool</h3>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Oracle Rate: ${r.price.toFixed(3)}</span>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: 'var(--text-muted)'
                                }}>
                                    LTV: {r.ltv}%
                                </span>
                            </div>

                            <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Thanh Khoản Khả Dụng (Available Cash)</span>
                                <span className="text-cyan" style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                                    {available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.1rem' }}>
                                    ~ ${(available * r.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tổng Nạp (Total Supply)</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.totalSupplied.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
                                        ~ ${(r.totalSupplied * r.price).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tổng Vay (Total Borrow)</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{r.totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 2 })} XLM</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
                                        ~ ${(r.totalBorrowed * r.price).toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Tỷ Lệ Sử Dụng (Utilization Rate)</span>
                                    <span style={{ color: utilColor, fontWeight: 700 }}>{utilization.toFixed(2)}%</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${Math.min(100, utilization)}%`,
                                        height: '100%',
                                        background: utilColor,
                                        boxShadow: `0 0 10px ${utilColor}`,
                                        borderRadius: '4px',
                                        transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
                                    }}></div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                                <div>
                                    <span className="text-green" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <TrendingUp size={12} />
                                        Supply APY
                                    </span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{r.supplyApy.toFixed(4)}%</span>
                                </div>
                                <div>
                                    <span className="text-purple" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Activity size={12} />
                                        Borrow APY
                                    </span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{r.borrowApy.toFixed(4)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* USDC Reserve Pool */}
                {(() => {
                    const r = reserves.USDC;
                    const available = Math.max(0, r.totalSupplied - r.totalBorrowed);
                    const utilization = r.totalSupplied > 0 ? (r.totalBorrowed / r.totalSupplied) * 100 : 0;
                    
                    let utilColor = 'var(--purple)';
                    if (utilization > 85) utilColor = 'var(--red)';
                    else if (utilization > 70) utilColor = 'var(--yellow)';

                    return (
                        <div className="card glass-card glow-cyan" style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
                            <div className="bg-glow" style={{
                                width: '200px',
                                height: '200px',
                                background: 'radial-gradient(circle, rgba(155, 81, 224, 0.06), transparent 70%)',
                                top: '-30px',
                                right: '-30px',
                                position: 'absolute',
                                pointerEvents: 'none'
                            }}></div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'rgba(155, 81, 224, 0.1)',
                                        border: '1px solid rgba(155, 81, 224, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <span style={{ color: 'var(--purple)', fontWeight: 'bold', fontSize: '1rem' }}>$</span>
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>USD Coin Pool</h3>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pegged Value: $1.000</span>
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    padding: '0.2rem 0.5rem',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.04)',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    color: 'var(--text-muted)'
                                }}>
                                    LTV: {r.ltv}%
                                </span>
                            </div>

                            <div style={{ borderBottom: '1px dashed rgba(255, 255, 255, 0.08)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block' }}>Thanh Khoản Khả Dụng (Available Cash)</span>
                                <span className="text-purple" style={{ fontSize: '1.6rem', fontWeight: 800 }}>
                                    ${available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                                </span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.1rem' }}>
                                    ~ ${available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tổng Nạp (Total Supply)</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>${r.totalSupplied.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
                                        ~ ${r.totalSupplied.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Tổng Vay (Total Borrow)</span>
                                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>${r.totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'block' }}>
                                        ~ ${r.totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 0 })} USD
                                    </span>
                                </div>
                            </div>

                            <div style={{ marginBottom: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Tỷ Lệ Sử Dụng (Utilization Rate)</span>
                                    <span style={{ color: utilColor, fontWeight: 700 }}>{utilization.toFixed(2)}%</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        width: `${Math.min(100, utilization)}%`,
                                        height: '100%',
                                        background: utilColor,
                                        boxShadow: `0 0 10px ${utilColor}`,
                                        borderRadius: '4px',
                                        transition: 'width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)'
                                    }}></div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.6rem 0.8rem', borderRadius: '8px' }}>
                                <div>
                                    <span className="text-green" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <TrendingUp size={12} />
                                        Supply APY
                                    </span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{r.supplyApy.toFixed(4)}%</span>
                                </div>
                                <div>
                                    <span className="text-purple" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <Activity size={12} />
                                        Borrow APY
                                    </span>
                                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{r.borrowApy.toFixed(4)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })()}
            </div>

            {/* Middle Row: Interactive APY Curve & Algorithm Explanation */}
            <div className="card glass-card">
                <div className="card-header">
                    <h3>
                        <TrendingUp className="text-cyan animate-pulse" size={18} />
                        <span>Mô Hình Đường Cong Lãi Suất Gấp Khúc (Kinked APY Curve Model)</span>
                    </h3>
                    <div style={{ display: 'flex', gap: '0.35rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', padding: '0.2rem', borderRadius: '8px' }}>
                        <button 
                            onClick={() => setSelectedCurveAsset('XLM')}
                            style={{
                                background: selectedCurveAsset === 'XLM' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                                border: 'none',
                                color: selectedCurveAsset === 'XLM' ? 'var(--cyan)' : 'var(--text-muted)',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)'
                            }}
                        >
                            Stellar XLM
                        </button>
                        <button 
                            onClick={() => setSelectedCurveAsset('USDC')}
                            style={{
                                background: selectedCurveAsset === 'USDC' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                                border: 'none',
                                color: selectedCurveAsset === 'USDC' ? 'var(--cyan)' : 'var(--text-muted)',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)'
                            }}
                        >
                            USD Coin USDC
                        </button>
                    </div>
                </div>
                
                <div className="card-body">
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                        gap: '2rem'
                    }}>
                        {/* SVG Drawing Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <div style={{
                                width: '100%',
                                background: 'rgba(5, 7, 15, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.03)',
                                borderRadius: '12px',
                                padding: '1rem 0.5rem',
                                position: 'relative'
                            }}>
                                <svg width="100%" viewBox="0 0 400 185" style={{ overflow: 'visible' }}>
                                    {/* Gradients */}
                                    <defs>
                                        <linearGradient id="curveLineGrad" x1="0" y1="1" x2="1" y2="0">
                                            <stop offset="0%" stopColor="var(--cyan)" />
                                            <stop offset="60%" stopColor="var(--purple)" />
                                            <stop offset="100%" stopColor="var(--red)" />
                                        </linearGradient>
                                        <linearGradient id="curveAreaGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="rgba(0, 242, 254, 0.12)" />
                                            <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                                        </linearGradient>
                                    </defs>

                                    {/* Grid Lines */}
                                    <line x1={xMin} y1={yMax} x2={xMax} y2={yMax} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                                    <line x1={xMin} y1={yMin} x2={xMin} y2={yMax} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                                    
                                    {/* Grid dashed auxiliary markers */}
                                    {[20, 40, 60, 80].map((tick) => (
                                        <line 
                                            key={tick}
                                            x1={mapX(tick)} 
                                            y1={yMin} 
                                            x2={mapX(tick)} 
                                            y2={yMax} 
                                            stroke="rgba(255,255,255,0.02)" 
                                            strokeWidth="1" 
                                            strokeDasharray="2,2" 
                                        />
                                    ))}

                                    {/* Optimal dashed line marker */}
                                    <line 
                                        x1={ptKink.x} 
                                        y1={yMin} 
                                        x2={ptKink.x} 
                                        y2={yMax} 
                                        stroke="rgba(255, 214, 0, 0.25)" 
                                        strokeWidth="1" 
                                        strokeDasharray="3,3" 
                                    />
                                    <text x={ptKink.x} y={yMax + 12} fill="var(--yellow)" fontSize="7.5" textAnchor="middle" fontWeight={600}>
                                        Optimal ({activeReserve.uOptimal}%)
                                    </text>

                                    {/* Current Utilization Line */}
                                    {curveUtilization > 0 && (
                                        <line 
                                            x1={curveDotX} 
                                            y1={curveDotY} 
                                            x2={curveDotX} 
                                            y2={yMax} 
                                            stroke="rgba(0, 242, 254, 0.3)" 
                                            strokeWidth="1.2" 
                                            strokeDasharray="2,2" 
                                        />
                                    )}

                                    {/* Y-axis APY labels */}
                                    <text x={xMin - 8} y={ptA.y + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">
                                        {activeReserve.baseRate}% (Base)
                                    </text>
                                    <text x={xMin - 8} y={ptKink.y + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">
                                        {activeReserve.baseRate + activeReserve.slope1}% (Optimal)
                                    </text>
                                    <text x={xMin - 8} y={ptMax.y + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">
                                        {activeReserve.baseRate + activeReserve.slope1 + activeReserve.slope2}% (Max)
                                    </text>

                                    {/* X-axis Utilization labels */}
                                    <text x={xMin} y={yMax + 12} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
                                        0%
                                    </text>
                                    <text x={xMax} y={yMax + 12} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
                                        100%
                                    </text>

                                    {/* Curve Shadow Shading Area */}
                                    <path 
                                        d={`M ${ptA.x},${yMax} L ${ptA.x},${ptA.y} L ${ptKink.x},${ptKink.y} L ${ptMax.x},${ptMax.y} L ${ptMax.x},${yMax} Z`}
                                        fill="url(#curveAreaGrad)"
                                    />

                                    {/* Curve Stroke Line */}
                                    <path 
                                        d={pathStr} 
                                        fill="none" 
                                        stroke="url(#curveLineGrad)" 
                                        strokeWidth="2.8" 
                                    />

                                    {/* Active state pulsing dot */}
                                    {curveUtilization > 0 && (
                                        <g>
                                            {/* Outer breathing ring */}
                                            <circle 
                                                cx={curveDotX} 
                                                cy={curveDotY} 
                                                r="11" 
                                                fill="none" 
                                                stroke="var(--cyan)" 
                                                strokeWidth="1.5" 
                                                opacity="0.4"
                                                className="pulse-icon"
                                            />
                                            {/* Inner glowing dot */}
                                            <circle 
                                                cx={curveDotX} 
                                                cy={curveDotY} 
                                                r="5.5" 
                                                fill="var(--cyan)" 
                                                style={{ filter: 'drop-shadow(0 0 6px var(--cyan-glow))' }}
                                            />
                                        </g>
                                    )}
                                </svg>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                                <span>* Trục tung (Y-axis): Lãi suất APY (%)</span>
                                <span>Trục hoành (X-axis): Hệ số sử dụng U (%)</span>
                            </div>
                        </div>

                        {/* Text explanation Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                            <div>
                                <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                                    Thuật Toán Phân Phối Lãi Suất Phản Ứng Nhanh (Reactive APY Curve)
                                </h4>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45', margin: 0 }}>
                                    Lãi suất của bể thanh khoản UdonFi được điều chỉnh năng động tại mỗi block ledger Soroban dựa trên cung-cầu thực tế. 
                                    Khi <strong style={{ color: 'var(--cyan)' }}>Hệ số Sử Dụng (Utilization Rate)</strong> dưới ngưỡng tối ưu ({activeReserve.uOptimal}%), 
                                    lãi suất tăng chậm tuyến tính (Slope 1) nhằm kích thích nhu cầu vay vốn.
                                </p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45', marginTop: '0.5rem' }}>
                                    Tuy nhiên, ngay khi hệ số vượt qua <strong style={{ color: 'var(--yellow)' }}>{activeReserve.uOptimal}%</strong>, 
                                    thanh khoản khả dụng cạn kiệt, thuật toán kích hoạt Slope 2 cực kỳ gay gắt (+{activeReserve.slope2}% APY) 
                                    để kìm hãm vay mới và kích thích người đi vay nhanh chóng trả nợ (Repay) hoặc thanh lý, bảo vệ an toàn hệ thống.
                                </p>
                            </div>

                            <div style={{
                                background: 'rgba(255, 255, 255, 0.01)',
                                border: '1px solid rgba(255, 255, 255, 0.04)',
                                borderRadius: '10px',
                                padding: '1rem'
                            }}>
                                <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                    Tham Số Hiện Trạng Bể ({selectedCurveAsset})
                                </h5>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '0.5rem' }}>
                                        <span className="text-dim">Hệ Số U Hiện Tại:</span>
                                        <strong className="text-cyan">{curveUtilization.toFixed(2)}%</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '0.5rem' }}>
                                        <span className="text-dim">U Tối Ưu (U_opt):</span>
                                        <strong className="text-yellow">{activeReserve.uOptimal}%</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderRight: '1px solid rgba(255,255,255,0.05)', paddingRight: '0.5rem' }}>
                                        <span className="text-dim">Lãi Suất Cơ Bản (Base):</span>
                                        <strong>{activeReserve.baseRate.toFixed(1)}% APY</strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '0.5rem' }}>
                                        <span className="text-dim">Lãi Suất Vay Hiện Tại:</span>
                                        <strong className="text-purple">{curveCurrentBorrowApy.toFixed(4)}% APY</strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row Layout: Flow Ledger on Left, Liquidation Sandbox on Right */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr',
                gap: '1.5rem',
                alignItems: 'start'
            }}>
                {/* Flow Ledger */}
                <div className="card glass-card" style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}>
                    <div className="card-header">
                        <h3>
                            <History className="text-cyan" size={18} />
                            <span>Lịch Sử Dòng Tiền Ra Vào (Token Flow Ledger)</span>
                        </h3>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Tổng số giao dịch: {txHistory.length}
                        </span>
                    </div>
                    
                    <div className="card-body" style={{ flex: 1, padding: 0, overflowX: 'auto' }}>
                        {txHistory.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <History size={32} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                                <p>Chưa ghi nhận giao dịch dòng tiền nào trên hệ thống.</p>
                            </div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)' }}>
                                        <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Thời Gian</th>
                                        <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Hành Động</th>
                                        <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tài Sản</th>
                                        <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>Số Lượng</th>
                                        <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Địa Chỉ Ví</th>
                                        <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600 }}>Mã TxHash / Block</th>
                                        <th style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'right' }}>CPU Consumed</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {txHistory.map((tx) => {
                                        let actionBadgeBg = 'rgba(255, 255, 255, 0.05)';
                                        let actionColor = 'var(--text-main)';
                                        let actionLabel: string = tx.type;

                                        switch (tx.type) {
                                            case 'SUPPLY':
                                                actionBadgeBg = 'rgba(0, 230, 118, 0.08)';
                                                actionColor = 'var(--green)';
                                                actionLabel = 'SUPPLY';
                                                break;
                                            case 'WITHDRAW':
                                                actionBadgeBg = 'rgba(0, 242, 254, 0.08)';
                                                actionColor = 'var(--cyan)';
                                                actionLabel = 'WITHDRAW';
                                                break;
                                            case 'BORROW':
                                                actionBadgeBg = 'rgba(155, 81, 224, 0.08)';
                                                actionColor = 'var(--purple)';
                                                actionLabel = 'BORROW';
                                                break;
                                            case 'REPAY':
                                                actionBadgeBg = 'rgba(255, 214, 0, 0.08)';
                                                actionColor = 'var(--yellow)';
                                                actionLabel = 'REPAY';
                                                break;
                                            case 'LIQUIDATION_PREPARE':
                                                actionBadgeBg = 'rgba(255, 87, 34, 0.1)';
                                                actionColor = '#ff5722';
                                                actionLabel = 'LIQ_PREP';
                                                break;
                                            case 'LIQUIDATION_EXECUTE':
                                                actionBadgeBg = 'rgba(255, 23, 68, 0.1)';
                                                actionColor = 'var(--red)';
                                                actionLabel = 'LIQ_EXEC';
                                                break;
                                        }

                                        return (
                                            <tr 
                                                key={tx.id} 
                                                style={{ 
                                                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                                                    transition: 'var(--transition-smooth)'
                                                }}
                                                className="ledger-row-hover"
                                            >
                                                <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                                                    {tx.timestamp}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <span style={{
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '4px',
                                                        background: actionBadgeBg,
                                                        color: actionColor,
                                                        fontSize: '0.7rem',
                                                        fontWeight: 700,
                                                        letterSpacing: '0.5px',
                                                        border: `1px solid ${actionColor}2a`
                                                    }}>
                                                        {actionLabel}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>
                                                    {tx.asset}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', fontWeight: 700, textAlign: 'right', color: actionColor }}>
                                                    {tx.type === 'WITHDRAW' || tx.type === 'BORROW' ? '-' : '+'}
                                                    {tx.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                                    {tx.account.slice(0, 5)}...{tx.account.slice(-4)}
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                                        <span style={{ color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                                                            {tx.hash.slice(0, 8)}...
                                                        </span>
                                                        <button 
                                                            onClick={() => copyToClipboard(tx.hash, tx.id)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: copiedTxId === tx.id ? 'var(--green)' : 'var(--text-dim)',
                                                                cursor: 'pointer',
                                                                padding: '0.1rem',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                transition: 'var(--transition-smooth)'
                                                            }}
                                                            title="Sao chép TxHash"
                                                        >
                                                            {copiedTxId === tx.id ? <Check size={12} /> : <Copy size={12} />}
                                                        </button>
                                                        <span style={{
                                                            fontSize: '0.7rem',
                                                            background: 'rgba(255,255,255,0.03)',
                                                            padding: '0.1rem 0.3rem',
                                                            borderRadius: '3px',
                                                            border: '1px solid rgba(255,255,255,0.06)'
                                                        }}>
                                                            #{tx.ledger}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.85rem 1rem', textAlign: 'right', color: '#ffb74d', fontFamily: 'monospace' }}>
                                                    {tx.cpuInstructions ? tx.cpuInstructions.toLocaleString() : 'N/A'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Liquidation Keeper Sandbox */}
                <div className="card glass-card" style={{ borderLeft: '3px solid var(--red)' }}>
                    <div className="card-header">
                        <h3>
                            <ShieldAlert className="text-red" size={18} />
                            <span>Giám Sát Thanh Lý & Keeper Sandbox</span>
                        </h3>
                    </div>
                    
                    <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {isRealP2P ? (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(34, 197, 94, 0.01) 100%)',
                                border: '1px solid rgba(34, 197, 94, 0.25)',
                                borderRadius: '10px',
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <span className="p2p-dot-pulse" style={{
                                    width: '8px',
                                    height: '8px',
                                    backgroundColor: '#22c55e',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 6px #22c55e',
                                    display: 'inline-block'
                                }}></span>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.8rem', color: '#22c55e', fontWeight: 700 }}>
                                        REAL P2P ACTIVE
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: '1.3' }}>
                                        Dữ liệu sandbox liên kết với ví: <span style={{ color: 'var(--cyan)' }}>{wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}</span>
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                borderRadius: '10px',
                                padding: '0.75rem 1rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem'
                            }}>
                                <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--text-muted)', borderRadius: '50%', display: 'inline-block', opacity: 0.6 }}></span>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        SIMULATION ACTIVE
                                    </h4>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: '1.3' }}>
                                        Đang chạy giả lập trên thông số mẫu.
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Interactive Parameters */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span className="text-dim">Thế chấp XLM:</span>
                                <strong style={{ color: 'var(--text-main)' }}>{sandboxSupplyAmt.toLocaleString()} XLM (${sandboxCollateralValue.toFixed(2)})</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                                <span className="text-dim">Nợ vay USDC:</span>
                                <strong style={{ color: 'var(--text-main)' }}>{sandboxDebtAmt.toLocaleString()} USDC (${sandboxDebtValue.toFixed(2)})</strong>
                            </div>

                            {/* Price Slider */}
                            <div style={{ marginTop: '0.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                                    <span style={{ color: 'var(--yellow)', fontWeight: 600 }}>Giá XLM: ${sandboxXlmPrice.toFixed(3)}</span>
                                    <span className="text-xs text-dim">Kéo trượt để giảm giá</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0.05" 
                                    max="0.25" 
                                    step="0.005"
                                    value={sandboxXlmPrice} 
                                    disabled={sandbox.stepActive > 0 || isPreparing || isExecuting}
                                    onChange={(e) => onSlidePrice(parseFloat(e.target.value))}
                                    style={{ width: '100%', accentColor: 'var(--yellow)', cursor: sandbox.stepActive > 0 ? 'not-allowed' : 'pointer' }}
                                />
                            </div>
                        </div>

                        {/* Keeper Automatic Bot Controller */}
                        <div style={{
                            background: 'rgba(168, 85, 247, 0.03)',
                            border: '1px solid rgba(168, 85, 247, 0.15)',
                            borderRadius: '10px',
                            padding: '0.85rem 1rem'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Cpu className={sandbox.isAutoKeeperActive ? "text-purple animate-pulse" : "text-dim"} size={16} />
                                    <span style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                        Keeper Bot Tự Động
                                    </span>
                                </div>
                                <div 
                                    onClick={() => onToggleAutoKeeper(!sandbox.isAutoKeeperActive)}
                                    style={{
                                        width: '38px',
                                        height: '20px',
                                        background: sandbox.isAutoKeeperActive ? 'var(--purple)' : 'rgba(255,255,255,0.1)',
                                        borderRadius: '10px',
                                        position: 'relative',
                                        cursor: 'pointer',
                                        transition: 'var(--transition-smooth)',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}
                                >
                                    <div style={{
                                        width: '14px',
                                        height: '14px',
                                        background: 'white',
                                        borderRadius: '50%',
                                        position: 'absolute',
                                        top: '2px',
                                        left: sandbox.isAutoKeeperActive ? '20px' : '2px',
                                        transition: 'var(--transition-smooth)',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
                                    }} />
                                </div>
                            </div>
                            
                            {sandbox.isAutoKeeperActive && (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '0.4rem', 
                                    marginTop: '0.6rem', 
                                    padding: '0.35rem 0.5rem',
                                    borderRadius: '5px',
                                    background: 'rgba(168, 85, 247, 0.1)',
                                    border: '1px solid rgba(168, 85, 247, 0.25)'
                                }}>
                                    <Activity className="text-purple animate-pulse" size={12} />
                                    <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--purple)', letterSpacing: '0.5px' }}>
                                        {isPreparing ? 'KEEPER: ĐANG CHUẨN BỊ...' : isExecuting ? 'KEEPER: ĐANG THỰC THI...' : sandboxLiquidatable && sandbox.stepActive === 0 ? 'PHÁT HIỆN SỰ CỐ! ĐANG THANH LÝ...' : 'RADAR: ĐANG QUÉT LEDGER...'}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Health Factor Indicator */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(5, 7, 15, 0.2)',
                            border: '1px solid rgba(255, 255, 255, 0.03)',
                            padding: '0.85rem 1rem',
                            borderRadius: '10px'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Hệ Số Sức Khoẻ (Health Factor)</span>
                                <strong style={{ fontSize: '1.25rem' }} className={sandboxHealthFactor < 1.0 ? 'text-red animate-pulse' : 'text-green'}>
                                    {sandboxHealthFactor === Infinity ? '∞' : sandboxHealthFactor.toFixed(4)}
                                </strong>
                            </div>
                            <div>
                                {sandboxHealthFactor < 1.0 ? (
                                    <span className="badge badge-danger" style={{ display: 'inline-block', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                        LIQUIDATABLE
                                    </span>
                                ) : (
                                    <span className="badge badge-success" style={{ display: 'inline-block', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700 }}>
                                        SAFE STATE
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* 2-Step Execution Flow */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <Layers size={14} />
                                <span>Tiến Trình Thanh Lý 2 Bước (Soroban CPU Limit Bypasser)</span>
                            </h4>

                            {/* Step 1 Card */}
                            <div style={{
                                display: 'flex',
                                gap: '0.75rem',
                                background: sandboxLiquidatable && sandbox.stepActive === 0 ? 'rgba(0, 242, 254, 0.04)' : 'rgba(255,255,255,0.01)',
                                border: '1px solid ' + (sandboxLiquidatable && sandbox.stepActive === 0 ? 'rgba(0, 242, 254, 0.25)' : 'rgba(255,255,255,0.04)'),
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                opacity: sandboxLiquidatable || sandbox.stepActive >= 1 ? 1 : 0.4
                            }}>
                                <div style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: sandbox.stepActive >= 1 ? 'var(--green)' : 'rgba(0, 242, 254, 0.1)',
                                    color: sandbox.stepActive >= 1 ? 'var(--bg-dark)' : 'var(--cyan)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: '1px solid ' + (sandbox.stepActive >= 1 ? 'var(--green)' : 'rgba(0, 242, 254, 0.3)'),
                                    flexShrink: 0
                                }}>
                                    {sandbox.stepActive >= 1 ? '✓' : '1'}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        prepare_liquidation()
                                    </h5>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: '1.3' }}>
                                        Khoá tài sản, tạo snapshot ID phiên trên chuỗi.
                                    </p>
                                    
                                    {isPreparing ? (
                                        <div style={{ marginTop: '0.35rem' }}>
                                            <span style={{ fontSize: '0.65rem', color: '#ffb74d', display: 'block', marginBottom: '0.15rem' }}>Đang chạy VM: {prepCpuWidth}M CPU Instructions</span>
                                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ width: `${prepCpuWidth}%`, height: '100%', background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)', transition: 'width 1s linear' }} />
                                            </div>
                                        </div>
                                    ) : sandbox.stepActive >= 1 ? (
                                        <div style={{ marginTop: '0.35rem', background: 'rgba(255,255,255,0.02)', padding: '0.2rem 0.4rem', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '4px', fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                            Session ID: {sandbox.sessionId?.slice(0, 14)}...
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handlePrepareClick}
                                            disabled={!sandboxLiquidatable || sandbox.isAutoKeeperActive}
                                            style={{
                                                marginTop: '0.35rem',
                                                background: 'transparent',
                                                border: '1px solid ' + (sandboxLiquidatable ? 'var(--cyan)' : 'rgba(255,255,255,0.06)'),
                                                color: sandboxLiquidatable ? 'var(--cyan)' : 'var(--text-dim)',
                                                borderRadius: '4px',
                                                padding: '0.2rem 0.5rem',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                cursor: sandboxLiquidatable ? 'pointer' : 'not-allowed',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                width: 'fit-content'
                                            }}
                                        >
                                            <Zap size={10} />
                                            Khởi tạo Prepare (~60M CPU)
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Step 2 Card */}
                            <div style={{
                                display: 'flex',
                                gap: '0.75rem',
                                background: sandbox.stepActive === 1 ? 'rgba(155, 81, 224, 0.04)' : 'rgba(255,255,255,0.01)',
                                border: '1px solid ' + (sandbox.stepActive === 1 ? 'rgba(155, 81, 224, 0.25)' : 'rgba(255,255,255,0.04)'),
                                padding: '0.75rem 1rem',
                                borderRadius: '8px',
                                opacity: sandbox.stepActive >= 1 ? 1 : 0.4
                            }}>
                                <div style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: sandbox.stepActive >= 2 ? 'var(--green)' : 'rgba(155, 81, 224, 0.1)',
                                    color: sandbox.stepActive >= 2 ? 'var(--bg-dark)' : 'var(--purple)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    border: '1px solid ' + (sandbox.stepActive >= 2 ? 'var(--green)' : 'rgba(155, 81, 224, 0.3)'),
                                    flexShrink: 0
                                }}>
                                    {sandbox.stepActive >= 2 ? '✓' : '2'}
                                </div>
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <h5 style={{ margin: 0, fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>
                                        execute_liquidation()
                                    </h5>
                                    <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-dim)', lineHeight: '1.3' }}>
                                        Thực thi nợ, giải phóng tài sản thế chấp (+5% thưởng).
                                    </p>
                                    
                                    {isExecuting ? (
                                        <div style={{ marginTop: '0.35rem' }}>
                                            <span style={{ fontSize: '0.65rem', color: '#ffb74d', display: 'block', marginBottom: '0.15rem' }}>Đang tất toán: {execCpuWidth}M CPU Instructions</span>
                                            <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{ width: `${execCpuWidth * 3.3}%`, height: '100%', background: 'var(--purple)', boxShadow: '0 0 6px var(--purple)', transition: 'width 1s linear' }} />
                                            </div>
                                        </div>
                                    ) : sandbox.stepActive >= 2 ? (
                                        <div style={{ marginTop: '0.35rem', color: 'var(--green)', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                            <span>✓ THANH LÝ HOÀN TẤT THÀNH CÔNG!</span>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleExecuteClick}
                                            disabled={sandbox.stepActive !== 1 || sandbox.isAutoKeeperActive}
                                            style={{
                                                marginTop: '0.35rem',
                                                background: 'transparent',
                                                border: '1px solid ' + (sandbox.stepActive === 1 ? 'var(--purple)' : 'rgba(255,255,255,0.06)'),
                                                color: sandbox.stepActive === 1 ? 'var(--purple)' : 'var(--text-dim)',
                                                borderRadius: '4px',
                                                padding: '0.2rem 0.5rem',
                                                fontSize: '0.7rem',
                                                fontWeight: 600,
                                                cursor: sandbox.stepActive === 1 ? 'pointer' : 'not-allowed',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.25rem',
                                                width: 'fit-content'
                                            }}
                                        >
                                            <Layers size={10} />
                                            Gọi Execute (~30M CPU)
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Reset control */}
                        <button 
                            onClick={onReset} 
                            style={{
                                width: '100%',
                                background: 'transparent',
                                border: '1px solid rgba(255, 23, 68, 0.25)',
                                color: 'var(--red)',
                                borderRadius: '8px',
                                padding: '0.5rem',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                transition: 'var(--transition-smooth)',
                                marginTop: '0.25rem'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 23, 68, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 23, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.borderColor = 'rgba(255, 23, 68, 0.25)';
                            }}
                        >
                            <RefreshCw size={14} />
                            <span>Đặt Lại Sandbox Giám Sát</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
