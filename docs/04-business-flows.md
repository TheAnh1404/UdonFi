# 04 - Business Sequence Flows

This document details the step-by-step transaction lifecycles and business workflows of UdonFi V2 using sequence diagrams.

## 1. Deposit (Supply) Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Depositor
    participant UI as React Web Client
    participant Wallet as Freighter Wallet
    participant Pool as Lending Pool Contract
    participant Token as Stellar Asset Contract (SAC)
    participant aToken as Yield-Bearing aToken
    
    User->>UI: Select Asset & Input Amount (e.g., 100 USDC)
    UI->>Pool: Simulate supply transaction
    Pool-->>UI: Return transaction execution cost and gas limits
    UI->>Wallet: Request transaction signature
    Wallet-->>User: Prompt approval dialog
    User->>Wallet: Approve and sign transaction
    Wallet-->>UI: Return signed XDR payload
    UI->>Pool: Submit signed transaction
    activate Pool
    Pool->>Pool: accrue_interest(USDC) [Updates supplyIndex & borrowIndex]
    Pool->>Token: transfer_from(User, Pool, 100 USDC)
    Token-->>Pool: Confirmation (Transfer Success)
    Pool->>Pool: Calculate scaledSupply = 100 USDC / supplyIndex
    Pool->>aToken: mint(User, scaledSupply)
    aToken-->>Pool: Mint Success
    Pool->>Pool: Update user bitmap, record scaledSupply balance & extend storage TTL
    Pool-->>UI: Emit Supply Event (Tx Hash)
    deactivate Pool
    UI-->>User: Update UI dashboard balances (Neon Green confirmation)
```

---

## 2. Borrow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Borrower
    participant UI as React Web Client
    participant Pool as Lending Pool Contract
    participant Risk as Risk Engine Contract
    participant Oracle as Oracle Aggregator
    participant Token as Stellar Asset Contract (SAC)
    
    User->>UI: Select Asset & Input Borrow Amount
    UI->>Pool: Simulate borrow transaction
    activate Pool
    Pool->>Pool: accrue_interest(Collateral & Debt Reserves)
    Pool->>Risk: evaluate_borrow_capacity(User)
    activate Risk
    Risk->>Oracle: fetch_asset_prices()
    Oracle-->>Risk: Return asset price matrix
    Risk-->>Pool: Return borrow capacity details
    deactivate Risk
    
    alt Borrow capacity exceeded
        Pool-->>UI: Revert (Capacity Exceeded)
        UI-->>User: Display borrowing limit warning
    else Borrow capacity is valid
        Pool-->>UI: Return successful simulation parameters
        UI->>User: Request transaction signature
        User->>UI: Sign and submit transaction
        Pool->>Pool: accrue_interest(Debt Reserve)
        Pool->>Token: transfer(Pool, User, Borrow Amount)
        Token-->>Pool: Transfer Success
        Pool->>Pool: Calculate scaledDebt = Borrow Amount / borrowIndex (Round Up)
        Pool->>Pool: Mint scaledDebt tokens/shares to User balance
        Pool->>Pool: Pack borrow flag in User bitmap & extend TTL
        Pool-->>UI: Emit Borrow Event
        deactivate Pool
        UI-->>User: Update Borrow Balance & Purple LED state
    end
```

---

## 3. Repay Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Borrower
    participant UI as React Web Client
    participant Pool as Lending Pool Contract
    participant Token as Stellar Asset Contract (SAC)
    
    User->>UI: Select Debt & Input Repay Amount
    UI->>Pool: Simulate repayment transaction
    Pool-->>UI: Return simulation parameters
    UI->>User: Request transaction signature
    User->>UI: Sign and submit transaction
    activate Pool
    Pool->>Token: transfer_from(User, Pool, Repay Amount)
    Token-->>Pool: Transfer Success
    Pool->>Pool: Burn Debt Tokens corresponding to Repay Amount
    Pool->>Pool: Recalculate User bitmap (Disable borrow flag if debt = 0)
    Pool->>Pool: Extend state TTL
    Pool-->>UI: Emit Repay Event
    deactivate Pool
    UI-->>User: Refresh Health Factor & disable LED Purple lights
```

---

## 4. Withdraw Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Depositor
    participant UI as React Web Client
    participant Pool as Lending Pool Contract
    participant Risk as Risk Engine Contract
    participant Token as Stellar Asset Contract (SAC)
    participant aToken as Yield-Bearing aToken
    
    User->>UI: Input withdrawal amount
    UI->>Pool: Simulate withdrawal transaction
    activate Pool
    Pool->>Risk: evaluate_post_withdraw_health(User)
    activate Risk
    Risk-->>Pool: Return simulated Health Factor (HF)
    deactivate Risk
    
    alt Health Factor < 1.0
        Pool-->>UI: Revert (Withdrawal triggers insolvency risk)
        UI-->>User: Block action with red banner warnings
    else Health Factor >= 1.0
        Pool-->>UI: Return transaction parameters
        User->>UI: Sign and submit transaction
        Pool->>aToken: burn(User, Burn Amount)
        aToken-->>Pool: Burn Success
        Pool->>Token: transfer(Pool, User, Amount)
        Token-->>Pool: Transfer Success
        Pool->>Pool: Update User bitmap (Disable collateral flag if supply = 0)
        Pool-->>UI: Emit Withdraw Event
        deactivate Pool
        UI-->>User: Balance updated
    end
```

---

## 5. Liquidation Sequence (2-Step)

```mermaid
sequenceDiagram
    autonumber
    actor Liq as Liquidator
    participant UI as Liquidator Dashboard
    participant Contracts as Liquidation Coordinator
    participant Risk as Risk Engine Contract
    participant Token as Stellar Asset Contract (SAC)
    
    Liq->>UI: Select insolvent account & trigger liquidation
    UI->>Contracts: prepare_liquidation(Target Borrower)
    activate Contracts
    Contracts->>Risk: check_health_factor(Target Borrower)
    Risk-->>Contracts: Health Factor (HF < 1.0)
    Contracts->>Contracts: Create signed lock session on borrower's collateral
    Contracts-->>UI: Return Session ID (Tx 1 complete, locked state)
    deactivate Contracts
    
    UI->>Contracts: execute_liquidation(Session ID)
    activate Contracts
    Contracts->>Token: transfer_from(Liquidator, Pool, Debt Repayment)
    Token-->>Contracts: Repayment Success
    Contracts->>Token: transfer(Pool, Liquidator, Collateral Seized + Bonus)
    Token-->>Contracts: Transfer Success
    Contracts->>Contracts: Recalculate borrower's remaining balances & bitmap
    Contracts-->>UI: Emit Liquidation Completed Event
    deactivate Contracts
```

---

## 6. Governance Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Proposer as Governance Proposer
    actor Voter as Token Holder
    participant Gov as Governance Contract
    participant TL as Timelock Coordinator
    
    Proposer->>Gov: submit_proposal(Action, Target)
    Gov->>Gov: Validate proposal deposit & start delay period
    
    Voter->>Gov: cast_vote(Proposal ID, Support)
    Note over Gov: Voting period closes. Votes are tallied.
    
    alt Proposal Passed
        Gov->>TL: queue_proposal(Proposal ID)
        Note over TL: Queue wait time elapsed (e.g., 48 hours)
        TL->>Gov: execute_proposal(Proposal ID)
        Gov->>Gov: Apply protocol parameters or upgrade contract
    else Proposal Rejected
        Gov->>Gov: Cancel proposal & release locked proposer deposit
    end
```
