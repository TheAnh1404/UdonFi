import React, { useState, useEffect } from 'react';
import {
    Copy,
    Check,
    Activity,
    TrendingUp,
    Cpu,
    History,
    ShieldAlert,
    RefreshCw,
    Zap,
    Search,
    List,
    Grid,
    ChevronLeft,
    ChevronRight,
    ExternalLink
} from 'lucide-react';
import type { Web3Tx, Reserve } from '../types/lending';

// ── Shared helpers ──────────────────────────────────────────
type TxFilterType = 'ALL' | 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LIQ';

interface TxMeta {
    actionColor: string;
    actionLabel: string;
    IconComp: React.ElementType;
    sign: string;
    glowClass: string;
}

const getTxMeta = (type: Web3Tx['type']): TxMeta => {
    switch (type) {
        case 'SUPPLY':
            return { actionColor: 'var(--green)', actionLabel: 'SUPPLY', IconComp: TrendingUp, sign: '+', glowClass: 'glow-text-green' };
        case 'WITHDRAW':
            return { actionColor: 'var(--cyan)', actionLabel: 'WITHDRAW', IconComp: Activity, sign: '-', glowClass: 'glow-text-cyan' };
        case 'BORROW':
            return { actionColor: 'var(--purple)', actionLabel: 'BORROW', IconComp: Zap, sign: '-', glowClass: 'glow-text-purple' };
        case 'REPAY':
            return { actionColor: 'var(--yellow)', actionLabel: 'REPAY', IconComp: RefreshCw, sign: '+', glowClass: 'glow-text-yellow' };
        case 'LIQUIDATION_PREPARE':
            return { actionColor: 'var(--red)', actionLabel: 'LIQ_PREP', IconComp: ShieldAlert, sign: '+', glowClass: 'glow-text-orange' };
        case 'LIQUIDATION_EXECUTE':
            return { actionColor: 'var(--red)', actionLabel: 'LIQ_EXEC', IconComp: ShieldAlert, sign: '+', glowClass: 'glow-text-red' };
        default:
            return { actionColor: 'var(--text-main)', actionLabel: type, IconComp: History, sign: '+', glowClass: 'glow-text-cyan' };
    }
};

// ── Filter pills config ─────────────────────────────────────
const FILTER_PILLS: { id: TxFilterType; label: string; color: string; bg: string }[] = [
    { id: 'ALL', label: 'TẤT CẢ', color: 'var(--text-bright)', bg: 'rgba(255,255,255,0.05)' },
    { id: 'SUPPLY', label: 'SUPPLY', color: 'var(--green)', bg: 'rgba(0, 230, 118, 0.08)' },
    { id: 'WITHDRAW', label: 'WITHDRAW', color: 'var(--cyan)', bg: 'rgba(0, 242, 254, 0.08)' },
    { id: 'BORROW', label: 'BORROW', color: 'var(--purple)', bg: 'rgba(155, 81, 224, 0.08)' },
    { id: 'REPAY', label: 'REPAY', color: 'var(--yellow)', bg: 'rgba(255, 214, 0, 0.08)' },
    { id: 'LIQ', label: 'LIQUIDATION', color: 'var(--red)', bg: 'rgba(255, 23, 68, 0.08)' },
];

