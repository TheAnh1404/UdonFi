import { Address, nativeToScVal } from "@stellar/stellar-sdk";
import { signSorobanTransaction } from "./freighter";
import {
  buildContractTransaction,
  getNetworkPassphrase,
  getRpcUrl,
  pollTransactionStatus,
  simulateContractRead,
  submitSignedTransaction,
  transactionToXdr,
  type ContractArg,
  type TransactionPhase,
} from "./soroban";

export type ContractConfig = {
  rpcUrl: string;
  networkPassphrase: string;
  lendingPoolId: string;
  aTokenId: string;
  debtTokenId: string;
  reserveId: string;
  priceOracleId: string;
  liquidationId: string;
  defaultAssetId: string;
  usdcAssetId: string;
  reflectorContractId: string;
  oracleMode: "reflector" | "manual";
  maxPriceStalenessLedgers: number;
  usdBaseAssetId: string;
};

export type OracleStatus = {
  mode?: string;
  price_wad?: bigint;
  priceWad?: bigint;
  updated_at?: bigint | number;
  updatedAt?: bigint | number;
  current_ledger?: number;
  currentLedger?: number;
  max_staleness_ledgers?: number;
  maxStalenessLedgers?: number;
  is_stale?: boolean;
  isStale?: boolean;
};

export type UserAccountData = {
  total_collateral_usd?: bigint;
  totalCollateralUsd?: bigint;
  total_debt_usd?: bigint;
  totalDebtUsd?: bigint;
  available_borrow_usd?: bigint;
  availableBorrowUsd?: bigint;
  health_factor?: bigint;
  healthFactor?: bigint;
  current_ltv?: bigint;
  currentLtv?: bigint;
  config_bitmap?: bigint;
  configBitmap?: bigint;
};

export type ContractActionParams = {
  walletAddress: string;
  amount: string;
  assetId?: string;
  onPhase?: (phase: TransactionPhase) => void;
};

export type LiquidationActionParams = {
  walletAddress: string;
  borrower: string;
  debtAssetId?: string;
  collateralAssetId?: string;
  amount: string;
  onPhase?: (phase: TransactionPhase) => void;
};

export type ExecuteLiquidationParams = {
  walletAddress: string;
  sessionIdHex: string;
  onPhase?: (phase: TransactionPhase) => void;
};

export type SubmittedTransaction = {
  hash: string;
};

const WAD_DECIMALS = 18;
const DEFAULT_ASSET_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const DEFAULT_USDC_ASSET_ID = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

export const getContractConfig = (): ContractConfig => ({
  rpcUrl: getRpcUrl(),
  networkPassphrase: getNetworkPassphrase(),
  lendingPoolId: import.meta.env.VITE_LENDING_POOL_CONTRACT_ID || "",
  aTokenId: import.meta.env.VITE_A_TOKEN_CONTRACT_ID || "",
  debtTokenId: import.meta.env.VITE_DEBT_TOKEN_CONTRACT_ID || "",
  reserveId: import.meta.env.VITE_RESERVE_CONTRACT_ID || "",
  priceOracleId: import.meta.env.VITE_PRICE_ORACLE_CONTRACT_ID || "",
  liquidationId: import.meta.env.VITE_LIQUIDATION_CONTRACT_ID || "",
  defaultAssetId: import.meta.env.VITE_XLM_ASSET_CONTRACT_ID || DEFAULT_ASSET_ID,
  usdcAssetId: import.meta.env.VITE_USDC_ASSET_CONTRACT_ID || DEFAULT_USDC_ASSET_ID,
  reflectorContractId: import.meta.env.VITE_REFLECTOR_CONTRACT_ID || "",
  oracleMode: import.meta.env.VITE_ORACLE_MODE === "manual" ? "manual" : "reflector",
  maxPriceStalenessLedgers: Number(import.meta.env.VITE_MAX_PRICE_STALENESS_LEDGERS || 120),
  usdBaseAssetId: import.meta.env.VITE_USD_BASE_ASSET_ID || "",
});

export const hasRequiredContractIds = (config = getContractConfig()) =>
  Boolean(config.lendingPoolId && config.priceOracleId && config.liquidationId);

export const parseAssetAmount = (amount: string, decimals = 7) => {
  const normalized = amount.trim();

  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    throw new Error("Enter a positive numeric amount.");
  }

  const [whole, fraction = ""] = normalized.split(".");
  if (fraction.length > decimals) {
    throw new Error(`Amount supports at most ${decimals} decimal places.`);
  }

  const scale = 10n ** BigInt(decimals);
  const wholeUnits = BigInt(whole) * scale;
  const fractionUnits = BigInt((fraction + "0".repeat(decimals)).slice(0, decimals));
  const value = wholeUnits + fractionUnits;

  if (value <= 0n) {
    throw new Error("Amount must be greater than zero.");
  }

  return value;
};

