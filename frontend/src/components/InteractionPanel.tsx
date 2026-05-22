import React, { useState, useEffect } from 'react';
import { HelpCircle, AlertTriangle, X, ShieldAlert, Zap, Play, CheckCircle2, Gauge, Loader2, Info, Check, AlertCircle } from 'lucide-react';
import type { Reserve, UserBalances } from '../types/lending';

type ActionType = 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LEVERAGE';

interface InteractionPanelProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    userBalances: UserBalances;
    activeAction: ActionType;
    activeAsset: 'XLM' | 'USDC';
    onClose: () => void;
    onSubmit: (action: ActionType, asset: 'XLM' | 'USDC', amount: number, leverageFactor?: number) => void;
    onToggleCollateral: (symbol: 'XLM' | 'USDC', useAsCollateral: boolean) => void;
    txState?: 'IDLE' | 'SIMULATING' | 'SIGNING' | 'SUBMITTING' | 'CONFIRMED' | 'FAILED';
    txDetails?: { gasFeeXlm: number; cpuInstructions: number; txHash?: string; error?: string };
    onResetTxState?: () => void;
    onExtendTtl?: () => void;
    showCloseButton?: boolean;
}

export const InteractionPanel: React.FC<InteractionPanelProps> = ({
    reserves,
    userBalances,
    activeAction,
    activeAsset: propAsset,
    onClose,
    onSubmit,
    onToggleCollateral,
    txState = 'IDLE',
    txDetails = { gasFeeXlm: 0, cpuInstructions: 0 },
    onResetTxState = () => {},
    onExtendTtl = () => {},
    showCloseButton = true
}) => {
    const [action, setAction] = useState<ActionType>(activeAction);
    const [asset, setAsset] = useState<'XLM' | 'USDC'>(propAsset);
    const [amountStr, setAmountStr] = useState<string>('');
    const amount = parseFloat(amountStr) || 0;

    // Advanced features state
    const [isLeverageMode, setIsLeverageMode] = useState<boolean>(false);
    const [leverageFactor, setLeverageFactor] = useState<number>(2.0);

    // Keep state synced with props when they change
    useEffect(() => {
        setAction(activeAction);
    }, [activeAction]);

    useEffect(() => {
        setAsset(propAsset);
    }, [propAsset]);

    // Clear input on tab or asset change
    useEffect(() => {
        setAmountStr('');
        setIsLeverageMode(false);
    }, [action, asset]);

    const reserve = reserves[asset];

    // Current actual balances
    const currentXlmSupplied = userBalances.suppliedScaled.XLM * reserves.XLM.liquidityIndex;
    const currentUsdcSupplied = userBalances.suppliedScaled.USDC * reserves.USDC.liquidityIndex;
    const currentXlmDebt = userBalances.debtScaled.XLM * reserves.XLM.borrowIndex;
    const currentUsdcDebt = userBalances.debtScaled.USDC * reserves.USDC.borrowIndex;

    const currentXlmSuppliedValue = currentXlmSupplied * reserves.XLM.price;
    const currentUsdcSuppliedValue = currentUsdcSupplied * reserves.USDC.price;
    const currentXlmDebtValue = currentXlmDebt * reserves.XLM.price;
    const currentUsdcDebtValue = currentUsdcDebt * reserves.USDC.price;

    const isXlmCollateral = ((userBalances.bitmap & 1n) === 1n);
    const isUsdcCollateral = ((userBalances.bitmap & 4n) === 4n);

    // Initial calculations
    const initialCollateralValue = (isXlmCollateral ? currentXlmSuppliedValue : 0) + (isUsdcCollateral ? currentUsdcSuppliedValue : 0);
    const initialDebtValue = currentXlmDebtValue + currentUsdcDebtValue;
    const initialHealthFactor = initialDebtValue > 0 ? (initialCollateralValue * 0.825) / initialDebtValue : Infinity;
    const initialLtv = initialCollateralValue > 0 ? (initialDebtValue / initialCollateralValue) * 100 : 0;

    // Smart Wizard Activation check
    // If user goes to borrow but has no collateral active
    const showWizard = action === 'BORROW' && !isXlmCollateral && !isUsdcCollateral;

    // Detect current Wizard step
    // Step 1: Supply XLM (if XLM supplied is 0)
    // Step 2: Enable Collateral (if XLM supplied > 0 but not enabled as collateral)
    // Step 3: Perform Borrow (if collateral is enabled)
    let wizardStep = 1;
    if (currentXlmSupplied > 0) {
        if (!isXlmCollateral) {
            wizardStep = 2;
        } else {
            wizardStep = 3;
        }
    }

    // Balance definitions for UI references
    let referenceBalance = 0;
    let balanceLabel = '';

    if (action === 'SUPPLY') {
        referenceBalance = userBalances.wallet[asset];
        balanceLabel = 'Số dư ví';
    } else if (action === 'WITHDRAW') {
        referenceBalance = asset === 'XLM' ? currentXlmSupplied : currentUsdcSupplied;
        balanceLabel = 'Đã nạp';
    } else if (action === 'BORROW') {
        // Max borrowable = (Collateral * 0.70) - Debt
        const maxBorrowableUsd = Math.max(0, (initialCollateralValue * 0.70) - initialDebtValue);
        referenceBalance = maxBorrowableUsd / reserve.price;
        balanceLabel = 'Hạn mức vay';
    } else if (action === 'REPAY') {
        referenceBalance = Math.min(
            userBalances.wallet[asset],
            asset === 'XLM' ? currentXlmDebt : currentUsdcDebt
        );
        balanceLabel = 'Cần trả tối đa';
    }

    // Handle quick percentage selection
    const handlePercentClick = (pct: number) => {
        const calculated = referenceBalance * pct;
        setAmountStr(calculated.toFixed(4));
    };

    // Handle Safety Presets for LTV
    const handleSafetyPresetClick = (targetLtvPct: number) => {
        if (action !== 'BORROW') return;
        const targetLtv = targetLtvPct / 100;
        const targetDebtUsd = initialCollateralValue * targetLtv;
        const borrowNeededUsd = Math.max(0, targetDebtUsd - initialDebtValue);
        const calculated = borrowNeededUsd / reserve.price;
        setAmountStr(calculated.toFixed(4));
    };

    // Simulation logic
    let simCollateralValue = initialCollateralValue;
    let simDebtValue = initialDebtValue;

    if (amount > 0) {
        if (isLeverageMode) {
            // Leverage Loop simulation
            const leveragedSupply = amount * leverageFactor;
            const leveragedDebt = amount * (leverageFactor - 1) * reserves.XLM.price;
            
            simCollateralValue = initialCollateralValue + (leveragedSupply * reserves.XLM.price);
            simDebtValue = initialDebtValue + leveragedDebt;
        } else {
            if (action === 'SUPPLY') {
                const addedValue = amount * reserve.price;
                simCollateralValue += addedValue;
            } else if (action === 'WITHDRAW') {
                const removedValue = amount * reserve.price;
                const isCollateral = asset === 'XLM' ? isXlmCollateral : isUsdcCollateral;
                if (isCollateral) {
                    simCollateralValue = Math.max(0, simCollateralValue - removedValue);
                }
            } else if (action === 'BORROW') {
                const addedDebtValue = amount * reserve.price;
                simDebtValue += addedDebtValue;
            } else if (action === 'REPAY') {
                const repaidDebtValue = amount * reserve.price;
                simDebtValue = Math.max(0, simDebtValue - repaidDebtValue);
            }
        }
    }

    const simHealthFactor = simDebtValue > 0 ? (simCollateralValue * 0.825) / simDebtValue : Infinity;
    const simLtv = simCollateralValue > 0 ? (simDebtValue / simCollateralValue) * 100 : 0;

    // Advanced dynamic liquidation price calculator
    const getLiquidationPriceInfo = () => {
        // We calculate XLM liquidation price based on simulated position
        // Liquidation occurs when HF = 1.0 -> ((Collateral_XLM * P + Collateral_USDC) * 0.825) / (Debt_XLM * P + Debt_USDC) = 1.0
        
        let simXlmCollateralAmount = currentXlmSupplied;
        let simUsdcCollateralValue = isUsdcCollateral ? currentUsdcSuppliedValue : 0;
        let simXlmDebtAmount = currentXlmDebt;
        let simUsdcDebtValue = currentUsdcDebtValue;

        if (amount > 0) {
            if (isLeverageMode) {
                simXlmCollateralAmount += amount * leverageFactor;
                simUsdcDebtValue += amount * (leverageFactor - 1) * reserves.XLM.price;
            } else {
                if (action === 'SUPPLY' && asset === 'XLM') {
                    simXlmCollateralAmount += amount;
                } else if (action === 'WITHDRAW' && asset === 'XLM' && isXlmCollateral) {
                    simXlmCollateralAmount = Math.max(0, simXlmCollateralAmount - amount);
                } else if (action === 'SUPPLY' && asset === 'USDC') {
                    simUsdcCollateralValue += amount;
                } else if (action === 'WITHDRAW' && asset === 'USDC' && isUsdcCollateral) {
                    simUsdcCollateralValue = Math.max(0, simUsdcCollateralValue - amount);
                } else if (action === 'BORROW' && asset === 'XLM') {
                    simXlmDebtAmount += amount;
                } else if (action === 'REPAY' && asset === 'XLM') {
                    simXlmDebtAmount = Math.max(0, simXlmDebtAmount - amount);
                } else if (action === 'BORROW' && asset === 'USDC') {
                    simUsdcDebtValue += amount;
                } else if (action === 'REPAY' && asset === 'USDC') {
                    simUsdcDebtValue = Math.max(0, simUsdcDebtValue - amount);
                }
            }
        }

        const a = 0.825 * simXlmCollateralAmount - simXlmDebtAmount;
        const b = simUsdcDebtValue - 0.825 * simUsdcCollateralValue;

        if (simDebtValue === 0) {
            return { hasRisk: false, price: 0, margin: 100, text: 'Không có nợ - 100% An toàn 🟢' };
        }

        if (a <= 0) {
            // Negative 'a' means debt in XLM exceeds collateral in XLM (highly risky, XLM price drop makes position safer)
            return { hasRisk: true, price: -1, margin: 0, text: 'Rủi ro cực cao - Bị ngược thế chấp 🔴' };
        }

        const liqPrice = b / a;

        if (liqPrice <= 0) {
            return { hasRisk: false, price: 0, margin: 100, text: 'Tài sản thế chấp quá lớn - Không thể thanh lý 🟢' };
        }

        const margin = Math.max(0, ((reserves.XLM.price - liqPrice) / reserves.XLM.price) * 100);
        let safetyText = 'Rất An Toàn 🟢';
        if (margin < 15) safetyText = 'CỰC KỲ NGUY HIỂM 🔴';
        else if (margin < 30) safetyText = 'Rủi Ro Cao 🟡';

        return {
            hasRisk: true,
            price: liqPrice,
            margin: margin,
            text: `Nếu XLM giảm về $${liqPrice.toFixed(4)} (${margin.toFixed(1)}% drop), bạn sẽ bị thanh lý! - ${safetyText}`
        };
    };

    const liqInfo = getLiquidationPriceInfo();

    // Revert warnings
    let isRevert = false;
    let revertReason = '';

    if (amount > referenceBalance && (action === 'SUPPLY' || action === 'WITHDRAW' || action === 'REPAY') && !isLeverageMode) {
        isRevert = true;
        revertReason = `Số lượng nhập vào vượt quá ${balanceLabel.toLowerCase()} khả dụng!`;
    } else if (action === 'WITHDRAW' && amount > (asset === 'XLM' ? currentXlmSupplied : currentUsdcSupplied)) {
        isRevert = true;
        revertReason = 'Bạn không thể rút nhiều hơn số lượng đã nạp!';
    } else if (action === 'REPAY' && amount > (asset === 'XLM' ? currentXlmDebt : currentUsdcDebt)) {
        isRevert = true;
        revertReason = 'Số lượng trả nợ vượt quá tổng dư nợ hiện tại!';
    } else if (amount > 0) {
        if ((action === 'BORROW' || action === 'WITHDRAW') && simHealthFactor <= 1.0) {
            isRevert = true;
            revertReason = 'Giao dịch mô phỏng bị REVERT vì Hệ số Sức Khỏe HF rơi xuống mức nguy hiểm (HF <= 1.0)!';
        } else if (action === 'BORROW' && simLtv > 70) {
            isRevert = true;
            revertReason = 'Khoản vay mới vượt quá tỷ lệ nợ tối đa LTV (70%) trên tổng tài sản thế chấp!';
        } else if (isLeverageMode && simHealthFactor <= 1.0) {
            isRevert = true;
            revertReason = 'Đòn bẩy bị từ chối: Tỷ lệ nợ mô phỏng vượt ngưỡng an toàn tối đa!';
        } else if (isLeverageMode && amount > userBalances.wallet.XLM) {
            isRevert = true;
            revertReason = 'Số lượng thế chấp ban đầu vượt quá số dư XLM khả dụng trong ví!';
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0 || isRevert) return;
        if (isLeverageMode) {
            onSubmit('LEVERAGE', 'XLM', amount, leverageFactor);
        } else {
            onSubmit(action, asset, amount);
        }
        setAmountStr('');
    };

    const utilizationRate = reserve.totalSupplied > 0 ? (reserve.totalBorrowed / reserve.totalSupplied) * 100 : 0;
    const isUtilizationHigh = utilizationRate > reserve.uOptimal;

    return (
        <div className={`card glass-card interaction-card ${amount > 0 ? 'active' : ''}`}>
            {txState !== 'IDLE' && (
                <div className="tx-state-overlay">
                    <div className="tx-loader-container">
                        {txState === 'SIMULATING' && (
                            <div className="double-spinner">
                                <div className="spinner-outer"></div>
                                <div className="spinner-inner"></div>
                            </div>
                        )}
                        {txState === 'SIGNING' && (
                            <div className="double-spinner">
                                <div className="spinner-outer" style={{ borderTopColor: 'var(--purple)', borderBottomColor: 'var(--purple)' }}></div>
                                <div className="spinner-inner" style={{ borderLeftColor: 'var(--yellow)', borderRightColor: 'var(--yellow)' }}></div>
                            </div>
                        )}
                        {txState === 'SUBMITTING' && (
                            <div className="double-spinner">
                                <div className="spinner-outer" style={{ animationDuration: '0.6s' }}></div>
                                <div className="spinner-inner" style={{ animationDuration: '0.4s' }}></div>
                            </div>
                        )}
                        {txState === 'CONFIRMED' && (
                            <CheckCircle2 size={64} className="success-glow-icon" />
                        )}
                        {txState === 'FAILED' && (
                            <AlertCircle size={64} className="error-glow-icon" />
                        )}
                    </div>

                    <div className="tx-status-title">
                        {txState === 'SIMULATING' && <span className="text-cyan animate-pulse">ĐANG MÔ PHỎNG GIAO DỊCH...</span>}
                        {txState === 'SIGNING' && <span className="text-purple animate-pulse">ĐANG CHỜ KÝ VÍ FREIGHTER...</span>}
                        {txState === 'SUBMITTING' && <span className="text-cyan animate-pulse">ĐANG PHÁT LÊN STELLAR LEDGER...</span>}
                        {txState === 'CONFIRMED' && <span className="text-green">GIAO DỊCH THÀNH CÔNG! 🎉</span>}
                        {txState === 'FAILED' && <span className="text-red">GIAO DỊCH THẤT BẠI! ⚠️</span>}
                    </div>

                    <div className="tx-status-desc">
                        {txState === 'SIMULATING' && "Đang gửi giao dịch ảo lên Soroban RPC để ước tính gas, giới hạn tài nguyên CPU và RAM..."}
                        {txState === 'SIGNING' && "Vui lòng mở ví Freighter và ký xác nhận giao dịch để tiếp tục. Hãy kiểm tra kỹ các thông số."}
                        {txState === 'SUBMITTING' && "Đang phát giao dịch lên Stellar Testnet và chờ đồng thuận (Consensus) từ các nút mạng..."}
                        {txState === 'CONFIRMED' && "Giao dịch đã được ghi nhận trên Stellar Ledger thành công. Trạng thái vị thế của bạn đã được cập nhật."}
                        {txState === 'FAILED' && (txDetails.error || "Giao dịch bị từ chối hoặc gặp lỗi trong quá trình thực hiện trên mạng Soroban.")}
                    </div>

                    {txState === 'CONFIRMED' && (
                        <div className="tx-metrics-box">
                            <div className="tx-metric-row">
                                <span>Phí Gas tiêu thụ:</span>
                                <span>{txDetails.gasFeeXlm ? txDetails.gasFeeXlm.toFixed(6) : '0.000120'} XLM</span>
                            </div>
                            <div className="tx-metric-row">
                                <span>Soroban CPU Instructions:</span>
                                <span>{txDetails.cpuInstructions ? txDetails.cpuInstructions.toLocaleString() : '842,510'}</span>
                            </div>
                            {txDetails.txHash && (
                                <div className="tx-metric-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                                    <span>Giao dịch Hash:</span>
                                    <span>
                                        <a 
                                            href={`https://stellar.expert/explorer/testnet/tx/${txDetails.txHash}`} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="tx-hash-link"
                                        >
                                            {txDetails.txHash.slice(0, 8)}...{txDetails.txHash.slice(-8)}
                                            <Play size={10} style={{ transform: 'rotate(-45deg)' }} />
                                        </a>
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {txState === 'CONFIRMED' && (
                        <button type="button" onClick={onResetTxState} className="btn btn-cyan btn-sm" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
                            <Check size={14} />
                            <span>Hoàn Tất & Quay Lại</span>
                        </button>
                    )}
                    {txState === 'FAILED' && (
                        <button type="button" onClick={onResetTxState} className="btn btn-purple btn-sm" style={{ paddingLeft: '2rem', paddingRight: '2rem' }}>
                            <Play size={14} />
                            <span>Thử Lại</span>
                        </button>
                    )}
                </div>
            )}

            <div className="card-header">
                <h3>
                    <Zap className="text-cyan animate-pulse" size={18} style={{ filter: 'drop-shadow(0 0 6px var(--cyan-glow))' }} />
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.05em' }}>TRẠM GIAO DỊCH VÍ DEFI</span>
                </h3>
                {showCloseButton && (
                    <button onClick={onClose} className="btn-close" title="Đóng">
                        <X size={18} />
                    </button>
                )}
            </div>
            <div className="card-body">
                {/* Tabs */}
                <div className="tab-buttons">
                    {(['SUPPLY', 'WITHDRAW', 'BORROW', 'REPAY'] as ActionType[]).map((t) => (
                        <button
                            key={t}
                            onClick={() => setAction(t)}
                            className={`tab-btn ${action === t ? 'active' : ''}`}
                        >
                            {t === 'SUPPLY' ? 'Nạp' : t === 'WITHDRAW' ? 'Rút' : t === 'BORROW' ? 'Vay' : 'Trả'}
                        </button>
                    ))}
                </div>

                {/* Asset selector & Leverage Mode Switch */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                            onClick={() => setAsset('XLM')}
                            className={`btn-connect btn-sm ${asset === 'XLM' ? 'active-asset' : ''}`}
                            style={{ flex: 1, borderColor: asset === 'XLM' ? 'var(--cyan)' : 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}
                        >
                            XLM (Stellar)
                        </button>
                        <button
                            onClick={() => setAsset('USDC')}
                            className={`btn-connect btn-sm ${asset === 'USDC' ? 'active-asset' : ''}`}
                            style={{ flex: 1, borderColor: asset === 'USDC' ? 'var(--cyan)' : 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'center' }}
                            disabled={isLeverageMode}
                        >
                            USDC (Stablecoin)
                        </button>
                    </div>

                    {/* Leverage Mode Toggle for XLM (Only on Supply & Borrow) */}
                    {(action === 'SUPPLY' || action === 'BORROW') && asset === 'XLM' && (
                        <div className="leverage-mode-indicator">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Zap size={14} className={isLeverageMode ? "text-cyan animate-pulse" : "text-dim"} />
                                <span style={{ fontWeight: 600 }}>🚀 Đòn bẩy 1-Click (Leverage Loop)</span>
                            </div>
                            <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px' }}>
                                <input
                                    type="checkbox"
                                    checked={isLeverageMode}
                                    onChange={(e) => {
                                        setIsLeverageMode(e.target.checked);
                                        if (e.target.checked) {
                                            setAction('LEVERAGE');
                                            setAmountStr('1000'); // default amount for loop
                                        } else {
                                            setAction(activeAction);
                                            setAmountStr('');
                                        }
                                    }}
                                    style={{ opacity: 0, width: 0, height: 0 }}
                                />
                                <span className="slider round" style={{
                                    position: 'absolute',
                                    cursor: 'pointer',
                                    top: 0, left: 0, right: 0, bottom: 0,
                                    backgroundColor: isLeverageMode ? 'var(--cyan)' : 'rgba(255,255,255,0.08)',
                                    transition: '.4s',
                                    borderRadius: '34px'
                                }}>
                                    <span className="slider-dot" style={{
                                        position: 'absolute',
                                        height: '14px',
                                        width: '14px',
                                        left: isLeverageMode ? '20px' : '3px',
                                        bottom: '3px',
                                        backgroundColor: '#fff',
                                        transition: '.4s',
                                        borderRadius: '50%'
                                    }}></span>
                                </span>
                            </label>
                        </div>
                    )}
                </div>

                {/* Dynamic Warnings & Risk Cards */}
                <div className="risk-warnings-container" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
                    {/* Low TTL Warning */}
                    {userBalances.ttl < 1000 && (
                        <div className="risk-warning-card risk-danger">
                            <div className="risk-warning-header text-red">
                                <ShieldAlert size={16} />
                                <span>CẢNH BÁO TTL THẤP (SẮP BỊ GIẢI PHÓNG)</span>
                            </div>
                            <div className="risk-warning-body">
                                Dữ liệu tài khoản của bạn trên Stellar Soroban sắp hết hạn sử dụng (dưới 1000 ledgers). Vui lòng gia hạn thời gian sống dữ liệu để tránh tài khoản bị giải phóng (Eviction) khỏi mạng.
                            </div>
                            <div className="risk-warning-action">
                                <button type="button" onClick={onExtendTtl} className="btn-extend-ttl">
                                    <Zap size={12} />
                                    <span>Gia hạn TTL ngay (+500 Ledgers)</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* High Utilization APY Warning */}
                    {isUtilizationHigh && (
                        <div className="risk-warning-card">
                            <div className="risk-warning-header text-yellow">
                                <AlertTriangle size={16} />
                                <span>CẢNH BÁO LÃI SUẤT TĂNG VỌT (POOL UTILIZATION &gt; {reserve.uOptimal}%)</span>
                            </div>
                            <div className="risk-warning-body">
                                Hệ số sử dụng Pool {asset} hiện đạt <strong>{utilizationRate.toFixed(1)}%</strong>, vượt mức tối ưu {reserve.uOptimal}%. Lãi suất vay đang tăng phi mã lên mức <strong>{reserve.borrowApy.toFixed(2)}% APY</strong>. Vui lòng cân nhắc kỹ trước khi thực hiện giao dịch vay thêm.
                            </div>
                        </div>
                    )}

                    {/* Slippage Alert in Leverage Mode */}
                    {isLeverageMode && leverageFactor > 1.8 && (
                        <div className="risk-warning-card risk-info">
                            <div className="risk-warning-header text-cyan">
                                <Info size={16} />
                                <span>RỦI RO TRƯỢT GIÁ ĐÒN BẨY CAO</span>
                            </div>
                            <div className="risk-warning-body">
                                Đòn bẩy <strong>{leverageFactor.toFixed(1)}x</strong> yêu cầu thực hiện hoán đổi (swap) một khối lượng lớn USDC/XLM qua Stellar DEX. Trượt giá ước tính có thể vượt <strong>1.5%</strong>, làm tăng nguy cơ bị thanh lý vị thế sớm.
                            </div>
                        </div>
                    )}
                </div>

                <form className="op-form" onSubmit={handleSubmit}>
                    {showWizard ? (
                        /* 3-Step Interactive Onboarding Stepper */
                        <div className="borrow-stepper">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                <Gauge className="text-cyan animate-pulse" size={20} />
                                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 700 }}>
                                    Bộ Hướng Dẫn Vay Tín Dụng 3 Bước
                                </h4>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.4', marginBottom: '0.5rem' }}>
                                UdonFi vận hành trên chuỗi Stellar. Hãy thực hiện 3 bước đơn giản dưới đây để kích hoạt hạn mức vay:
                            </p>

                            {/* Step 1: Supply Collateral */}
                            <div className={`step-card ${wizardStep === 1 ? 'active' : wizardStep > 1 ? 'completed' : 'locked'}`}>
                                <div className="step-badge">
                                    {wizardStep > 1 ? <CheckCircle2 size={16} className="text-green" /> : '1'}
                                </div>
                                <div className="step-content">
                                    <span className="step-title">
                                        <span>Nạp XLM Thế Chấp</span>
                                        {wizardStep > 1 && <span className="text-green text-xs">Hoàn thành</span>}
                                    </span>
                                    <span className="step-desc">
                                        Nạp tài sản đảm bảo ban đầu vào Lending Pool để tạo sức mua.
                                    </span>
                                    {wizardStep === 1 && (
                                        <div className="step-action-area">
                                            <div className="step-input-row">
                                                <input
                                                    type="number"
                                                    placeholder="Lượng XLM (ví dụ: 1000)"
                                                    value={amountStr}
                                                    onChange={(e) => setAmountStr(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={amount <= 0 || amount > userBalances.wallet.XLM}
                                                    onClick={() => {
                                                        onSubmit('SUPPLY', 'XLM', amount);
                                                        setAmountStr('');
                                                    }}
                                                    className="btn btn-sm btn-cyan"
                                                >
                                                    <Play size={10} />
                                                    <span>Nạp ngay</span>
                                                </button>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                                Số dư khả dụng: {userBalances.wallet.XLM.toLocaleString()} XLM
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Enable Collateral Toggle */}
                            <div className={`step-card ${wizardStep === 2 ? 'active' : wizardStep > 2 ? 'completed' : 'locked'}`}>
                                <div className="step-badge">
                                    {wizardStep > 2 ? <CheckCircle2 size={16} className="text-green" /> : '2'}
                                </div>
                                <div className="step-content">
                                    <span className="step-title">
                                        <span>Kích Hoạt Thế Chấp (Soroban Bitmap)</span>
                                        {wizardStep > 2 && <span className="text-green text-xs">Hoàn thành</span>}
                                    </span>
                                    <span className="step-desc">
                                        Thiết lập quyền sử dụng XLM làm thế chấp (cập nhật Bit #0 trên u128 bitmap lưu trữ Ledger).
                                    </span>
                                    {wizardStep === 2 && (
                                        <div className="step-action-area">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    onToggleCollateral('XLM', true);
                                                }}
                                                className="btn btn-sm btn-cyan"
                                                style={{ width: 'fit-content' }}
                                            >
                                                <Zap size={12} />
                                                <span>Bật quyền thế chấp XLM</span>
                                            </button>
                                            <div className="soroban-ttl-badge">
                                                <span>⚡ Soroban u128 Bitmap Matrix: Bit 0 = 1</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Step 3: Perform Borrow */}
                            <div className={`step-card ${wizardStep === 3 ? 'active' : 'locked'}`}>
                                <div className="step-badge">3</div>
                                <div className="step-content">
                                    <span className="step-title">Thực Hiện Khoản Vay USDC</span>
                                    <span className="step-desc">
                                        Hạn mức vay của bạn đã mở! Hãy nhập số lượng USDC cần vay về ví.
                                    </span>
                                    {wizardStep === 3 && (
                                        <div className="step-action-area">
                                            <div className="step-input-row">
                                                <input
                                                    type="number"
                                                    placeholder="Lượng USDC cần vay"
                                                    value={amountStr}
                                                    onChange={(e) => setAmountStr(e.target.value)}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={amount <= 0 || isRevert}
                                                    onClick={() => {
                                                        onSubmit('BORROW', 'USDC', amount);
                                                        setAmountStr('');
                                                    }}
                                                    className="btn btn-sm btn-purple"
                                                >
                                                    <span>Vay ngay</span>
                                                </button>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--cyan)' }}>
                                                Hạn mức vay tối đa của bạn: ${referenceBalance.toFixed(2)} USDC
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : isLeverageMode ? (
                        /* 1-Click Leverage Loop UI */
                        <div>
                            {/* Initial capital input */}
                            <div className="form-row-bal">
                                <span className="input-label">Vốn XLM ban đầu của bạn</span>
                                <span className="input-bal-ref">
                                    Khả dụng: {userBalances.wallet.XLM.toLocaleString()} XLM
                                </span>
                            </div>
                            <div className="input-container" style={{ marginBottom: '1rem' }}>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    value={amountStr}
                                    onChange={(e) => setAmountStr(e.target.value)}
                                    min="0"
                                />
                                <span className="input-suffix">XLM</span>
                            </div>

                            {/* Leverage Factor Slider */}
                            <div className="leverage-slider-box">
                                <div className="leverage-val-label">
                                    <span className="preset-title">Hệ số đòn bẩy</span>
                                    <strong className="text-cyan" style={{ fontFamily: 'var(--font-heading)' }}>
                                        {leverageFactor.toFixed(1)}x
                                    </strong>
                                </div>
                                <input
                                    type="range"
                                    min="1.1"
                                    max="2.3"
                                    step="0.1"
                                    value={leverageFactor}
                                    onChange={(e) => setLeverageFactor(parseFloat(e.target.value))}
                                    className="slider-leverage"
                                />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                    <span>LTV thấp (1.1x)</span>
                                    <span>LTV cân bằng (1.8x)</span>
                                    <span>LTV tối đa (2.3x)</span>
                                </div>
                            </div>

                            {/* Side-by-side comparison */}
                            <div className="leverage-comparison">
                                <div className="comp-card">
                                    <span className="comp-title">Bình thường (1.0x)</span>
                                    <div className="comp-row">
                                        <span>Nạp:</span>
                                        <strong>{amount} XLM</strong>
                                    </div>
                                    <div className="comp-row">
                                        <span>Vay:</span>
                                        <strong>0 USDC</strong>
                                    </div>
                                    <div className="comp-row">
                                        <span>APY nạp:</span>
                                        <strong className="text-green">1.25%</strong>
                                    </div>
                                    <div className="comp-row">
                                        <span>Thanh lý:</span>
                                        <span className="text-dim">Không có</span>
                                    </div>
                                </div>
                                <div className="comp-card highlight">
                                    <span className="comp-title text-cyan">Đòn bẩy ({leverageFactor.toFixed(1)}x)</span>
                                    <div className="comp-row">
                                        <span>Tổng nạp:</span>
                                        <strong className="text-cyan">{(amount * leverageFactor).toFixed(1)} XLM</strong>
                                    </div>
                                    <div className="comp-row">
                                        <span>Tổng nợ:</span>
                                        <strong className="text-purple">{(amount * (leverageFactor - 1) * reserves.XLM.price).toFixed(1)} USDC</strong>
                                    </div>
                                    <div className="comp-row">
                                        <span>Net LTV:</span>
                                        <strong className="text-yellow">{(((leverageFactor - 1) / leverageFactor) * 100).toFixed(1)}%</strong>
                                    </div>
                                    <div className="comp-row">
                                        <span>Thanh lý:</span>
                                        <strong className="text-red">${( (amount * (leverageFactor - 1) * reserves.XLM.price) / ((amount * leverageFactor) * 0.825) || 0 ).toFixed(3)}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Flash-loan multi-call step visualizer */}
                            <div className="loop-steps-visual">
                                <span className="preset-title" style={{ marginBottom: '0.2rem' }}>Quy trình multi-call Stellar Soroban (1 Giao dịch):</span>
                                <div className="loop-step-line active">
                                    <div className="loop-step-dot"></div>
                                    <span>1. Nạp {amount.toLocaleString()} XLM tài sản đảm bảo gốc.</span>
                                </div>
                                <div className="loop-step-line active">
                                    <div className="loop-step-dot"></div>
                                    <span>2. Vay tự động {(amount * (leverageFactor - 1) * reserves.XLM.price).toFixed(1)} USDC.</span>
                                </div>
                                <div className="loop-step-line active">
                                    <div className="loop-step-dot"></div>
                                    <span>3. Định tuyến Swap USDC → {(amount * (leverageFactor - 1)).toFixed(1)} XLM qua DEX.</span>
                                </div>
                                <div className="loop-step-line active">
                                    <div className="loop-step-dot"></div>
                                    <span>4. Nạp tái thế chấp {(amount * (leverageFactor - 1)).toFixed(1)} XLM để chốt đòn bẩy.</span>
                                </div>
                            </div>

                            {/* Simulation summary */}
                            <div className="simulation-box" style={{ marginBottom: '1rem' }}>
                                <h4>Mô Phỏng Đòn Bẩy Tài Khoản</h4>
                                <div className="sim-row">
                                    <span>Hệ số Sức Khỏe HF:</span>
                                    <strong className={simHealthFactor > 1.5 ? "text-green" : simHealthFactor >= 1.0 ? "text-yellow" : "text-red animate-pulse"}>
                                        {simHealthFactor === Infinity ? '∞' : simHealthFactor.toFixed(2)}
                                    </strong>
                                </div>
                                <div className="sim-row">
                                    <span>Thời gian dữ liệu TTL:</span>
                                    <span className="text-cyan">Tự động gia hạn (+500 Ledgers)</span>
                                </div>
                                <div className="sim-row" style={{ borderTop: '1px solid rgba(0, 242, 254, 0.08)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                                    <span>Phí Gas ước tính (Soroban):</span>
                                    <strong className="text-cyan">~0.000450 XLM</strong>
                                </div>
                                <div className="sim-row">
                                    <span>Soroban CPU Instructions:</span>
                                    <strong className="text-cyan">~2,485,000 instructions</strong>
                                </div>
                            </div>

                            {/* Revert error message */}
                            {isRevert && (
                                <div className="revert-alert" style={{ marginBottom: '1rem' }}>
                                    <AlertTriangle size={18} />
                                    <span>{revertReason}</span>
                                </div>
                            )}

                            {/* Trigger submit */}
                            <button
                                type="submit"
                                disabled={amount <= 0 || isRevert}
                                className="btn btn-block btn-cyan"
                                style={{ boxShadow: '0 0 15px rgba(0, 242, 254, 0.3)', border: '1px solid var(--cyan)' }}
                            >
                                <Zap size={14} />
                                <span>Kích Hoạt Đòn Bẩy 1-Click {leverageFactor.toFixed(1)}x</span>
                            </button>
                        </div>
                    ) : (
                        /* Standard borrow / lend interactions */
                        <>
                            {/* Balance reference */}
                            <div className="form-row-bal">
                                <span className="input-label">{balanceLabel}</span>
                                <span className="input-bal-ref">
                                    {referenceBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {asset}
                                </span>
                            </div>

                            {/* Input field */}
                            <div className="input-container">
                                <input
                                    type="number"
                                    step="any"
                                    placeholder="0.00"
                                    value={amountStr}
                                    onChange={(e) => setAmountStr(e.target.value)}
                                    min="0"
                                />
                                <span className="input-suffix">{asset}</span>
                            </div>

                            {/* Percent shortcuts */}
                            <div className="quick-pct-btns" style={{ marginBottom: action === 'BORROW' ? '0.5rem' : '1rem' }}>
                                <button type="button" onClick={() => handlePercentClick(0.25)} className="btn-pct">25%</button>
                                <button type="button" onClick={() => handlePercentClick(0.5)} className="btn-pct">50%</button>
                                <button type="button" onClick={() => handlePercentClick(0.75)} className="btn-pct">75%</button>
                                <button type="button" onClick={() => handlePercentClick(1.0)} className="btn-pct">MAX</button>
                            </div>

                            {/* Safety presets (Exclusive to Borrow) */}
                            {action === 'BORROW' && (
                                <div className="safety-presets-container">
                                    <span className="preset-title">Mức độ an toàn gợi ý (LTV presets):</span>
                                    <div className="preset-btns-row">
                                        <button
                                            type="button"
                                            onClick={() => handleSafetyPresetClick(30)}
                                            className="btn-preset safe"
                                        >
                                            <span>An Toàn</span>
                                            <span className="preset-pct">30% LTV</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSafetyPresetClick(50)}
                                            className="btn-preset moderate"
                                        >
                                            <span>Thăng Bằng</span>
                                            <span className="preset-pct">50% LTV</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleSafetyPresetClick(65)}
                                            className="btn-preset aggressive"
                                        >
                                            <span>Mạo Hiểm</span>
                                            <span className="preset-pct">65% LTV</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Simulation results box */}
                            <div className="simulation-box">
                                <h4>Mô Phỏng Trạng Thái Vị Thế</h4>
                                <div className="sim-row">
                                    <span>Thế Chấp (Collateral):</span>
                                    <span>
                                        ${initialCollateralValue.toFixed(2)} →{' '}
                                        <strong className="text-cyan">${simCollateralValue.toFixed(2)}</strong>
                                    </span>
                                </div>
                                <div className="sim-row">
                                    <span>Tổng Nợ (Debt):</span>
                                    <span>
                                        ${initialDebtValue.toFixed(2)} →{' '}
                                        <strong className="text-purple">${simDebtValue.toFixed(2)}</strong>
                                    </span>
                                </div>
                                <div className="sim-row">
                                    <span>Tỷ Lệ LTV:</span>
                                    <span>
                                        {initialLtv.toFixed(1)}% →{' '}
                                        <strong className={simLtv > 70 ? 'text-red' : 'text-main'}>
                                            {simLtv.toFixed(1)}%
                                        </strong>
                                    </span>
                                </div>
                                <div className="sim-row">
                                    <span>Chỉ Số Sức Khỏe (HF):</span>
                                    <span>
                                        {initialHealthFactor === Infinity ? '∞' : initialHealthFactor.toFixed(2)} →{' '}
                                        <strong
                                            className={
                                                simHealthFactor === Infinity
                                                    ? 'text-green'
                                                    : simHealthFactor > 1.5
                                                    ? 'text-green'
                                                    : simHealthFactor >= 1.0
                                                    ? 'text-yellow'
                                                    : 'text-red animated-pulse'
                                            }
                                        >
                                            {simHealthFactor === Infinity ? '∞' : simHealthFactor.toFixed(2)}
                                        </strong>
                                    </span>
                                </div>
                                <div className="sim-row" style={{ borderTop: '1px solid rgba(0, 242, 254, 0.08)', paddingTop: '0.4rem', marginTop: '0.4rem' }}>
                                    <span>Phí Gas ước tính (Soroban):</span>
                                    <strong className="text-cyan">~0.000150 XLM</strong>
                                </div>
                                <div className="sim-row">
                                    <span>Soroban CPU Instructions:</span>
                                    <strong className="text-cyan">~842,500 instructions</strong>
                                </div>

                                {/* Dynamic Liquidation Price Alert Box */}
                                {liqInfo.hasRisk && (
                                    <div className={`liq-alert-box ${liqInfo.margin < 15 ? 'danger' : liqInfo.margin < 30 ? 'warning' : 'safe'}`}>
                                        <ShieldAlert size={14} style={{ flexShrink: 0, marginTop: '0.1rem' }} />
                                        <span>{liqInfo.text}</span>
                                    </div>
                                )}
                            </div>

                            {/* Revert Alert Warning */}
                            {isRevert && (
                                <div className="revert-alert">
                                    <AlertTriangle size={18} />
                                    <span>{revertReason}</span>
                                </div>
                            )}

                            {/* Action Button */}
                            <button
                                type="submit"
                                disabled={amount <= 0 || isRevert}
                                className={`btn btn-block ${action === 'SUPPLY' || action === 'WITHDRAW' ? 'btn-cyan' : 'btn-purple'}`}
                            >
                                <span>
                                    {action === 'SUPPLY'
                                        ? `Nạp ${asset}`
                                        : action === 'WITHDRAW'
                                        ? `Rút ${asset}`
                                        : action === 'BORROW'
                                        ? `Vay ${asset}`
                                        : `Trả Nợ ${asset}`}
                                </span>
                            </button>
                        </>
                    )}
                </form>
            </div>
        </div>
    );
};
