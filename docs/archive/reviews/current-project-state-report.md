# Current Project State Report

Generated: 2026-07-01

Scope: repository audit only. No application source code was intentionally modified by this report.

## 1. Executive Summary

UdonFi V2 currently looks like a **contract MVP with a restored original frontend UI, deployment scaffolding, and partial frontend integration work**.

The smart contract side is the strongest part of the repository. The deployed Soroban workspace compiles, tests, formats, and passes clippy. The lending workflow is represented in contract APIs and tests: initialize protocol, create reserve, deposit/supply, withdraw, borrow, repay, health factor reads, price setting, aToken/debtToken mint/burn, and manual liquidation.

The frontend is a **feature-rich original demo UI** rather than a fully connected production frontend. The original UI is preserved as the default app. A separate MVP demo dashboard exists under `frontend/src/components/mvp-demo/` and is exported by `frontend/src/pages/MvpDemoPage.tsx`, but no route is wired to it. Freighter, Soroban RPC, contract wrapper, and Stellar Expert helper service files exist, but the restored default UI still primarily uses the older large `App.tsx` flow and simulated/local state patterns.

Deployment is **prepared but not completed**. Testnet deployment scripts and env templates exist. `deployments/testnet.json` is only a template with empty contract IDs, so there is no recorded successful Testnet deployment in the repository.

Documentation is extensive and mostly aligned around the contract-first MVP scope. Some historical documents still discuss backend, indexer, bot, API, database, and queue systems, but most of those references are marked Post-MVP / Future Work.

Overall: contracts are verified locally; frontend builds and lints; deployment needs real Testnet execution and browser/wallet smoke testing before the project can honestly be called demo-ready.

## 2. Repository Structure

High-level structure detected:

```text
.
├── backend/
├── contracts/
├── deployments/
├── diagrams/
├── docs/
├── frontend/
├── indexer/
├── indexer_bot/
├── scripts/
├── tests/
├── README.md
├── DEPLOY_INSTRUCTIONS.md
├── mainnet_deployment_plan.md
└── package.json
```

Folder purposes:

| Folder | Purpose | Current State |
| --- | --- | --- |
| `contracts/` | Rust/Soroban smart contracts and contract deployment/init scripts. | Active MVP area. Root workspace contains deployed crates. `contracts/core/*` contains standalone engine crates. |
| `frontend/` | React + TypeScript + Vite frontend. | Builds and lints. Original UI is default. Integration services exist but are not fully connected to default UI. |
| `backend/` | Optional backend analytics/caching plan. | Present with README only. Marked Post-MVP. |
| `indexer/` | Optional event indexer plan/code area. | Present with README and `node_modules`. Marked Post-MVP. |
| `indexer_bot/` | Legacy/test scripts for indexer/bot/deployment experiments. | Present with many JS scripts and a `serviceAccountKey.json` file that should be reviewed for secrets. Not MVP-required. |
| `docs/` | Architecture, specs, ADRs, security, roadmap, future-work, reviews, demo docs. | Extensive and documentation-heavy. |
| `deployments/` | Deployment output/templates. | Present with `testnet.json`, currently empty/template values. |
| `scripts/` | Root automation notes. | Contains README describing scripts that do not all appear in root `scripts/`. |
| `tests/` | Test strategy/readme area. | Present with README; real contract tests live mainly in contract crates. |
| `diagrams/` | Architecture/diagram assets. | Present; not deeply inspected in this audit. |

Notes:

- `contracts/core/*` are standalone crates, not members of `contracts/Cargo.toml`.
- `node_modules/` exists at repository root and under `indexer/`.
- Generated/build directories exist under `contracts/target` and several `contracts/core/*/target` paths.

## 3. Smart Contract Overview

### Root Contract Workspace

`contracts/Cargo.toml` workspace members:

- `common`
- `lending_pool`
- `reserve`
- `a_token`
- `debt_token`
- `price_oracle`
- `liquidation`

Workspace release profile is configured for optimized Soroban WASM:

- `opt-level = "z"`
- `overflow-checks = true`
- `panic = "abort"`
- `lto = true`
- `crate-type = ["cdylib"]` for deployable contracts.

### `contracts/common`

Purpose:

- Shared math, bitmap helpers, errors, and contract data types.

Key files:

- `contracts/common/src/types.rs`
- `contracts/common/src/math.rs`
- `contracts/common/src/bitmap.rs`
- `contracts/common/src/errors.rs`

Important types:

- `PoolDataKey`
- `ReserveDataKey`
- `TokenDataKey`
- `OracleDataKey`
- `LiquidationDataKey`
- `ReserveConfig`
- `InterestRateConfig`
- `ReserveState`
- `UserAccountData`
- `LiquidationParams`
- `LendingError`