// ── Embedded CSS ────────────────────────────────────────────
const LEDGER_CSS = `
.custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.01); border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0,242,254,0.4); box-shadow: 0 0 8px rgba(0,242,254,0.5); }

.stream-timeline-row { position: relative; transition: all 0.25s cubic-bezier(0.4,0,0.2,1); border: 1px solid transparent; }
.stream-timeline-row:hover { background: rgba(0,242,254,0.03) !important; border-color: rgba(0,242,254,0.12) !important; transform: translateX(3px); box-shadow: -4px 0 15px rgba(0,242,254,0.05); }
.stream-timeline-row::before { content: ''; position: absolute; left: 23px; top: 0; bottom: 0; width: 1px; background: rgba(255,255,255,0.05); z-index: 1; }
.stream-timeline-row:first-of-type::before { top: 50%; }
.stream-timeline-row:last-of-type::before { bottom: 50%; }

.chip-interactive { transition: all 0.2s ease; }
.chip-interactive:hover { background: rgba(255,255,255,0.06) !important; border-color: rgba(255,255,255,0.12) !important; color: var(--text-bright) !important; }

.search-input-glow:focus { border-color: rgba(0,242,254,0.4) !important; box-shadow: 0 0 10px rgba(0,242,254,0.15) !important; outline: none; }

.dense-row { transition: all 0.18s ease; border-bottom: 1px solid rgba(255,255,255,0.02); }
.dense-row:hover { background: rgba(0,242,254,0.02) !important; }

.hud-card { transition: all 0.2s ease; border: 1px solid rgba(255,255,255,0.03); }
.hud-card:hover { background: rgba(255,255,255,0.02) !important; border-color: rgba(255,255,255,0.08) !important; }

.glow-text-green { text-shadow: 0 0 8px rgba(0,230,118,0.4); }
.glow-text-cyan { text-shadow: 0 0 8px rgba(0,242,254,0.4); }
.glow-text-purple { text-shadow: 0 0 8px rgba(155,81,224,0.4); }
.glow-text-yellow { text-shadow: 0 0 8px rgba(255,214,0,0.4); }
.glow-text-red { text-shadow: 0 0 8px rgba(255,23,68,0.4); }
.glow-text-orange { text-shadow: 0 0 8px rgba(255,87,34,0.4); }

@keyframes fadeInSlide { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
@keyframes heartbeat { 0% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.2); opacity: 1; } 100% { transform: scale(1); opacity: 0.5; } }
.heartbeat-dot { animation: heartbeat 2s infinite ease-in-out; }
`;

// ── Sub-components ──────────────────────────────────────────

