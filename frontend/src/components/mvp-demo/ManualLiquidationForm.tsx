import { useState } from "react";
import { Gavel, Play } from "lucide-react";

type ManualLiquidationFormProps = {
  disabled: boolean;
  onPrepare: (borrower: string, amount: string) => void;
  onExecute: (sessionIdHex: string) => void;
};

export const ManualLiquidationForm = ({ disabled, onPrepare, onExecute }: ManualLiquidationFormProps) => {
  const [borrower, setBorrower] = useState("");
  const [amount, setAmount] = useState("");
  const [sessionId, setSessionId] = useState("");

  return (
    <section className="liquidation-panel">
      <div className="section-heading">
        <span>Manual Liquidation</span>
        <Gavel size={18} aria-hidden="true" />
      </div>

      <form
        className="action-form"
        onSubmit={(event) => {
          event.preventDefault();
          onPrepare(borrower, amount);
        }}
      >
        <label htmlFor="liquidation-borrower">Borrower</label>
        <input
          id="liquidation-borrower"
          placeholder="G..."
          value={borrower}
          onChange={(event) => setBorrower(event.target.value)}
          disabled={disabled}
        />

        <label htmlFor="liquidation-amount">Debt to cover</label>
        <div className="input-row">
          <input
            id="liquidation-amount"
            inputMode="decimal"
            placeholder="0.0000000"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            disabled={disabled}
          />
          <button type="submit" disabled={disabled || !borrower || !amount}>
            <Gavel size={16} aria-hidden="true" />
            Prepare
          </button>
        </div>
      </form>

      <form
        className="action-form"
        onSubmit={(event) => {
          event.preventDefault();
          onExecute(sessionId);
        }}
      >
        <label htmlFor="liquidation-session">Session ID</label>
        <div className="input-row">
          <input
            id="liquidation-session"
            placeholder="64 hex chars"
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            disabled={disabled}
          />
          <button type="submit" disabled={disabled || !sessionId}>
            <Play size={16} aria-hidden="true" />
            Execute
          </button>
        </div>
      </form>
    </section>
  );
};