Important constants/helpers:

- `WAD`
- `RAY`
- `PERCENTAGE_FACTOR`
- `MAX_RESERVES`
- `HEALTH_FACTOR_LIQUIDATION_THRESHOLD`
- checked fixed-point helpers such as `wad_mul`, `wad_div`, `ray_mul`, `ray_div`, interest/rate helpers.

Events:

- No standalone event bus in `common`; contracts and core modules publish events directly.

Tests:

- `cargo test` in root workspace ran 14 common tests.

Status: **Complete for MVP shared primitives**.

### `contracts/lending_pool`

Purpose:

- Main lending pool/router contract for protocol initialization, reserves, supply, withdraw, borrow, repay, health factor, collateral toggling, and liquidation hook.

Key files:

- `contracts/lending_pool/src/lib.rs`
- `contracts/lending_pool/Cargo.toml`
- `contracts/lending_pool/test_snapshots/test/*.json`

Main public functions:

- `initialize(admin, oracle, treasury)`
- `add_reserve(config, rate_config)`
- `upgrade(new_wasm_hash)`
- `set_paused(paused)`
- `set_liquidation_engine(address)`
- `supply(caller, asset, amount)`
- `withdraw(caller, asset, amount)`
- `borrow(caller, asset, amount)`
- `repay(caller, asset, amount)`
- `toggle_collateral(caller, asset, use_as_collateral)`
- `get_user_data(user)`
- `get_health_factor(user)`
- `get_reserve_info(asset)`
- `get_reserve_count()`
- `oracle()`
- `get_user_deposit(user, asset)`
- `get_user_debt(user, asset)`
- `get_pool_total_deposits(asset)`
- `get_pool_total_borrows(asset)`
- `get_reserve_deficit(asset)`
- `liquidation_hook(...)`

Important structs/types:

- Uses `ReserveConfig`, `InterestRateConfig`, `UserAccountData`, storage keys from `common`.
- Internal `InternalKey`.

Events:

- Publishes symbols including `reserve`, `supply`, `wdraw`, `borrow`, `repay`, `toggle`, and `bad_debt`.

Tests:

- Workspace tests include:
  - `test_initialize`
  - `test_double_init`
  - `test_add_reserve`
  - `test_supply_and_withdraw`
  - `test_toggle_collateral`
  - `test_toggle_collateral_fails_with_debt`
  - `test_alice_deposit_borrow_repay_withdraw_flow`
  - `test_manual_liquidation_flow`

Status: **Complete for contract MVP**, with production-hardening caveat: business logic still uses `panic!` in several failure paths.

### `contracts/a_token`

Purpose:

- Interest-bearing receipt token for supplied positions.

Key files:

- `contracts/a_token/src/lib.rs`

Main public functions:

- `initialize(pool, underlying_asset, reserve_index, name, symbol, decimals)`
- `mint(to, scaled_amount)`
- `burn(from, scaled_amount)`
- `scaled_balance_of(id)`
- `scaled_total_supply()`
- `decimals()`
- `name()`
- `symbol()`
- `underlying_asset()`
- `pool()`

Important types:

- Uses `TokenDataKey`.

Events:

- Publishes `mint` and `burn` events.

Tests:

- Workspace tests include metadata, mint/burn, insufficient burn, and double initialization.

Status: **Complete for MVP receipt-token behavior**.

### `contracts/debt_token`

Purpose:

- Non-transferable scaled debt token for borrow accounting.

Key files:

- `contracts/debt_token/src/lib.rs`

Main public functions:

- `initialize(pool, underlying_asset, reserve_index, name, symbol, decimals)`
- `mint(to, scaled_amount)`
- `burn(from, scaled_amount)`
- `transfer(from, to, amount)` rejects transfers.
- `scaled_balance_of(id)`
- `scaled_total_supply()`
- `decimals()`
- `name()`
- `symbol()`
- `underlying_asset()`
- `pool()`

Events:

- Publishes `mint` and `burn`.

Tests:

- Workspace tests include mint/burn and transfer rejection.

Status: **Complete for MVP debt tracking**.

### `contracts/reserve`

Purpose:

- Reserve state/index/rate storage contract.

Key files:

- `contracts/reserve/src/lib.rs`

Main public functions:

- `initialize(config, rate_config)`
- `update_state(rate_config)`
- `update_total_deposits(delta, is_increase)`
- `update_total_borrows(delta, is_increase)`
- `get_config()`
- `get_liquidity_index()`
- `get_borrow_index()`
- `get_total_deposits()`
- `get_total_borrows()`
- `get_borrow_rate()`
- `get_supply_rate()`

Important types:

- `ReserveConfig`
- `InterestRateConfig`
- `ReserveDataKey`

