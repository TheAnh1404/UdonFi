// UdonFi Format & Math Utilities

export const WAD = 1000000000000000000n; // 10^18
export const RAY = 1000000000000000000000000000n; // 10^27

/**
 * Formats a raw number or string as USD currency
 */
export const formatUSD = (val: number | string): string => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '$0.00';
  return num.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formats token balances nicely with adjustable decimals
 */
export const formatTokenAmount = (val: number | string, decimals = 4): string => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return num.toLocaleString('vi-VN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formats APY and other percentages
 */
export const formatPercent = (val: number): string => {
  if (isNaN(val)) return '0.00%';
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`;
};

/**
 * Helper to truncate a public key for UI space-saver
 */
export const truncateAddress = (addr: string | null): string => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

/**
 * Convert BigInt scaled balance from Soroban to human readable number
 * actual_balance = scaled_balance * index / RAY
 */
export const fromScaledBalance = (scaled: bigint, index: bigint): number => {
  const scale = Number(scaled) / 1e7; // assuming decimals is 7 for basic Stellar assets
  const ind = Number(index) / 1e27;
  return scale * ind;
};

/**
 * Convert WAD value (10^18) to float number
 */
export const fromWad = (wad: bigint | number): number => {
  return Number(wad) / 1e18;
};

/**
 * Convert RAY value (10^27) to float number
 */
export const fromRay = (ray: bigint | number): number => {
  return Number(ray) / 1e27;
};
