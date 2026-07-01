import { useState } from "react";
import { ArrowDownToLine } from "lucide-react";

type DepositFormProps = {
  disabled: boolean;
  onSubmit: (amount: string) => void;
};

export const DepositForm = ({ disabled, onSubmit }: DepositFormProps) => {
  const [amount, setAmount] = useState("");

  return (
    <form
      className="action-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(amount);
      }}
    >
      <label htmlFor="deposit-amount">Deposit XLM</label>
      <div className="input-row">
        <input
          id="deposit-amount"
          inputMode="decimal"
          placeholder="0.0000000"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !amount}>
          <ArrowDownToLine size={16} aria-hidden="true" />
          Deposit
        </button>
      </div>
    </form>
  );
};
