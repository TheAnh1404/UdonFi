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

