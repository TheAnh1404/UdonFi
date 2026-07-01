# Documentation Cleanup Report

Date: 2026-07-01

## Files Kept

Raw Markdown scanned before this report: 1100 files.

Current project Markdown kept active: 46 files.

This cleanup report is new and was created after the audit scan; it brings active project Markdown to 47 files after cleanup.

- `AGENTS.md`
- `CHANGELOG.md`
- `CODE_OF_CONDUCT.md`
- `CONTRIBUTING.md`
- `GEMINI.md`
- `README.md`
- `SECURITY.md`
- `contracts/README.md`
- `frontend/README.md`
- `scripts/README.md`
- `tests/README.md`
- `tests/core/reserve/README.md`
- `tests/core/withdraw/README.md`
- `tests/shared/README.md`
- `docs/architecture/00-overview.md`
- `docs/architecture/01-product-requirements.md`
- `docs/architecture/02-system-architecture.md`
- `docs/architecture/03-c4-model.md`
- `docs/architecture/04-business-flows.md`
- `docs/architecture/21-performance-budget.md`
- `docs/architecture/diagrams/architecture_overview.md`
- `docs/architecture/diagrams/borrow_sequence.md`
- `docs/architecture/diagrams/component_diagram.md`
- `docs/architecture/diagrams/container_diagram.md`
- `docs/architecture/diagrams/context_diagram.md`
- `docs/architecture/diagrams/deployment_diagram.md`
- `docs/architecture/diagrams/deposit_sequence.md`
- `docs/architecture/diagrams/governance_sequence.md`
- `docs/architecture/diagrams/liquidation_sequence.md`
- `docs/architecture/diagrams/repay_sequence.md`
- `docs/architecture/diagrams/withdraw_sequence.md`
- `docs/contracts/05-smart-contract-spec.md`
- `docs/contracts/09-testing-strategy.md`
- `docs/contracts/13-financial-specification.md`
- `docs/contracts/14-mathematical-specification.md`
- `docs/contracts/15-protocol-invariants.md`
- `docs/contracts/16-state-machine-specification.md`
- `docs/contracts/20-gas-storage-optimization.md`
- `docs/demo/demo-script.md`
- `docs/deployment/10-deployment-plan.md`
- `docs/frontend/06-api-spec.md`
- `docs/roadmap/12-roadmap.md`
- `docs/security/08-security-model.md`
- `docs/security/17-failure-mode-analysis.md`
- `docs/security/18-economic-attack-model.md`
- `docs/security/19-threat-model.md`

External or vendored Markdown kept unchanged:

- 1007 Markdown files under `node_modules/`.
- 10 Markdown files under `stellar-dev-skill/`.

## Files Archived

Archived project Markdown: 37 files.

