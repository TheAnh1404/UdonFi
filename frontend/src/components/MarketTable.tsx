import React from 'react';
import { Landmark, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { Reserve, UserBalances } from '../types/lending';

interface MarketTableProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    userBalances: UserBalances;
    onAction: (action: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY', asset: 'XLM' | 'USDC') => void;
    onToggleCollateral: (symbol: 'XLM' | 'USDC', useAsCollateral: boolean) => void;
}

export const MarketTable: React.FC<MarketTableProps> = ({ reserves, userBalances, onAction, onToggleCollateral }) => {
    const assets: ('XLM' | 'USDC')[] = ['XLM', 'USDC'];

    return (
        <div className="card glass-card market-card">
            <div className="card-header">
                <h3>
                    <Landmark className="text-cyan" size={18} />
                    <span>Thị Trường Tín Dụng UdonFi</span>
                </h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
                <table className="market-table">
                    <thead>
                        <tr>
                            <th>Tài Sản</th>
                            <th>Giá Cả</th>
                            <th>Lãi Nạp (APY)</th>
                            <th>Lãi Vay (APY)</th>
                            <th>Thế Chấp</th>
                            <th>Nạp / Vay của bạn</th>
                            <th className="text-right">Thao Tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((symbol) => {
                            const reserve = reserves[symbol];
                            const suppliedActual = userBalances.suppliedScaled[symbol] * reserve.liquidityIndex;
                            const debtActual = userBalances.debtScaled[symbol] * reserve.borrowIndex;

                            return (
                                <tr key={symbol}>
                                    <td>
                                        <div className="asset-cell">
                                            <div className={`asset-logo ${symbol.toLowerCase()}-logo`}></div>
                                            <div>
                                                <span className="asset-sym">{symbol}</span>
                                                <span className="asset-name">{reserve.name}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="asset-price text-cyan">
                                            ${reserve.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-green" style={{ fontWeight: 600 }}>
                                            {reserve.supplyApy.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td>
                                        <span className="text-purple" style={{ fontWeight: 600 }}>
                                            {reserve.borrowApy.toFixed(2)}%
                                        </span>
                                    </td>
                                    <td>
                                        {/* Collateral Toggle Switch */}
                                        {(() => {
                                            const isCollateral = symbol === 'XLM' 
                                                ? ((userBalances.bitmap & 1n) === 1n)
                                                : ((userBalances.bitmap & 4n) === 4n);
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '38px', height: '20px' }}>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isCollateral}
                                                            disabled={suppliedActual <= 0}
                                                            onChange={(e) => onToggleCollateral(symbol, e.target.checked)}
                                                            style={{ opacity: 0, width: 0, height: 0 }}
                                                        />
                                                        <span className="slider round" style={{
                                                            position: 'absolute',
                                                            cursor: suppliedActual > 0 ? 'pointer' : 'not-allowed',
                                                            top: 0, left: 0, right: 0, bottom: 0,
                                                            backgroundColor: isCollateral ? 'var(--cyan)' : 'rgba(255,255,255,0.08)',
                                                            boxShadow: isCollateral ? '0 0 10px rgba(0, 243, 255, 0.4)' : 'none',
                                                            transition: '.4s',
                                                            borderRadius: '34px'
                                                        }}>
                                                            <span className="slider-dot" style={{
                                                                position: 'absolute',
                                                                content: '""',
                                                                height: '14px',
                                                                width: '14px',
                                                                left: isCollateral ? '20px' : '3px',
                                                                bottom: '3px',
                                                                backgroundColor: suppliedActual > 0 ? '#fff' : '#666',
                                                                transition: '.4s',
                                                                borderRadius: '50%'
                                                            }}></span>
                                                        </span>
                                                    </label>
                                                    <span className="text-xs" style={{ 
                                                        color: isCollateral ? 'var(--cyan)' : 'var(--text-dim)',
                                                        fontWeight: isCollateral ? 'bold' : 'normal',
                                                        fontSize: '0.75rem'
                                                    }}>
                                                        {isCollateral ? 'Bật' : 'Tắt'}
                                                    </span>
                                                </div>
                                            );
                                         })()}
                                    </td>
                                    <td>
                                        <div className="balance-cell">
                                            <span className="bal-val">
                                                {suppliedActual > 0 ? (
                                                    <span className="text-green">
                                                        +{suppliedActual.toLocaleString(undefined, { maximumFractionDigits: 2 })} {symbol}
                                                    </span>
                                                ) : '-'}
                                            </span>
                                            <span className="bal-usd">
                                                {debtActual > 0 ? (
                                                    <span className="text-purple">
                                                        -{debtActual.toLocaleString(undefined, { maximumFractionDigits: 2 })} {symbol}
                                                    </span>
                                                ) : ''}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-right">
                                        <button 
                                            onClick={() => onAction('SUPPLY', symbol)} 
                                            className="btn btn-cyan btn-sm"
                                            title="Nạp tài sản để nhận lãi"
                                        >
                                            <ArrowDownLeft size={14} />
                                            <span>Nạp</span>
                                        </button>
                                        <button 
                                            onClick={() => onAction('WITHDRAW', symbol)} 
                                            className="btn btn-connect btn-sm"
                                            disabled={suppliedActual <= 0}
                                            title="Rút tài sản thế chấp về ví"
                                        >
                                            <span>Rút</span>
                                        </button>
                                        <button 
                                            onClick={() => onAction('BORROW', symbol)} 
                                            className="btn btn-purple btn-sm"
                                            title="Vay tài sản thế chấp"
                                        >
                                            <ArrowUpRight size={14} />
                                            <span>Vay</span>
                                        </button>
                                        <button 
                                            onClick={() => onAction('REPAY', symbol)} 
                                            className="btn btn-connect btn-sm"
                                            disabled={debtActual <= 0}
                                            title="Trả khoản vay hiện tại"
                                        >
                                            <span>Trả</span>
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
