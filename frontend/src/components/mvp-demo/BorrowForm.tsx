import { useState } from "react";
import { Banknote } from "lucide-react";

type BorrowFormProps = {
  disabled: boolean;
  onSubmit: (amount: string) => void;
};

export const BorrowForm = ({ disabled, onSubmit }: BorrowFormProps) => {
  const [amount, setAmount] = useState("");

  return (
    <form
      className="action-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(amount);
      }}
    >
      <label htmlFor="borrow-amount">Borrow XLM</label>
      <div className="input-row">
        <input
          id="borrow-amount"
          inputMode="decimal"
          placeholder="0.0000000"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !amount}>
          <Banknote size={16} aria-hidden="true" />
          Borrow
        </button>
      </div>
    </form>
  );
};