export const formatWad = (value: unknown) => {
  if (value === undefined || value === null) {
    return "Not available";
  }

  const integer = typeof value === "bigint" ? value : BigInt(String(value));
  const scale = 10n ** BigInt(WAD_DECIMALS);
  const whole = integer / scale;
  const fraction = (integer % scale).toString().padStart(WAD_DECIMALS, "0").slice(0, 4);

  return `${whole}.${fraction}`;
};

export const wadToNumber = (value: unknown) => {
  if (value === undefined || value === null) {
    return 0;
  }

  const integer = typeof value === "bigint" ? value : BigInt(String(value));
  return Number(integer) / 10 ** WAD_DECIMALS;
};

export const formatAssetAmount = (value: unknown, decimals = 7) => {
  if (value === undefined || value === null) {
    return "0";
  }

  const integer = typeof value === "bigint" ? value : BigInt(String(value));
  const scale = 10n ** BigInt(decimals);
  const whole = integer / scale;
  const fraction = (integer % scale).toString().padStart(decimals, "0").replace(/0+$/, "");

  return fraction ? `${whole}.${fraction}` : whole.toString();
};

const addressArg = (address: string) => new Address(address).toScVal();

const i128Arg = (value: bigint) => nativeToScVal(value, { type: "i128" });

const boolArg = (value: boolean) => nativeToScVal(value);

const bytes32Arg = (hex: string) => {
  const normalized = hex.trim().replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]{64}$/.test(normalized)) {
    throw new Error("Session ID must be a 32-byte hex value.");
  }

  const bytes = new Uint8Array(32);
  for (let index = 0; index < normalized.length; index += 2) {
    bytes[index / 2] = Number.parseInt(normalized.slice(index, index + 2), 16);
  }

  return nativeToScVal(bytes);
};

const requireContractId = (contractId: string, name: string) => {
  if (!contractId) {
    throw new Error(`${name} contract ID is not configured.`);
  }

  return contractId;
};

const executeContract = async ({
  source,
  contractId,
  method,
  args,
  onPhase,
}: {
  source: string;
  contractId: string;
  method: string;
  args: ContractArg[];
  onPhase?: (phase: TransactionPhase) => void;
}): Promise<SubmittedTransaction> => {
  const config = getContractConfig();

  try {
    onPhase?.("preparing");
    const preparedTransaction = await buildContractTransaction({
      source,
      contractId,
      method,
      args,
      rpcUrl: config.rpcUrl,
      networkPassphrase: config.networkPassphrase,
    });

    onPhase?.("signing");
    const signedXdr = await signSorobanTransaction(
      transactionToXdr(preparedTransaction),
      config.networkPassphrase,
      source,
    );

    onPhase?.("submitting");
    const hash = await submitSignedTransaction(signedXdr, config.networkPassphrase, config.rpcUrl);

    onPhase?.("confirming");
    await pollTransactionStatus(hash, config.rpcUrl);

    onPhase?.("success");
    return { hash };
  } catch (error) {
    onPhase?.("error");
    throw error;
  }
};

export const getReserveInfo = (source: string, assetId = getContractConfig().defaultAssetId) => {
  const config = getContractConfig();

  return simulateContractRead<Record<string, unknown>>({
    source,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "get_reserve_info",
    args: [addressArg(assetId)],
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
  });
};

export const getReserveCount = (source: string) => {
  const config = getContractConfig();

  return simulateContractRead<number>({
    source,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "get_reserve_count",
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
  });
};

export const getUserDeposit = (source: string, assetId = getContractConfig().defaultAssetId) => {
  const config = getContractConfig();

  return simulateContractRead<bigint>({
    source,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "get_user_deposit",
    args: [addressArg(source), addressArg(assetId)],
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
  });
};

export const getUserDebt = (source: string, assetId = getContractConfig().defaultAssetId) => {
  const config = getContractConfig();

  return simulateContractRead<bigint>({
    source,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "get_user_debt",
    args: [addressArg(source), addressArg(assetId)],
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
  });
};

export const getHealthFactor = (source: string) => {
  const config = getContractConfig();

  return simulateContractRead<bigint>({
    source,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "get_health_factor",
    args: [addressArg(source)],
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
  });
};

