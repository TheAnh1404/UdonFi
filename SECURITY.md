# Security Policy

UdonFi is a decentralized lending protocol. Securing user funds and maintaining system stability is our highest priority. This document outlines the security architecture guidelines, reporting procedures, and response coordination.

## Security Architecture Guidelines

- **Access Control**: Administrative functions must be gated behind Multi-Sig controls and timelocked actions.
- **Circuit Breakers**: Contract states support pausing capabilities in the event of an active threat or mathematical anomaly.
- **Storage Protection**: All dynamic structures must use explicit TTL management to prevent eviction from the Stellar ledger.

## Reporting a Vulnerability

If you discover a security vulnerability within the UdonFi V2 protocol, please report it immediately. Do not disclose the vulnerability publicly or in open issues until it has been resolved.

Please submit your report via email to: **security@udonfi.xyz**

### What to Include in the Report:
1. **Description**: A detailed explanation of the vulnerability and its potential impact.
2. **Proof of Concept (PoC)**: Step-by-step instructions or script to reproduce the exploit.
3. **Contracts/Files Involved**: The specific file paths and contract functions.
4. **Suggested Mitigation**: If possible, suggest code changes or operational steps to resolve the issue.

We support and coordinate with security researchers. Responsible disclosures may be eligible for bounty programs.

## Disclosure Policy

UdonFi follows a coordinated vulnerability disclosure policy:

1. **Acknowledgment**: We will acknowledge receipt of your report within 24 hours.
2. **Evaluation**: Our engineering team will review the report and verify the vulnerability within 72 hours.
3. **Patching**: We will develop and test a fix in a private branch.
4. **Deployment**: The fix will be deployed on-chain (using the timelock mechanism if applicable).
5. **Public Release**: We will publish a security advisory detailing the vulnerability and thanking the reporter after the fix is successfully in production.

## Active Incidents

In the event of an active contract exploit:
- The core multisig will trigger the **Circuit Breaker** (pausing deposits and borrows).
- Liquidations and debt repayments will remain active if mathematically safe, to protect pool solvency.
- Emergency announcements will be made via official communication channels.
