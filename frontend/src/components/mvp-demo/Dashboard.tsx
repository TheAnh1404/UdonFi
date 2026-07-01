import { useCallback, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { BorrowForm } from "./BorrowForm";
import { ConnectWallet } from "./ConnectWallet";
import { DepositForm } from "./DepositForm";
import { HealthFactorCard } from "./HealthFactorCard";
import { ManualLiquidationForm } from "./ManualLiquidationForm";
import { PoolCard } from "./PoolCard";
import { RepayForm } from "./RepayForm";
import { TransactionStatus } from "./TransactionStatus";
import { WithdrawForm } from "./WithdrawForm";
import {
  borrow,
  deposit,
  executeLiquidation,
  formatAssetAmount,
  formatWad,
  getContractConfig,
  getHealthFactor,
  getReserveCount,
  getReserveInfo,
  getUserDebt,
  getUserDeposit,
  hasRequiredContractIds,
  prepareLiquidation,
  repay,
  withdraw,
  type SubmittedTransaction,
} from "../../services/contracts";
import { connectWallet, type FreighterWallet } from "../../services/freighter";
import type { TransactionPhase } from "../../services/soroban";

type ActionState = {
  label: string;
  phase: TransactionPhase;
  txHash?: string;
  error?: string;
};

type OverviewState = {
  reserveCount?: number;
  reserveInfo?: Record<string, unknown>;
  healthFactor?: string;
  supplied?: string;
  debt?: string;
  error?: string;
};

const initialActionState: ActionState = {
  label: "Idle",
  phase: "idle",
};

const toErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

export const Dashboard = () => {
  const config = useMemo(() => getContractConfig(), []);
  const [wallet, setWallet] = useState<FreighterWallet>();
  const [connectError, setConnectError] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [overview, setOverview] = useState<OverviewState>({});
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [action, setAction] = useState<ActionState>(initialActionState);

  const refreshOverview = useCallback(
    async (activeWallet = wallet) => {
      if (!activeWallet) {
        return;
      }

      if (!hasRequiredContractIds(config)) {
        setOverview((current) => ({
          ...current,
          error: "Contract IDs are not configured in frontend/.env.local.",
        }));
        return;
      }

      setIsOverviewLoading(true);
      setOverview((current) => ({ ...current, error: undefined }));

      const [countResult, reserveResult, healthResult, suppliedResult, debtResult] = await Promise.allSettled([
        getReserveCount(activeWallet.publicKey),
        getReserveInfo(activeWallet.publicKey),
        getHealthFactor(activeWallet.publicKey),
        getUserDeposit(activeWallet.publicKey),
        getUserDebt(activeWallet.publicKey),
      ]);

      setOverview({
        reserveCount: countResult.status === "fulfilled" ? countResult.value : undefined,
        reserveInfo: reserveResult.status === "fulfilled" ? reserveResult.value : undefined,
        healthFactor: healthResult.status === "fulfilled" ? formatWad(healthResult.value) : undefined,
        supplied: suppliedResult.status === "fulfilled" ? formatAssetAmount(suppliedResult.value) : undefined,
        debt: debtResult.status === "fulfilled" ? formatAssetAmount(debtResult.value) : undefined,
        error:
          countResult.status === "rejected"
            ? toErrorMessage(countResult.reason)
            : reserveResult.status === "rejected"
              ? toErrorMessage(reserveResult.reason)
              : undefined,
      });

      setIsOverviewLoading(false);
    },
    [config, wallet],
  );

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectError("");

    try {
      const connectedWallet = await connectWallet();
      setWallet(connectedWallet);
      await refreshOverview(connectedWallet);
    } catch (error) {
      setConnectError(toErrorMessage(error));
    } finally {
      setIsConnecting(false);
    }
  };

  const runAction = async (
    label: string,
    execute: (onPhase: (phase: TransactionPhase) => void) => Promise<SubmittedTransaction>,
  ) => {
    setAction({ label, phase: "preparing" });

    try {
      const submitted = await execute((phase) =>
        setAction((current) => ({ ...current, phase, error: phase === "error" ? current.error : undefined })),
      );

      setAction({ label, phase: "success", txHash: submitted.hash });
      await refreshOverview();
    } catch (error) {
      setAction({ label, phase: "error", error: toErrorMessage(error) });
    }
  };

  const busy = ["preparing", "signing", "submitting", "confirming"].includes(action.phase);
  const networkReady = wallet?.networkPassphrase === config.networkPassphrase;
  const contractReady = hasRequiredContractIds(config);
  const canTransact = Boolean(wallet && networkReady && contractReady && !busy);

  return (
    <main className="mvp-shell">
      <ConnectWallet
        wallet={wallet}
        expectedNetworkPassphrase={config.networkPassphrase}
        isConnecting={isConnecting}
        error={connectError}
        onConnect={handleConnect}
      />

      {!contractReady ? (
        <div className="warning-box top-warning">
          <AlertTriangle size={16} aria-hidden="true" />
          Missing Testnet contract IDs. Populate frontend/.env.local after deployment.
        </div>
      ) : null}

      <div className="dashboard-grid">
        <PoolCard
          config={config}
          reserveCount={overview.reserveCount}
          reserveInfo={overview.reserveInfo}
          overviewError={overview.error}
        />

        <HealthFactorCard
          healthFactor={overview.healthFactor}
          supplied={overview.supplied}
          debt={overview.debt}
          isLoading={isOverviewLoading}
          disabled={!wallet || !contractReady}
          onRefresh={() => {
            void refreshOverview();
          }}
        />

        <section className="actions-panel">
          <div className="section-heading">
            <span>Core Actions</span>
            <strong>XLM</strong>
          </div>
          <div className="actions-grid">
            <DepositForm
              disabled={!canTransact}
              onSubmit={(amount) => {
                if (!wallet) return;
                void runAction("Deposit", (onPhase) => deposit({ walletAddress: wallet.publicKey, amount, onPhase }));
              }}
            />
            <WithdrawForm
              disabled={!canTransact}
              onSubmit={(amount) => {
                if (!wallet) return;
                void runAction("Withdraw", (onPhase) => withdraw({ walletAddress: wallet.publicKey, amount, onPhase }));
              }}
            />
            <BorrowForm
              disabled={!canTransact}
              onSubmit={(amount) => {
                if (!wallet) return;
                void runAction("Borrow", (onPhase) => borrow({ walletAddress: wallet.publicKey, amount, onPhase }));
              }}
            />
            <RepayForm
              disabled={!canTransact}
              onSubmit={(amount) => {
                if (!wallet) return;
                void runAction("Repay", (onPhase) => repay({ walletAddress: wallet.publicKey, amount, onPhase }));
              }}
            />
          </div>
        </section>

        <ManualLiquidationForm
          disabled={!canTransact}
          onPrepare={(borrower, amount) => {
            if (!wallet) return;
            void runAction("Prepare liquidation", (onPhase) =>
              prepareLiquidation({ walletAddress: wallet.publicKey, borrower, amount, onPhase }),
            );
          }}
          onExecute={(sessionIdHex) => {
            if (!wallet) return;
            void runAction("Execute liquidation", (onPhase) =>
              executeLiquidation({ walletAddress: wallet.publicKey, sessionIdHex, onPhase }),
            );
          }}
        />

        <TransactionStatus label={action.label} phase={action.phase} txHash={action.txHash} error={action.error} />
      </div>
    </main>
  );
};
