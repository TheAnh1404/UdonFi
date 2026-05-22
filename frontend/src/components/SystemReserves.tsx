import React from 'react';
import { Database, ShieldCheck } from 'lucide-react';
import type { Reserve } from '../types/lending';

interface SystemReservesProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    onNavigate: () => void;
}

export const SystemReserves: React.FC<SystemReservesProps> = ({ reserves, onNavigate }) => {
    return (
        <div className="card glass-card pos-card glow-cyan" style={{ flex: '1.2' }}>
            <div className="card-header">
                <h3>
                    <Database className="text-cyan animate-pulse" size={18} />
                    <span>Hệ Thống Bể Thanh Khoản (UdonFi Pools)</span>
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button 
                        onClick={onNavigate}
                        style={{
                            background: 'rgba(0, 242, 254, 0.08)',
                            border: '1px solid rgba(0, 242, 254, 0.3)',
                            color: 'var(--cyan)',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            transition: 'var(--transition-smooth)',
                            boxShadow: '0 0 10px rgba(0, 242, 254, 0.1)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 242, 254, 0.15)';
                            e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.5)';
                            e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 242, 254, 0.2)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(0, 242, 254, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.3)';
                            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 242, 254, 0.1)';
                        }}
                    >
                        Xem Chi Tiết Bể ↗
                    </button>
                    <span className="badge badge-success text-xs" style={{
                        padding: '0.25rem 0.6rem',
                        borderRadius: '20px',
                        background: 'rgba(0, 230, 118, 0.1)',
                        border: '1px solid rgba(0, 230, 118, 0.3)',
                        color: 'var(--green)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                    }}>
                        <ShieldCheck size={12} />
                        Active Reserves
                    </span>
                </div>
            </div>
            
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '1.25rem'
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
                            <div className="pool-box" style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                transition: 'var(--transition-smooth)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'rgba(0, 242, 254, 0.1)',
                                            border: '1px solid rgba(0, 242, 254, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <span style={{ color: 'var(--cyan)', fontWeight: 'bold', fontSize: '0.85rem' }}>XLM</span>
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Stellar Lumens Pool</h4>
                                            <span className="text-dim" style={{ fontSize: '0.75rem' }}>Oracle: ${r.price.toFixed(3)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                    <span className="text-dim" style={{ fontSize: '0.8rem', display: 'block' }}>Thanh Khoản Khả Dụng (Available Cash)</span>
                                    <span className="text-cyan" style={{ fontSize: '1.4rem', fontWeight: 700, filter: 'drop-shadow(0 0 6px rgba(0, 242, 254, 0.3))' }}>
                                        {available.toLocaleString(undefined, { maximumFractionDigits: 1 })} XLM
                                    </span>
                                    <span className="text-dim" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.1rem' }}>
                                        ~ ${(available * r.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                                    <div>
                                        <span className="text-dim" style={{ display: 'block' }}>Tổng Nạp (Total Supply)</span>
                                        <span style={{ fontWeight: 600 }}>{r.totalSupplied.toLocaleString(undefined, { maximumFractionDigits: 0 })} XLM</span>
                                    </div>
                                    <div>
                                        <span className="text-dim" style={{ display: 'block' }}>Tổng Vay (Total Borrow)</span>
                                        <span style={{ fontWeight: 600 }}>{r.totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 0 })} XLM</span>
                                    </div>
                                </div>

                                {/* Utilization rate bar */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                        <span className="text-dim">Tỷ lệ Sử dụng (Utilization)</span>
                                        <span style={{ color: utilColor, fontWeight: 600 }}>{utilization.toFixed(1)}%</span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '6px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '3px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${Math.min(100, utilization)}%`,
                                            height: '100%',
                                            background: utilColor,
                                            boxShadow: `0 0 8px ${utilColor}`,
                                            borderRadius: '3px',
                                            transition: 'width 0.5s ease-in-out'
                                        }}></div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.01)', padding: '0.4rem', borderRadius: '6px' }}>
                                    <div>
                                        <span className="text-green">Supply APY</span>
                                        <span style={{ display: 'block', fontWeight: 600 }}>{r.supplyApy.toFixed(2)}%</span>
                                    </div>
                                    <div>
                                        <span className="text-purple">Borrow APY</span>
                                        <span style={{ display: 'block', fontWeight: 600 }}>{r.borrowApy.toFixed(2)}%</span>
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
                            <div className="pool-box" style={{
                                background: 'rgba(255,255,255,0.02)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '12px',
                                padding: '1rem',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                transition: 'var(--transition-smooth)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            background: 'rgba(155, 81, 224, 0.1)',
                                            border: '1px solid rgba(155, 81, 224, 0.3)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            <span style={{ color: 'var(--purple)', fontWeight: 'bold', fontSize: '0.85rem' }}>USDC</span>
                                        </div>
                                        <div>
                                            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>USD Coin Pool</h4>
                                            <span className="text-dim" style={{ fontSize: '0.75rem' }}>Pegged: $1.000</span>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                                    <span className="text-dim" style={{ fontSize: '0.8rem', display: 'block' }}>Thanh Khoản Khả Dụng (Available Cash)</span>
                                    <span className="text-purple" style={{ fontSize: '1.4rem', fontWeight: 700, filter: 'drop-shadow(0 0 6px rgba(155, 81, 224, 0.3))' }}>
                                        ${available.toLocaleString(undefined, { maximumFractionDigits: 1 })} USDC
                                    </span>
                                    <span className="text-dim" style={{ fontSize: '0.75rem', display: 'block', marginTop: '0.1rem' }}>
                                        ~ ${available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                    </span>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem' }}>
                                    <div>
                                        <span className="text-dim" style={{ display: 'block' }}>Tổng Nạp (Total Supply)</span>
                                        <span style={{ fontWeight: 600 }}>${r.totalSupplied.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                    <div>
                                        <span className="text-dim" style={{ display: 'block' }}>Tổng Vay (Total Borrow)</span>
                                        <span style={{ fontWeight: 600 }}>${r.totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>

                                {/* Utilization rate bar */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                                        <span className="text-dim">Tỷ lệ Sử dụng (Utilization)</span>
                                        <span style={{ color: utilColor, fontWeight: 600 }}>{utilization.toFixed(1)}%</span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '6px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '3px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${Math.min(100, utilization)}%`,
                                            height: '100%',
                                            background: utilColor,
                                            boxShadow: `0 0 8px ${utilColor}`,
                                            borderRadius: '3px',
                                            transition: 'width 0.5s ease-in-out'
                                        }}></div>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem', background: 'rgba(255,255,255,0.01)', padding: '0.4rem', borderRadius: '6px' }}>
                                    <div>
                                        <span className="text-green">Supply APY</span>
                                        <span style={{ display: 'block', fontWeight: 600 }}>{r.supplyApy.toFixed(2)}%</span>
                                    </div>
                                    <div>
                                        <span className="text-purple">Borrow APY</span>
                                        <span style={{ display: 'block', fontWeight: 600 }}>{r.borrowApy.toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>
        </div>
    );
};
