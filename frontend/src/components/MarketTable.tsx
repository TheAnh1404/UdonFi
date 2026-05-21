import React from 'react';
import { Landmark, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import type { Reserve, UserBalances } from '../types/lending';

interface MarketTableProps {
    reserves: Record<'XLM' | 'USDC', Reserve>;
    userBalances: UserBalances;
    onAction: (action: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY', asset: 'XLM' | 'USDC') => void;
}

export const MarketTable: React.FC<MarketTableProps> = ({ reserves, userBalances, onAction }) => {
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