export const getUserData = (source: string) => {
  const config = getContractConfig();

  return simulateContractRead<UserAccountData>({
    source,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "get_user_data",
    args: [addressArg(source)],
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
  });
};

export const getOraclePrice = (source: string, assetId = getContractConfig().defaultAssetId) => {
  const config = getContractConfig();

  return simulateContractRead<bigint>({
    source,
    contractId: requireContractId(config.priceOracleId, "Price oracle"),
    method: "get_price_wad",
    args: [addressArg(assetId)],
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
  });
};

export const getOracleStatus = (source: string, assetId = getContractConfig().defaultAssetId) => {
  const config = getContractConfig();

  return simulateContractRead<OracleStatus>({
    source,
    contractId: requireContractId(config.priceOracleId, "Price oracle"),
    method: "get_oracle_status",
    args: [addressArg(assetId)],
    rpcUrl: config.rpcUrl,
    networkPassphrase: config.networkPassphrase,
  });
};

export const initializeProtocol = (walletAddress: string, onPhase?: (phase: TransactionPhase) => void) => {
  const config = getContractConfig();

  return executeContract({
    source: walletAddress,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "initialize",
    args: [addressArg(walletAddress), addressArg(config.priceOracleId), addressArg(walletAddress)],
    onPhase,
  });
};

export const deposit = ({ walletAddress, amount, assetId, onPhase }: ContractActionParams) => {
  const config = getContractConfig();
  const targetAsset = assetId || config.defaultAssetId;

  return executeContract({
    source: walletAddress,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "supply",
    args: [addressArg(walletAddress), addressArg(targetAsset), i128Arg(parseAssetAmount(amount))],
    onPhase,
  });
};

export const withdraw = ({ walletAddress, amount, assetId, onPhase }: ContractActionParams) => {
  const config = getContractConfig();
  const targetAsset = assetId || config.defaultAssetId;

  return executeContract({
    source: walletAddress,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "withdraw",
    args: [addressArg(walletAddress), addressArg(targetAsset), i128Arg(parseAssetAmount(amount))],
    onPhase,
  });
};

export const borrow = ({ walletAddress, amount, assetId, onPhase }: ContractActionParams) => {
  const config = getContractConfig();
  const targetAsset = assetId || config.defaultAssetId;

  return executeContract({
    source: walletAddress,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "borrow",
    args: [addressArg(walletAddress), addressArg(targetAsset), i128Arg(parseAssetAmount(amount))],
    onPhase,
  });
};

export const repay = ({ walletAddress, amount, assetId, onPhase }: ContractActionParams) => {
  const config = getContractConfig();
  const targetAsset = assetId || config.defaultAssetId;

  return executeContract({
    source: walletAddress,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "repay",
    args: [addressArg(walletAddress), addressArg(targetAsset), i128Arg(parseAssetAmount(amount))],
    onPhase,
  });
};

export const toggleCollateral = ({
  walletAddress,
  assetId,
  useAsCollateral,
  onPhase,
}: {
  walletAddress: string;
  assetId?: string;
  useAsCollateral: boolean;
  onPhase?: (phase: TransactionPhase) => void;
}) => {
  const config = getContractConfig();
  const targetAsset = assetId || config.defaultAssetId;

  return executeContract({
    source: walletAddress,
    contractId: requireContractId(config.lendingPoolId, "Lending pool"),
    method: "toggle_collateral",
    args: [addressArg(walletAddress), addressArg(targetAsset), boolArg(useAsCollateral)],
    onPhase,
  });
};

export const prepareLiquidation = ({
  walletAddress,
  borrower,
  debtAssetId,
  collateralAssetId,
  amount,
  onPhase,
}: LiquidationActionParams) => {
  const config = getContractConfig();
  const debtAsset = debtAssetId || config.defaultAssetId;
  const collateralAsset = collateralAssetId || config.defaultAssetId;

  return executeContract({
    source: walletAddress,
    contractId: requireContractId(config.liquidationId, "Liquidation"),
    method: "prepare_liquidation",
    args: [
      addressArg(walletAddress),
      addressArg(borrower),
      addressArg(debtAsset),
      addressArg(collateralAsset),
      i128Arg(parseAssetAmount(amount)),
    ],
    onPhase,
  });
};

export const executeLiquidation = ({ walletAddress, sessionIdHex, onPhase }: ExecuteLiquidationParams) => {
  const config = getContractConfig();

  return executeContract({
    source: walletAddress,
    contractId: requireContractId(config.liquidationId, "Liquidation"),
    method: "execute_liquidation",
    args: [addressArg(walletAddress), bytes32Arg(sessionIdHex)],
    onPhase,
  });
};
