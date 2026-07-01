import React, { useState } from 'react';

interface SorobanBitmapProps {
    bitmap: bigint;
    onToggleBit: (bitIndex: number) => void;
}

export const SorobanBitmap: React.FC<SorobanBitmapProps> = ({ bitmap, onToggleBit }) => {
    const [selectedBit, setSelectedBit] = useState<number>(0);

    // Create 128 LED nodes (0 to 127)
    const bits: number[] = Array.from({ length: 128 }, (_, i) => i);

    // Asset translation mapping
    const getBitExplanation = (index: number) => {
        const assetIndex = Math.floor(index / 2);
        const isBorrowFlag = index % 2 === 1;
        const assetName = assetIndex === 0 ? 'XLM' : assetIndex === 1 ? 'USDC' : `Asset #${assetIndex}`;

        // eslint-disable-next-line no-useless-assignment
        let description = '';
        // eslint-disable-next-line prefer-const
        let isInteractive = assetIndex < 2; // only XLM and USDC are simulated in details

        if (isBorrowFlag) {
            description = `Cờ vay nợ (Borrow Flag) của ${assetName}. Khi bật (1), chứng tỏ người dùng đang có số dư nợ đối với tài sản này.`;
        } else {
            description = `Cờ thế chấp (Collateral Flag) của ${assetName}. Khi bật (1), số dư nạp của tài sản này sẽ được tính vào tổng tài sản thế chấp để làm hạn mức vay.`;
        }

        return {
            assetIndex,
            isBorrowFlag,
            assetName,
            description,
            isInteractive
        };
    };

    const exp = getBitExplanation(selectedBit);
    const isBitOn = ((bitmap >> BigInt(selectedBit)) & 1n) === 1n;

    // Convert bitmap to hex with padding
    const toHexStr = (val: bigint) => {
        // eslint-disable-next-line prefer-const
        let hex = val.toString(16);
        // Pad to 32 characters for 128-bit hex representation
        return '0x' + hex.padStart(32, '0').toUpperCase();
    };

    return (
        <div className="soroban-tab-content active">
            <div className="bitmap-matrix-container">
                <div>
                    <div className="bitmap-desc">
                        <h3>Lưới Matrix 128-bit Bitmap Trạng Thái</h3>
                        <p>
                            Hợp đồng Soroban của UdonFi sử dụng một biến u128 bitmap duy nhất để quản lý trạng thái tài sản thế chấp và nợ của tài khoản. 
                            Mỗi tài sản chiếm 2 bit: <strong>Bit 2i</strong> là trạng thái Thế chấp, <strong>Bit 2i + 1</strong> là trạng thái Nợ.
                        </p>
                        <p style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '0.75rem 0' }}>
                            <span className="legend-item" style={{ display: 'inline-flex' }}>
                                <span className="color-box bg-cyan"></span>
                                <span>Thế chấp bật (Collateral ON)</span>
                            </span>
                            <span className="legend-item" style={{ display: 'inline-flex' }}>
                                <span className="color-box bg-purple"></span>
                                <span>Vay nợ bật (Borrow ON)</span>
                            </span>
                            <span className="legend-item" style={{ display: 'inline-flex' }}>
                                <span className="color-box" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.05)' }}></span>
                                <span>Tắt (OFF / 0)</span>
                            </span>
                        </p>
                    </div>

                    <div className="bitmap-grid">
                        {bits.map((bitIndex) => {
                            const isOn = ((bitmap >> BigInt(bitIndex)) & 1n) === 1n;
                            const isBorrow = bitIndex % 2 === 1;

                            let nodeClass = 'led-node';
                            if (isOn) {
                                nodeClass += isBorrow ? ' borrow-on' : ' collateral-on';
                            }
                            if (selectedBit === bitIndex) {
                                nodeClass += ' selected';
                            }

                            return (
                                <div
                                    key={bitIndex}
                                    className={nodeClass}
                                    onClick={() => setSelectedBit(bitIndex)}
                                    title={`Bit #${bitIndex}: ${isBorrow ? 'Borrow' : 'Collateral'}`}
                                ></div>
                            );
                        })}
                    </div>
                </div>

                <div className="bitmap-info-sidebar">
                    <div>
                        <span className="info-title">Trình Dịch Toán Học Bitmap</span>
                        <div className="selected-bit-box">
                            <span className="bit-index-display">#{selectedBit}</span>
                            <span className="bit-status-desc" style={{ fontWeight: 600 }}>
                                {exp.isBorrowFlag ? 'BORROW FLAG' : 'COLLATERAL FLAG'} ({exp.assetName})
                            </span>
                            <div className={`badge ${isBitOn ? 'badge-success' : 'badge-danger'}`} style={{ marginTop: '0.4rem' }}>
                                {isBitOn ? 'GIÁ TRỊ: 1 (BẬT)' : 'GIÁ TRỊ: 0 (TẮT)'}
                            </div>
                        </div>
                        <p style={{ fontSize: '0.8rem', lineHeight: '1.4', background: 'rgba(255,255,255,0.01)', padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
                            {exp.description}
                        </p>

                        {exp.isInteractive && (
                            <button
                                onClick={() => onToggleBit(selectedBit)}
                                className="btn btn-connect btn-sm btn-block"
                                style={{ marginTop: '0.75rem', borderColor: 'var(--yellow)', color: 'var(--yellow)' }}
                            >
                                {isBitOn ? 'Tắt Bit này (Simulate)' : 'Bật Bit này (Simulate)'}
                            </button>
                        )}
                    </div>

                    <div className="bitmap-math">
                        <strong>Lưu trữ u128 trong Ledger (Hex):</strong>
                        <div className="bitmap-val-hex">{toHexStr(bitmap)}</div>
                        <strong style={{ display: 'block', marginTop: '0.5rem' }}>Số thập phân u128:</strong>
                        <div className="bitmap-val-dec">{bitmap.toString()}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};
