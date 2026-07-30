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

export const createRpcServer = (rpcUrl = DEFAULT_RPC_URL) => new rpc.Server(rpcUrl);

export const buildContractTransaction = async ({
  source,
  contractId,
  method,
  args = [],
  rpcUrl = DEFAULT_RPC_URL,
  networkPassphrase = DEFAULT_NETWORK_PASSPHRASE,
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
  rpcUrl = DEFAULT_RPC_URL,
  networkPassphrase = DEFAULT_NETWORK_PASSPHRASE,
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
  networkPassphrase = DEFAULT_NETWORK_PASSPHRASE,
  rpcUrl = DEFAULT_RPC_URL,
) => {
  const server = createRpcServer(rpcUrl);
  const transaction = TransactionBuilder.fromXDR(signedTransactionXdr, networkPassphrase);
  const response = await server.sendTransaction(transaction);

  if (response.status !== "PENDING" && response.status !== "DUPLICATE") {
    throw new Error(`Transaction submission failed with status ${response.status}.`);
  }

  return response.hash;
};

export const transactionToXdr = (transaction: Transaction | FeeBumpTransaction) => transaction.toXDR();
