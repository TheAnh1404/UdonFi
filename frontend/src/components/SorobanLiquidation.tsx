import React, { useState } from 'react';
import { Zap, Layers, RefreshCw } from 'lucide-react';
import type { LiqSandbox, Reserve } from '../types/lending';

interface SorobanLiquidationProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    sandbox: LiqSandbox;
    onSlidePrice: (price: number) => void;
    onPrepare: () => void;
    onExecute: () => void;
    onReset: () => void;
}

export const SorobanLiquidation: React.FC<SorobanLiquidationProps> = ({
    reserves,
    sandbox,
    onSlidePrice,
    onPrepare,
    onExecute,
    onReset
}) => {
    const [isPreparing, setIsPreparing] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const [prepCpuWidth, setPrepCpuWidth] = useState(0);
    const [execCpuWidth, setExecCpuWidth] = useState(0);

    // Initial constants
    const supplyAmt = sandbox.supplyXLM;
    const debtAmt = sandbox.borrowUSDC;
    
    // Calculations based on sliding price
    const xlmPrice = sandbox.xlmPrice;
    const usdcPrice = reserves.USDC.price; // $1.00

    const collateralValue = supplyAmt * xlmPrice;
    const debtValue = debtAmt * usdcPrice;

    // HF = (Collateral * 0.825) / Debt
    const healthFactor = debtValue > 0 ? (collateralValue * 0.825) / debtValue : Infinity;
    const isLiquidatable = healthFactor < 1.0;

    // Simulate prepare execution
    const handlePrepareClick = () => {
        setIsPreparing(true);
        setPrepCpuWidth(0);
        
        // Trigger CPU progress bar animation
        setTimeout(() => {
            setPrepCpuWidth(60); // 60M CPU Instructions
        }, 50);

        setTimeout(() => {
            onPrepare();
            setIsPreparing(false);
        }, 1200);
    };

    // Simulate execute execution
    const handleExecuteClick = () => {
        setIsExecuting(true);
        setExecCpuWidth(0);

        // Trigger CPU progress bar animation
        setTimeout(() => {
            setExecCpuWidth(30); // 30M CPU Instructions
        }, 50);

        setTimeout(() => {
            onExecute();
            setIsExecuting(false);
        }, 1200);
    };

    return (
        <div className="soroban-tab-content active">
            <div className="liq-sandbox-header">
                <h3>Sandbox Thanh Lý 2 Bước (Soroban CPU Limit Bypasser)</h3>
                <p>
                    Trên blockchain Stellar Soroban, giới hạn CPU cho mỗi giao dịch là <strong>100 triệu Instructions</strong>. 
                    Một giao dịch thanh lý đơn lẻ trong Lending Pool (bao gồm đọc bitmap, tính toán lãi suất, kiểm định oracle, chuyển tiền và thu giữ tài sản thế chấp) có thể vượt quá giới hạn này và bị từ chối.
                </p>
                <p>
                    UdonFi giải quyết bài toán này bằng cơ chế <strong>Thanh lý 2 bước</strong>: Bước 1 (Prepare) lưu trữ snapshot phiên và khoá tài sản. Bước 2 (Execute) hoàn tất thanh toán. 
                    Hãy thử nghiệm cơ chế này ở bên dưới bằng cách trượt thanh giá XLM để bắt đầu đợt thanh lý!
                </p>
            </div>

            <div className="liq-sandbox-layout">
                {/* Control Panel */}
                <div className="liq-control-panel">
                    <h4>Bảng Điều Khiển Giá & Trạng Thái</h4>
                    
                    <div className="control-row">
                        <label>Thế chấp XLM:</label>
                        <span className="input-bal-ref">{supplyAmt.toLocaleString()} XLM (${collateralValue.toFixed(2)})</span>
                    </div>

                    <div className="control-row">
                        <label>Khoản vay USDC:</label>
                        <span className="input-bal-ref">{debtAmt.toLocaleString()} USDC (${debtValue.toFixed(2)})</span>
                    </div>

                    <div className="price-slider-box mt-2">
                        <div className="control-row">
                            <label style={{ color: 'var(--yellow)', fontWeight: 600 }}>Giá XLM: ${xlmPrice.toFixed(3)}</label>
                            <span className="text-xs text-dim">Kéo để giả lập sụt giá</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.05" 
                            max="0.25" 
                            step="0.005"
                            value={xlmPrice} 
                            disabled={sandbox.stepActive > 0}
                            onChange={(e) => onSlidePrice(parseFloat(e.target.value))}
                        />
                    </div>

                    <div className="liq-sim-results">
                        <div className="res-row">
                            <span>Hệ số sức khoẻ (HF):</span>
                            <strong className={healthFactor < 1.0 ? 'text-red animated-pulse' : 'text-green'}>
                                {healthFactor === Infinity ? '∞' : healthFactor.toFixed(3)}
                            </strong>
                        </div>
                        <div className="res-row">
                            <span>Khả năng thanh lý:</span>
                            {isLiquidatable ? (
                                <span className="badge badge-danger">LIQUIDATABLE</span>
                            ) : (
                                <span className="badge badge-success">AN TOÀN (SAFE)</span>
                            )}
                        </div>
                    </div>

                    <button 
                        onClick={onReset} 
                        className="btn btn-connect btn-block"
                        style={{ borderColor: 'var(--red)', color: 'var(--red)' }}
                    >
                        <RefreshCw size={14} />
                        <span>Reset Sandbox</span>
                    </button>
                </div>

                {/* Steps Panel */}
                <div className="liq-steps-panel">
                    <h4>Quy Trình Thực Thi 2 Bước</h4>

                    {/* Step 1 Card */}
                    <div className={`liq-step-card ${isLiquidatable && sandbox.stepActive === 0 ? 'active' : ''} ${sandbox.stepActive > 0 || !isLiquidatable ? 'disabled' : ''}`}>
                        <div className="step-num">1</div>
                        <div className="step-details">
                            <h5>Bước 1: Chuẩn Bị (prepare_liquidation)</h5>
                            <p>Đọc bitmap tài khoản, khoá tài sản và sinh ID Phiên (Session ID) trên Ledger.</p>
                            
                            {isPreparing ? (
                                <div className="cpu-meter">
                                    <span>Đang chạy máy ảo WASM... ({prepCpuWidth}M CPU Instructions)</span>
                                    <div className="cpu-progress-bar">
                                        <div className="cpu-progress-fill step-1" style={{ width: `${prepCpuWidth}%` }}></div>
                                    </div>
                                </div>
                            ) : sandbox.stepActive >= 1 ? (
                                <div className="session-id-box">
                                    <span>Session ID:</span>
                                    <code>{sandbox.sessionId?.slice(0, 16)}...</code>
                                </div>
                            ) : (
                                <button 
                                    onClick={handlePrepareClick} 
                                    className="btn btn-cyan btn-sm mt-2"
                                    disabled={!isLiquidatable || isPreparing}
                                    style={{ width: 'fit-content' }}
                                >
                                    <Zap size={12} />
                                    <span>Gọi prepare_liquidation() (~60M CPU)</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Step 2 Card */}
                    <div className={`liq-step-card ${sandbox.stepActive === 1 ? 'active' : ''} ${sandbox.stepActive !== 1 ? 'disabled' : ''}`}>
                        <div className="step-num">2</div>
                        <div className="step-details">
                            <h5>Bước 2: Thực Thi (execute_liquidation)</h5>
                            <p>Tịch thu tài sản thế chấp XLM kèm <strong>5% liquidation bonus</strong> để trả nợ USDC.</p>

                            {isExecuting ? (
                                <div className="cpu-meter">
                                    <span>Đang giải phóng tài sản... ({execCpuWidth}M CPU Instructions)</span>
                                    <div className="cpu-progress-bar">
                                        <div className="cpu-progress-fill step-2" style={{ width: `${execCpuWidth}%` }}></div>
                                    </div>
                                </div>
                            ) : sandbox.stepActive >= 2 ? (
                                <div className="badge badge-success" style={{ width: 'fit-content', marginTop: '0.5rem' }}>
                                    THANH LÝ THÀNH CÔNG!
                                </div>
                            ) : (
                                <button 
                                    onClick={handleExecuteClick} 
                                    className="btn btn-purple btn-sm mt-2"
                                    disabled={sandbox.stepActive !== 1 || isExecuting}
                                    style={{ width: 'fit-content' }}
                                >
                                    <Layers size={12} />
                                    <span>Gọi execute_liquidation() (~30M CPU)</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