- `DEPLOY_INSTRUCTIONS.md` -> `docs/archive/root/DEPLOY_INSTRUCTIONS.md`
- `mainnet_deployment_plan.md` -> `docs/archive/root/mainnet_deployment_plan.md`
- `backend/README.md` -> `docs/archive/backend/README.md`
- `indexer/README.md` -> `docs/archive/indexer/README.md`
- `indexer_bot/README.md` -> `docs/archive/indexer_bot/README.md`
- `docs/07-database-design.md` -> `docs/archive/07-database-design.md`
- `docs/11-governance.md` -> `docs/archive/11-governance.md`
- `docs/adr/ADR-0001-use-stellar-soroban.md` -> `docs/archive/adr/ADR-0001-use-stellar-soroban.md`
- `docs/adr/ADR-0002-event-driven-architecture.md` -> `docs/archive/adr/ADR-0002-event-driven-architecture.md`
- `docs/adr/ADR-0003-postgresql-instead-of-firebase.md` -> `docs/archive/adr/ADR-0003-postgresql-instead-of-firebase.md`
- `docs/adr/ADR-0004-modular-smart-contracts.md` -> `docs/archive/adr/ADR-0004-modular-smart-contracts.md`
- `docs/adr/ADR-0005-oracle-aggregator.md` -> `docs/archive/adr/ADR-0005-oracle-aggregator.md`
- `docs/adr/ADR-0006-upgradeability-and-migration-strategy.md` -> `docs/archive/adr/ADR-0006-upgradeability-and-migration-strategy.md`
- `docs/adr/ADR-0007-emergency-pause-and-guardian-model.md` -> `docs/archive/adr/ADR-0007-emergency-pause-and-guardian-model.md`
- `docs/adr/ADR-0008-oracle-failure-handling.md` -> `docs/archive/adr/ADR-0008-oracle-failure-handling.md`
- `docs/adr/ADR-0009-interest-index-accounting-model.md` -> `docs/archive/adr/ADR-0009-interest-index-accounting-model.md`
- `docs/adr/ADR-0010-governance-timelock-policy.md` -> `docs/archive/adr/ADR-0010-governance-timelock-policy.md`
- `docs/future-work/backend-analytics.md` -> `docs/archive/future-work/backend-analytics.md`
- `docs/future-work/indexer-architecture.md` -> `docs/archive/future-work/indexer-architecture.md`
- `docs/future-work/liquidation-bot.md` -> `docs/archive/future-work/liquidation-bot.md`
- `docs/project-management/01-product-backlog.md` -> `docs/archive/project-management/01-product-backlog.md`
- `docs/project-management/02-epic-breakdown.md` -> `docs/archive/project-management/02-epic-breakdown.md`
- `docs/project-management/03-sprint-plan.md` -> `docs/archive/project-management/03-sprint-plan.md`
- `docs/project-management/04-task-dependency.md` -> `docs/archive/project-management/04-task-dependency.md`
- `docs/project-management/05-definition-of-done.md` -> `docs/archive/project-management/05-definition-of-done.md`
- `docs/project-management/06-definition-of-ready.md` -> `docs/archive/project-management/06-definition-of-ready.md`
- `docs/project-management/07-coding-guidelines.md` -> `docs/archive/project-management/07-coding-guidelines.md`
- `docs/project-management/08-code-review-checklist.md` -> `docs/archive/project-management/08-code-review-checklist.md`
- `docs/project-management/09-testing-checklist.md` -> `docs/archive/project-management/09-testing-checklist.md`
- `docs/project-management/10-release-checklist.md` -> `docs/archive/project-management/10-release-checklist.md`
- `docs/project-management/11-risk-register.md` -> `docs/archive/project-management/11-risk-register.md`
- `docs/project-management/12-developer-onboarding.md` -> `docs/archive/project-management/12-developer-onboarding.md`
- `docs/reviews/architecture-review-001.md` -> `docs/archive/reviews/architecture-review-001.md`
- `docs/reviews/architecture-review-001-resolution.md` -> `docs/archive/reviews/architecture-review-001-resolution.md`
- `docs/reviews/architecture-review-002-financial-design.md` -> `docs/archive/reviews/architecture-review-002-financial-design.md`
- `docs/reviews/current-project-state-report.md` -> `docs/archive/reviews/current-project-state-report.md`
- `docs/reviews/mvp-scope-refactor-report.md` -> `docs/archive/reviews/mvp-scope-refactor-report.md`

## Files Deleted

No Markdown files were deleted. No temporary/generated document was clearly safe to delete without losing historical context.

Removed empty legacy documentation directories after archiving:

- `diagrams/`
- `docs/adr/`
- `docs/future-work/`
- `docs/project-management/`

## Folder Structure After Cleanup

```text
docs/
  architecture/
    diagrams/
  archive/
    adr/
    backend/
    future-work/
    indexer/
    indexer_bot/
    project-management/
    reviews/
    root/
  contracts/
  demo/
  deployment/
  frontend/
  oracle/
  reviews/
  roadmap/
  security/
```

## Broken Links Fixed

- Updated `docs/architecture/00-overview.md` links after moving API, security, roadmap, and performance docs.
- Removed active links to archived `docs/future-work/` files from `docs/architecture/02-system-architecture.md`.
- Verified active relative Markdown links. No broken active relative Markdown links found.

## Remaining Documentation

- Root repository docs: README, contributing, security, changelog, code of conduct, and agent guidance.
- Current architecture docs under `docs/architecture/`.
- Current contract, testing, math, invariants, state-machine, and gas/storage docs under `docs/contracts/`.
- Current deployment docs under `docs/deployment/`.
- Current frontend/RPC API docs under `docs/frontend/`.
- Current demo docs under `docs/demo/`.
- Current roadmap under `docs/roadmap/`.
- Current security, threat, economic, and failure-mode docs under `docs/security/`.
- Historical and superseded docs under `docs/archive/`.

## Ready For New Architecture

Ready. Active Markdown no longer contains the requested legacy-scope phrases from the cleanup brief.

Archived documents may still contain those terms by design. Source code was not modified, so any old terminology in code comments, identifiers, or implementation files remains outside this documentation cleanup.
