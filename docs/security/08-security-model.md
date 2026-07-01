# 08 - Security Model & Threat Assessment

This security model reflects the simplified MVP scope: smart contracts, frontend, Freighter, Soroban RPC, Stellar Testnet, and Stellar Expert transaction links.

## 1. MVP Trust Boundaries

| Boundary | Trust Assumption | MVP Control |
|---|---|---|
| User -> Frontend | UI can be wrong or stale. | Simulate before signing; show transaction details and Stellar Expert links. |
| Frontend -> Freighter | Wallet protects private keys. | User approval required for every transaction. |
| Frontend -> Soroban RPC | RPC may be slow or unavailable. | Retry/read fallback can be added; no off-chain cache is authoritative. |
| Soroban RPC -> Contracts | Contracts enforce all critical state transitions. | Contract validation for caps, liquidity, balances, HF, and liquidation eligibility. |
| Contracts -> Events | Events are for observability. | Events are not required as state source for MVP. |

## 2. Critical MVP Risks and Mitigations

1. **Invalid signatures or spoofed users**
   - Mitigation: Freighter signs transactions for the active Stellar account; contracts validate authorization where required.

2. **Incorrect UI calculations**
   - Mitigation: The frontend must simulate transactions through Soroban RPC before requesting signatures. Contracts remain the final authority.

3. **RPC downtime or slow reads**
   - Mitigation: MVP can show degraded UX and retry. The frontend must not fall back to off-chain balances as authoritative state.

4. **Health Factor bypass**
   - Mitigation: Borrow, withdraw, and liquidation checks must be enforced in contract/risk logic, not only in frontend code.

5. **Manual liquidation only**
   - Mitigation: MVP supports user/liquidator-called liquidation.

6. **Event visibility gaps**
   - Mitigation: Basic events and Stellar Expert links support debugging.

## 3. Out of MVP Security Controls

The following controls must not block the demo:

- Production monitoring and alerting.
- Off-chain stale-data policies.
- Production incident automation.

## 4. Manual Liquidation Security

Manual liquidation remains in MVP:

- Eligibility must require Health Factor below the configured minimum.
- Close factor and liquidation bonus must be bounded by reserve risk config.
- Collateral seized and debt repaid must use checked integer math.
- Liquidation events should be emitted for explorer/debug visibility.

## 5. Not Production-Ready

The MVP is not mainnet-ready. Before production, the protocol still needs full audits, oracle hardening, operational monitoring, frontend security review, incident response procedures, and analytics/monitoring decisions.
