import { useEffect, useState } from 'react';

interface Particle {
    id: string;
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    size: number;
    color: string;
    symbol: string;
    delay: number;
    duration: number;
}

interface FloatingBadge {
    id: string;
    x: number;
    y: number;
    text: string;
    color: string;
}

export function MoneyFlowOverlay() {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [badges, setBadges] = useState<FloatingBadge[]>([]);

    useEffect(() => {
        const handleMoneyFlow = (e: Event) => {
            const customEvent = e as CustomEvent<{
                type: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LIQUIDATION_PREPARE' | 'LIQUIDATION_EXECUTE' | 'LEVERAGE';
                asset: 'XLM' | 'USDC';
                amount: number;
            }>;
            
            const { type, asset, amount } = customEvent.detail;
            
            // 1. Determine Source and Target Coordinates
            let sourceX = window.innerWidth / 2;
            let sourceY = window.innerHeight - 100; // Default action button area
            let targetX = window.innerWidth / 2;
            let targetY = window.innerHeight / 2;  // Center screen
            
            const walletEl = document.getElementById('header-wallet-area');
            const xlmPoolEl = document.getElementById('pool-card-xlm');
            const usdcPoolEl = document.getElementById('pool-card-usdc');
            
            const walletRect = walletEl?.getBoundingClientRect();
            const xlmRect = xlmPoolEl?.getBoundingClientRect();
            const usdcRect = usdcPoolEl?.getBoundingClientRect();
            
            const walletPos = walletRect 
                ? { x: walletRect.left + walletRect.width / 2, y: walletRect.top + walletRect.height / 2 }
                : { x: window.innerWidth - 180, y: 30 };
                
            const xlmPos = xlmRect
                ? { x: xlmRect.left + xlmRect.width / 2, y: xlmRect.top + xlmRect.height / 2 }
                : { x: window.innerWidth * 0.3, y: window.innerHeight * 0.5 };
                
            const usdcPos = usdcRect
                ? { x: usdcRect.left + usdcRect.width / 2, y: usdcRect.top + usdcRect.height / 2 }
                : { x: window.innerWidth * 0.7, y: window.innerHeight * 0.5 };

            const activePoolPos = asset === 'XLM' ? xlmPos : usdcPos;
            
            // Define money direction
            // SUPPLY / REPAY: Wallet -> Pool
            // WITHDRAW / BORROW / LIQUIDATION: Pool -> Wallet
            const isWalletToPool = type === 'SUPPLY' || type === 'REPAY' || type === 'LEVERAGE';
            
            if (isWalletToPool) {
                sourceX = walletPos.x;
                sourceY = walletPos.y;
                targetX = activePoolPos.x;
                targetY = activePoolPos.y;
            } else {
                sourceX = activePoolPos.x;
                sourceY = activePoolPos.y;
                targetX = walletPos.x;
                targetY = walletPos.y;
            }
            
            // 2. Generate Particles
            const particleCount = 15;
            const newParticles: Particle[] = [];
            const particleColor = asset === 'XLM' ? '#00f2fe' : '#9b51e0';
            const symbolText = asset === 'XLM' ? 'XLM' : '$';
            
            for (let i = 0; i < particleCount; i++) {
                newParticles.push({
                    id: `p-${Math.random().toString(36).substring(2, 9)}`,
                    x: sourceX + (Math.random() - 0.5) * 40,
                    y: sourceY + (Math.random() - 0.5) * 40,
                    targetX: targetX + (Math.random() - 0.5) * 50,
                    targetY: targetY + (Math.random() - 0.5) * 50,
                    size: Math.random() * 8 + 6,
                    color: particleColor,
                    symbol: symbolText,
                    delay: Math.random() * 0.4,
                    duration: 0.8 + Math.random() * 0.5
                });
            }
            
            setParticles(prev => [...prev, ...newParticles]);
            
            // 3. Generate Floating Badge Text
            let badgeText = '';
            let badgeColor = '#00e676'; // green
            
            if (type === 'SUPPLY') {
                badgeText = `+${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${asset}`;
                badgeColor = '#00e676';
            } else if (type === 'REPAY') {
                badgeText = `+${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${asset} Trả`;
                badgeColor = '#00e676';
            } else if (type === 'WITHDRAW') {
                badgeText = `-${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${asset}`;
                badgeColor = '#ff1744'; // red
            } else if (type === 'BORROW') {
                badgeText = `-${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${asset} Vay`;
                badgeColor = '#ff1744';
            } else if (type === 'LEVERAGE') {
                badgeText = `⚡ Đòn bẩy ${amount.toFixed(1)}x ${asset}`;
                badgeColor = '#00f2fe'; // cyan
            } else if (type === 'LIQUIDATION_PREPARE') {
                badgeText = `🔒 Khóa ${amount.toLocaleString(undefined, { maximumFractionDigits: 1 })} XLM thế chấp`;
                badgeColor = '#ffd600'; // yellow
            } else if (type === 'LIQUIDATION_EXECUTE') {
                badgeText = `💥 Thanh lý: Tịch thu ${amount.toLocaleString(undefined, { maximumFractionDigits: 1 })} XLM`;
                badgeColor = '#ff1744';
            }
            
            const newBadge: FloatingBadge = {
                id: `b-${Math.random().toString(36).substring(2, 9)}`,
                x: activePoolPos.x,
                y: activePoolPos.y - 20,
                text: badgeText,
                color: badgeColor
            };
            
            setBadges(prev => [...prev, newBadge]);

            // Clear old particles & badges after animation completes
            setTimeout(() => {
                setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
            }, 1800);
            
            setTimeout(() => {
                setBadges(prev => prev.filter(b => b.id !== newBadge.id));
            }, 2500);
        };
        
        window.addEventListener('defi-money-flow', handleMoneyFlow);
        return () => window.removeEventListener('defi-money-flow', handleMoneyFlow);
    }, []);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 9999,
            overflow: 'hidden'
        }}>
            {/* Render Particles */}
            {particles.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate(${p.x}px, ${p.y}px)`,
                        width: `${p.size}px`,
                        height: `${p.size}px`,
                        borderRadius: '50%',
                        background: `radial-gradient(circle, #ffffff 10%, ${p.color} 70%)`,
                        boxShadow: `0 0 12px ${p.color}, 0 0 24px ${p.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        fontSize: '7px',
                        fontWeight: 900,
                        fontFamily: 'sans-serif',
                        opacity: 0,
                        animation: `fly-particle-${p.id} ${p.duration}s cubic-bezier(0.25, 1, 0.5, 1) forwards`,
                        animationDelay: `${p.delay}s`
                    }}
                >
                    <style>{`
                        @keyframes fly-particle-${p.id} {
                            0% {
                                transform: translate(${p.x}px, ${p.y}px) scale(0.6);
                                opacity: 0;
                            }
                            15% {
                                opacity: 1;
                                transform: translate(${p.x}px, ${p.y}px) scale(1.2);
                            }
                            85% {
                                opacity: 0.95;
                            }
                            100% {
                                transform: translate(${p.targetX}px, ${p.targetY}px) scale(0.4);
                                opacity: 0;
                            }
                        }
                    `}</style>
                    {p.symbol}
                </div>
            ))}

            {/* Render Floating Badges */}
            {badges.map(b => (
                <div
                    key={b.id}
                    style={{
                        position: 'absolute',
                        left: b.x,
                        top: b.y,
                        transform: 'translate(-50%, -50%)',
                        color: b.color,
                        background: 'rgba(7, 10, 19, 0.85)',
                        border: `1px solid ${b.color}`,
                        borderRadius: '20px',
                        padding: '0.4rem 0.8rem',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        boxShadow: `0 0 15px ${b.color}44, inset 0 0 10px ${b.color}22`,
                        whiteSpace: 'nowrap',
                        animation: 'badge-rise-fade 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
                    }}
                >
                    <style>{`
                        @keyframes badge-rise-fade {
                            0% {
                                transform: translate(-50%, 0) scale(0.7);
                                opacity: 0;
                            }
                            15% {
                                transform: translate(-50%, -30px) scale(1.1);
                                opacity: 1;
                            }
                            30% {
                                transform: translate(-50%, -40px) scale(1);
                            }
                            80% {
                                opacity: 1;
                            }
                            100% {
                                transform: translate(-50%, -90px) scale(0.85);
                                opacity: 0;
                            }
                        }
                    `}</style>
                    {b.text}
                </div>
            ))}
        </div>
    );
}
