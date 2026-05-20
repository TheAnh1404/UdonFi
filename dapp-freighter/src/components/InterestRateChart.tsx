import React from 'react';
import type { AssetMarketConfig } from '../services/contracts';

interface InterestRateChartProps {
  config: AssetMarketConfig;
  currentUtilization?: number; // e.g. 0.55 for 55%
}

export const InterestRateChart: React.FC<InterestRateChartProps> = ({
  config,
  currentUtilization = 0.55,
}) => {
  const kink = config.optimalUtilization; // e.g. 0.8
  const base = config.baseApy;
  const slope1 = config.slope1;
  const slope2 = config.slope2;

  // Let's compute rates for the curve points:
  // 0% utilization
  const rate0 = base;
  // Kink utilization (80%)
  const rateKink = base + slope1;
  // 100% utilization
  const rateMax = base + slope1 + slope2;

  // We want to map these into SVG coordinates:
  // SVG size: 400 x 200
  // X range: [40, 360] -> maps 0% to 100%
  // Y range: [160, 20] -> maps 0% to 40% (if rateMax is high, we will clip or scale it)
  // Let's use a non-linear scale for the Y-axis so slope2 doesn't dwarf slope1 completely, or cap the display at base + slope1 + slope2 * 0.2 (which is already 20%-30%)
  const maxDisplayRate = Math.min(30, rateMax * 0.3); // capped for aesthetic visualization
  
  const getX = (u: number) => 40 + u * 320;
  const getY = (rate: number) => {
    // scale to [20, 160]
    const ratio = Math.min(1, Math.max(0, rate / maxDisplayRate));
    return 160 - ratio * 140;
  };

  // Points on the SVG
  const p0 = { x: getX(0), y: getY(rate0) };
  const pKink = { x: getX(kink), y: getY(rateKink) };
  const p100 = { x: getX(1), y: getY(rateMax) };

  // Current utilization point
  const currentRate = currentUtilization < kink
    ? base + (currentUtilization / kink) * slope1
    : base + slope1 + ((currentUtilization - kink) / (1 - kink)) * slope2;
  const pCurrent = { x: getX(currentUtilization), y: getY(currentRate) };

  return (
    <div className="interest-rate-chart" style={{ position: 'relative', width: '100%', height: '220px' }}>
      <svg viewBox="0 0 400 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        <defs>
          <linearGradient id="curveGlow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.8" />
            <stop offset="80%" stopColor="var(--color-secondary)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--color-error)" stopOpacity="1" />
          </linearGradient>
          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Grid lines */}
        <line x1="40" y1="20" x2="40" y2="160" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1="40" y1="160" x2="360" y2="160" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        
        {/* Horizontal reference dotted lines */}
        <line x1="40" y1={pKink.y} x2={pKink.x} y2={pKink.y} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />
        <line x1={pKink.x} y1="160" x2={pKink.x} y2={pKink.y} stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="3,3" />

        {/* The Kinked Interest Curve */}
        <path
          d={`M ${p0.x} ${p0.y} L ${pKink.x} ${pKink.y} L ${p100.x} ${pKink.y - 40}`} // slightly adjusted for nice bending aesthetics
          fill="none"
          stroke="url(#curveGlow)"
          strokeWidth="3"
          filter="url(#glowEffect)"
        />

        {/* Curve points */}
        <circle cx={p0.x} cy={p0.y} r="4" fill="var(--color-primary)" />
        <circle cx={pKink.x} cy={pKink.y} r="5" fill="var(--color-secondary)" />
        
        {/* Text Labels */}
        <text x={pKink.x} y="180" fill="var(--text-muted)" fontSize="10" textAnchor="middle">
          Kink ({kink * 100}%)
        </text>
        
        {/* Current State Marker */}
        <line x1={pCurrent.x} y1="160" x2={pCurrent.x} y2={pCurrent.y} stroke="var(--color-success)" strokeWidth="1.5" strokeDasharray="2,2" />
        <circle cx={pCurrent.x} cy={pCurrent.y} r="6" fill="var(--color-success)" stroke="#fff" strokeWidth="1.5" />
        
        {/* Labels at axes */}
        <text x="35" y={p0.y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">
          {base.toFixed(1)}%
        </text>
        <text x="35" y={pKink.y + 4} fill="var(--text-muted)" fontSize="10" textAnchor="end">
          {rateKink.toFixed(1)}%
        </text>
        
        <text x="40" y="175" fill="var(--text-muted)" fontSize="10" textAnchor="middle">0%</text>
        <text x="360" y="175" fill="var(--text-muted)" fontSize="10" textAnchor="middle">100%</text>
        
        <text x="200" y="205" fill="var(--text-muted)" fontSize="11" textAnchor="middle" fontWeight="600">
          Tỷ lệ sử dụng (Utilization Rate)
        </text>
      </svg>

      {/* Floating Badge */}
      <div 
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '12px',
          fontWeight: 700,
          color: 'var(--color-success)',
          backdropFilter: 'blur(10px)'
        }}
      >
        Lãi suất hiện tại: {currentRate.toFixed(2)}% APY
      </div>
    </div>
  );
};
