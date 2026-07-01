import { useState } from "react";
import { RotateCcw } from "lucide-react";

type RepayFormProps = {
  disabled: boolean;
  onSubmit: (amount: string) => void;
};

export const RepayForm = ({ disabled, onSubmit }: RepayFormProps) => {
  const [amount, setAmount] = useState("");

  return (
    <form
      className="action-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(amount);
      }}
    >
      <label htmlFor="repay-amount">Repay XLM</label>
      <div className="input-row">
        <input
          id="repay-amount"
          inputMode="decimal"
          placeholder="0.0000000"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !amount}>
          <RotateCcw size={16} aria-hidden="true" />
          Repay
        </button>
      </div>
    </form>
  );
};
