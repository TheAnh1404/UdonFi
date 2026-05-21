import React, { useState, useEffect } from 'react';
import { HelpCircle, AlertTriangle, X } from 'lucide-react';
import type { Reserve, UserBalances } from '../types/lending';

type ActionType = 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY';

interface InteractionPanelProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    userBalances: UserBalances;
    activeAction: ActionType;
    activeAsset: 'XLM' | 'USDC';
    onClose: () => void;
    onSubmit: (action: ActionType, asset: 'XLM' | 'USDC', amount: number) => void;
}

export const InteractionPanel: React.FC<InteractionPanelProps> = ({
    reserves,
    userBalances,
    activeAction,
    activeAsset: propAsset,
    onClose,
    onSubmit
}) => {
    const [action, setAction] = useState<ActionType>(activeAction);
    const [asset, setAsset] = useState<'XLM' | 'USDC'>(propAsset);
    const [amountStr, setAmountStr] = useState<string>('');
    const amount = parseFloat(amountStr) || 0;

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

    // Simulation logic
    let simCollateralValue = initialCollateralValue;
    let simDebtValue = initialDebtValue;

    if (amount > 0) {
        if (action === 'SUPPLY') {
            const addedValue = amount * reserve.price;
            // When supplying, let's assume it automatically acts as collateral
            simCollateralValue += addedValue;
        } else if (action === 'WITHDRAW') {
            const removedValue = amount * reserve.price;
            // Subtract from collateral if the asset is used as collateral
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

    const simHealthFactor = simDebtValue > 0 ? (simCollateralValue * 0.825) / simDebtValue : Infinity;
    const simLtv = simCollateralValue > 0 ? (simDebtValue / simCollateralValue) * 100 : 0;

    // Revert warnings
    let isRevert = false;
    let revertReason = '';

    if (amount > referenceBalance && (action === 'SUPPLY' || action === 'WITHDRAW' || action === 'REPAY')) {
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
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (amount <= 0 || isRevert) return;
        onSubmit(action, asset, amount);
        setAmountStr('');
    };

    return (
        <div className={`card glass-card interaction-card ${amount > 0 ? 'active' : ''}`}>
            <div className="card-header">
                <h3>
                    <HelpCircle className="text-cyan" size={18} />
                    <span>Mô Phỏng Giao Dịch Web3</span>
                </h3>
                <button onClick={onClose} className="btn-close" title="Đóng">
                    <X size={18} />
                </button>
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

                {/* Asset selector */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <button
                        onClick={() => setAsset('XLM')}
                        className={`btn-connect btn-sm ${asset === 'XLM' ? 'active-asset' : ''}`}
                        style={{ flex: 1, borderColor: asset === 'XLM' ? 'var(--cyan)' : 'rgba(255,255,255,0.05)' }}
                    >
                        XLM (Stellar)
                    </button>
                    <button
                        onClick={() => setAsset('USDC')}
                        className={`btn-connect btn-sm ${asset === 'USDC' ? 'active-asset' : ''}`}
                        style={{ flex: 1, borderColor: asset === 'USDC' ? 'var(--cyan)' : 'rgba(255,255,255,0.05)' }}
                    >
                        USDC (Stablecoin)
                    </button>
                </div>

                <form className="op-form" onSubmit={handleSubmit}>
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
                    <div className="quick-pct-btns">
                        <button type="button" onClick={() => handlePercentClick(0.25)} className="btn-pct">25%</button>
                        <button type="button" onClick={() => handlePercentClick(0.5)} className="btn-pct">50%</button>
                        <button type="button" onClick={() => handlePercentClick(0.75)} className="btn-pct">75%</button>
                        <button type="button" onClick={() => handlePercentClick(1.0)} className="btn-pct">MAX</button>
                    </div>

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
                </form>
            </div>
        </div>
    );
};
