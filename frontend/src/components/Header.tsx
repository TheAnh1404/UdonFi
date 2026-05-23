import React, { useState } from 'react';
import { Wallet, LogOut, LayoutDashboard, Database, Coins, Zap, Bell, Trash2 } from 'lucide-react';
import type { Reserve } from '../types/lending';

interface HeaderProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    wallet: { isConnected: boolean; address: string };
    onConnect: () => void;
    onDisconnect: () => void;
    currentView: 'DASHBOARD' | 'MARKET' | 'POOLS' | 'SIMULATOR';
    onNavigate: (view: 'DASHBOARD' | 'MARKET' | 'POOLS' | 'SIMULATOR') => void;
    notifications: any[];
    onClearNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    reserves, 
    wallet, 
    onConnect, 
    onDisconnect,
    currentView,
    onNavigate,
    notifications,
    onClearNotifications
}) => {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    // Calculate TVL, Borrowed and Utilization Rate
    const tvl = (reserves.XLM.totalSupplied * reserves.XLM.price) + (reserves.USDC.totalSupplied * reserves.USDC.price);
    const borrowed = (reserves.XLM.totalBorrowed * reserves.XLM.price) + (reserves.USDC.totalBorrowed * reserves.USDC.price);
    const utilization = tvl > 0 ? (borrowed / tvl) * 100 : 0;

    return (
        <header className="app-header" style={{
            position: 'relative',
            zIndex: 999,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            padding: '1.25rem 1.5rem',
            background: 'rgba(8, 12, 28, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            backdropFilter: 'blur(20px)',
            borderRadius: '16px',
            boxShadow: '0 4px 30px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)'
        }}>
            {/* ROW 1: BRAND LOGO (LEFT) & NAVIGATION TABS BAR (RIGHT/CENTERED) */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                marginBottom: '0.5rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                paddingBottom: '1rem',
                flexWrap: 'wrap',
                gap: '1rem'
            }}>
                {/* Logo Area */}
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
                    gap: '0.5rem',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    padding: '0.3rem',
                    borderRadius: '12px',
                    flexWrap: 'nowrap',
                    boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.03)'
                }}>
                    <button 
                        onClick={() => onNavigate('DASHBOARD')}
                        className="nav-btn"
                        style={{
                            background: currentView === 'DASHBOARD' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                            border: '1px solid ' + (currentView === 'DASHBOARD' ? 'rgba(0, 242, 254, 0.2)' : 'transparent'),
                            color: currentView === 'DASHBOARD' ? 'var(--cyan)' : 'var(--text-muted)',
                            padding: '0.45rem 1.15rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            transition: 'var(--transition-smooth)',
                            textShadow: currentView === 'DASHBOARD' ? '0 0 8px rgba(0, 242, 254, 0.2)' : 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <LayoutDashboard size={13} />
                        <span>Bảng Điều Khiển</span>
                    </button>
                    <button 
                        onClick={() => onNavigate('MARKET')}
                        className="nav-btn"
                        style={{
                            background: currentView === 'MARKET' ? 'rgba(155, 81, 224, 0.08)' : 'transparent',
                            border: '1px solid ' + (currentView === 'MARKET' ? 'rgba(155, 81, 224, 0.2)' : 'transparent'),
                            color: currentView === 'MARKET' ? 'var(--purple)' : 'var(--text-muted)',
                            padding: '0.45rem 1.15rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            transition: 'var(--transition-smooth)',
                            textShadow: currentView === 'MARKET' ? '0 0 8px rgba(155, 81, 224, 0.2)' : 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Coins size={13} />
                        <span>Thị Trường Tín Dụng</span>
                    </button>
                    <button 
                        onClick={() => onNavigate('POOLS')}
                        className="nav-btn"
                        style={{
                            background: currentView === 'POOLS' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                            border: '1px solid ' + (currentView === 'POOLS' ? 'rgba(0, 242, 254, 0.2)' : 'transparent'),
                            color: currentView === 'POOLS' ? 'var(--cyan)' : 'var(--text-muted)',
                            padding: '0.45rem 1.15rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            transition: 'var(--transition-smooth)',
                            textShadow: currentView === 'POOLS' ? '0 0 8px rgba(0, 242, 254, 0.2)' : 'none',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Database size={13} />
                        <span>UdonFi Pools</span>
                    </button>
                    
                    <button 
                        onClick={() => onNavigate('SIMULATOR')}
                        className="nav-btn simulator-nav-btn"
                        style={{
                            background: currentView === 'SIMULATOR' ? 'rgba(0, 242, 254, 0.12)' : 'transparent',
                            border: '1px solid ' + (currentView === 'SIMULATOR' ? 'rgba(0, 242, 254, 0.3)' : 'rgba(0, 242, 254, 0.15)'),
                            color: 'var(--cyan)',
                            padding: '0.45rem 1.15rem',
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            transition: 'var(--transition-smooth)',
                            boxShadow: currentView === 'SIMULATOR' ? '0 0 10px rgba(0, 242, 254, 0.2)' : 'none',
                            textShadow: '0 0 8px rgba(0, 242, 254, 0.2)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Zap size={13} />
                        <span>Trình Giả Lập</span>
                    </button>
                </div>
            </div>

            {/* ROW 2: WALLET CONNECT (LEFT, UNDER LOGO) & STATS + BELL (RIGHT) */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                flexWrap: 'wrap',
                gap: '1rem',
                marginTop: '0.15rem'
            }}>
                {/* Wallet Connect directly under the Logo */}
                <div className="wallet-area" id="header-wallet-area" style={{ display: 'flex', alignItems: 'center' }}>
                    {!wallet.isConnected ? (
                        <button onClick={onConnect} className="btn-connect" style={{
                            padding: '0.45rem 1rem',
                            fontSize: '0.75rem',
                            borderRadius: '8px',
                            height: '34px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}>
                            <Wallet size={14} />
                            <span>Connect Freighter</span>
                        </button>
                    ) : (
                        <div className="wallet-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="wallet-badge" style={{
                                padding: '0.4rem 0.8rem',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                background: 'rgba(0, 242, 254, 0.06)',
                                border: '1px solid rgba(0, 242, 254, 0.2)',
                                color: 'var(--cyan)',
                                height: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem'
                            }}>
                                <span className="dot-active"></span>
                                <span>{wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}</span>
                            </div>
                            <button onClick={onDisconnect} className="btn-icon-only" title="Disconnect" style={{
                                background: 'rgba(255, 25, 68, 0.06)',
                                border: '1px solid rgba(255, 25, 68, 0.2)',
                                color: 'var(--red)',
                                borderRadius: '8px',
                                width: '34px',
                                height: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'var(--red)';
                                e.currentTarget.style.color = '#fff';
                                e.currentTarget.style.boxShadow = '0 0 10px rgba(255, 25, 68, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 25, 68, 0.06)';
                                e.currentTarget.style.color = 'var(--red)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Global Stats & Bell notifications */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    {/* Global Stats */}
                    <div className="global-stats" style={{ height: '34px', display: 'flex', alignItems: 'center' }}>
                        <div className="stat-pill">
                            <span className="label">TVL</span>
                            <span className="val">${tvl.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                        </div>
                        <div className="stat-pill">
                            <span className="label">Borrowed</span>
                            <span className="val">${borrowed.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</span>
                        </div>
                        <div className="stat-pill">
                            <span className="label">Utilization</span>
                            <span className="val">{utilization.toFixed(1)}%</span>
                        </div>
                    </div>

                    {/* Notification Dropdown Icon */}
                    <div className="notification-dropdown-wrapper" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <button 
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: notifications.length > 0 ? 'var(--cyan)' : 'var(--text-muted)',
                                cursor: 'pointer',
                                transition: 'var(--transition-smooth)',
                                boxShadow: notifications.length > 0 ? '0 0 10px rgba(0, 242, 254, 0.15)' : 'none',
                                position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(0, 242, 254, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(0, 242, 254, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                            }}
                        >
                            <Bell size={15} />
                            {notifications.length > 0 && (
                                <span style={{
                                    position: 'absolute',
                                    top: '-3px',
                                    right: '-3px',
                                    background: '#ff0055',
                                    color: '#fff',
                                    fontSize: '0.6rem',
                                    fontWeight: 800,
                                    borderRadius: '50%',
                                    width: '13px',
                                    height: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 0 8px #ff0055'
                                }}>
                                    {notifications.length}
                                </span>
                            )}
                        </button>

                        {isDropdownOpen && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: 'calc(100% + 0.65rem)',
                                width: '320px',
                                background: 'linear-gradient(135deg, rgba(13, 20, 38, 0.96), rgba(8, 12, 24, 0.98))',
                                border: '1px solid rgba(0, 242, 254, 0.2)',
                                boxShadow: '0 10px 40px rgba(0, 0, 0, 0.6), inset 0 0 15px rgba(0, 242, 254, 0.02)',
                                borderRadius: '12px',
                                padding: '1rem',
                                backdropFilter: 'blur(16px)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                                pointerEvents: 'auto',
                                zIndex: 1000
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '0.5rem' }}>
                                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '0.02em' }}>THÔNG BÁO MẠNG LƯỚI ({notifications.length})</span>
                                    {notifications.length > 0 && (
                                        <button 
                                            onClick={() => {
                                                onClearNotifications();
                                                setIsDropdownOpen(false);
                                            }}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                fontSize: '0.65rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.2fr',
                                                transition: 'color 0.2s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--red)'}
                                            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                                        >
                                            <Trash2 size={11} style={{ marginRight: '0.15rem' }} />
                                            <span>Xóa hết</span>
                                        </button>
                                    )}
                                </div>

                                <div style={{
                                    maxHeight: '260px',
                                    overflowY: 'auto',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem',
                                    paddingRight: '0.1rem'
                                }} className="custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.72rem', fontStyle: 'italic' }}>
                                            Không có thông báo mới từ Soroban VM
                                        </div>
                                    ) : (
                                        notifications.map((n) => {
                                            const isLiq = n.action?.includes('LIQUIDATION');
                                            const accent = isLiq ? '#ff0055' : 'var(--cyan)';
                                            return (
                                                <div key={n.id} style={{
                                                    background: 'rgba(255, 255, 255, 0.01)',
                                                    border: `1px solid ${accent}15`,
                                                    borderRadius: '8px',
                                                    padding: '0.5rem 0.65rem 0.5rem 0.85rem',
                                                    position: 'relative',
                                                    overflow: 'hidden',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.2rem'
                                                }}>
                                                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '2px', background: accent }}></div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-bright)' }}>{n.title}</span>
                                                        <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)' }}>{n.timestamp}</span>
                                                    </div>
                                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-dim)', margin: 0, lineHeight: '1.3', textAlign: 'left' }}>{n.message}</p>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
