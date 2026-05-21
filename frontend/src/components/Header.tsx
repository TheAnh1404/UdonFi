import React from 'react';
import { Wallet, LogOut } from 'lucide-react';
import type { Reserve } from '../types/lending';

interface HeaderProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    wallet: { isConnected: boolean; address: string };
    onConnect: () => void;
    onDisconnect: () => void;
}

export const Header: React.FC<HeaderProps> = ({ reserves, wallet, onConnect, onDisconnect }) => {
    // Calculate TVL, Borrowed and Utilization Rate
    const tvl = (reserves.XLM.totalSupplied * reserves.XLM.price) + (reserves.USDC.totalSupplied * reserves.USDC.price);
    const borrowed = (reserves.XLM.totalBorrowed * reserves.XLM.price) + (reserves.USDC.totalBorrowed * reserves.USDC.price);
    const utilization = tvl > 0 ? (borrowed / tvl) * 100 : 0;

    return (
        <header className="app-header">
            <div className="logo-area">
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

            {/* Global Stats */}
            <div className="global-stats">
                <div className="stat-pill">
                    <span className="label">TVL</span>
                    <span className="val">${tvl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="stat-pill">
                    <span className="label">Total Borrowed</span>
                    <span className="val">${borrowed.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
