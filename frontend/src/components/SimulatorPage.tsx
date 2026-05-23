import React from 'react';
import { SorobanLiquidation } from './SorobanLiquidation';
import { ConsoleLogger } from './ConsoleLogger';
import { Server, ShieldAlert, Cpu, Database, Activity } from 'lucide-react';
import type { LiqSandbox, Reserve, LogLine } from '../types/lending';

interface SimulatorPageProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    sandbox: LiqSandbox;
    isRealP2P: boolean;
    onSlidePrice: (price: number) => void;
    onToggleAutoKeeper: (active: boolean) => void;
    onPrepare: () => void;
    onExecute: () => void;
    onReset: () => void;
    logs: LogLine[];
    onClearLogs: () => void;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({
    reserves,
    sandbox,
    isRealP2P,
    onSlidePrice,
    onToggleAutoKeeper,
    onPrepare,
    onExecute,
    onReset,
    logs,
    onClearLogs
}) => {
    return (
        <div className="simulator-page-container" style={{
            padding: '2rem',
            maxWidth: '1280px',
            margin: '0 auto',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            animation: 'fadeIn 0.5s ease-out'
        }}>
            {/* Header & Status Section */}
            <div className="card glass-card" style={{
                padding: '1.75rem',
                border: '1px solid rgba(0, 242, 254, 0.2)',
                boxShadow: '0 8px 32px rgba(0, 242, 254, 0.05), inset 0 0 20px rgba(0, 242, 254, 0.02)',
                background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.9), rgba(8, 12, 24, 0.95))',
                borderRadius: '16px',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Decorative glow lines */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent, var(--cyan), var(--purple), transparent)'
                }}></div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1.5rem'
                }}>
                    <div style={{ flex: 1, minWidth: '300px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{
                                background: 'rgba(0, 242, 254, 0.1)',
                                border: '1px solid rgba(0, 242, 254, 0.3)',
                                padding: '0.5rem',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--cyan)',
                                boxShadow: '0 0 15px rgba(0,242,254,0.2)'
                            }}>
                                <Server size={24} />
                            </div>
                            <h1 style={{
                                fontSize: '1.4rem',
                                fontWeight: 800,
                                margin: 0,
                                color: 'var(--text-bright)',
                                letterSpacing: '0.03em',
                                textShadow: '0 0 12px rgba(0, 242, 254, 0.3)'
                            }}>
                                SOROBAN EVENT SIMULATOR & KEEPER CENTER
                            </h1>
                        </div>
                        <p style={{
                            fontSize: '0.85rem',
                            color: 'var(--text-dim)',
                            lineHeight: '1.5',
                            margin: 0,
                            maxWidth: '750px'
                        }}>
                            Không gian quản trị và giả lập ngoại tuyến (Sandbox) dành cho nhà phát triển. 
                            Tại đây, bạn có thể mô phỏng các giao dịch nạp, vay và kích hoạt chu trình thanh lý 2 bước 
                            được bảo vệ bởi cơ chế khóa phiên trên Soroban Smart Contract.
                        </p>
                    </div>

                    {/* Network Stats Block */}
                    <div style={{
                        display: 'flex',
                        gap: '1rem',
                        flexWrap: 'wrap'
                    }}>
                        <div className="stat-pill" style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            padding: '0.6rem 1rem',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: '110px'
                        }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>RPC Status</span>
                            <span style={{ fontSize: '0.9rem', color: '#00e676', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00e676', boxShadow: '0 0 8px #00e676' }}></span>
                                ACTIVE
                            </span>
                        </div>
                        <div className="stat-pill" style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            padding: '0.6rem 1rem',
                            borderRadius: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            minWidth: '110px'
                        }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Keeper Bot</span>
                            <span style={{ 
                                fontSize: '0.9rem', 
                                color: sandbox.isAutoKeeperActive ? 'var(--cyan)' : 'var(--text-dim)', 
                                fontWeight: 700, 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.3rem',
                                marginTop: '0.2rem'
                            }}>
                                <span style={{ 
                                    width: '6px', 
                                    height: '6px', 
                                    borderRadius: '50%', 
                                    background: sandbox.isAutoKeeperActive ? 'var(--cyan)' : 'var(--text-muted)',
                                    boxShadow: sandbox.isAutoKeeperActive ? '0 0 8px var(--cyan)' : 'none'
                                }}></span>
                                {sandbox.isAutoKeeperActive ? 'RUNNING' : 'STANDBY'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Info Alert Box */}
                <div style={{
                    marginTop: '1.25rem',
                    background: 'rgba(155, 81, 224, 0.05)',
                    border: '1px solid rgba(155, 81, 224, 0.15)',
                    borderRadius: '8px',
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                }}>
                    <ShieldAlert size={16} color="var(--purple)" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-bright)', lineHeight: '1.4' }}>
                        <strong style={{ color: 'var(--purple)' }}>LƯU Ý KỸ THUẬT:</strong> Hệ thống sử dụng <strong>BroadcastChannel API</strong> để truyền tải các giao dịch thành công sang Tab App UdonFi chính. Hãy mở Tab App chính song song để kiểm nghiệm các Neon Toast Notification thời gian thực ngay khi kích hoạt thanh lý!
                    </span>
                </div>
            </div>

            {/* Renders the Unified Liquidation Station */}
            <SorobanLiquidation 
                reserves={reserves}
                sandbox={sandbox}
                isRealP2P={isRealP2P}
                onSlidePrice={onSlidePrice}
                onToggleAutoKeeper={onToggleAutoKeeper}
                onPrepare={onPrepare}
                onExecute={onExecute}
                onReset={onReset}
            />

            {/* Simulated RPC Node Metrics Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.25rem',
                marginTop: '1rem'
            }}>
                <div className="card glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(0, 242, 254, 0.08)', padding: '0.5rem', borderRadius: '8px', color: 'var(--cyan)' }}>
                        <Cpu size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>CPU Gas Limit / Tx</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)', marginTop: '0.15rem' }}>100,000,000 Instructions</div>
                    </div>
                </div>

                <div className="card glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(155, 81, 224, 0.08)', padding: '0.5rem', borderRadius: '8px', color: 'var(--purple)' }}>
                        <Database size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>State Storage Type</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)', marginTop: '0.15rem' }}>Persistent & Temporary (TTL)</div>
                    </div>
                </div>

                <div className="card glass-card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ background: 'rgba(0, 242, 254, 0.08)', padding: '0.5rem', borderRadius: '8px', color: 'var(--cyan)' }}>
                        <Activity size={20} />
                    </div>
                    <div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Simulated Blocks</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)', marginTop: '0.15rem' }}>~5s Ledger Close Time</div>
                    </div>
                </div>
            </div>

            {/* Simulated RPC Node Terminal Logs */}
            <div style={{ marginTop: '1rem' }}>
                <ConsoleLogger 
                    logs={logs}
                    onClear={onClearLogs}
                />
            </div>
        </div>
    );
};
