import { Wallet } from "lucide-react";
import type { FreighterWallet } from "../../services/freighter";
import { accountUrl } from "../../services/stellarExpert";

type ConnectWalletProps = {
  wallet?: FreighterWallet;
  expectedNetworkPassphrase: string;
  isConnecting: boolean;
  error?: string;
  onConnect: () => void;
};

const shortAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-6)}`;

export const ConnectWallet = ({
  wallet,
  expectedNetworkPassphrase,
  isConnecting,
  error,
  onConnect,
}: ConnectWalletProps) => {
  const networkMismatch = wallet && wallet.networkPassphrase !== expectedNetworkPassphrase;

  return (
    <section className="wallet-panel">
      <div>
        <p className="eyebrow">Wallet</p>
        {wallet ? (
          <a className="wallet-address" href={accountUrl(wallet.publicKey)} target="_blank" rel="noreferrer">
            {shortAddress(wallet.publicKey)}
          </a>
        ) : (
          <h1>UdonFi Testnet Console</h1>
        )}
      </div>

      <div className="wallet-actions">
        {wallet ? (
          <div className={`network-pill ${networkMismatch ? "is-warning" : "is-ok"}`}>
            {wallet.network || "Unknown network"}
          </div>
        ) : null}

        <button className="primary-button" type="button" onClick={onConnect} disabled={isConnecting}>
          <Wallet size={18} aria-hidden="true" />
          {isConnecting ? "Connecting" : wallet ? "Reconnect" : "Connect Freighter"}
        </button>
      </div>

      {networkMismatch ? <div className="warning-box">Freighter is not set to the configured Testnet passphrase.</div> : null}
      {error ? <div className="error-box">{error}</div> : null}
    </section>
  );
};
