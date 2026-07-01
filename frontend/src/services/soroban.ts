import {
  BASE_FEE,
  Contract,
  rpc,
  scValToNative,
  TransactionBuilder,
  type FeeBumpTransaction,
  type Transaction,
  type xdr,
} from "@stellar/stellar-sdk";

export type TransactionPhase =
  | "idle"
  | "preparing"
  | "signing"
  | "submitting"
  | "confirming"
  | "success"
  | "error";

export type ContractArg = xdr.ScVal;

export type BuildContractTransactionParams = {
  source: string;
  contractId: string;
  method: string;
  args?: ContractArg[];
  rpcUrl?: string;
  networkPassphrase?: string;
};

export const DEFAULT_RPC_URL = "https://soroban-testnet.stellar.org:443";
export const DEFAULT_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

export const getRpcUrl = () => import.meta.env.VITE_SOROBAN_RPC_URL || DEFAULT_RPC_URL;

export const getNetworkPassphrase = () =>
  import.meta.env.VITE_SOROBAN_NETWORK_PASSPHRASE || DEFAULT_NETWORK_PASSPHRASE;

export const createRpcServer = (rpcUrl = getRpcUrl()) => new rpc.Server(rpcUrl);

export const buildContractTransaction = async ({
  source,
  contractId,
  method,
  args = [],
  rpcUrl = getRpcUrl(),
  networkPassphrase = getNetworkPassphrase(),
}: BuildContractTransactionParams) => {
  const server = createRpcServer(rpcUrl);
  const account = await server.getAccount(source);
  const contract = new Contract(contractId);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  return server.prepareTransaction(transaction);
};

export const simulateContractRead = async <T>({
  source,
  contractId,
  method,
  args = [],
  rpcUrl = getRpcUrl(),
  networkPassphrase = getNetworkPassphrase(),
}: BuildContractTransactionParams): Promise<T | undefined> => {
  const server = createRpcServer(rpcUrl);
  const account = await server.getAccount(source);
  const contract = new Contract(contractId);

  const transaction = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(300)
    .build();

  const simulation = await server.simulateTransaction(transaction);

  if ("error" in simulation) {
    throw new Error(simulation.error || `Simulation failed for ${method}.`);
  }

  if (!simulation.result) {
    return undefined;
  }

  return scValToNative(simulation.result.retval) as T;
};

export const submitSignedTransaction = async (
  signedTransactionXdr: string,
  networkPassphrase = getNetworkPassphrase(),
  rpcUrl = getRpcUrl(),
) => {
  const server = createRpcServer(rpcUrl);
  const transaction = TransactionBuilder.fromXDR(signedTransactionXdr, networkPassphrase);
  const response = await server.sendTransaction(transaction);

  if (response.status !== "PENDING" && response.status !== "DUPLICATE") {
    throw new Error(`Transaction submission failed with status ${response.status}.`);
  }

  return response.hash;
};

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const pollTransactionStatus = async (
  txHash: string,
  rpcUrl = getRpcUrl(),
  maxAttempts = 30,
) => {
  const server = createRpcServer(rpcUrl);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await server.getTransaction(txHash);

    if (response.status === "SUCCESS") {
      return response;
    }

    if (response.status === "FAILED") {
      throw new Error(`Transaction ${txHash} failed on-chain.`);
    }

    await sleep(1000);
  }

  throw new Error(`Transaction ${txHash} was not confirmed before the timeout.`);
};

export const transactionToXdr = (transaction: Transaction | FeeBumpTransaction) => transaction.toXDR();
