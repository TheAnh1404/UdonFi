# 06 - Definition of Ready (DoR)

This document establishes the official Definition of Ready (DoR) for all engineering tasks in the UdonFi V2 project. A task cannot be pulled into an active sprint or assigned to an engineer/agent for development unless it satisfies all criteria listed below.

---

## 1. Technical Requirements Exist
- The task contains a clear, unambiguous title and a detailed description explaining **what** is being built and **why**.
- The business logic or smart contract behavior requested is clearly detailed.

## 2. Technical Specifications & References Linked
- The task explicitly links to its referenced technical specifications, including:
  - Smart contract entry-point details in [05-smart-contract-spec.md](file:///d:/TheAnhProject/UdonFi/docs/05-smart-contract-spec.md).
  - API schemas and REST pathways in [06-api-spec.md](file:///d:/TheAnhProject/UdonFi/docs/06-api-spec.md).
  - Data layouts in [07-database-design.md](file:///d:/TheAnhProject/UdonFi/docs/07-database-design.md).
  - Math/financial models in [13-financial-specification.md](file:///d:/TheAnhProject/UdonFi/docs/13-financial-specification.md) and [14-mathematical-specification.md](file:///d:/TheAnhProject/UdonFi/docs/14-mathematical-specification.md).

## 3. ADR (Architectural Decision Record) Aligned
- The task references any applicable ADRs, ensuring the engineer understands structural decisions like:
  - Pause governance in [ADR-0007-emergency-pause-and-guardian-model.md](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0007-emergency-pause-and-guardian-model.md).
  - Oracle contingencies in [ADR-0008-oracle-failure-handling.md](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0008-oracle-failure-handling.md).
  - Upgradability paths in [ADR-0006-upgradeability-and-migration-strategy.md](file:///d:/TheAnhProject/UdonFi/docs/adr/ADR-0006-upgradeability-and-migration-strategy.md).

## 4. Clear Acceptance Criteria (AC) Defined
- The task contains explicit, binary (pass/fail) Acceptance Criteria. 
- These criteria define exactly what the system must do to verify the task is complete (e.g., "Must revert if `supplyCap` is exceeded").
- Standard parameters (such as expected inputs, expected outputs, revert conditions, and emitted events) are spelled out.

## 5. Dependencies Resolved
- All prerequisite tasks listed in the dependency registry ([04-task-dependency.md](file:///d:/TheAnhProject/UdonFi/docs/project-management/04-task-dependency.md)) must be fully completed and merged (marked as "Done").
- External tool chains, sandbox environments, or Mock SDK features needed for the task must be configured and available.

## 6. Risks Assessed and Understood
- The developer must review the [11-risk-register.md](file:///d:/TheAnhProject/UdonFi/docs/project-management/11-risk-register.md) for any technical, economic, or security risks associated with the component (e.g., math rounding errors, reentrancy risk, flash loan attacks).
- Mitigation strategies outlined in the Risk Register must be integrated into the planned implementation.

## 7. Testing Goals Outlined
- The task must specify which testing tiers are required for validation (e.g., unit test, integration test, property test, or E2E UI test).
- Relevant protocol invariants listed in the testing checklist ([09-testing-checklist.md](file:///d:/TheAnhProject/UdonFi/docs/project-management/09-testing-checklist.md)) must be mapped to the task if the task modifies accounting, interest index, or risk validation modules.
