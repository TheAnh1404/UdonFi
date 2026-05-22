import React, { useState, useEffect } from 'react';
import { Zap, Layers, RefreshCw, Cpu, Activity } from 'lucide-react';
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

            {isRealP2P ? (
                <div className="p2p-status-banner real-mode" style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(34, 197, 94, 0.02) 100%)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: '0 0 15px rgba(34, 197, 94, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span className="p2p-dot-pulse" style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#22c55e',
                            borderRadius: '50%',
                            display: 'inline-block',
                            boxShadow: '0 0 8px #22c55e',
                            animation: 'pulse 1.5s infinite ease-in-out'
                        }}></span>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#22c55e', fontWeight: 700, letterSpacing: '0.5px' }}>
                                ĐANG ĐỒNG BỘ VỊ THẾ THẬT (REAL P2P MODE)
                            </h4>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.3' }}>
                                Sandbox đang liên kết trực tiếp với ví của bạn. Việc thanh lý sẽ tất toán khoản nợ thực tế 
                                và khấu trừ XLM thế chấp của bạn trên Dashboard chính!
                            </p>
                        </div>
                    </div>
                    <span className="badge badge-success" style={{ padding: '0.3rem 0.6rem', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>P2P ACTIVE</span>
                </div>
            ) : (
                <div className="p2p-status-banner sim-mode" style={{
                    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '1rem',
                    marginBottom: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                            width: '10px',
                            height: '10px',
                            backgroundColor: 'var(--text-muted)',
                            borderRadius: '50%',
                            display: 'inline-block',
                            opacity: 0.6
                        }}></span>
                        <div>
                            <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>
                                CHẾ ĐỘ GIẢ LẬP MẪU (SIMULATION MODE)
                            </h4>
                            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-dim)', lineHeight: '1.3' }}>
                                Bạn chưa có vị thế nạp/vay thực tế. Sandbox đang chạy trên số dư giả định mẫu. 
                                <strong style={{ color: 'var(--cyan)' }}> Hãy sang tab Thị Trường nạp thế chấp & vay USDC</strong> để bật P2P!
                            </p>
                        </div>
                    </div>
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.1)', color: 'var(--text-muted)', padding: '0.3rem 0.6rem', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>MOCK ACTIVE</span>
                </div>
            )}

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

                    {/* Automated Keeper Bot Controller */}
                    <div className="keeper-bot-box mt-3" style={{
                        background: 'rgba(168, 85, 247, 0.04)',
                        border: '1px solid rgba(168, 85, 247, 0.2)',
                        borderRadius: '12px',
                        padding: '1rem',
                        marginBottom: '1rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Cpu className={sandbox.isAutoKeeperActive ? "text-purple animate-pulse" : "text-dim"} size={16} />
                                <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>
                                    Bot Keeper Tự Động
                                </span>
                            </div>
                            <label className="switch">
                                <input 
                                    type="checkbox" 
                                    checked={sandbox.isAutoKeeperActive} 
                                    onChange={(e) => onToggleAutoKeeper(e.target.checked)}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.5rem', lineHeight: '1.3' }}>
                            Tự động quét Ledger và thực thi 2 bước thanh lý khi Hệ số Sức khoẻ giảm xuống dưới 1.0.
                        </p>
                        
                        {sandbox.isAutoKeeperActive && (
                            <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                marginTop: '0.75rem', 
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                background: 'rgba(168, 85, 247, 0.1)',
                                border: '1px solid rgba(168, 85, 247, 0.3)'
                            }}>
                                <Activity className="text-purple animate-pulse" size={12} style={{ animationDuration: '1s' }} />
                                <span className="text-purple" style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.5px' }}>
                                    {isPreparing ? 'BOT KEEPER: ĐANG CHUẨN BỊ...' : isExecuting ? 'BOT KEEPER: ĐANG THỰC THI...' : isLiquidatable && sandbox.stepActive === 0 ? 'PHÁT HIỆN SỰ CỐ! ĐANG THANH LÝ...' : 'RADAR: ĐANG QUÉT LEDGER...'}
                                </span>
                            </div>
                        )}
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
                    {isRealP2P && (
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '0.6rem', lineHeight: '1.3', opacity: 0.8 }}>
                            * Lưu ý: Nút Reset chỉ đặt lại giá XLM về $0.15 và tắt bot. Vị thế thực tế của bạn vẫn được bảo toàn.
                        </p>
                    )}
                </div>

                {/* Steps Panel */}
                <div className="liq-steps-panel">
                    <h4>Quy Trình Thực Thi 2 Bước</h4>

                    {/* Bot Scanning Radar Card */}
                    {sandbox.isAutoKeeperActive && (
                        <div className="bot-scanning-card" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            background: 'rgba(168, 85, 247, 0.02)',
                            border: '1px solid rgba(168, 85, 247, 0.1)',
                            borderRadius: '12px',
                            padding: '0.85rem 1rem',
                            marginBottom: '1rem',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div className="radar-ping-container">
                                <div className="radar-ping-ring"></div>
                                <div className="radar-ping-ring-2"></div>
                                <div className="radar-ping-dot"></div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--purple)' }}>
                                        Mạng Lưới Keeper Off-chain (Keeper Bot Network)
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                        Chu kỳ quét: 1.0s
                                    </span>
                                </div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.2rem' }}>
                                    {isPreparing ? (
                                        <span className="text-purple animate-pulse">🤖 Bot #404: Đang gọi prepare_liquidation() để khoá thế chấp...</span>
                                    ) : isExecuting ? (
                                        <span className="text-purple animate-pulse">🤖 Bot #404: Đang gọi execute_liquidation() để thu hồi tài sản...</span>
                                    ) : isLiquidatable && sandbox.stepActive === 0 ? (
                                        <span className="text-red animate-pulse">⚠️ Phát hiện vị thế mất an toàn (HF &lt; 1.0). Đang tự động xử lý...</span>
                                    ) : sandbox.stepActive === 2 ? (
                                        <span className="text-green">✅ Vị thế đã được thanh lý sạch sẽ. Trạng thái tài khoản ổn định.</span>
                                    ) : (
                                        <span>Đang quét định kỳ các vị thế trên Stellar Soroban Ledger...</span>
                                    )}
                                </span>
                            </div>
                        </div>
                    )}

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
                                    disabled={!isLiquidatable || isPreparing || sandbox.isAutoKeeperActive}
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
                                    disabled={sandbox.stepActive !== 1 || isExecuting || sandbox.isAutoKeeperActive}
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
;
