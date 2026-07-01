# 04 - Business Sequence Flows

These flows describe the current MVP path: frontend, Freighter, Soroban RPC, smart contracts, Stellar Testnet, and Stellar Expert links. No off-chain service is required.

## 1. Deposit Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Depositor
    participant UI as React Frontend
    participant Wallet as Freighter
    participant RPC as Soroban RPC
    participant Contracts as UdonFi Contracts
    participant Expert as Stellar Expert

    User->>UI: Select reserve and deposit amount
    UI->>RPC: Simulate deposit transaction
    RPC-->>UI: Simulation result and fees
    UI->>Wallet: Request signature
    Wallet-->>UI: Signed XDR
    UI->>RPC: Submit signed transaction
    RPC->>Contracts: Execute deposit
    Contracts-->>RPC: State update and deposit event
    RPC-->>UI: Transaction hash/status
    UI-->>User: Show updated direct RPC state and Stellar Expert link
    UI->>Expert: Open transaction link on demand
```

## 2. Withdraw Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Depositor
    participant UI as React Frontend
    participant Wallet as Freighter
    participant RPC as Soroban RPC
    participant Contracts as UdonFi Contracts

    User->>UI: Enter withdraw amount
    UI->>RPC: Read supply, liquidity, debt, and HF inputs
    UI->>RPC: Simulate withdraw
    RPC->>Contracts: Validate liquidity and post-withdraw HF
    Contracts-->>RPC: Simulation result
    alt Invalid withdraw
        UI-->>User: Show insufficient balance/liquidity/HF warning
    else Valid withdraw
        UI->>Wallet: Request signature
        Wallet-->>UI: Signed XDR
        UI->>RPC: Submit transaction
        RPC->>Contracts: Execute withdraw
        Contracts-->>RPC: State update and withdraw.completed event
        UI-->>User: Show direct RPC state and Stellar Expert link
    end
```

## 3. Borrow Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Borrower
    participant UI as React Frontend
    participant Wallet as Freighter
    participant RPC as Soroban RPC
    participant Contracts as UdonFi Contracts

    User->>UI: Enter borrow amount
    UI->>RPC: Read collateral, debt, reserve config, and prices
    UI->>RPC: Simulate borrow
    RPC->>Contracts: Validate active protocol, caps, liquidity, and HF
    Contracts-->>RPC: Simulation result
    alt Borrow invalid
        UI-->>User: Show cap/liquidity/HF rejection
    else Borrow valid
        UI->>Wallet: Request signature
        Wallet-->>UI: Signed XDR
        UI->>RPC: Submit transaction
        RPC->>Contracts: Execute borrow
        Contracts-->>RPC: State update and borrow.created event
        UI-->>User: Show new debt, HF, and Stellar Expert link
    end
```

## 4. Repay Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User as Borrower
    participant UI as React Frontend
    participant Wallet as Freighter
    participant RPC as Soroban RPC
    participant Contracts as UdonFi Contracts

    User->>UI: Enter repay amount
    UI->>RPC: Simulate repay
    RPC->>Contracts: Cap repay to actual debt
    Contracts-->>RPC: Simulation result
    UI->>Wallet: Request signature
    Wallet-->>UI: Signed XDR
    UI->>RPC: Submit transaction
    RPC->>Contracts: Execute repay
    Contracts-->>RPC: State update and repay.completed event
    UI-->>User: Show updated debt/HF and Stellar Expert link
```

## 5. Manual Liquidation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Liq as Manual Liquidator
    participant UI as React Frontend
    participant Wallet as Freighter
    participant RPC as Soroban RPC
    participant Contracts as UdonFi Contracts

    Liq->>UI: Select borrower and liquidation amount
    UI->>RPC: Read borrower collateral, debt, reserve config, and prices
    UI->>RPC: Simulate liquidation
    RPC->>Contracts: Check HF < 1, close factor, bonus, collateral seized
    Contracts-->>RPC: Simulation result
    alt Position solvent
        UI-->>Liq: Show liquidation not allowed
    else Position eligible
        UI->>Wallet: Request signature
        Wallet-->>UI: Signed XDR
        UI->>RPC: Submit transaction
        RPC->>Contracts: Execute liquidation
        Contracts-->>RPC: State update and liquidation.executed event
        UI-->>Liq: Show debt repaid, collateral seized, and Stellar Expert link
    end
```
