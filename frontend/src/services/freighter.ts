import {
  getAddress,
  getNetworkDetails,
  isAllowed,
  isConnected,
  setAllowed,
  signTransaction,
} from "@stellar/freighter-api";

export type FreighterWallet = {
  publicKey: string;
  network: string;
  networkPassphrase: string;
  sorobanRpcUrl?: string;
};

const freighterErrorMessage = (error: unknown) => {
  if (!error) {
    return "Freighter request failed.";
  }

  if (typeof error === "object" && "message" in error) {
    return String((error as { message?: string }).message || "Freighter request failed.");
  }

  return String(error);
};

export const checkFreighterAvailability = async () => {
  const result = await isConnected();

  if (result.error) {
    throw new Error(freighterErrorMessage(result.error));
  }

  return result.isConnected;
};

export const connectWallet = async (): Promise<FreighterWallet> => {
  const connected = await checkFreighterAvailability();
  if (!connected) {
    throw new Error("Freighter wallet extension is not available.");
  }

  const allowed = await isAllowed();
  if (allowed.error) {
    throw new Error(freighterErrorMessage(allowed.error));
  }

  if (!allowed.isAllowed) {
    const allowedAfterPrompt = await setAllowed();
    if (allowedAfterPrompt.error) {
      throw new Error(freighterErrorMessage(allowedAfterPrompt.error));
    }

    if (!allowedAfterPrompt.isAllowed) {
      throw new Error("Freighter access was not granted.");
    }
  }

  const address = await getAddress();
  if (address.error) {
    throw new Error(freighterErrorMessage(address.error));
  }

  const networkDetails = await getNetworkDetails();
  if (networkDetails.error) {
    throw new Error(freighterErrorMessage(networkDetails.error));
  }

  return {
    publicKey: address.address,
    network: networkDetails.network,
    networkPassphrase: networkDetails.networkPassphrase,
    sorobanRpcUrl: networkDetails.sorobanRpcUrl,
  };
};

export const signSorobanTransaction = async (
  transactionXdr: string,
  networkPassphrase: string,
  address: string,
) => {
  const result = await signTransaction(transactionXdr, { networkPassphrase, address });

  if (result.error) {
    throw new Error(freighterErrorMessage(result.error));
  }

  if (!result.signedTxXdr) {
    throw new Error("Freighter returned an empty signed transaction.");
  }

  return result.signedTxXdr;
};
