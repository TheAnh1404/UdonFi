import {
  getAddress,
  getNetworkDetails,
  isAllowed,
  isConnected,
  setAllowed,
  signTransaction,
} from "@stellar/freighter-api";

export type WalletType = "freighter" | "stellar-wallets-kit" | "albedo" | "xbull" | "lobstr";

export type WalletConnection = {
  publicKey: string;
  network: string;
  networkPassphrase: string;
  sorobanRpcUrl?: string;
  walletType: WalletType;
};

export class StellarWalletsKit {
  public network: string;
  public selectedWallet: WalletType;

  constructor(options: { network: string; selectedWalletId?: WalletType }) {
    this.network = options.network || "TESTNET";
    this.selectedWallet = options.selectedWalletId || "freighter";
  }

  public setWallet(walletId: WalletType) {
    this.selectedWallet = walletId;
  }

  public async getAddress(): Promise<{ address: string }> {
    const addressRes = await getAddress();
    if (addressRes.error || !addressRes.address) {
      throw new Error(addressRes.error || "Failed to retrieve public key from wallet.");
    }
    return { address: addressRes.address };
  }

  public async signTx(options: { xdr: string; publicNetwork?: boolean }): Promise<{ signedTx: string }> {
    const netDetails = await getNetworkDetails();
    const networkPassphrase = netDetails.networkPassphrase || "Test SDF Network ; September 2015";
    const addr = await this.getAddress();
    
    const result = await signTransaction(options.xdr, {
      networkPassphrase,
      address: addr.address,
    });

    const signedTx = typeof result === "string" ? result : result?.signedTxXdr;
    if (!signedTx) {
      throw new Error(result?.error || "Transaction signing cancelled.");
    }
    return { signedTx };
  }
}

export const kit = new StellarWalletsKit({
  network: "TESTNET",
  selectedWalletId: "freighter",
});

/**
 * Step 1: Mandatory Wallet Availability Check
 */
export const checkWalletAvailability = async (): Promise<boolean> => {
  try {
    const res = await isConnected();
    return Boolean(res.isConnected);
  } catch (error) {
    console.warn("Freighter availability check:", error);
    return false;
  }
};

/**
 * Step 2: Connect Wallet, Request Permission & Retrieve Address
 */
export const connectStellarWallet = async (): Promise<WalletConnection> => {
  const connected = await checkWalletAvailability();
  if (!connected) {
    throw new Error("Freighter wallet extension is not installed or enabled in browser.");
  }

  const allowedRes = await isAllowed();
  if (!allowedRes.isAllowed) {
    const promptRes = await setAllowed();
    if (!promptRes.isAllowed) {
      throw new Error("User denied wallet access permission.");
    }
  }

  const { address } = await kit.getAddress();
  const netDetails = await getNetworkDetails();

  return {
    publicKey: address,
    network: netDetails.network || "TESTNET",
    networkPassphrase: netDetails.networkPassphrase || "Test SDF Network ; September 2015",
    sorobanRpcUrl: netDetails.sorobanRpcUrl || "https://soroban-testnet.stellar.org",
    walletType: "freighter",
  };
};

/**
 * Step 3: Mandatory Transaction Signing Logic
 */
export const signSorobanTx = async (
  xdr: string,
  networkPassphrase: string = "Test SDF Network ; September 2015",
  address: string
): Promise<string> => {
  const result = await signTransaction(xdr, {
    networkPassphrase,
    address,
  });

  const signedXdr = typeof result === "string" ? result : result?.signedTxXdr;
  if (!signedXdr) {
    throw new Error(result?.error || "Freighter transaction signing failed or was rejected.");
  }
  return signedXdr;
};
