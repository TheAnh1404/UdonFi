import React, { useState, useEffect } from 'react';

interface LendingModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: 'supply' | 'withdraw' | 'borrow' | 'repay';
  assetSymbol: string;
  walletBalance: number;
  suppliedBalance: number;
  borrowedBalance: number;
  isCollateral: boolean;
  assetPrice: number;
  ltv: number;
  borrowCapacityUsd: number;
  totalBorrowedUsd: number;
  onSubmit: (action: 'supply' | 'withdraw' | 'borrow' | 'repay', assetSymbol: string, amount: number) => Promise<void>;
  loading: boolean;
}

export const LendingModal: React.FC<LendingModalProps> = ({
  isOpen,
  onClose,
  actionType,
  assetSymbol,
  walletBalance,
  suppliedBalance,
  borrowedBalance,
  isCollateral,
  assetPrice,
  ltv,
  borrowCapacityUsd,
  totalBorrowedUsd,
  onSubmit,
  loading,
}) => {
  const [inputVal, setInputVal] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset inputs when modal opens
  useEffect(() => {
    setInputVal('');
    setErrorMsg(null);
  }, [isOpen, actionType, assetSymbol]);

  if (!isOpen) return null;

  const parsedInput = parseFloat(inputVal) || 0;

  // Determine limits based on action
  let maxAmount = 0;
  if (actionType === 'supply') {
    maxAmount = walletBalance;
  } else if (actionType === 'withdraw') {
    maxAmount = suppliedBalance;
  } else if (actionType === 'borrow') {
    // Max borrow capacity in asset terms
    const availableBorrowUsd = Math.max(0, borrowCapacityUsd - totalBorrowedUsd);
    maxAmount = availableBorrowUsd / assetPrice;
  } else if (actionType === 'repay') {
    maxAmount = Math.min(walletBalance, borrowedBalance);
  }

  // Pre-calculate percentage triggers
  const handlePercentClick = (percent: number) => {
    const val = (maxAmount * percent).toFixed(4);
    setInputVal(parseFloat(val).toString());
    validate(parseFloat(val));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setInputVal(val);
      validate(parseFloat(val) || 0);
    }
  };

  const validate = (val: number) => {
    if (val <= 0) {
      setErrorMsg(null);
      return;
    }
    if (val > maxAmount) {
      if (actionType === 'supply') {
        setErrorMsg('Vượt quá số dư ví khả dụng của bạn!');
      } else if (actionType === 'withdraw') {
        setErrorMsg('Vượt quá số dư bạn đã cung cấp!');
      } else if (actionType === 'borrow') {
        setErrorMsg('Vượt quá giới hạn vay an toàn của bạn!');
      } else if (actionType === 'repay') {
        setErrorMsg('Vượt quá số tiền nợ hoặc số dư ví!');
      }
      return;
    }

    // Safety checks for health factor impacts
    if (actionType === 'withdraw' && isCollateral && totalBorrowedUsd > 0) {
      const inputUsd = val * assetPrice;
      const reductionInBorrowCapacity = inputUsd * ltv;
      const newBorrowCapacity = Math.max(0, borrowCapacityUsd - reductionInBorrowCapacity);
      if (newBorrowCapacity <= totalBorrowedUsd) {
        setErrorMsg('❌ Rút số lượng này sẽ đẩy tài khoản của bạn vào trạng thái thanh lý ngay lập tức! (Health Factor < 1.0)');
        return;
      }
    }

    if (actionType === 'borrow') {
      const inputUsd = val * assetPrice;
      const newTotalBorrowed = totalBorrowedUsd + inputUsd;
      if (newTotalBorrowed > borrowCapacityUsd) {
        setErrorMsg('❌ Vay số lượng này sẽ vượt quá giới hạn thế chấp tối đa của bạn!');
        return;
      }
      const newHealth = borrowCapacityUsd / newTotalBorrowed;
      if (newHealth < 1.05) {
        setErrorMsg('⚠️ Cảnh báo: Khoản vay này sẽ đưa Health Factor về mức rủi ro rất cao (< 1.05)!');
        return;
      }
    }

    setErrorMsg(null);
  };

  // Math simulations for previews
  const getSimulatedMetrics = () => {
    let newBorrowCapacity = borrowCapacityUsd;
    let newTotalBorrowed = totalBorrowedUsd;

    const inputUsd = parsedInput * assetPrice;

    if (actionType === 'supply' && isCollateral) {
      newBorrowCapacity = borrowCapacityUsd + (inputUsd * ltv);
    } else if (actionType === 'withdraw' && isCollateral) {
      newBorrowCapacity = Math.max(0, borrowCapacityUsd - (inputUsd * ltv));
    } else if (actionType === 'borrow') {
      newTotalBorrowed = totalBorrowedUsd + inputUsd;
    } else if (actionType === 'repay') {
      newTotalBorrowed = Math.max(0, totalBorrowedUsd - inputUsd);
    }

    const currentHealth = totalBorrowedUsd > 0 ? (borrowCapacityUsd / totalBorrowedUsd) : Infinity;
    const newHealth = newTotalBorrowed > 0 ? (newBorrowCapacity / newTotalBorrowed) : Infinity;

    return {
      currentHealth: currentHealth === Infinity ? '∞' : currentHealth.toFixed(2),
      newHealth: newHealth === Infinity ? '∞' : newHealth.toFixed(2),
      currentCapacity: borrowCapacityUsd,
      newCapacity: newBorrowCapacity,
      newTotalBorrowed
    };
  };

  const metrics = getSimulatedMetrics();

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedInput <= 0 || errorMsg?.startsWith('❌')) return;
    onSubmit(actionType, assetSymbol, parsedInput);
  };

  const getActionTitle = () => {
    switch (actionType) {
      case 'supply': return 'Cung cấp';
      case 'withdraw': return 'Rút tiền';
      case 'borrow': return 'Vay';
      case 'repay': return 'Trả nợ';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {getActionTitle()} {assetSymbol}
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleFormSubmit}>
          <div className="modal-body">
            
            {/* Input field */}
            <div className="modal-input-container">
              <div className="modal-input-row">
                <span className="modal-input-label">Số lượng {getActionTitle().toLowerCase()}</span>
                <span className="modal-input-balance" onClick={() => handlePercentClick(1.0)}>
                  Khả dụng: {maxAmount.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} {assetSymbol}
                </span>
              </div>
              <div className="modal-input-fields">
                <input
                  type="text"
                  className="modal-input-val"
                  value={inputVal}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  disabled={loading}
                  autoFocus
                />
                <span className="modal-input-asset-tag">
                  {assetSymbol}
                </span>
              </div>

              {/* Preset percents */}
              <div className="modal-percent-row">
                <button type="button" className="btn-percent" onClick={() => handlePercentClick(0.25)} disabled={loading}>25%</button>
                <button type="button" className="btn-percent" onClick={() => handlePercentClick(0.50)} disabled={loading}>50%</button>
                <button type="button" className="btn-percent" onClick={() => handlePercentClick(0.75)} disabled={loading}>75%</button>
                <button type="button" className="btn-percent" onClick={() => handlePercentClick(1.00)} disabled={loading}>MAX</button>
              </div>
            </div>

            {/* Error / Warnings panel */}
            {errorMsg && (
              <div className="modal-warning-panel">
                <span>{errorMsg.startsWith('❌') ? '🛑' : '⚠️'}</span>
                <div>{errorMsg}</div>
              </div>
            )}

            {/* Simulation breakdown */}
            <div className="modal-info-box">
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>
                📊 Phân tích giao dịch dự kiến:
              </h4>

              {/* Supply APY */}
              <div className="modal-info-row">
                <span className="modal-info-lbl">Lợi nhuận áp dụng (APY)</span>
                <span className="modal-info-val" style={{ color: actionType === 'borrow' ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {actionType === 'borrow' 
                    ? `⚡ ${(assetSymbol === 'XLM' ? 5.5 : assetSymbol === 'USDC' ? 8.4 : assetSymbol === 'EURC' ? 7.9 : assetSymbol === 'USDT' ? 8.8 : 6.2).toFixed(2)}% APY`
                    : `📈 ${(assetSymbol === 'XLM' ? 3.5 : assetSymbol === 'USDC' ? 6.2 : assetSymbol === 'EURC' ? 5.8 : assetSymbol === 'USDT' ? 6.5 : 4.1).toFixed(2)}% APY`
                  }
                </span>
              </div>

              {/* Health Factor preview */}
              <div className="modal-info-row">
                <span className="modal-info-lbl">Chỉ số Sức khỏe (Health Factor)</span>
                <div className="modal-info-val-change">
                  <span className="modal-info-val">{metrics.currentHealth}</span>
                  {parsedInput > 0 && (
                    <>
                      <span className="modal-info-arrow">→</span>
                      <span 
                        className={`modal-info-val ${
                          metrics.newHealth === '∞' || parseFloat(metrics.newHealth) > 1.5 
                            ? 'success' 
                            : parseFloat(metrics.newHealth) > 1.1 
                              ? 'warning' 
                              : 'error'
                        }`}
                      >
                        {metrics.newHealth}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Borrow capacity preview */}
              <div className="modal-info-row">
                <span className="modal-info-lbl">Hạn mức vay khả dụng</span>
                <div className="modal-info-val-change">
                  <span className="modal-info-val">${metrics.currentCapacity.toFixed(2)}</span>
                  {parsedInput > 0 && (
                    <>
                      <span className="modal-info-arrow">→</span>
                      <span className="modal-info-val" style={{ color: metrics.newCapacity >= metrics.currentCapacity ? 'var(--color-success)' : 'var(--color-warning)' }}>
                        ${metrics.newCapacity.toFixed(2)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <button
              type="submit"
              className="btn-action-full"
              disabled={loading || parsedInput <= 0 || (errorMsg !== null && errorMsg.startsWith('❌'))}
            >
              {loading ? (
                <>
                  <span className="btn-spinner" />
                  <span>Đang xử lý trên blockchain...</span>
                </>
              ) : (
                <span>Xác nhận ký {getActionTitle().toLowerCase()}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
