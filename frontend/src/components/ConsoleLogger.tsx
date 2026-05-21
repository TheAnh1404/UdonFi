import React, { useEffect, useRef } from 'react';
import { Terminal, Trash2 } from 'lucide-react';
import type { LogLine } from '../types/lending';

interface ConsoleLoggerProps {
    logs: LogLine[];
    onClear: () => void;
}

export const ConsoleLogger: React.FC<ConsoleLoggerProps> = ({ logs, onClear }) => {
    const consoleEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom whenever logs change
    useEffect(() => {
        if (consoleEndRef.current) {
            consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    return (
        <div className="card glass-card console-card">
            <div className="card-header">
                <h3>
                    <Terminal className="text-yellow" size={18} />
                    <span>Horizon & Soroban RPC Event Simulator</span>
                </h3>
                <button onClick={onClear} className="btn-clear-console" title="Xóa logs">
                    <Trash2 size={16} />
                </button>
            </div>
            <div className="card-body" style={{ padding: '1rem' }}>
                <div className="console-body">
                    {logs.length === 0 ? (
                        <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
                            [System] Đang chờ sự kiện giao dịch mạng thử nghiệm Soroban...
                        </div>
                    ) : (
                        logs.map((log) => (
                            <div key={log.id} className={`log-line ${log.type.toLowerCase()}`}>
                                <span style={{ color: 'var(--text-dim)', marginRight: '0.5rem' }}>
                                    {log.timestamp}
                                </span>
                                <strong>[{log.type}]</strong> {log.message}
                            </div>
                        ))
                    )}
                    <div ref={consoleEndRef} />
                </div>
            </div>
        </div>
    );
};
