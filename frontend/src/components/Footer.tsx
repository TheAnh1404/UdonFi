import React from 'react';
import { Github, Twitter, MessageSquare, BookOpen, Layers, Heart, Radio } from 'lucide-react';

interface FooterProps {
    currentLedger: number;
}

export const Footer: React.FC<FooterProps> = ({ currentLedger }) => {
    return (
        <footer className="footer-container" style={{
            marginTop: '3rem',
            background: 'rgba(10, 15, 29, 0.4)',
            border: '1px solid var(--card-border)',
            backdropFilter: 'blur(20px)',
            borderRadius: '18px',
            padding: '2.5rem 2rem 1.5rem 2rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '2rem',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Subtle top neon glow */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: '10%',
                right: '10%',
                height: '1px',
                background: 'linear-gradient(90deg, transparent, var(--cyan-glow), var(--purple-glow), transparent)',
                opacity: 0.8
            }}></div>

            <div className="footer-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '2rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                paddingBottom: '2rem'
            }}>
                {/* Brand & Bio column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', maxWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="bowl" style={{
                            width: '26px',
                            height: '16px',
                            border: '2px solid var(--cyan)',
                            borderBottomLeftRadius: '12px',
                            borderBottomRightRadius: '12px',
                            position: 'relative'
                        }}>
                            <div style={{
                                width: '100%',
                                height: '2px',
                                background: 'var(--cyan)',
                                position: 'absolute',
                                top: '4px'
                            }}></div>
                        </div>
                        <span style={{
                            fontFamily: 'var(--font-heading)',
                            fontSize: '1.25rem',
                            fontWeight: 700,
                            letterSpacing: '0.5px'
                        }}>
                            Udon<span className="text-cyan">Fi</span>
                        </span>
                    </div>
                    <p style={{
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        lineHeight: '1.5'
                    }}>
                        Giao thức thanh khoản và cho vay P2P tiên tiến, tối ưu hóa hiệu quả sử dụng vốn trên mạng Stellar Soroban Smart Contract.
                    </p>
                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-icon" style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            transition: 'var(--transition-smooth)'
                        }}>
                            <Twitter size={14} />
                        </a>
                        <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="social-icon" style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            transition: 'var(--transition-smooth)'
                        }}>
                            <MessageSquare size={14} />
                        </a>
                        <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-icon" style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            transition: 'var(--transition-smooth)'
                        }}>
                            <Github size={14} />
                        </a>
                    </div>
                </div>

                {/* Column 2: Products */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: 'var(--text-main)',
                        fontWeight: 600
                    }}>Sản Phẩm (Products)</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <li><a href="#markets" className="footer-link">Thị Trường Cho Vay</a></li>
                        <li><a href="#leverage" className="footer-link">Leverage Loop (Đòn bẩy)</a></li>
                        <li><a href="#liquidation" className="footer-link">Sandbox 2-Step Liquidation</a></li>
                        <li><a href="#rates" className="footer-link">Lãi Suất Kinked APY</a></li>
                    </ul>
                </div>

                {/* Column 3: Developers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: 'var(--text-main)',
                        fontWeight: 600
                    }}>Nhà Phát Triển (Developers)</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <li>
                            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Github size={12} />
                                <span>Github Repositories</span>
                            </a>
                        </li>
                        <li>
                            <a href="#docs" className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <BookOpen size={12} />
                                <span>Tài Liệu Kỹ Thuật (Docs)</span>
                            </a>
                        </li>
                        <li>
                            <a href="#smartcontracts" className="footer-link" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <Layers size={12} />
                                <span>Soroban Contract Code</span>
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Column 4: Governance */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h4 style={{
                        fontFamily: 'var(--font-heading)',
                        fontSize: '0.85rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: 'var(--text-main)',
                        fontWeight: 600
                    }}>Quản Trị (Governance)</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
                        <li><a href="#dao" className="footer-link">UdonFi DAO Governance</a></li>
                        <li><a href="#tokenomics" className="footer-link">UDON Tokenomics</a></li>
                        <li><a href="#grants" className="footer-link">Stellar Community Grants</a></li>
                    </ul>
                </div>
            </div>

            {/* Bottom Row */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                fontSize: '0.75rem',
                color: 'var(--text-dim)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <span>© 2026 UdonFi Protocol. Designed with</span>
                    <Heart size={10} className="text-red animate-pulse" style={{ color: 'var(--red)' }} />
                    <span>for Stellar Soroban Network.</span>
                </div>

                {/* Ledger connection status with blinking LED */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    padding: '0.3rem 0.6rem',
                    borderRadius: '20px'
                }}>
                    <Radio size={12} className="text-green" style={{
                        color: 'var(--green)',
                        animation: 'pulse 1.5s infinite'
                    }} />
                    <span>Soroban RPC: </span>
                    <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>Connected</span>
                    <span style={{ color: 'var(--cyan)' }}>[Ledger #{currentLedger}]</span>
                </div>
            </div>

            {/* Inline CSS styling injection */}
            <style>{`
                .social-icon:hover {
                    color: var(--cyan) !important;
                    border-color: var(--cyan) !important;
                    background: rgba(0, 242, 254, 0.05) !important;
                    box-shadow: 0 0 10px rgba(0, 242, 254, 0.15);
                }
                .footer-link {
                    color: var(--text-muted);
                    text-decoration: none;
                    transition: var(--transition-smooth);
                }
                .footer-link:hover {
                    color: var(--cyan) !important;
                    padding-left: 3px;
                    text-shadow: 0 0 5px rgba(0, 242, 254, 0.2);
                }
            `}</style>
        </footer>
    );
};