/** Compact telemetry HUD bar */
const TelemetryHud: React.FC<{
    volume: number;
    cpuUsed: number;
    successCount: number;
    currentPage: number;
}> = ({ volume, cpuUsed, successCount, currentPage }) => (
    <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '0.75rem',
        padding: '0.65rem 1.5rem',
        background: 'rgba(4, 6, 12, 0.6)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        backdropFilter: 'blur(8px)'
    }}>
        <div className="hud-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(0,0,0,0.15)', padding: '0.45rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Dòng Tiền Trang</span>
            <span style={{ color: 'var(--cyan)', fontWeight: 800, fontSize: '0.95rem', fontFamily: 'monospace' }} className="glow-text-cyan">
                ${volume.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
        </div>
        <div className="hud-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(0,0,0,0.15)', padding: '0.45rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Soroban Gas</span>
            <span style={{ color: '#ffb74d', fontWeight: 800, fontSize: '0.95rem', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="glow-text-orange">
                <Cpu size={13} style={{ color: '#ffb74d' }} />
                {(cpuUsed / 1000000).toFixed(2)}M CPU
            </span>
        </div>
        <div className="hud-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', background: 'rgba(0,0,0,0.15)', padding: '0.45rem 0.75rem', borderRadius: '8px' }}>
            <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Trạng Thái Lệnh</span>
            <span style={{ color: 'var(--green)', fontWeight: 800, fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} className="glow-text-green">
                <span style={{ width: '6px', height: '6px', background: 'var(--green)', borderRadius: '50%', display: 'inline-block', boxShadow: '0 0 6px var(--green)' }} />
                {successCount} OK / P.{currentPage}
            </span>
        </div>
    </div>
);

/** Detailed timeline row */
const DetailedRow: React.FC<{
    tx: Web3Tx;
    isExpanded: boolean;
    onToggle: () => void;
    copiedTxId: string | null;
    onCopy: (text: string, id: string) => void;
}> = ({ tx, isExpanded, onToggle, copiedTxId, onCopy }) => {
    const { actionColor, actionLabel, IconComp, sign, glowClass } = getTxMeta(tx.type);

    return (
        <div key={tx.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div
                onClick={onToggle}
                style={{
                    background: isExpanded
                        ? 'linear-gradient(90deg, rgba(20, 28, 52, 0.45) 0%, rgba(12, 17, 34, 0.6) 100%)'
                        : 'rgba(255, 255, 255, 0.01)',
                    borderRadius: '8px',
                    padding: '0.6rem 1rem',
                    height: '56px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    zIndex: 2,
                    border: '1px solid rgba(255, 255, 255, 0.02)'
                }}
                className="stream-timeline-row"
            >
                {/* Left: Action Node */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', zIndex: 3 }}>
                    <div style={{
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: 'rgba(5, 7, 15, 0.8)',
                        border: `2px solid ${actionColor}`,
                        boxShadow: `0 0 8px ${actionColor}50`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: actionColor, flexShrink: 0
                    }}>
                        <IconComp size={13} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: actionColor, letterSpacing: '0.3px' }}>{actionLabel}</span>
                            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)', color: 'var(--text-muted)', padding: '0.05rem 0.3rem', borderRadius: '4px', fontFamily: 'monospace' }}>
                                #{tx.ledger}
                            </span>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block', marginTop: '0.1rem' }}>
                            ⏱ {tx.timestamp}
                        </span>
                    </div>
                </div>

                {/* Middle: Address, Hash, and CPU chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.2rem 0.55rem', borderRadius: '6px', fontFamily: 'monospace' }}>
                        Ví: <span style={{ color: 'var(--text-bright)' }}>{tx.account.slice(0, 6)}...{tx.account.slice(-6)}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.2rem 0.55rem', borderRadius: '6px', fontFamily: 'monospace' }}>
                        Tx Hash: <a href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }} className="chip-interactive">{tx.hash.slice(0, 8)}...{tx.hash.slice(-8)}</a>
                    </div>
                    {tx.cpuInstructions && (
                        <div style={{ background: 'rgba(255,183,77,0.03)', border: '1px solid rgba(255,183,77,0.15)', padding: '0.2rem 0.55rem', borderRadius: '6px', fontFamily: 'monospace', color: '#ffb74d', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Cpu size={11} />
                            <span>{(tx.cpuInstructions / 1000000).toFixed(1)}M CPU</span>
                        </div>
                    )}
                </div>

                {/* Right: Amount */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: '120px', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 900, color: actionColor, fontFamily: 'monospace', textAlign: 'right' }} className={glowClass}>
                        {sign}{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-main)', marginLeft: '0.2rem' }}>{tx.asset}</span>
                    </div>
                    <div style={{ color: 'var(--text-dim)', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease', display: 'flex', alignItems: 'center' }}>
                        <ChevronRight size={14} />
                    </div>
                </div>
            </div>

            {/* Expanded Drawer */}
            {isExpanded && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                        background: 'linear-gradient(135deg, rgba(8, 12, 24, 0.92) 0%, rgba(12, 17, 34, 0.97) 100%)',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        margin: '0.3rem 0.3rem 0.5rem 2rem',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '1rem',
                        animation: 'fadeInSlide 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                        boxShadow: 'inset 0 0 20px rgba(0,0,0,0.6)',
                        position: 'relative'
                    }}
                >
                    {/* Left column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Địa Chỉ Ví Nguồn</span>
                            <div
                                onClick={() => onCopy(tx.account, tx.id + '-acc')}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-bright)', fontFamily: 'monospace' }}
                                className="chip-interactive"
                                title="Sao chép địa chỉ ví"
                            >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.account}</span>
                                {copiedTxId === tx.id + '-acc' ? <Check size={12} style={{ color: 'var(--green)' }} /> : <Copy size={12} />}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mã Giao Dịch (Tx Hash)</span>
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                                <div
                                    onClick={() => onCopy(tx.hash, tx.id + '-hash')}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.35rem 0.6rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-bright)', fontFamily: 'monospace', flex: 1 }}
                                    className="chip-interactive"
                                    title="Sao chép Tx Hash"
                                >
                                    <span>
                                        {tx.hash.slice(0, 12)}...{tx.hash.slice(-12)}
                                    </span>
                                    {copiedTxId === tx.id + '-hash' ? <Check size={12} style={{ color: 'var(--green)' }} /> : <Copy size={12} />}
                                </div>
                                <a
                                    href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Xem trên StellarExpert Explorer"
                                    style={{ background: 'rgba(0,242,254,0.06)', border: '1px solid rgba(0,242,254,0.25)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.6rem', color: 'var(--cyan)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                                    className="chip-interactive"
                                >
                                    <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', padding: '0.35rem 0.6rem', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Trạng Thái Soroban</span>
                                <span style={{ fontSize: '0.82rem', color: 'var(--green)', fontWeight: 800 }}>VALIDATED ENGINE (OK)</span>
                            </div>
                            <span className="heartbeat-dot" style={{ width: '6px', height: '6px', background: 'var(--green)', borderRadius: '50%', boxShadow: '0 0 8px var(--green)' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                <span>Soroban CPU Core</span>
                                {tx.cpuInstructions && (
                                    <span style={{ color: '#ffb74d', fontWeight: 600 }}>{((tx.cpuInstructions / 100000000) * 100).toFixed(2)}% Limit</span>
                                )}
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '0.35rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    <Cpu size={12} style={{ color: '#ffb74d' }} />
                                    <span style={{ fontSize: '0.82rem', fontFamily: 'monospace', fontWeight: 800, color: '#ffb74d' }}>
                                        {tx.cpuInstructions ? tx.cpuInstructions.toLocaleString() : '—'} Instructions
                                    </span>
                                </div>
                                {tx.cpuInstructions && (
                                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${Math.min(100, (tx.cpuInstructions / 100000000) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #ffb74d, #ffa726)', borderRadius: '4px' }} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/** Dense table row */
const DenseRow: React.FC<{
    tx: Web3Tx;
    isExpanded: boolean;
    onToggle: () => void;
    copiedTxId: string | null;
    onCopy: (text: string, id: string) => void;
}> = ({ tx, isExpanded, onToggle, copiedTxId, onCopy }) => {
    const { actionColor, actionLabel, IconComp, sign } = getTxMeta(tx.type);

    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
                onClick={onToggle}
                className="dense-row"
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 0.7fr 1.2fr 1.5fr 1.5fr 1fr 1fr 1.2fr',
                    padding: '0.55rem 0.6rem',
                    fontSize: '0.82rem',
                    alignItems: 'center',
                    cursor: 'pointer',
                    background: isExpanded ? 'rgba(0, 242, 254, 0.03)' : 'transparent',
                    borderLeft: isExpanded ? `3px solid ${actionColor}` : '3px solid transparent',
                    paddingLeft: isExpanded ? 'calc(0.6rem - 3px)' : '0.6rem',
                    transition: 'all 0.15s ease'
                }}
            >
                <span style={{ fontWeight: 800, color: actionColor, letterSpacing: '0.02em', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <IconComp size={11} style={{ opacity: 0.8 }} />{actionLabel}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.8rem' }}>{tx.asset}</span>
                <span style={{ textAlign: 'right', fontWeight: 800, fontFamily: 'monospace', color: actionColor, paddingRight: '0.5rem' }}>
                    {sign}{tx.amount.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                </span>
                <span style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    {tx.account.slice(0, 4)}...{tx.account.slice(-4)}
                </span>
                <span style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    <a href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--cyan)', textDecoration: 'none' }} className="chip-interactive">{tx.hash.slice(0, 5)}...{tx.hash.slice(-5)}</a>
                </span>
                <span style={{ textAlign: 'center', fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{tx.ledger}</span>
                <span style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.78rem' }}>{tx.timestamp}</span>
                <span style={{ textAlign: 'right', fontFamily: 'monospace', color: '#ffb74d', fontSize: '0.8rem' }}>
                    {tx.cpuInstructions ? `${(tx.cpuInstructions / 1000000).toFixed(1)}M` : '—'}
                </span>
            </div>

            {/* Expanded inline detail */}
            {isExpanded && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        background: 'rgba(5, 7, 15, 0.45)',
                        borderLeft: `3px solid ${actionColor}`,
                        padding: '0.65rem 1rem',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        animation: 'fadeInSlide 0.15s ease forwards'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Ví:</span>
                        <span
                            onClick={() => onCopy(tx.account, tx.id + '-acc')}
                            style={{ fontFamily: 'monospace', color: 'var(--text-bright)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                            className="chip-interactive"
                            title="Sao chép ví"
                        >
                            {tx.account}
                            {copiedTxId === tx.id + '-acc' ? <Check size={10} style={{ color: 'var(--green)' }} /> : <Copy size={10} />}
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Tx:</span>
                        <span
                            onClick={() => onCopy(tx.hash, tx.id + '-hash')}
                            style={{ fontFamily: 'monospace', color: 'var(--text-bright)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2,rem' }}
                            className="chip-interactive"
                            title="Sao chép Tx Hash"
                        >
                            {tx.hash.slice(0, 20)}...
                            {copiedTxId === tx.id + '-hash' ? <Check size={10} style={{ color: 'var(--green)' }} /> : <Copy size={10} />}
                        </span>
                        <a
                            href={`https://stellar.expert/explorer/testnet/tx/${tx.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--cyan)', display: 'flex', alignItems: 'center' }}
                        >
                            <ExternalLink size={10} />
                        </a>
                    </div>
                    {tx.cpuInstructions && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>Resources:</span>
                            <span style={{ color: '#ffb74d', fontFamily: 'monospace', fontWeight: 700 }}>
                                {tx.cpuInstructions.toLocaleString()} CPU ({((tx.cpuInstructions / 100000000) * 100).toFixed(2)}%)
                            </span>
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginLeft: 'auto' }}>
                        <span style={{ color: 'var(--text-dim)' }}>Status:</span>
                        <span style={{ color: 'var(--green)', fontWeight: 600 }}>Success</span>
                        <span className="heartbeat-dot" style={{ width: '4px', height: '4px', background: 'var(--green)', borderRadius: '50%' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Main Component ──────────────────────────────────────────

interface TokenFlowLedgerProps {
    txHistory: Web3Tx[];
    reserves: Record<'XLM' | 'USDC', Reserve>;
}

export const TokenFlowLedger: React.FC<TokenFlowLedgerProps> = ({ txHistory, reserves }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<TxFilterType>('ALL');
    const [viewMode, setViewMode] = useState<'DENSE' | 'DETAILED'>('DETAILED');
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
    const [copiedTxId, setCopiedTxId] = useState<string | null>(null);

    // Reset expanded row on any control change
    useEffect(() => { setExpandedTxId(null); }, [searchTerm, filterType, currentPage, pageSize, viewMode]);
    // Reset page on filter/search change
    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterType]);

    const copyToClipboard = (text: string, txId: string) => {
        navigator.clipboard.writeText(text);
        setCopiedTxId(txId);
        setTimeout(() => setCopiedTxId(null), 2000);
    };

    // Filter + search logic
    const filteredTxs = React.useMemo(() => {
        return txHistory.filter((tx) => {
            const term = searchTerm.trim().toLowerCase();
            const matchesSearch = term === '' ||
                tx.ledger.toString().includes(term) ||
                tx.hash.toLowerCase().includes(term) ||
                tx.account.toLowerCase().includes(term) ||
                tx.asset.toLowerCase().includes(term) ||
                tx.type.toLowerCase().includes(term);
            if (!matchesSearch) return false;
            if (filterType === 'ALL') return true;
            if (filterType === 'SUPPLY') return tx.type === 'SUPPLY';
            if (filterType === 'WITHDRAW') return tx.type === 'WITHDRAW';
            if (filterType === 'BORROW') return tx.type === 'BORROW';
            if (filterType === 'REPAY') return tx.type === 'REPAY';
            if (filterType === 'LIQ') return tx.type === 'LIQUIDATION_PREPARE' || tx.type === 'LIQUIDATION_EXECUTE';
            return true;
        });
    }, [txHistory, searchTerm, filterType]);

    // Pagination
    const totalItems = filteredTxs.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const paginatedTxs = React.useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredTxs.slice(start, start + pageSize);
    }, [filteredTxs, currentPage, pageSize]);

    // Telemetry for current page
    const ledgerTelemetry = React.useMemo(() => {
        let volume = 0;
        let cpuUsed = 0;
        paginatedTxs.forEach((tx) => {
            const price = tx.asset === 'XLM' ? reserves.XLM.price : reserves.USDC.price;
            volume += tx.amount * price;
            cpuUsed += tx.cpuInstructions || 0;
        });
        return { volume, cpuUsed, successCount: paginatedTxs.length };
    }, [paginatedTxs, reserves]);

    return (
        <div className="card glass-card" style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid rgba(0, 242, 254, 0.15)',
            background: 'radial-gradient(circle at top left, rgba(16, 24, 48, 0.8), rgba(8, 12, 24, 0.95))',
            backdropFilter: 'blur(16px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 242, 254, 0.02)'
        }}>
            <style>{LEDGER_CSS}</style>

            {/* ── Header ── */}
            <div className="card-header" style={{
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                padding: '1.25rem 1.5rem',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.015) 0%, rgba(255,255,255,0) 100%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(0,242,254,0.08)', border: '1px solid rgba(0,242,254,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--cyan)' }}>
                            <History className="animate-spin-slow" size={18} />
                        </div>
                        <div>
                            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-bright)', letterSpacing: '0.5px', display: 'block' }}>
                                LỊCH SỬ DÒNG TIỀN
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                                Stellar Soroban Blockstream Feed
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.05)', border: '1px solid rgba(34, 197, 94, 0.15)', color: '#22c55e', padding: '0.25rem 0.55rem', borderRadius: '6px', fontWeight: 700 }}>
                            <span className="heartbeat-dot" style={{ width: '5px', height: '5px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 6px #22c55e', display: 'inline-block' }} />
                            LIVE SYNC
                        </span>
                        <span style={{ fontSize: '0.75rem', background: 'rgba(0,242,254,0.05)', border: '1px solid rgba(0,242,254,0.15)', color: 'var(--cyan)', padding: '0.25rem 0.55rem', borderRadius: '6px', fontWeight: 800, letterSpacing: '0.5px' }}>
                            {totalItems}/{txHistory.length} TXS
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Telemetry HUD ── */}
            <TelemetryHud volume={ledgerTelemetry.volume} cpuUsed={ledgerTelemetry.cpuUsed} successCount={ledgerTelemetry.successCount} currentPage={currentPage} />

            {/* ── Controls Panel ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', padding: '0.75rem 1.25rem', background: 'rgba(255,255,255,0.005)', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                        <Search size={13} style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                        <input
                            type="text"
                            placeholder="Tìm Ledger, Tx Hash, ví..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input-glow"
                            style={{ width: '100%', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '0.45rem 0.75rem 0.45rem 2rem', fontSize: '0.85rem', color: 'var(--text-bright)', transition: 'all 0.2s ease', fontFamily: 'monospace' }}
                        />
                    </div>
                    {/* View mode toggle */}
                    <div style={{ display: 'flex', background: 'rgba(4, 5, 10, 0.7)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.2rem', borderRadius: '8px', gap: '0.2rem' }}>
                        <button onClick={() => setViewMode('DETAILED')} title="Dòng thời gian" style={{ background: viewMode === 'DETAILED' ? 'rgba(0,242,254,0.12)' : 'transparent', border: 'none', color: viewMode === 'DETAILED' ? 'var(--cyan)' : 'var(--text-dim)', padding: '0.3rem 0.65rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.15s ease' }}>
                            <Grid size={12} /><span>Chi Tiết</span>
                        </button>
                        <button onClick={() => setViewMode('DENSE')} title="Bảng tối giản" style={{ background: viewMode === 'DENSE' ? 'rgba(0,242,254,0.12)' : 'transparent', border: 'none', color: viewMode === 'DENSE' ? 'var(--cyan)' : 'var(--text-dim)', padding: '0.3rem 0.65rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.15s ease' }}>
                            <List size={12} /><span>Tối Giản</span>
                        </button>
                    </div>
                </div>
                {/* Filter pills */}
                <div style={{ display: 'flex', gap: '0.3rem', overflowX: 'auto', paddingBottom: '0.15rem', scrollbarWidth: 'none' }} className="custom-scrollbar">
                    {FILTER_PILLS.map((p) => {
                        const active = filterType === p.id;
                        return (
                            <button key={p.id} onClick={() => setFilterType(p.id)} style={{ flexShrink: 0, background: active ? p.bg : 'transparent', border: `1px solid ${active ? p.color : 'rgba(255,255,255,0.03)'}`, color: active ? p.color : 'var(--text-dim)', padding: '0.3rem 0.65rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease' }}>
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* ── Content ── */}
            <div className="card-body custom-scrollbar" style={{ flex: 1, padding: '0.5rem 0.75rem', maxHeight: '650px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {paginatedTxs.length === 0 ? (
                    <div style={{ padding: '4.5rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <History size={28} style={{ opacity: 0.15, marginBottom: '0.65rem' }} className="animate-pulse" />
                        <p style={{ fontSize: '0.82rem', margin: 0 }}>Không tìm thấy giao dịch nào.</p>
                    </div>
                ) : viewMode === 'DETAILED' ? (
                    paginatedTxs.map((tx) => (
                        <DetailedRow
                            key={tx.id}
                            tx={tx}
                            isExpanded={expandedTxId === tx.id}
                            onToggle={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                            copiedTxId={copiedTxId}
                            onCopy={copyToClipboard}
                        />
                    ))
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', overflowX: 'auto' }}>
                        {/* Dense header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.7fr 1.2fr 1.5fr 1.5fr 1fr 1fr 1.2fr', padding: '0.55rem 0.6rem', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', minWidth: '680px', letterSpacing: '0.3px' }}>
                            <span>Hành Động</span>
                            <span>Coin</span>
                            <span style={{ textAlign: 'right', paddingRight: '0.5rem' }}>Số Lượng</span>
                            <span style={{ textAlign: 'center' }}>Địa Chỉ Ví</span>
                            <span style={{ textAlign: 'center' }}>Tx Hash</span>
                            <span style={{ textAlign: 'center' }}>Ledger</span>
                            <span style={{ textAlign: 'center' }}>Giờ</span>
                            <span style={{ textAlign: 'right' }}>Gas CPU</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: '680px' }}>
                            {paginatedTxs.map((tx) => (
                                <DenseRow
                                    key={tx.id}
                                    tx={tx}
                                    isExpanded={expandedTxId === tx.id}
                                    onToggle={() => setExpandedTxId(expandedTxId === tx.id ? null : tx.id)}
                                    copiedTxId={copiedTxId}
                                    onCopy={copyToClipboard}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Pagination Footer ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 1.25rem', background: 'rgba(4, 6, 12, 0.8)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '0.85rem', color: 'var(--text-dim)', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>Hiển thị:</span>
                    <select
                        value={pageSize}
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '6px', color: 'var(--text-bright)', padding: '0.2rem 0.4rem', fontSize: '0.82rem', cursor: 'pointer', outline: 'none' }}
                    >
                        <option value={5} style={{ background: '#0a0d1b' }}>5 giao dịch</option>
                        <option value={6} style={{ background: '#0a0d1b' }}>6 giao dịch</option>
                        <option value={10} style={{ background: '#0a0d1b' }}>10 giao dịch</option>
                        <option value={20} style={{ background: '#0a0d1b' }}>20 giao dịch</option>
                    </select>
                </div>
                <div><span>Trang <strong>{currentPage}</strong> / {totalPages}</span></div>
                <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        style={{ background: currentPage === 1 ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', color: currentPage === 1 ? 'rgba(255,255,255,0.15)' : 'var(--text-bright)', padding: '0.3rem 0.5rem', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
                        onMouseEnter={(e) => { if (currentPage !== 1) e.currentTarget.style.background = 'rgba(0,242,254,0.06)'; }}
                        onMouseLeave={(e) => { if (currentPage !== 1) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                        <ChevronLeft size={13} />
                    </button>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        style={{ background: currentPage === totalPages ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', color: currentPage === totalPages ? 'rgba(255,255,255,0.15)' : 'var(--text-bright)', padding: '0.3rem 0.5rem', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s ease' }}
                        onMouseEnter={(e) => { if (currentPage !== totalPages) e.currentTarget.style.background = 'rgba(0,242,254,0.06)'; }}
                        onMouseLeave={(e) => { if (currentPage !== totalPages) e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                    >
                        <ChevronRight size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
};