Events:

- No obvious high-level reserve event publication in this contract file; state is updated in storage.

Tests:

- Workspace tests include initialize, get_config, update_totals.

Status: **Complete for MVP state/rate storage**.

### `contracts/price_oracle`

Purpose:

- Price adapter/mock price source. Supports configured prices and symbol mapping; intended MVP use includes `set_price`.

Key files:

- `contracts/price_oracle/src/lib.rs`

Main public functions:

- `initialize(admin, reflector_address)`
- `get_price_usd(asset)`
- `set_asset_symbol(asset, symbol)`
- `set_price(asset, price_wad)`
- `set_reflector(new_reflector)`
- `set_max_price_age(max_age)`
- `set_max_deviation(max_deviation_bps)`
- `admin()`
- `reflector()`

Important types:

- `LocalOracleKey`
- `PriceData`

Events:

- Publishes `price` event when setting price.

Tests:

- Workspace tests include set/get price, invalid price, and default price failure.

Status: **Partial for production, complete for MVP/mock price**. Full oracle aggregation is not implemented.

### `contracts/liquidation`

Purpose:

- Manual liquidation engine with prepare/execute session flow.

Key files:

- `contracts/liquidation/src/lib.rs`

Main public functions:

- `initialize(admin, pool)`
- `prepare_liquidation(liquidator, borrower, debt_asset, collateral_asset, debt_to_cover)`
- `execute_liquidation(liquidator, session_id)`
- `get_session(session_id)`
- `pool()`
- `is_liquidatable(borrower)`

Important types:

- `LiquidationParams`
- `LiquidationDataKey`

Events:

- Publishes `liq_prp` and `liq_exe`.

Tests:

- Workspace tests include initialize, double init, prepare liquidation, execute liquidation.
- Standalone core liquidation tests also pass; they generated untracked snapshots during this audit.

Status: **Complete for MVP manual liquidation**, not an automated bot.

### `contracts/core/*`

Purpose:

- Standalone engine modules for domain logic: accounting, borrow, config, interest, liquidation, pool, repay, reserve lifecycle, risk, supply, withdraw.

Detected modules:

- `accounting`
- `borrow`
- `config`
- `interest`
- `liquidation`
- `pool`
- `repay`
- `reserve`
- `risk`
- `supply`
- `withdraw`

Common file pattern:

- `model.rs`
- `events.rs`
- `errors.rs`
- `flow.rs` or operation-specific modules
- `validation.rs`
- `tests.rs`
- `mod.rs`

Important observations:

- These modules are not members of the root `contracts` workspace.
- Running `cd contracts && cargo test` does not execute these standalone core tests.
- Separate audit run executed all core crate tests and they passed:
  - accounting: 32 tests
  - borrow: 26 tests
  - config: 11 tests
  - interest: 16 tests
  - liquidation: 4 tests
  - pool: 7 tests
  - repay: 26 tests
  - reserve: 15 tests
  - risk: 6 tests
  - supply: 21 tests
  - withdraw: 23 tests

Status: **Partial integration / strong internal engine coverage**. The core crates are substantial, but the deployable root workspace uses the deployable contract crates, not all standalone core crates directly.

### Panic / Error Handling Observation

No `TODO`, `FIXME`, `todo!`, or `unimplemented!` markers were found in `contracts`, `frontend`, or `docs` for the searched file types.

However, several deployable contracts still use `panic!` for business logic and authorization/state failures. That is acceptable for current tests but should be reviewed before production.

## 4. Smart Contract Feature Matrix

| Feature | Status | Where Implemented | Notes |
| --- | --- | --- | --- |
| Initialize protocol | Complete | `contracts/lending_pool/src/lib.rs::initialize` | Tests pass. Stores admin, oracle, treasury, initialized state. |
| Create reserve | Complete | `lending_pool::add_reserve`, `reserve::initialize` | Supports reserve config and rate config. |
| Deposit | Complete | `lending_pool::supply`; core `supply` module | Transfers asset, updates scaled balances, mints aToken, emits event. |
| Withdraw | Complete | `lending_pool::withdraw`; core `withdraw` module | Checks health factor where needed, burns aToken, transfers underlying. |
| Borrow | Complete | `lending_pool::borrow`; core `borrow` module | Checks collateral/health, mints debt, transfers underlying. |
| Repay | Complete | `lending_pool::repay`; core `repay` module | Caps repayment to debt, burns debt token, updates liquidity/debt. |
| Interest accrual | Complete for MVP | `common/math.rs`, `reserve::update_state`, lending pool index helpers, core `interest` | Uses WAD/RAY fixed-point math. |
| Health Factor | Complete for MVP | `lending_pool::get_user_data`, `get_health_factor` | Uses reserve configs and oracle prices. |
| Manual liquidation | Complete for MVP | `liquidation::{prepare_liquidation, execute_liquidation}`, `lending_pool::liquidation_hook` | Manual two-step flow. No bot. |
| Price oracle / mock price | Partial | `contracts/price_oracle/src/lib.rs` | `set_price` supports MVP/mock pricing. Production aggregation incomplete. |
| Events | Partial/Complete for MVP | Deployed contracts and core event modules | Core actions emit events; no off-chain indexer required. |
| A token | Complete for MVP | `contracts/a_token/src/lib.rs` | Scaled mint/burn receipt token. |
| Debt token | Complete for MVP | `contracts/debt_token/src/lib.rs` | Non-transferable scaled debt token. |
| Deployment scripts | Partial | `contracts/scripts/*.sh`, older `contracts/*.ps1/js` | Scripts exist and syntax-check, but no actual deployment recorded. |
| Tests | Complete for current MVP commands | Workspace and standalone core crates | Root workspace 38 tests pass; core standalone 187 tests pass separately. |

