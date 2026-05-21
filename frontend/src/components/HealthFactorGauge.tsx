import React from 'react';
import { ShieldCheck, Info } from 'lucide-react';

interface HealthFactorGaugeProps {
    healthFactor: number;
}

export const HealthFactorGauge: React.FC<HealthFactorGaugeProps> = ({ healthFactor }) => {
    const isInfinite = healthFactor === Infinity || isNaN(healthFactor);

    // Calculate Dashoffset: radial length = 314
    // Capped between 1.0 (empty) and 3.0 (full)
    const capped = Math.max(1.0, Math.min(3.0, healthFactor));
    const dashOffset = isInfinite ? 0 : 314 - ((capped - 1.0) / 2.0) * 314;

    let strokeColor = 'var(--green)';
    let statusText = 'An Toàn';
    let statusClass = 'gauge-label text-green';

    if (!isInfinite) {
        if (healthFactor > 1.5) {
            strokeColor = 'var(--green)';
            statusText = 'An Toàn';
            statusClass = 'gauge-label text-green';
        } else if (healthFactor >= 1.0) {
            strokeColor = 'var(--yellow)';
            statusText = 'Rủi Ro Cao';
            statusClass = 'gauge-label text-yellow';
        } else {
            strokeColor = 'var(--red)';
            statusText = 'THANH LÝ!';
            statusClass = 'gauge-label text-red animated-pulse';
        }
    }

    return (
        <div className="card glass-card hf-card">
            <div className="card-header">
                <h3>
                    <ShieldCheck className="text-cyan" size={18} />
                    <span>Hệ Số Sức Khỏe (Health Factor)</span>
                </h3>
                <span className="info-tooltip" title="Hệ số đo lường độ an toàn của tài sản thế chấp so với khoản vay. Dưới 1.0 sẽ bị thanh lý.">
                    <Info size={14} />
                </span>
            </div>
            <div className="card-body hf-body">
                <div className="gauge-container">
                    <svg className="radial-gauge" viewBox="0 0 120 120">
                        <circle className="gauge-bg" cx="60" cy="60" r="50"></circle>
                        <circle 
                            className="gauge-fill" 
                            cx="60" 
                            cy="60" 
                            r="50"
                            style={{
                                strokeDashoffset: dashOffset,
                                stroke: strokeColor
                            }}
                        ></circle>
                    </svg>
                    <div className="gauge-text">
                        <span className="gauge-val">
                            {isInfinite ? '∞' : healthFactor.toFixed(2)}
                        </span>
                        <span className={statusClass}>{statusText}</span>
                    </div>
                </div>
                <div className="hf-legend">
                    <div className="legend-item">
                        <div className="legend-left">
                            <span className="color-dot bg-green animated-pulse-green"></span>
                            <span className="legend-range">&gt; 1.5</span>
                        </div>
                        <span className="legend-badge green-badge">An Toàn</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-left">
                            <span className="color-dot bg-yellow"></span>
                            <span className="legend-range">1.0 - 1.5</span>
                        </div>
                        <span className="legend-badge yellow-badge">Rủi Ro</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-left">
                            <span className="color-dot bg-red animated-pulse-red"></span>
                            <span className="legend-range">&lt; 1.0</span>
                        </div>
                        <span className="legend-badge red-badge">Thanh Lý</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
