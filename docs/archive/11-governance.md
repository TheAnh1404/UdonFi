# 11 - Decentralized Governance Spec

This document details the governance models, proposal lifecycles, and on-chain parameters for the UdonFi V2 protocol.

## 1. Governance Architecture

UdonFi V2 utilizes a token-weighted voting model to manage protocol configurations. Governance tokens (UDON) represent voting rights. The voting process is designed to protect the system against flash-loan attacks and centralization.

```text
+-------------------+      +-------------------+      +-------------------+
| Proposal Creation | ---> |   Voting Period   | ---> |  Timelock Queue   |
| Proposer must     |      | 3-day duration.   |      | 48-hour delay     |
| hold >1% of supply|      | Reaches quorum.   |      | for safety.       |
+-------------------+      +-------------------+      +-------------------+
                                                                |
                                                                v
                                                       +-------------------+
                                                       |     Execution     |
                                                       | Parameter update  |
                                                       | or contract upgrade|
                                                       +-------------------+
```

---

## 2. On-Chain Proposal Parameters

The governance smart contract enforces the following rules for proposal submission and voting:

| Parameter | Current Value | Description |
|---|---|---|
| **Proposal Threshold** | 1,000,000 UDON (1%) | Minimum tokens required to submit a proposal. |
| **Voting Delay** | 1,728 blocks (~6 hours) | Buffer time between proposal submission and the start of voting. Prevents flash-loan voting. |
| **Voting Period** | 20,160 blocks (~3 days) | Active voting window. |
| **Quorum Threshold** | 4,000,000 UDON (4%) | Minimum "Yes" votes required for a proposal to pass. |
| **Timelock Delay** | 48 hours | Minimum wait time before executing a passed proposal. |

---

## 3. Proposal Lifecycle Stages

1. **Submission**: A proposer drafts a proposal detailing target contract addresses, call values, and call payloads (e.g., calling `set_ltv(0.75)` on `reserve_config`).
2. **Pending**: The voting delay is active. Users can lock their voting tokens to calculate their voting power.
3. **Active**: Token holders cast votes (For, Against, or Abstain) on the proposal.
4. **Succeeded / Defeated**: If the voting period closes, the proposal passes if the quorum is met and the majority of votes are "For". Otherwise, the proposal is marked as defeated.
5. **Queued**: Passed proposals are moved to the `timelock` contract. This delay gives users time to withdraw their assets if they disagree with the upcoming changes.
6. **Executed**: The proposal payload is executed, modifying protocol states or upgrading contracts.

---

## 4. Governance over Reserve Caps

To maintain protocol security, capacity limits are managed under a dual-path control flow:

### A. Supply & Borrow Cap Increases
- **Required Action**: Proposal submission -> Voting delay -> Active vote -> Timelock queue -> Execution.
- **Rules**:
  - All cap increases **must** be executed via the standard on-chain proposal lifecycle.
  - Cap increases are subject to the **48-hour Timelock Delay**. This delay cannot be bypassed, suspended, or overridden by any role.
  - This ensures depositors and borrowers have a 2-day window to evaluate risk parameters and withdraw funds if they disagree with the cap inflation.

### B. Supply & Borrow Cap Decreases
- **Required Action**: Direct contract execution by the Emergency Guardian or Governance Board.
- **Rules**:
  - The Emergency Guardian is authorized to execute `emergency_reduce_caps` directly on the `lending_pool` contract.
  - This action does not require proposal voting or timelock queuing and resolves instantly.
  - Cap decreases are restricted to values equal to or lower than the currently configured caps. Cap values can never be raised via this emergency pathway.
  - This allows the protocol to react immediately to security disclosures or volatile market events.

