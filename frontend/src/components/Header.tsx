import React from 'react';
import { Wallet, LogOut, LayoutDashboard, Database, Coins } from 'lucide-react';
import type { Reserve } from '../types/lending';

interface HeaderProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    wallet: { isConnected: boolean; address: string };
    onConnect: () => void;
    onDisconnect: () => void;
    currentView: 'DASHBOARD' | 'MARKET' | 'POOLS';
    onNavigate: (view: 'DASHBOARD' | 'MARKET' | 'POOLS') => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    reserves, 
    wallet, 
    onConnect, 
    onDisconnect,
    currentView,
    onNavigate
}) => {
    // Calculate TVL, Borrowed and Utilization Rate
    const tvl = (reserves.XLM.totalSupplied * reserves.XLM.price) + (reserves.USDC.totalSupplied * reserves.USDC.price);
    const borrowed = (reserves.XLM.totalBorrowed * reserves.XLM.price) + (reserves.USDC.totalBorrowed * reserves.USDC.price);
    const utilization = tvl > 0 ? (borrowed / tvl) * 100 : 0;

    return (
        <header className="app-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <div className="logo-area" style={{ cursor: 'pointer' }} onClick={() => onNavigate('DASHBOARD')}>
                    <div className="udon-bowl-icon">
                        <div className="steam steam-1"></div>
                        <div className="steam steam-2"></div>
                        <div className="steam steam-3"></div>
                        <div className="bowl">
                            <div className="line"></div>
                        </div>
                        <div className="chopstick chopstick-1"></div>
                        <div className="chopstick chopstick-2"></div>
                    </div>
                    <div className="brand">
                        <span className="brand-title">Udon<span className="highlight">Fi</span></span>
                        <span className="brand-network">Soroban Testnet</span>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="nav-tabs" style={{
                    display: 'flex',
                    gap: '0.4rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '0.25rem',
                    borderRadius: '10px',
                    marginLeft: '2rem'
                }}>
                    <button 
                        onClick={() => onNavigate('DASHBOARD')}
                        className="nav-btn"
                        style={{
                            background: currentView === 'DASHBOARD' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                            border: '1px solid ' + (currentView === 'DASHBOARD' ? 'rgba(0, 242, 254, 0.2)' : 'transparent'),
                            color: currentView === 'DASHBOARD' ? 'var(--cyan)' : 'var(--text-muted)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'var(--transition-smooth)',
                            textShadow: currentView === 'DASHBOARD' ? '0 0 8px rgba(0, 242, 254, 0.2)' : 'none'
                        }}
                    >
                        <LayoutDashboard size={12} />
                        <span>Bảng Điều Khiển</span>
                    </button>
                    <button 
                        onClick={() => onNavigate('MARKET')}
                        className="nav-btn"
                        style={{
                            background: currentView === 'MARKET' ? 'rgba(155, 81, 224, 0.08)' : 'transparent',
                            border: '1px solid ' + (currentView === 'MARKET' ? 'rgba(155, 81, 224, 0.2)' : 'transparent'),
                            color: currentView === 'MARKET' ? 'var(--purple)' : 'var(--text-muted)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'var(--transition-smooth)',
                            textShadow: currentView === 'MARKET' ? '0 0 8px rgba(155, 81, 224, 0.2)' : 'none'
                        }}
                    >
                        <Coins size={12} />
                        <span>Thị Trường Tín Dụng</span>
                    </button>
                    <button 
                        onClick={() => onNavigate('POOLS')}
                        className="nav-btn"
                        style={{
                            background: currentView === 'POOLS' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                            border: '1px solid ' + (currentView === 'POOLS' ? 'rgba(0, 242, 254, 0.2)' : 'transparent'),
                            color: currentView === 'POOLS' ? 'var(--cyan)' : 'var(--text-muted)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            transition: 'var(--transition-smooth)',
                            textShadow: currentView === 'POOLS' ? '0 0 8px rgba(0, 242, 254, 0.2)' : 'none'
                        }}
                    >
                        <Database size={12} />
                        <span>UdonFi Pools</span>
                    </button>
                </div>
            </div>

            {/* Global Stats */}
            <div className="global-stats">
                <div className="stat-pill">
                    <span className="label">TVL</span>
                    <span className="val">${tvl.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                </div>
                <div className="stat-pill">
                    <span className="label">Total Borrowed</span>
                    <span className="val">${borrowed.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                </div>
                <div className="stat-pill">
                    <span className="label">Utilization</span>
                    <span className="val">{utilization.toFixed(1)}%</span>
                </div>
            </div>

            {/* Wallet Connect */}
            <div className="wallet-area">
                {!wallet.isConnected ? (
                    <button onClick={onConnect} className="btn-connect">
                        <Wallet size={16} />
                        <span>Connect Freighter</span>
                    </button>
                ) : (
                    <div className="wallet-info">
                        <div className="wallet-badge">
                            <span className="dot-active"></span>
                            <span>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
                        </div>
                        <button onClick={onDisconnect} className="btn-icon-only" title="Disconnect">
                            <LogOut size={16} />
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
};
