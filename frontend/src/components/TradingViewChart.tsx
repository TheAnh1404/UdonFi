import React, { useEffect, useRef, useState } from 'react';
import { AreaChart, Eye, EyeOff, TrendingUp } from 'lucide-react';

export const TradingViewChart: React.FC = () => {
    const container = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState<boolean>(true);

    useEffect(() => {
        if (!container.current || !isVisible) return;

        // Clear previous chart wrapper if any
        container.current.innerHTML = '';

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
        script.type = 'text/javascript';
        script.async = true;
        script.innerHTML = JSON.stringify({
            autosize: true,
            symbol: "KRAKEN:XLMUSD",
            interval: "1",
            timezone: "Asia/Ho_Chi_Minh",
            theme: "dark",
            style: "1",
            locale: "vi",
            enable_publishing: false,
            allow_symbol_change: false,
            save_image: false,
            calendar: false,
            hide_volume: false,
            support_host: "https://www.tradingview.com",
            backgroundColor: "rgba(10, 15, 30, 0.6)",
            gridColor: "rgba(255, 255, 255, 0.04)",
            container_id: "tradingview_udonfi_chart"
        });

        container.current.appendChild(script);
    }, [isVisible]);

    return (
        <div className="card glass-card glow-cyan" style={{ width: '100%', marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: 0 }}>
                    <AreaChart className="text-cyan animate-pulse" size={18} />
                    <span>Biểu Đồ Kỹ Thuật XLM/USDC Realtime</span>
                    <span className="badge badge-network" style={{
                        fontSize: '0.65rem',
                        background: 'rgba(0, 243, 255, 0.1)',
                        borderColor: 'rgba(0, 243, 255, 0.3)',
                        color: 'var(--cyan)'
                    }}>
                        Binance/Kraken Live Feed
                    </span>
                </h3>
                <button
                    onClick={() => setIsVisible(!isVisible)}
                    className="btn-connect btn-sm"
                    style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        borderColor: 'rgba(255, 255, 255, 0.1)'
                    }}
                >
                    {isVisible ? (
                        <>
                            <EyeOff size={12} />
                            <span>Ẩn biểu đồ</span>
                        </>
                    ) : (
                        <>
                            <Eye size={12} />
                            <span>Hiện biểu đồ</span>
                        </>
                    )}
                </button>
            </div>
            
            {isVisible ? (
                <div className="card-body" style={{ padding: '0.75rem', position: 'relative' }}>
                    {/* TradingView Container */}
                    <div 
                        id="tradingview_udonfi_chart" 
                        ref={container} 
                        style={{ 
                            height: "380px", 
                            width: "100%",
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            background: 'rgba(10, 15, 30, 0.8)'
                        }} 
                    />
                    
                    {/* Real-time Indicator Glow */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '0.6rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-dim)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <span className="dot-active animate-pulse" style={{ backgroundColor: 'var(--green)' }}></span>
                            <span>Trực tiếp từ Kraken WebSockets (Độ trễ &lt; 50ms)</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <TrendingUp size={12} className="text-cyan" />
                            <span>Hỗ trợ vẽ kỹ thuật &amp; hơn 100 chỉ số phân tích</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="card-body" style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-dim)',
                    background: 'rgba(255, 255, 255, 0.01)',
                    borderRadius: '0 0 16px 16px'
                }}>
                    Biểu đồ thời gian thực đã được thu gọn để tối ưu hóa không gian hiển thị vị thế tài chính. Nhấn nút <strong>Hiện biểu đồ</strong> để tiếp tục theo dõi thị trường.
                </div>
            )}
        </div>
    );
};