## 5. Frontend Overview

Framework:

- React 19
- TypeScript
- Vite
- ESLint
- `lucide-react`
- `@stellar/freighter-api`
- `@stellar/stellar-sdk`
- `socket.io-client`
- Firebase dependency remains in package dependencies.

Main entry files:

- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/src/index.css`
- `frontend/src/App.css`

Routing:

- No React Router dependency or route table was detected.
- The app uses internal `currentView` state in `App.tsx` with views:
  - `DASHBOARD`
  - `MARKET`
  - `POOLS`
  - `SIMULATOR`
- No `/demo` route exists.

Main pages/components:

- `Header`
- `HealthFactorGauge`
- `PositionStats`
- `SystemReserves`
- `TradingViewChart`
- `CreditMarketPage`
- `PoolsPage`
- `SimulatorPage`
- `InteractionPanel`
- `MarketTable`
- `MoneyFlowOverlay`
- `SorobanBitmap`
- `SorobanKinked`
- `SorobanLiquidation`
- `SorobanTtl`
- `TokenFlowLedger`
- `Footer`
- `ConsoleLogger`

Styling approach:

- Large global stylesheet in `frontend/src/index.css`.
- `frontend/src/App.css` remains from the original template/legacy app and is imported by `App.tsx`.
- Visual style is the original neon/glass/cyberpunk dashboard design.

Original UI preservation:

- The default app is the restored original UI.
- `App.tsx` imports the original components and does not render the rough MVP dashboard by default.

MVP dashboard:

- Exists under `frontend/src/components/mvp-demo/`.
- Exported via `frontend/src/pages/MvpDemoPage.tsx`.
- Not wired into the default app.
- No `/demo` route exists because routing is not present.

Integration services:

- `frontend/src/services/freighter.ts`: Freighter availability/connect/sign helpers.
- `frontend/src/services/soroban.ts`: RPC client, transaction build/submit/poll/read helpers.
- `frontend/src/services/contracts.ts`: wrapper functions for initialize, reserve reads, deposit, withdraw, borrow, repay, health factor, liquidation prepare/execute.
- `frontend/src/services/stellarExpert.ts`: transaction/contract/account URL helpers.

Important caveat:

- These services compile, but the restored default UI does not appear to consistently use them yet. The default UI still contains older direct Freighter/Stellar SDK imports in `App.tsx` and significant simulated/local state behavior.

## 6. Frontend Feature Matrix

| Feature | Status | Where Implemented | Notes |
| --- | --- | --- | --- |
| Landing page/default UI | Complete/restored | `frontend/src/App.tsx`, `index.css`, original components | Original dashboard UI is default. |
| Connect wallet | Partial | Default `App.tsx`; `services/freighter.ts`; `components/mvp-demo/ConnectWallet.tsx` | Exists, but default UI needs service-layer consolidation and browser testing. |
| Dashboard | Complete for original UI | `App.tsx`, `PositionStats`, `HealthFactorGauge`, `SystemReserves`, `TradingViewChart` | Uses local/simulated state patterns. |
| Pool display | Complete for original UI | `SystemReserves`, `PoolsPage`, `MarketTable` | Displays XLM/USDC reserve simulation data. |
| Deposit form | Partial | `InteractionPanel`; `components/mvp-demo/DepositForm.tsx` | UI exists; real service integration not confirmed in default UI. |
| Withdraw form | Partial | `InteractionPanel`; `components/mvp-demo/WithdrawForm.tsx` | UI exists; real service integration not confirmed in default UI. |
| Borrow form | Partial | `InteractionPanel`; `components/mvp-demo/BorrowForm.tsx` | UI exists; real service integration not confirmed in default UI. |
| Repay form | Partial | `InteractionPanel`; `components/mvp-demo/RepayForm.tsx` | UI exists; real service integration not confirmed in default UI. |
| Health Factor display | Complete for UI, partial for live chain | `HealthFactorGauge`, `PositionStats`, `contracts.ts::getHealthFactor` | Display exists. Live contract reads not verified in browser. |
| Transaction status | Partial | Default app tx state; `mvp-demo/TransactionStatus.tsx` | UI patterns exist; default flow should be revalidated with real Testnet txs. |
| Stellar Expert link | Partial | `services/stellarExpert.ts`; links also appear in legacy UI patterns | Helper exists. Actual default UI link coverage needs review. |
| Manual liquidation form | Partial | `SorobanLiquidation`, simulator flow; `mvp-demo/ManualLiquidationForm.tsx` | Manual liquidation UI/simulation exists; live flow not browser-tested. |
| Environment variables | Partial/Complete template | `frontend/.env.example` | Template exists; `.env.local` with real contract IDs is not present/tracked. |

## 7. Deployment & Environment

Available deployment-related files:

- `contracts/scripts/deploy-testnet.sh`
- `contracts/scripts/init-testnet.sh`
- `contracts/scripts/verify-testnet.sh`
- `contracts/.env.example`
- `frontend/.env.example`
- `deployments/testnet.json`
- Older scripts:
  - `contracts/deploy.ps1`
  - `contracts/initialize.ps1`
  - `contracts/initialize_fixed.ps1`
  - `contracts/add_reserves_via_files.js`
  - `contracts/initialize_oracle.js`
  - `contracts/initialize_reserves.js`
  - `contracts/redeploy_entire_protocol.js`
  - `contracts/deploy_mainnet.js`

Expected contract env variables:

```text
SOROBAN_RPC_URL
SOROBAN_NETWORK_PASSPHRASE
DEPLOYER_SECRET_KEY
SOURCE_ACCOUNT
LENDING_POOL_CONTRACT_ID
A_TOKEN_CONTRACT_ID
DEBT_TOKEN_CONTRACT_ID
RESERVE_CONTRACT_ID
PRICE_ORACLE_CONTRACT_ID
LIQUIDATION_CONTRACT_ID
XLM_ASSET_CONTRACT_ID
USDC_ASSET_CONTRACT_ID
STELLAR_EXPERT_BASE_URL
```

Expected frontend env variables:

```text
VITE_SOROBAN_RPC_URL
VITE_SOROBAN_NETWORK_PASSPHRASE
VITE_LENDING_POOL_CONTRACT_ID
VITE_A_TOKEN_CONTRACT_ID
VITE_DEBT_TOKEN_CONTRACT_ID
VITE_RESERVE_CONTRACT_ID
VITE_PRICE_ORACLE_CONTRACT_ID
VITE_LIQUIDATION_CONTRACT_ID
VITE_XLM_ASSET_CONTRACT_ID
VITE_USDC_ASSET_CONTRACT_ID
VITE_STELLAR_EXPERT_BASE_URL
```

Real contract IDs:

- No real contract IDs are recorded in `deployments/testnet.json`.
- The deployment JSON is a template with empty values.
- No `contracts/.env.local` or `frontend/.env.local` was found in tracked status output.

Deployment performed:

- Not recorded in repository.
- Scripts were syntax-checked with Git Bash and passed.
- Scripts were not executed against Testnet during this audit.

Manual commands currently expected:

```bash
cd contracts
cp .env.example .env
# set DEPLOYER_SECRET_KEY in contracts/.env
bash scripts/deploy-testnet.sh
bash scripts/init-testnet.sh
bash scripts/verify-testnet.sh
```

Then:

```bash
cd frontend
npm install
npm run dev
```

Deployment readiness:

- Scripts and templates are ready for a manual Testnet attempt.
- Biggest missing input is a real funded deployer secret key.
- Biggest missing output is populated contract IDs and successful `verify-testnet.sh` output.

## 8. Documentation Overview

Documentation categories detected:

### Architecture

- `docs/00-overview.md`
- `docs/02-system-architecture.md`
- `docs/03-c4-model.md`
- `docs/04-business-flows.md`

These documents mostly describe the current contract-first MVP and explicitly exclude backend/indexer/bot dependencies from the MVP.

### ADRs

- `docs/adr/ADR-0001-use-stellar-soroban.md`
- `ADR-0002-event-driven-architecture.md`
- `ADR-0003-postgresql-instead-of-firebase.md`
- `ADR-0004-modular-smart-contracts.md`
- `ADR-0005-oracle-aggregator.md`
- `ADR-0006-upgradeability-and-migration-strategy.md`
- `ADR-0007-emergency-pause-and-guardian-model.md`
- `ADR-0008-oracle-failure-handling.md`
- `ADR-0009-interest-index-accounting-model.md`
- `ADR-0010-governance-timelock-policy.md`

Some ADRs are explicitly marked superseded or Post-MVP for the current MVP.

### Financial / Mathematical / Invariants

- `docs/13-financial-specification.md`
- `docs/14-mathematical-specification.md`
- `docs/15-protocol-invariants.md`
- `docs/16-state-machine-specification.md`
- `docs/17-failure-mode-analysis.md`
- `docs/18-economic-attack-model.md`

These are comprehensive and go beyond the immediate MVP.

### Security / Threat Model

- `docs/08-security-model.md`
- `docs/19-threat-model.md`
- `SECURITY.md`

They correctly state the MVP is not mainnet-ready and lacks production monitoring/oracle hardening.

### Roadmap / Project Management

- `docs/12-roadmap.md`
- `docs/project-management/*.md`

These documents mostly align to the MVP refactor and put backend/indexer/bot work in Post-MVP scope.

### Future Work

- `docs/future-work/backend-analytics.md`
- `docs/future-work/indexer-architecture.md`
- `docs/future-work/liquidation-bot.md`

These preserve non-MVP systems for later.

### Demo Docs

- `docs/demo/demo-script.md`

Provides a step-by-step Testnet demo script.

### Reviews

- `docs/reviews/architecture-review-001.md`
- `docs/reviews/architecture-review-001-resolution.md`
- `docs/reviews/architecture-review-002-financial-design.md`
- `docs/reviews/mvp-scope-refactor-report.md`
- This report: `docs/reviews/current-project-state-report.md`

Outdated/conflicting docs:

- Historical architecture reviews still discuss indexer/backend/API/database concerns, but they generally include warnings that those are historical or Post-MVP.
- `scripts/README.md` describes root scripts such as `deploy_contracts.js`, but those files are not present in root `scripts/`; deployment scripts currently live under `contracts/scripts/`.
- `mainnet_deployment_plan.md` and `contracts/deploy_mainnet.js` exist, but current project status is Testnet/demo only.

## 9. Test & Build Status

Commands run on 2026-07-01.

### Contracts

| Command | Status | Notes |
| --- | --- | --- |
| `cd contracts && cargo build --target wasm32v1-none --release` | PASS | Optimized WASM build finished successfully. |
| `cd contracts && cargo test` | PASS | 38 workspace tests passed, 0 failed. |
| `cd contracts && cargo fmt -- --check` | PASS | No formatting failures. |
| `cd contracts && cargo clippy --all-targets -- -D warnings` | PASS | No clippy warnings/errors. |

Additional core crate test run:

| Core Crate | Status | Test Count |
| --- | --- | --- |
| accounting | PASS | 32 |
| borrow | PASS | 26 |
| config | PASS | 11 |
| interest | PASS | 16 |
| liquidation | PASS | 4 |
| pool | PASS | 7 |
| repay | PASS | 26 |
| reserve | PASS | 15 |
| risk | PASS | 6 |
| supply | PASS | 21 |
| withdraw | PASS | 23 |

Core crate note:

- These are standalone crates under `contracts/core/*`.
- They are not included in the root `contracts` workspace members.
- Running them generated untracked snapshot files under `contracts/core/liquidation/test_snapshots/`.

### Frontend

| Command | Status | Notes |
| --- | --- | --- |
| `cd frontend && npm install` | PASS | Up to date; 302 packages audited; 0 vulnerabilities reported. |
| `cd frontend && npm run build` | PASS | TypeScript and Vite build passed. Vite reported large chunk warning. |
| `cd frontend && npm run lint` | PASS | ESLint passed. |

Frontend build warning:

- Main JS bundle is large: about 1.46 MB minified, 384 KB gzip.
- Vite suggests code-splitting or adjusting chunk warning limit.

Deployment script syntax:

| Command | Status | Notes |
| --- | --- | --- |
| `bash -n contracts/scripts/*.sh` via Git Bash | PASS | Syntax-only check; no deployment performed. |

## 10. Git / Working Tree Status

`git status --short` before writing this report showed a dirty working tree.

Modified tracked files:

```text
M README.md
M contracts/Cargo.lock
M contracts/a_token/src/lib.rs
M contracts/common/src/types.rs
M contracts/core/repay/execution.rs
M contracts/debt_token/src/lib.rs
M contracts/lending_pool/Cargo.toml
M contracts/lending_pool/src/lib.rs
M contracts/lending_pool/test_snapshots/test/test_add_reserve.1.json
M contracts/lending_pool/test_snapshots/test/test_double_init.1.json
M contracts/lending_pool/test_snapshots/test/test_initialize.1.json
M contracts/lending_pool/test_snapshots/test/test_supply_and_withdraw.1.json
M contracts/lending_pool/test_snapshots/test/test_toggle_collateral.1.json
M contracts/lending_pool/test_snapshots/test/test_toggle_collateral_fails_with_debt.1.json
M contracts/liquidation/Cargo.toml
M contracts/liquidation/src/lib.rs
M contracts/price_oracle/Cargo.toml
M contracts/price_oracle/src/lib.rs
M contracts/reserve/src/lib.rs
M frontend/src/App.tsx
M frontend/src/components/AnimateNumber.tsx
M frontend/src/components/Header.tsx
M frontend/src/components/InteractionPanel.tsx
M frontend/src/components/MoneyFlowOverlay.tsx
M frontend/src/components/PoolsPage.tsx
M frontend/src/components/SorobanBitmap.tsx
M frontend/src/components/SorobanKinked.tsx
M frontend/src/components/SorobanLiquidation.tsx
M frontend/src/components/TokenFlowLedger.tsx
```

Untracked files/directories:

```text
?? contracts/.env.example
?? contracts/core/liquidation/test_snapshots/
?? contracts/core/repay/test_snapshots/tests/test_execute_no_debt_rejected.1.json
?? contracts/core/repay/test_snapshots/tests/test_execute_over_repay_capped.1.json
?? contracts/core/repay/test_snapshots/tests/test_full_repay_execution.1.json
?? contracts/core/repay/test_snapshots/tests/test_full_repay_rounding_does_not_create_negative_debt.1.json
?? contracts/core/repay/test_snapshots/tests/test_liquidity_increases_on_repay.1.json
?? contracts/core/repay/test_snapshots/tests/test_partial_repay_execution.1.json
?? contracts/core/repay/test_snapshots/tests/test_repay_completed_event_emitted.1.json
?? contracts/core/repay/test_snapshots/tests/test_scaled_debt_decreases_with_indexed_debt.1.json
?? contracts/core/repay/test_snapshots/tests/test_successful_repay_execution.1.json
?? contracts/core/repay/test_snapshots/tests/test_validation_failure_prevents_execution.1.json
?? contracts/lending_pool/test_snapshots/test/test_alice_deposit_borrow_repay_withdraw_flow.1.json
?? contracts/lending_pool/test_snapshots/test/test_manual_liquidation_flow.1.json
?? contracts/scripts/
?? deployments/
?? docs/demo/
?? frontend/.env.example
?? frontend/src/assets/udonfi_logo.svg
?? frontend/src/assets/udonfi_logo_icon.svg
?? frontend/src/components/mvp-demo/
?? frontend/src/pages/
?? frontend/src/services/
```

Suspicious or review-worthy changes:

- `frontend/src/App.tsx` has a file-level ESLint compatibility disable header to keep the restored original UI linting without refactoring the large legacy file.
- `frontend/src/components/*` legacy lint fixes are modified tracked files.
- `contracts/core/liquidation/test_snapshots/` was generated during this audit's standalone core test run.
- `indexer_bot/serviceAccountKey.json` exists and should be reviewed for accidental secret material.
- `contracts/core/*/target` generated build outputs exist under core crates.
- `indexer/node_modules` and root `node_modules` are present.

## 11. Known Issues / Risks

1. No actual Testnet deployment is recorded.
   - `deployments/testnet.json` is empty/template-only.
   - Contract IDs are not available.

2. Frontend is not fully integrated into the restored default UI.
   - Service wrappers exist but are not clearly wired through the original default app flow.
   - Default UI still uses older direct Freighter/Stellar SDK imports and simulated/local state.

3. No browser/Freighter smoke test was performed in this audit.
   - Build/lint pass, but live wallet signing and Testnet submission are not verified.

4. Deployment scripts are new and syntax-check, but runtime behavior is unproven.
   - Need real funded Testnet deployer key and end-to-end script execution.

5. Business logic uses `panic!` in deployable contracts.
   - Tests pass, but production-quality Soroban contracts should use explicit error surfaces where practical.

6. Core crates are outside the root workspace.
   - Easy to miss their tests if only running `cd contracts && cargo test`.

7. Generated/untracked snapshots need review.
   - Snapshot files under core/lending pool should either be committed intentionally or cleaned/ignored intentionally.

8. Scope documents are mostly aligned but still broad.
   - Historical docs preserve backend/indexer/bot concepts; readers may need clear "current MVP vs future work" context.

9. Root `scripts/README.md` appears stale.
   - It references scripts not present in root `scripts/`.

10. Large frontend bundle warning.
    - Current build passes, but Vite warns that chunks exceed 500 KB after minification.

11. Potential secret file risk.
    - `indexer_bot/serviceAccountKey.json` should be verified and removed/ignored if it contains real credentials.

12. No production oracle aggregation.
    - Current oracle is sufficient for MVP/mock price but not mainnet-ready.

13. No automated liquidation bot.
    - Manual liquidation exists; monitoring/automation is Post-MVP.

14. No event indexer.
    - Events exist, but there is no MVP off-chain event pipeline.

## 12. Recommended Cleanup Plan

### Immediate Fixes

1. Deploy to Stellar Testnet and populate contract IDs.
2. Run `init-testnet.sh` and `verify-testnet.sh` against real Testnet.
3. Browser-test Freighter connect, signing, submission, polling, and Stellar Expert links.
4. Decide whether newly generated snapshots should be committed or removed/ignored.
5. Check `indexer_bot/serviceAccountKey.json` for secrets and remove if real.

### Short-Term Fixes

1. Wire service wrappers into the restored original UI without changing the design.
2. Replace remaining simulated transaction/hash paths in the default frontend with real Testnet calls.
3. Add a small non-invasive demo route or view only if routing is intentionally introduced.
4. Move core crates into the workspace or document/run their test command in CI.
5. Reconcile stale script docs with actual `contracts/scripts/*`.
6. Reduce `App.tsx` lint suppression by extracting typed helpers incrementally, without changing UI.

### Post-MVP

1. Production oracle aggregation and failure handling.
2. Event indexer and analytics backend.
3. Automated liquidation bot/off-chain monitor.
4. Governance/timelock production controls.
5. Frontend code-splitting and bundle optimization.
6. Mainnet deployment plan execution after audits.

## 13. Suggested Next Tasks

| ID | Goal | Files Likely Affected | Priority | Why It Matters |
| --- | --- | --- | --- | --- |
| DEPLOY-001 | Perform real Testnet deployment and capture IDs. | `contracts/.env`, `contracts/scripts/*`, `deployments/testnet.json`, `frontend/.env.local` | High | No real deployment is recorded; frontend cannot call contracts without IDs. |
| DEPLOY-002 | Run initialization and verification scripts on Testnet. | `contracts/scripts/init-testnet.sh`, `verify-testnet.sh`, deployment logs | High | Confirms protocol/reserve/oracle/liquidation are callable after deployment. |
| FRONTEND-001 | Connect restored original UI to service wrappers. | `frontend/src/App.tsx`, `frontend/src/services/*`, action components | High | Preserves design while enabling real contract calls. |
| UI-001 | Browser smoke-test original UI after env is populated. | No code expected; test notes/docs may be updated | High | Build passing is not enough for wallet/network UX. |
| DEMO-001 | Execute full demo flow with Freighter and Stellar Expert links. | `docs/demo/demo-script.md`, deployment output | High | Required for submission confidence. |
| CLEANUP-001 | Review and resolve untracked snapshots/generated files. | `contracts/core/*/test_snapshots`, `contracts/lending_pool/test_snapshots` | Medium | Prevents accidental artifact drift and unclear PR content. |
| CLEANUP-002 | Review possible secret-bearing files. | `indexer_bot/serviceAccountKey.json`, `.gitignore` | High | Avoids credential leakage. |
| DOCS-001 | Reconcile script documentation with actual scripts. | `scripts/README.md`, `README.md`, `docs/10-deployment-plan.md` | Medium | Reduces operator confusion during deployment. |
| CONTRACT-001 | Replace business `panic!` paths with explicit errors where feasible. | `contracts/*/src/lib.rs`, `common/errors.rs` | Medium | Production hardening and cleaner client behavior. |
| CI-001 | Add core crates to workspace or CI matrix. | `contracts/Cargo.toml`, CI config if present | Medium | Avoids missing standalone core test coverage. |

## 14. Final Assessment

Is the contract MVP ready?

- **Mostly yes for local MVP verification.**
- Verified: build, workspace tests, formatting, clippy, and standalone core tests all pass.
- Caveat: no real Testnet deployment verified during this audit; business logic still uses panic-style failures.

Is the frontend ready?

- **Partial.**
- Verified: `npm install`, build, and lint pass.
- The original UI is restored and builds.
- Caveat: default UI is not fully proven against live contracts; service wrappers exist but are not fully wired into the restored UI.

Is the project deploy-ready?

- **Partial.**
- Scripts, env templates, and deployment output template exist.
- Script syntax passes.
- Actual deployment has not been performed or recorded.

Is the project demo-ready?

- **Partial, not fully ready.**
- Local builds/tests pass and demo instructions exist.
- Biggest missing piece is a real Testnet deployment plus browser/Freighter end-to-end validation.

Single biggest blocker:

- **No verified Testnet deployment with real contract IDs wired into the restored frontend.**

