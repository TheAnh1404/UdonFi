# 11 - Risk Register

This risk register reflects the simplified MVP. The MVP avoids backend/indexer dependencies and uses direct Soroban RPC reads plus Freighter-signed transactions.

---

## MVP Risks

| ID | Risk Description | Category | Probability | Impact | Mitigation | Status |
|:---|:---|:---|:---|:---|:---|:---|
| RSK-MVP-001 | Manual liquidation may be delayed because no liquidation bot is in MVP. | Financial | Medium | High | Use conservative LTV/liquidation thresholds, clear demo instructions, and user-callable liquidation. | Open |
| RSK-MVP-002 | Frontend RPC reads may be slower than indexed reads. | UX | Medium | Medium | Batch reads where practical, show loading states, and keep Soroban RPC as source of truth. | Open |
| RSK-MVP-003 | No real-time indexed analytics for dashboard charts. | Product | High | Low | Limit MVP dashboard to current on-chain state and local transaction history. | Accepted |
| RSK-MVP-004 | No automated off-chain monitoring for unhealthy accounts. | Operations | High | Medium | Provide manual liquidation flow and document automated monitoring as Post-MVP. | Accepted |
| RSK-MVP-005 | Testnet RPC instability affects demo. | Dependency | Medium | Medium | Keep retry/error messaging in frontend and document RPC endpoint configuration. | Open |
| RSK-MVP-006 | Contract arithmetic bug could corrupt accounting. | Security | Medium | High | Use checked arithmetic, unit tests, integration tests, clippy, and security review. | Open |
| RSK-MVP-007 | Mock/simple price input may hide oracle integration risk. | Financial | Medium | Medium | State oracle aggregation as not production-ready and limit MVP to demo assumptions. | Accepted |
| RSK-MVP-008 | Freighter signing/network mismatch can submit to the wrong network. | UX/Security | Medium | Medium | Frontend must check network and show Testnet context before signing. | Open |

---

## Post-MVP Risks

| ID | Risk Description | Category | Future Mitigation |
|:---|:---|:---|:---|
| RSK-FUT-001 | Event indexer sync lag displays stale dashboard data. | Project | Design sync lag indicators and stale-data policy before shipping indexed dashboards. |
| RSK-FUT-002 | Concurrent database writes corrupt derived state. | Technical | Use single-writer PostgreSQL policy and idempotent event writes if indexer is revived. |
| RSK-FUT-003 | Analytics backend is mistaken for source of truth. | Product/Security | Backend must remain derived/cached state; Soroban RPC/on-chain state remains authoritative. |
| RSK-FUT-004 | Liquidation bot submits bad or stale transactions. | Financial | Require risk checks on-chain and monitor bot assumptions before production use. |

---

## Not Production-Ready

The MVP is not production-ready. Missing production controls include audits, robust oracle aggregation, operational monitoring, automated liquidation monitoring, production incident response, governance hardening, and full mainnet launch procedures.
