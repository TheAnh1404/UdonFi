// UdonFi Soroban Smart Contract Information

export interface AssetMarketConfig {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  price: number;
  ltv: number;
  liqThreshold: number;
  liqBonus: number;
  baseApy: number;
  slope1: number;
  slope2: number;
  optimalUtilization: number; // e.g. 0.8 (80%)
  icon: string;
}

// Active market configs corresponding to Soroban pool constants
export const ACTIVE_MARKETS: AssetMarketConfig[] = [
  {
    id: '1',
    name: 'Stellar Native',
    symbol: 'XLM',
    decimals: 7,
    price: 0.12,
    ltv: 0.70,
    liqThreshold: 0.75,
    liqBonus: 0.05,
    baseApy: 1.5,
    slope1: 3.5,
    slope2: 80.0,
    optimalUtilization: 0.8,
    icon: '🚀'
  },
  {
    id: '2',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 7,
    price: 1.00,
    ltv: 0.80,
    liqThreshold: 0.85,
    liqBonus: 0.04,
    baseApy: 2.0,
    slope1: 6.0,
    slope2: 120.0,
    optimalUtilization: 0.8,
    icon: '💵'
  },
  {
    id: '3',
    name: 'Euro Coin',
    symbol: 'EURC',
    decimals: 7,
    price: 1.08,
    ltv: 0.80,
    liqThreshold: 0.85,
    liqBonus: 0.04,
    baseApy: 1.8,
    slope1: 5.5,
    slope2: 100.0,
    optimalUtilization: 0.8,
    icon: '💶'
  },
  {
    id: '4',
    name: 'Tether',
    symbol: 'USDT',
    decimals: 7,
    price: 1.00,
    ltv: 0.75,
    liqThreshold: 0.80,
    liqBonus: 0.05,
    baseApy: 2.5,
    slope1: 7.0,
    slope2: 150.0,
    optimalUtilization: 0.8,
    icon: '₮'
  },
  {
    id: '5',
    name: 'Wrapped Ethereum',
    symbol: 'ETH',
    decimals: 7,
    price: 3000.00,
    ltv: 0.65,
    liqThreshold: 0.70,
    liqBonus: 0.06,
    baseApy: 1.0,
    slope1: 4.0,
    slope2: 90.0,
    optimalUtilization: 0.8,
    icon: '🔷'
  }
];

export const CONTRACT_IDS = {
  LENDING_POOL: 'CAQRYQXLNBFXCKNCN3UIVGL2OCR6EL3QURZ56ZC2B4YMPYY6JAVXLBBH',
  PRICE_ORACLE: 'CDO3UIVGL2OCR6EL3QURZ56ZC2B4YMPYY6JAVXLBBHCAQRYQXLNBFXCKN',
  LIQUIDATION: 'CBLIQ2OCR6EL3QURZ56ZC2B4YMPYY6JAVXLBBHCAQRYQXLNBFXCKNCN3UI',
  RESERVE: 'CBRES2B4YMPYY6JAVXLBBHCAQRYQXLNBFXCKNCN3UIVGL2OCR6EL3QURZ56',
};
