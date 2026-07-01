import { useState } from "react";
import { ArrowUpFromLine } from "lucide-react";

type WithdrawFormProps = {
  disabled: boolean;
  onSubmit: (amount: string) => void;
};

export const WithdrawForm = ({ disabled, onSubmit }: WithdrawFormProps) => {
  const [amount, setAmount] = useState("");

  return (
    <form
      className="action-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(amount);
      }}
    >
      <label htmlFor="withdraw-amount">Withdraw XLM</label>
      <div className="input-row">
        <input
          id="withdraw-amount"
          inputMode="decimal"
          placeholder="0.0000000"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !amount}>
          <ArrowUpFromLine size={16} aria-hidden="true" />
          Withdraw
        </button>
      </div>
    </form>
  );
};
