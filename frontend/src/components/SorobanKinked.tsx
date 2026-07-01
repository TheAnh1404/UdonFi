import React, { useState } from 'react';
import type { Reserve } from '../types/lending';

interface SorobanKinkedProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
}

export const SorobanKinked: React.FC<SorobanKinkedProps> = ({ reserves }) => {
    const [selectedAsset, setSelectedAsset] = useState<'XLM' | 'USDC'>('XLM');
    const reserve = reserves[selectedAsset];

    // Calculate utilization rate: U = Borrowed / Supplied
    const totalSupplied = reserve.totalSupplied;
    const totalBorrowed = reserve.totalBorrowed;
    const utilization = totalSupplied > 0 ? (totalBorrowed / totalSupplied) * 100 : 0;

    // Kinked curve parameters
    const uOptimal = reserve.uOptimal; // e.g. 80
    const baseRate = reserve.baseRate; // e.g. 1
    const slope1 = reserve.slope1; // e.g. 4
    const slope2 = reserve.slope2; // e.g. 85

    // Current APY
    const currentBorrowApy = reserve.borrowApy;

    // SVG plotting logic
    // ViewBox dimensions: width=400, height=200
    // Margin: left=40, right=20, top=20, bottom=30
    const xMin = 40;
    const xMax = 380;
    const yMin = 20;
    const yMax = 170;

    const mapX = (u: number) => xMin + (u / 100) * (xMax - xMin);
    const mapY = (apy: number) => {
        // We'll scale APY from 0% to 100% on the Y axis
        const scaleMax = 100;
        return yMax - (apy / scaleMax) * (yMax - yMin);
    };

    // Key coordinates
    const ptA = { x: mapX(0), y: mapY(baseRate) };
    const ptKink = { x: mapX(uOptimal), y: mapY(baseRate + slope1) };
    const ptMax = { x: mapX(100), y: mapY(baseRate + slope1 + slope2) };

    // Path string
    const pathStr = `M ${ptA.x},${ptA.y} L ${ptKink.x},${ptKink.y} L ${ptMax.x},${ptMax.y}`;

    // Current location coordinates
    const dotX = mapX(utilization);
    const dotY = mapY(currentBorrowApy);

    return (
        <div className="soroban-tab-content active">
            <div className="kinked-layout">
                <div>
                    <div className="kinked-chart-area">
                        <svg className="kinked-svg" viewBox="0 0 400 200">
                            {/* Grid lines */}
                            <line x1={xMin} y1={yMax} x2={xMax} y2={yMax} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                            <line x1={xMin} y1={yMin} x2={xMin} y2={yMax} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                            
                            {/* Kink line dashed */}
                            <line 
                                x1={ptKink.x} 
                                y1={yMin} 
                                x2={ptKink.x} 
                                y2={yMax} 
                                stroke="rgba(255, 214, 0, 0.2)" 
                                strokeWidth="1" 
                                strokeDasharray="3,3" 
                            />
                            <text x={ptKink.x} y={yMax + 12} fill="var(--yellow)" fontSize="8" textAnchor="middle">
                                U_opt ({uOptimal}%)
                            </text>

                            {/* Label Y-axis */}
                            <text x={xMin - 8} y={ptA.y} fill="var(--text-muted)" fontSize="8" textAnchor="end">
                                {baseRate}%
                            </text>
                            <text x={xMin - 8} y={ptKink.y} fill="var(--text-muted)" fontSize="8" textAnchor="end">
                                {baseRate + slope1}%
                            </text>
                            <text x={xMin - 8} y={ptMax.y} fill="var(--text-muted)" fontSize="8" textAnchor="end">
                                90%
                            </text>

                            {/* Labels X-axis */}
                            <text x={xMin} y={yMax + 12} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
                                0%
                            </text>
                            <text x={xMax} y={yMax + 12} fill="var(--text-muted)" fontSize="8" textAnchor="middle">
                                100%
                            </text>

                            {/* Curve Area shadow */}
                            <path 
                                d={`M ${ptA.x},${yMax} L ${ptA.x},${ptA.y} L ${ptKink.x},${ptKink.y} L ${ptMax.x},${ptMax.y} L ${ptMax.x},${yMax} Z`}
                                fill="url(#kinkGrad)"
                            />

                            {/* Main Curve Line */}
                            <path 
                                d={pathStr} 
                                fill="none" 
                                stroke="url(#lineGrad)" 
                                strokeWidth="2.5" 
                            />

                            {/* Active Dot */}
                            {utilization > 0 && (
                                <g>
                                    <circle 
                                        cx={dotX} 
                                        cy={dotY} 
                                        r="6" 
                                        fill="var(--cyan)" 
                                        style={{ filter: 'drop-shadow(0 0 6px var(--cyan-glow))' }}
                                    />
                                    <circle 
                                        cx={dotX} 
                                        cy={dotY} 
                                        r="12" 
                                        fill="none" 
                                        stroke="var(--cyan)" 
                                        strokeWidth="1" 
                                        opacity="0.5"
                                        className="pulse-icon"
                                    />
                                </g>
                            )}

                            {/* Gradients definition */}
                            <defs>
                                <linearGradient id="lineGrad" x1="0" y1="1" x2="1" y2="0">
                                    <stop offset="0%" stopColor="var(--cyan)" />
                                    <stop offset="70%" stopColor="var(--purple)" />
                                    <stop offset="100%" stopColor="var(--red)" />
                                </linearGradient>
                                <linearGradient id="kinkGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="rgba(0, 242, 254, 0.15)" />
                                    <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>

                <div className="kinked-desc-area">
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                            onClick={() => setSelectedAsset('XLM')}
                            className={`btn-connect btn-sm ${selectedAsset === 'XLM' ? 'active-asset' : ''}`}
                            style={{ flex: 1, borderColor: selectedAsset === 'XLM' ? 'var(--cyan)' : 'rgba(255,255,255,0.05)' }}
                        >
                            Đường Cong XLM
                        </button>
                        <button 
                            onClick={() => setSelectedAsset('USDC')}
                            className={`btn-connect btn-sm ${selectedAsset === 'USDC' ? 'active-asset' : ''}`}
                            style={{ flex: 1, borderColor: selectedAsset === 'USDC' ? 'var(--cyan)' : 'rgba(255,255,255,0.05)' }}
                        >
                            Đường Cong USDC
                        </button>
                    </div>

                    <h3>Thuật Toán Gấp Khúc (Kinked Rate Curve)</h3>
                    <p>
                        Lãi suất vay biến thiên theo công thức gấp khúc dựa trên tỷ lệ sử dụng quỹ $U$. 
                        Khi $U \le {uOptimal}\%$, nguồn vốn dư dả, lãi suất tăng chậm để khuyến khích vay. 
                        Khi $U &gt; {uOptimal}\%$, nguồn vốn cạn kiệt, lãi suất tăng **phi mã** ({slope2}%) để buộc người đi vay trả nợ, bảo vệ tính thanh khoản của Lending Pool.
                    </p>

                    <div className="kinked-stats">
                        <div className="k-stat">
                            <span>Tổng nạp (Supplied):</span>
                            <strong>{totalSupplied.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedAsset}</strong>
                        </div>
                        <div className="k-stat">
                            <span>Tổng vay (Borrowed):</span>
                            <strong>{totalBorrowed.toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedAsset}</strong>
                        </div>
                        <div className="k-stat">
                            <span>Tỷ lệ sử dụng (U):</span>
                            <strong className="text-cyan">{utilization.toFixed(1)}%</strong>
                        </div>
                        <div className="k-stat" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                            <span>Lãi suất vay hiện tại:</span>
                            <strong className="text-purple" style={{ fontSize: '1.05rem' }}>{currentBorrowApy.toFixed(2)}% APY</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
