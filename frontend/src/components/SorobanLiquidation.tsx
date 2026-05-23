import React, { useState, useEffect } from 'react';
import { Zap, Layers, RefreshCw, Cpu, Activity, CheckCircle } from 'lucide-react';
import type { LiqSandbox, Reserve } from '../types/lending';

interface SorobanLiquidationProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    sandbox: LiqSandbox;
    isRealP2P?: boolean;
    onSlidePrice: (price: number) => void;
    onToggleAutoKeeper: (active: boolean) => void;
    onPrepare: () => void;
    onExecute: () => void;
    onReset: () => void;
}

export const SorobanLiquidation: React.FC<SorobanLiquidationProps> = ({
    reserves,
    sandbox,
    isRealP2P = false,
    onSlidePrice,
    onToggleAutoKeeper,
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

    // Automated keeper routine
    useEffect(() => {
        if (!sandbox.isAutoKeeperActive) return;

        // Step 1: Automatically trigger prepare if undercollateralized and stepActive === 0
        if (isLiquidatable && sandbox.stepActive === 0 && !isPreparing && !isExecuting) {
            const timer = setTimeout(() => {
                handlePrepareClick();
            }, 1000);
            return () => clearTimeout(timer);
        }

        // Step 2: Automatically trigger execute if Step 1 is done and stepActive === 1
        if (sandbox.stepActive === 1 && !isPreparing && !isExecuting) {
            const timer = setTimeout(() => {
                handleExecuteClick();
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [sandbox.isAutoKeeperActive, isLiquidatable, sandbox.stepActive, isPreparing, isExecuting]);

    return (
        <div className="soroban-tab-content active">
            {/* Simulation Banner & Title Area */}
            <div className="liq-sandbox-header">
                <h3>Sandbox Thanh Lý 2 Bước (Soroban CPU Limit Bypasser)</h3>
                <p>
                    Trên blockchain Stellar Soroban, giới hạn CPU cho mỗi giao dịch là <strong>100 triệu Instructions</strong>. 
                    Một giao dịch thanh lý đơn lẻ trong Lending Pool (bao gồm đọc bitmap, tính toán lãi suất, kiểm định oracle, chuyển tiền và thu giữ tài sản thế chấp) có thể vượt quá giới hạn này và bị từ chối.
                </p>
                <p style={{ marginBottom: '1.25rem' }}>
                    UdonFi giải quyết bài toán này bằng cơ chế <strong>Thanh lý 2 bước</strong>: Bước 1 (Prepare) lưu trữ snapshot phiên và khoá tài sản. Bước 2 (Execute) hoàn tất thanh toán. 
                    Hãy thử nghiệm cơ chế này ở bên dưới bằng cách trượt thanh giá XLM để bắt đầu đợt thanh lý!
                </p>
            </div>

            {/* P2P / Sim banner */}
            {isRealP2P ? (
                <div className="p2p-status-banner real-mode" style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 15px rgba(34, 197, 94, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span className="p2p-dot-pulse" style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: '#22c55e',
                            borderRadius: '50%',
                            display: 'inline-block',
                            boxShadow: '0 0 8px #22c55e',
                            animation: 'pulse 1.5s infinite ease-in-out'
                        }}></span>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#22c55e', fontWeight: 700, letterSpacing: '0.5px' }}>
                                ĐANG ĐỒNG BỘ VỊ THẾ THẬT (REAL P2P MODE)
                            </h4>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                                Sandbox đang liên kết trực tiếp với ví của bạn. Việc thanh lý sẽ tất toán khoản nợ thực tế 
                                và khấu trừ XLM thế chấp của bạn trên Dashboard chính!
                            </p>
                        </div>
                    </div>
                    <span className="badge badge-success" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>P2P ACTIVE</span>
                </div>
            ) : (
                <div className="p2p-status-banner sim-mode" style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    marginBottom: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <span style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: 'var(--text-muted)',
                            borderRadius: '50%',
                            display: 'inline-block',
                            opacity: 0.6
                        }}></span>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontWeight: 600 }}>
                                CHẾ ĐỘ GIẢ LẬP MẪU (SIMULATION MODE)
                            </h4>
                            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-dim)', lineHeight: '1.4' }}>
                                Bạn chưa có vị thế nạp/vay thực tế. Sandbox đang chạy trên số dư giả định mẫu. 
                                <strong style={{ color: 'var(--cyan)' }}> Hãy sang tab Thị Trường nạp thế chấp & vay XLM</strong> để bật P2P!
                            </p>
                        </div>
                    </div>
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)', padding: '0.35rem 0.75rem', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>MOCK ACTIVE</span>
                </div>
            )}

            {/* UNIFIED LIQUIDATION STATION CARD (Full Width Wide Dashboard) */}
            <div className="liq-unified-station wide-dashboard">
                
                {/* Station Header */}
                <div className="station-header">
                    <div className="station-title">
                        <Activity className="station-pulse-icon text-cyan" size={18} />
                        <h4>Trạm Vận Hành Thanh Lý Soroban</h4>
                    </div>
                    <span className={`station-status-pill ${isLiquidatable ? 'danger' : 'safe'}`}>
                        {isLiquidatable ? 'VỊ THẾ KHÔNG AN TOÀN' : 'HỆ THỐNG AN TOÀN'}
                    </span>
                </div>

                {/* Station Main Grid */}
                <div className="station-body-grid">
                    
                    {/* Left Pane - Controls & Position HUD */}
                    <div className="station-controls-pane">
                        <h5 className="pane-title">1. Bảng Kiểm Soát Oracle & Vị Thế</h5>
                        
                        {/* Section 1: Position Telemetry HUD */}
                        <div className="station-hud">
                            <div className="hud-metric">
                                <span className="hud-label">Thế Chấp XLM</span>
                                <div className="hud-value-container">
                                    <span className="hud-value">{supplyAmt.toLocaleString()} XLM</span>
                                    <span className="hud-value-sub">${collateralValue.toFixed(2)}</span>
                                </div>
                            </div>
                            
                            <div className="hud-metric">
                                <span className="hud-label">Khoản Vay USDC</span>
                                <div className="hud-value-container">
                                    <span className="hud-value">{debtAmt.toLocaleString()} USDC</span>
                                    <span className="hud-value-sub">${debtValue.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className={`hud-metric hf-metric ${isLiquidatable ? 'danger' : 'safe'}`}>
                                <span className="hud-label">Hệ Số Sức Khoẻ (HF)</span>
                                <div className="hud-value-container">
                                    <span className="hud-value hf-number">
                                        {healthFactor === Infinity ? '∞' : healthFactor.toFixed(3)}
                                    </span>
                                    <span className="hud-value-sub hf-status">
                                        {isLiquidatable ? 'Mất An Toàn' : 'An Toàn'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Interactive Price Manipulator */}
                        <div className="station-slider-box">
                            <div className="slider-header">
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span className="slider-title">Điều Khiển Giá XLM Oracles</span>
                                    <span className="slider-subtitle">Kéo thanh trượt giả lập sụt giảm giá tài sản thế chấp</span>
                                </div>
                                <span className="slider-current-price">${xlmPrice.toFixed(3)}</span>
                            </div>
                            
                            <div className="slider-input-wrapper">
                                <span className="slider-bound">Min ($0.05)</span>
                                <input 
                                    type="range" 
                                    min="0.05" 
                                    max="0.25" 
                                    step="0.005"
                                    value={xlmPrice} 
                                    disabled={sandbox.stepActive > 0}
                                    onChange={(e) => onSlidePrice(parseFloat(e.target.value))}
                                    className="premium-range-slider"
                                />
                                <span className="slider-bound">Max ($0.25)</span>
                            </div>
                        </div>

                        {/* Section 3: Automated Keeper Bot Controller */}
                        <div className={`station-keeper-box ${sandbox.isAutoKeeperActive ? 'active' : ''}`}>
                            <div className="keeper-header">
                                <div className="keeper-info">
                                    <div className="keeper-icon-bg">
                                        <Cpu className={`keeper-icon ${sandbox.isAutoKeeperActive ? 'pulse-purple' : ''}`} size={20} />
                                    </div>
                                    <div className="keeper-text">
                                        <span className="keeper-title">Bot Keeper Off-chain Tự Động</span>
                                        <span className="keeper-desc">Tự động quét Ledger và thực thi 2 bước khi HF dưới 1.0</span>
                                    </div>
                                </div>
                                <label className="web3-switch">
                                    <input 
                                        type="checkbox" 
                                        checked={sandbox.isAutoKeeperActive} 
                                        onChange={(e) => onToggleAutoKeeper(e.target.checked)}
                                    />
                                    <span className="web3-slider"></span>
                                </label>
                            </div>

                            {sandbox.isAutoKeeperActive && (
                                <div className="keeper-telemetry">
                                    <div className="radar-indicator">
                                        <div className="radar-ping-ring"></div>
                                        <div className="radar-ping-ring-2"></div>
                                        <div className="radar-ping-dot"></div>
                                    </div>
                                    <div className="keeper-status-stream">
                                        <span className="keeper-status-title">TRẠNG THÁI KEEPER BOT:</span>
                                        <span className="keeper-status-message">
                                            {isPreparing ? (
                                                <span className="text-purple animate-pulse">🤖 Bot #404: Đang gọi prepare_liquidation() để khóa thế chấp...</span>
                                            ) : isExecuting ? (
                                                <span className="text-purple animate-pulse">🤖 Bot #404: Đang gọi execute_liquidation() tất toán...</span>
                                            ) : isLiquidatable && sandbox.stepActive === 0 ? (
                                                <span className="text-red animate-pulse">⚠️ Phát hiện vị thế mất an toàn! Đang tự động xử lý...</span>
                                            ) : sandbox.stepActive === 2 ? (
                                                <span className="text-green">✅ Vị thế đã được thanh lý. Trạng thái ổn định.</span>
                                            ) : (
                                                <span>Đang quét định kỳ các vị thế trên Stellar Soroban Ledger...</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Reset button at the bottom of the left column */}
                        <div className="station-reset-area">
                            <button 
                                onClick={onReset} 
                                className="premium-reset-btn"
                            >
                                <RefreshCw size={14} />
                                <span>Đặt Lại Sandbox Thử Nghiệm</span>
                            </button>
                            {isRealP2P && (
                                <p className="reset-disclaimer">
                                    * Note: Reset chỉ đặt lại giá XLM về $0.15 và tắt bot. Vị thế thực tế của bạn vẫn giữ nguyên.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right Pane - On-chain WASM Pipeline Stepper */}
                    <div className="station-pipeline-pane">
                        <h5 className="pane-title">2. Tiến Trình Giao Dịch 2 Bước On-chain</h5>
                        
                        <div className="station-stepper-flow">
                            <div className="steps-vertical-container">
                                
                                {/* Step 1 Node */}
                                <div className={`step-node ${isLiquidatable && sandbox.stepActive === 0 ? 'active' : ''} ${sandbox.stepActive > 0 ? 'completed' : ''} ${!isLiquidatable && sandbox.stepActive === 0 ? 'disabled' : ''}`}>
                                    <div className="step-node-left">
                                        <div className="step-node-bubble">
                                            {sandbox.stepActive > 0 ? <CheckCircle size={18} /> : <span>1</span>}
                                        </div>
                                        {/* Flow line to step 2 */}
                                        <div className={`step-flow-line ${sandbox.stepActive >= 1 ? 'glowing' : ''}`}></div>
                                    </div>
                                    <div className="step-node-right">
                                        <div className="step-node-header">
                                            <h5>Bước 1: Chuẩn Bị (prepare_liquidation)</h5>
                                            <span className="cpu-cost">Chi Phí: ~60M CPU</span>
                                        </div>
                                        <p className="step-node-description">
                                            Khóa tài sản thế chấp XLM trên Ledger Stellar và sinh mã Session ID nhằm ngăn chặn race condition.
                                        </p>
                                        
                                        <div className="step-node-action-area">
                                            {isPreparing ? (
                                                <div className="premium-cpu-meter">
                                                    <div className="cpu-meter-header">
                                                        <span>Máy ảo Soroban WASM đang xử lý...</span>
                                                        <span className="cpu-percent">{prepCpuWidth}M / 100M CPU</span>
                                                    </div>
                                                    <div className="premium-progress-bar">
                                                        <div className="premium-progress-fill fill-cyan" style={{ width: `${(prepCpuWidth / 100) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            ) : sandbox.stepActive >= 1 ? (
                                                <div className="premium-session-id">
                                                    <span className="session-label">Session ID Khóa:</span>
                                                    <code className="session-code">{sandbox.sessionId}</code>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={handlePrepareClick} 
                                                    className="premium-step-btn btn-cyan"
                                                    disabled={!isLiquidatable || isPreparing || sandbox.isAutoKeeperActive}
                                                >
                                                    <Zap size={14} />
                                                    <span>Gọi prepare_liquidation()</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Step 2 Node */}
                                <div className={`step-node step-node-two ${sandbox.stepActive === 1 ? 'active' : ''} ${sandbox.stepActive >= 2 ? 'completed' : ''} ${sandbox.stepActive !== 1 ? 'disabled' : ''}`}>
                                    <div className="step-node-left">
                                        <div className="step-node-bubble">
                                            {sandbox.stepActive >= 2 ? <CheckCircle size={18} /> : <span>2</span>}
                                        </div>
                                    </div>
                                    <div className="step-node-right">
                                        <div className="step-node-header">
                                            <h5>Bước 2: Thực Thi (execute_liquidation)</h5>
                                            <span className="cpu-cost">Chi Phí: ~30M CPU</span>
                                        </div>
                                        <p className="step-node-description">
                                            Tịch thu tài sản thế chấp XLM cùng phần thưởng khuyến khích 5% để thanh toán dứt điểm dư nợ USDC.
                                        </p>
                                        
                                        <div className="step-node-action-area">
                                            {isExecuting ? (
                                                <div className="premium-cpu-meter">
                                                    <div className="cpu-meter-header">
                                                        <span>Đang tất toán giao dịch thanh lý...</span>
                                                        <span className="cpu-percent">{execCpuWidth}M / 100M CPU</span>
                                                    </div>
                                                    <div className="premium-progress-bar">
                                                        <div className="premium-progress-fill fill-purple" style={{ width: `${(execCpuWidth / 100) * 100}%` }}></div>
                                                    </div>
                                                </div>
                                            ) : sandbox.stepActive >= 2 ? (
                                                <div className="premium-success-tag">
                                                    <CheckCircle size={14} className="text-green" />
                                                    <span>TẤT TOÁN THANH LÝ HOÀN TẤT THÀNH CÔNG</span>
                                                </div>
                                            ) : (
                                                <button 
                                                    onClick={handleExecuteClick} 
                                                    className="premium-step-btn btn-purple"
                                                    disabled={sandbox.stepActive !== 1 || isExecuting || sandbox.isAutoKeeperActive}
                                                >
                                                    <Layers size={14} />
                                                    <span>Gọi execute_liquidation()</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        {/* Educational / Explanatory footer notes inside right pane */}
                        <div className="pipeline-gas-insights">
                            <span className="insight-title">💡 Phân tích Tối ưu hóa Gas & CPU Soroban:</span>
                            <p className="insight-text">
                                Bằng cách phân tách quy trình làm 2 bước, mỗi giao dịch chỉ tiêu hao tối đa <strong>~60M CPU Instructions</strong> (bước 1) và <strong>~30M CPU Instructions</strong> (bước 2). 
                                Nhờ vậy, UdonFi <strong>không bao giờ bị lỗi quá tải CPU (&gt;100M CPU Limit)</strong> so với việc cố gộp cả hai hoạt động trong một giao dịch đơn lẻ, tăng tính ổn định của pool lên 100%.
                            </p>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
};
