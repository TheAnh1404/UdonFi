import React from 'react';
import { TrendingUp, ShieldAlert, Wallet } from 'lucide-react';
import type { Reserve, UserBalances } from '../types/lending';

interface PositionStatsProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    userBalances: UserBalances;
    wallet: { isConnected: boolean; address: string };
}

export const PositionStats: React.FC<PositionStatsProps> = ({ reserves, userBalances, wallet }) => {
    // 1. Calculate actual balances (Scaled * Index)
    const xlmSupplied = userBalances.suppliedScaled.XLM * reserves.XLM.liquidityIndex;
    const usdcSupplied = userBalances.suppliedScaled.USDC * reserves.USDC.liquidityIndex;
    const xlmDebt = userBalances.debtScaled.XLM * reserves.XLM.borrowIndex;
    const usdcDebt = userBalances.debtScaled.USDC * reserves.USDC.borrowIndex;

    // 2. Check collateral flags in u128 bitmap
    // XLM (index 0) -> collateral bit is 0 (value 1)
    // USDC (index 1) -> collateral bit is 2 (value 4)
    const isXlmCollateral = ((userBalances.bitmap & 1n) === 1n);
    const isUsdcCollateral = ((userBalances.bitmap & 4n) === 4n);

    const xlmSuppliedValue = xlmSupplied * reserves.XLM.price;
    const usdcSuppliedValue = usdcSupplied * reserves.USDC.price;
    const xlmDebtValue = xlmDebt * reserves.XLM.price;
    const usdcDebtValue = usdcDebt * reserves.USDC.price;

    const totalCollateralValue = (isXlmCollateral ? xlmSuppliedValue : 0) + (isUsdcCollateral ? usdcSuppliedValue : 0);
    const totalDebtValue = xlmDebtValue + usdcDebtValue;

    // 3. Current LTV
    const currentLtv = totalCollateralValue > 0 ? (totalDebtValue / totalCollateralValue) * 100 : 0;

    // 4. Net APY Calculation
    // Net APY = (Supply Yield - Borrow Interest) / Net Value
    const totalSuppliedValueAll = xlmSuppliedValue + usdcSuppliedValue;
    const netValue = totalSuppliedValueAll - totalDebtValue;
    const supplyYield = (xlmSuppliedValue * reserves.XLM.supplyApy / 100) + (usdcSuppliedValue * reserves.USDC.supplyApy / 100);
    const borrowInterest = (xlmDebtValue * reserves.XLM.borrowApy / 100) + (usdcDebtValue * reserves.USDC.borrowApy / 100);
    
    let netApy = 0;
    if (netValue > 0) {
        netApy = ((supplyYield - borrowInterest) / netValue) * 100;
    } else if (totalSuppliedValueAll > 0) {
        netApy = ((supplyYield - borrowInterest) / totalSuppliedValueAll) * 100;
    }

    // 5. Max LTV and Liquidation Threshold (Weighted based on collateral structure)
    // For simplicity and since contract uses hardcoded limits: XLM ltv = 70%, USDC ltv = 70%
    // Liquidation threshold = 82.5%
    const maxLtvLimit = 70;
    const liqThresholdLimit = 82.5;

    return (
        <div className="card glass-card pos-card glow-cyan">
            <div className="card-header">
                <h3>
                    <TrendingUp className="text-cyan" size={18} />
                    <span>Vị Thế Tài Chính Của Bạn</span>
                </h3>
            </div>
            <div className="card-body">
                <div className="stats-grid">
                    <div className="stat-box">
                        <span className="stat-label">Tổng Tài Sản Thế Chấp</span>
                        <span className="stat-value text-cyan">
                            ${totalCollateralValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-dim">
                            XLM: {isXlmCollateral ? 'Bật' : 'Tắt'} | USDC: {isUsdcCollateral ? 'Bật' : 'Tắt'}
                        </span>
                    </div>

                    <div className="stat-box">
                        <span className="stat-label">Tổng Khoản Vay</span>
                        <span className="stat-value text-purple">
                            ${totalDebtValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <span className="text-xs text-dim">
                            Hạn mức vay còn lại: ${Math.max(0, (totalCollateralValue * 0.7) - totalDebtValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    <div className="stat-box">
                        <span className="stat-label">Net APY</span>
                        <span className={`stat-value ${netApy >= 0 ? 'text-green' : 'text-red'}`}>
                            {netApy >= 0 ? '+' : ''}{netApy.toFixed(2)}%
                        </span>
                        <span className="text-xs text-dim">Lãi nạp - lãi vay thực tế</span>
                    </div>

                    <div className="stat-box">
                        <span className="stat-label">Tỷ Lệ Nợ hiện tại (LTV)</span>
                        <span className={`stat-value ${currentLtv > liqThresholdLimit ? 'text-red animated-pulse' : currentLtv > maxLtvLimit ? 'text-yellow' : 'text-main'}`}>
                            {currentLtv.toFixed(1)}%
                        </span>
                        <span className="text-xs text-dim">Giới hạn vay: {maxLtvLimit}%</span>
                    </div>
                </div>

                {/* Wallet Balance Section */}
                <div className="wallet-balances-box mt-4 mb-4" style={{
                    background: 'rgba(255, 255, 255, 0.01)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    padding: '1rem',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <Wallet className={wallet?.isConnected ? "text-cyan animate-pulse" : "text-dim"} size={16} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: wallet?.isConnected ? 'var(--text-main)' : 'var(--text-dim)' }}>
                            Số Dư Ví Của Bạn (Liquid Assets)
                        </span>
                    </div>
                    {wallet?.isConnected ? (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="wallet-asset-pill" style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(0, 243, 255, 0.15)',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>Stellar Lumens</span>
                                    <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                                        {userBalances.wallet.XLM.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM
                                    </span>
                                </div>
                                <span className="text-cyan" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                    ${(userBalances.wallet.XLM * reserves.XLM.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="wallet-asset-pill" style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(168, 85, 247, 0.15)',
                                borderRadius: '8px',
                                padding: '0.75rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block' }}>USD Coin</span>
                                    <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '1.05rem' }}>
                                        {userBalances.wallet.USDC.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC
                                    </span>
                                </div>
                                <span className="text-purple" style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                                    ${(userBalances.wallet.USDC * reserves.USDC.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '60px',
                            background: 'rgba(255, 255, 255, 0.01)',
                            borderRadius: '8px',
                            border: '1px dashed rgba(255, 255, 255, 0.08)',
                            color: 'var(--text-dim)',
                            fontSize: '0.85rem'
                        }}>
                            Vui lòng kết nối ví Freighter để theo dõi tài sản
                        </div>
                    )}
                </div>

                <div className="ltv-footer mt-2">
                    <div className="ltv-progress-container">
                        <div className="ltv-labels">
                            <span className="input-label">Thanh Giới Hạn LTV</span>
                            <span className="input-bal-ref">{currentLtv.toFixed(1)}% / 100%</span>
                        </div>
                        <div className="ltv-bar-bg">
                            <div 
                                className="ltv-bar-fill" 
                                style={{ 
                                    width: `${Math.min(100, currentLtv)}%`,
                                    background: currentLtv > liqThresholdLimit ? 'var(--red)' : currentLtv > maxLtvLimit ? 'var(--yellow)' : 'linear-gradient(90deg, var(--cyan), var(--purple))'
                                }}
                            ></div>
                            <div className="ltv-marker max-ltv" style={{ left: `${maxLtvLimit}%` }} title="Max LTV (70%)"></div>
                            <div className="ltv-marker liq-threshold" style={{ left: `${liqThresholdLimit}%` }} title="Liquidation Threshold (82.5%)"></div>
                        </div>
                        <div className="ltv-legends">
                            <span className="legend-item">
                                <span className="marker-dot bg-cyan"></span>
                                <span>Max LTV ({maxLtvLimit}%)</span>
                            </span>
                            <span className="legend-item">
                                <span className="marker-dot bg-red"></span>
                                <span>Ngưỡng thanh lý ({liqThresholdLimit}%)</span>
                            </span>
                            {currentLtv > maxLtvLimit && (
                                <span className="legend-item text-yellow animated-pulse">
                                    <ShieldAlert size={12} />
                                    <span>Rủi ro thanh lý cao!</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
