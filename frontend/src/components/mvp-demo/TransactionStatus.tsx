import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { StellarExpertLink } from "./StellarExpertLink";
import type { TransactionPhase } from "../../services/soroban";

type TransactionStatusProps = {
  label: string;
  phase: TransactionPhase;
  txHash?: string;
  error?: string;
};

const phases: Array<{ id: TransactionPhase; label: string }> = [
  { id: "idle", label: "Idle" },
  { id: "preparing", label: "Preparing transaction" },
  { id: "signing", label: "Waiting for wallet signature" },
  { id: "submitting", label: "Submitting transaction" },
  { id: "confirming", label: "Confirming transaction" },
  { id: "success", label: "Success" },
  { id: "error", label: "Error" },
];

export const TransactionStatus = ({ label, phase, txHash, error }: TransactionStatusProps) => {
  const activeIndex = phases.findIndex((item) => item.id === phase);
  const terminalError = phase === "error";

  return (
    <section className="status-panel" aria-live="polite">
      <div className="section-heading">
        <span>Transaction</span>
        <strong>{label}</strong>
      </div>

      <div className="phase-list">
        {phases.map((item, index) => {
          const isActive = item.id === phase;
          const isComplete = !terminalError && activeIndex > index;
          const isError = item.id === "error" && terminalError;

          return (
            <div
              className={`phase-row ${isActive ? "is-active" : ""} ${isComplete ? "is-complete" : ""} ${
                isError ? "is-error" : ""
              }`}
              key={item.id}
            >
              {isActive && !terminalError && item.id !== "success" ? (
                <Loader2 className="spin" size={16} aria-hidden="true" />
              ) : isError ? (
                <XCircle size={16} aria-hidden="true" />
              ) : isComplete || item.id === "success" && phase === "success" ? (
                <CheckCircle2 size={16} aria-hidden="true" />
              ) : (
                <Circle size={16} aria-hidden="true" />
              )}
              <span>{item.label}</span>
            </div>
          );
        })}
      </div>

      {txHash ? (
        <div className="status-result">
          <span className="mono">{txHash}</span>
          <StellarExpertLink id={txHash} type="tx" label="Open transaction" />
        </div>
      ) : null}

      {error ? <div className="error-box">{error}</div> : null}
    </section>
  );
};
