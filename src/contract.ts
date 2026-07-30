import { Address, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import {
  buildContractTransaction,
  simulateContractRead,
  submitSignedTransaction,
} from "./soroban";
import { signSorobanTransaction } from "./freighter";

export type SupplyParams = {
  caller: string;
  asset: string;
  amount: bigint;
  contractId: string;
  networkPassphrase?: string;
  rpcUrl?: string;
};

export const supplyCollateral = async ({
  caller,
  asset,
  amount,
  contractId,
  networkPassphrase,
  rpcUrl,
}: SupplyParams) => {
  const args = [
    new Address(caller).toScVal(),
    new Address(asset).toScVal(),
    nativeToScVal(amount, { type: "i128" }),
  ];

  const preparedTx = await buildContractTransaction({
    source: caller,
    contractId,
    method: "supply",
    args,
    networkPassphrase,
    rpcUrl,
  });

  const signedXdr = await signSorobanTransaction(
    preparedTx.toXDR(),
    networkPassphrase || "Test SDF Network ; September 2015",
    caller,
  );

  return submitSignedTransaction(signedXdr, networkPassphrase, rpcUrl);
};

export const getUserHealthFactor = async (
  userAddress: string,
  lendingPoolContractId: string,
) => {
  const args = [new Address(userAddress).toScVal()];
  const rawHf = await simulateContractRead<bigint>({
    source: userAddress,
    contractId: lendingPoolContractId,
    method: "get_health_factor",
    args,
  });

  if (rawHf === undefined) return 0;
  return Number(rawHf) / 1e18;
};
