export interface Reserve {
    index: number;
    symbol: 'XLM' | 'USDC';
    name: string;
    price: number;
    ltv: number;
    liquidationThreshold: number;
    supplyApy: number;
    borrowApy: number;
    totalSupplied: number;
    totalBorrowed: number;
    liquidityIndex: number;
    borrowIndex: number;
    baseRate: number;
    slope1: number;
    slope2: number;
    uOptimal: number;
}

export interface UserBalances {
    wallet: {
        XLM: number;
        USDC: number;
    };
    suppliedScaled: {
        XLM: number;
        USDC: number;
    };
    debtScaled: {
        XLM: number;
        USDC: number;
    };
    bitmap: bigint;
    ttl: number;
    currentLedger: number;
}

export interface LogLine {
    id: string;
    timestamp: string;
    type: 'SYSTEM' | 'INFO' | 'EVENT' | 'SUCCESS' | 'ERROR';
    message: string;
}

export interface LiqSandbox {
    supplyXLM: number;
    borrowUSDC: number;
    xlmPrice: number;
    stepActive: number; // 0: None, 1: Prepare done, 2: Execute done
    sessionId: string | null;
    isAutoKeeperActive: boolean; // Simulates background automated keeper bot
}

export interface Web3Tx {
    id: string;
    timestamp: string;
    type: 'SUPPLY' | 'WITHDRAW' | 'BORROW' | 'REPAY' | 'LIQUIDATION_PREPARE' | 'LIQUIDATION_EXECUTE';
    asset: 'XLM' | 'USDC';
    amount: number;
    hash: string;      // Stellar transaction hash mô phỏng
    ledger: number;
    account: string;   // Địa chỉ ví Freighter thực hiện
    cpuInstructions?: number; // CPU Instructions tiêu tốn
}


