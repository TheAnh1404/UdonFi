# 🍜 UdonFi — High-Performance & Premium Web3 Lending Protocol on Stellar Soroban

[![Stellar Soroban](https://img.shields.io/badge/Stellar-Soroban-black?style=for-the-badge&logo=stellar&logoColor=white&color=080C1C)](https://soroban.stellar.org/)
[![Rust Smart Contracts](https://img.shields.io/badge/Rust-Contracts-orange?style=for-the-badge&logo=rust&logoColor=white&color=DE7F3E)](https://www.rust-lang.org/)
[![Vite React TS](https://img.shields.io/badge/Vite_React_TS-Frontend-blue?style=for-the-badge&logo=vite&logoColor=white&color=00F2FE)](https://vitejs.dev/)
[![Node.js Indexer](https://img.shields.io/badge/Node.js-Indexer-green?style=for-the-badge&logo=nodedotjs&logoColor=white&color=21A366)](https://nodejs.org/)
[![Firebase Status](https://img.shields.io/badge/Firebase-Realtime-yellow?style=for-the-badge&logo=firebase&logoColor=white&color=FFCA28)](https://firebase.google.com/)

---

## 🌟 Executive Summary & High-Level Architecture

**UdonFi** is a state-of-the-art decentralized lending and borrowing protocol custom-tailored for the **Stellar Soroban Smart Contract platform**. Built to address both capital efficiency and low-level blockchain constraints, UdonFi leverages professional DeFi mathematical models (such as Kinked Interest Curves, dynamic LTV, and real-time Health Factor checks) alongside low-level Soroban engine optimizations (such as `u128` state bitmap packing, CPU instruction splitting, and ledger-level state preservation).

Wrapped in a breathtaking **Cyberpunk Neon & Glassmorphism React interface**, UdonFi serves as a production-grade blueprint for constructing elegant, high-throughput, and cost-effective financial dApps on Stellar.

```text
                                     UDONFI ECOSYSTEM FLOW
                                     
      ┌─────────────────────────────────────────────────────────────────────────────────┐
      │                                 Stellar Network                                 │
      │                                                                                 │
      │   ┌────────────────────┐      State Events      ┌───────────────────────────┐   │
      │   │  Smart Contracts   │ ─────────────────────> │     Indexer Bot (Node)    │   │
      │   │      (Rust)        │                        │                           │   │
      │   └────────┬───────────┘                        └─────────────┬─────────────┘   │
      └────────────┼──────────────────────────────────────────────────┼─────────────────┘
                   │                                                  │
           RPC Query/Writes                                    State Broadcast
                   │                                                  │
                   │                                     ┌────────────┴─────────────┐
                   │                                     │                          │
                   │                                     ▼                          ▼
                   │                           ┌──────────────────┐       ┌──────────────────┐
                   │                           │  Firestore Live  │       │  Socket.io Push  │
                   │                           │     Database     │       │     (Realtime)   │
                   │                           └────────┬─────────┘       └────────┬─────────┘
                   ▼                                    │                          │
      ┌─────────────────────────────────────────────────┼──────────────────────────┼────┐
      │                                                 │                          │    │
      │   ┌─────────────────────────────────────────────▼──────────────────────────▼┐   │
      │   │                         UdonFi Premium Web3 Client                      │   │
      │   │                      (Vite + React + TypeScript App)                    │   │
      │   └─────────────────────────────────────────────────────────────────────────┘   │
      │                                                                                 │
      └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📐 1. Core Financial Mathematics & Risk Models

UdonFi treats capital security and risk mitigation as top priorities. The protocol operates under mathematical formulas that continuously compute parameters for every pool position.

### A. Position Health & Automatic Liquidation Mechanics
*   **Loan-to-Value Max ($LTV_{max} = 70\%$):** Represents the strict borrowing ceiling. If a user attempts to borrow more than $70\%$ of their collateralized value, the transaction is rejected instantly at the simulation layer.
*   **Liquidation Threshold ($LT = 82.5\%$):** The risk threshold at which a position is deemed under-collateralized.
*   **Health Factor ($HF$):** The numeric indicator representing position safety:
    $$HF = \frac{\sum (\text{Collateral Value}_i \times LT_i)}{\sum \text{Outstanding Debt}_j}$$
    *   **$HF > 1.5$ (Safe Mode — Neon Green):** Excellent collateral ratio. Fully protected against market swings.
    *   **$1.0 \le HF \le 1.5$ (Caution Mode — Cyber Yellow):** High leverage. Exposed to liquidation if the collateral drops or interest accrues.
    *   **$HF < 1.0$ (Liquidatable — Warning Red):** The position is insolvent. Liquidation functions become public and executable.

---

### B. Dual-Phase Kinked Interest Rate Curve (KIRC)
To optimize capital utilization ($U$) and protect liquidity pools from fully draining, UdonFi implements a non-linear variable APY model:
$$U = \frac{\text{Borrowed Asset Value}}{\text{Total Supplied Value}}$$

The **Borrow APY** ($R_t$) spikes sharply once utilization passes the optimal threshold ($U_{optimal} = 80\%$), discouraging borrowing and penalizing active borrowers:

1.  **Phase 1 — Stable Borrowing ($U \le 80\%$):**
    $$R_t = R_{base} + \left( \frac{U}{U_{optimal}} \right) \times R_{slope1}$$
    *Rates scale gradually (e.g., from $1\%$ to $5\%$) to maintain friendly terms for borrowers.*

2.  **Phase 2 — Liquidity Crisis ($U > 80\%$):**
    $$R_t = R_{base} + R_{slope1} + \left( \frac{U - U_{optimal}}{100\% - U_{optimal}} \right) \times R_{slope2}$$
    *Rates surge exponentially up to $90\%$ ($R_{slope2}$). This forces borrowers to close their loans and encourages new suppliers to deposit liquidity to capture high yield.*

**Supply APY** tracks Borrow APY proportionally, accounting for a $10\%$ protocol reserve buffer:
$$\text{Supply APY} = R_t \times U \times (1 - \text{Reserve Factor})$$

```text
  Borrow APY (%)
   ▲
90 │                                                     /
   │                                                    /
   │                                                   / [Slope 2: Liquidity Panic]
   │                                                  /
   │                                                 /
 5 │                                  .-------------'
   │                      .----------'  [Kink @ 80%]
 1 │          .----------' [Slope 1]
   └──────────┴───────────────────────┴──────────────────┴───────► Utilization Rate (U)
             0%                      80%                100%
```

---

## 🛠️ 2. Soroban Low-Level Technical Innovations

Standard Ethereum Virtual Machine (EVM) paradigms do not translate efficiently to Stellar Soroban due to ledger fees and execution restrictions. UdonFi addresses this by integrating custom lower-level solutions:

### A. u128 Bitwise State Packing (Ledger Saving Matrix)
Rather than mapping user records via memory-expensive arrays or dynamic maps (which spike Soroban ledger size fees and require multiple O(N) iteration passes), UdonFi condenses a user’s active asset positions into a **single binary `u128` integer**:
*   Every asset registered in the protocol pool takes exactly **2 bits** within the bitmap:
    *   **Bit $2i$ (Collateral Flag):** If active ($1$), asset $i$ is pledged as collateral.
    *   **Bit $2i + 1$ (Debt Flag):** If active ($1$), asset $i$ is currently borrowed.
*   Updating flags relies entirely on CPU-efficient, single-instruction bitwise logic:
    *   *To Toggle Collateral:* `bitmap |= (1 << 2i)`
    *   *To Check Debt Status:* `(bitmap >> (2i + 1)) & 1 == 1`
*   **Result:** Reduces overall user-state ledger footprints by **up to 95%**, optimizing user transaction fees.

---

### B. 2-Step Liquidation Pattern (CPU Instruction Splitter)
Soroban VM maintains a maximum execution energy ceiling of **100 Million CPU Instructions** per transaction. A traditional, monolithic DeFi liquidation transaction (which aggregates Oracle calls, dynamic interest calculation, health evaluation, transfer of debt, and collateral seizure) regularly hits **100M - 120M CPU instructions**, triggering gas abort failures.

UdonFi resolves this limit with a **Split-Process Architectural Flow**:

```text
                       2-STEP DECENTRALIZED LIQUIDATION
                       
       ┌────────────────────────┐                   ┌────────────────────────┐
       │  prepare_liquidation() │ ── Session ID ──> │ execute_liquidation()  │
       │  (~60M CPU Instructions)│                   │ (~30M CPU Instructions)│
       └───────────┬────────────┘                   └───────────┬────────────┘
                   │                                            │
        - Evaluates Health Factor                     - Repays target debt asset
        - Locks Borrower's Collateral                 - Releases locked collateral
        - Opens Ledger Session ID                     - Rewards liquidator +5% Bonus
```
By breaking the operation into two distinct, cryptographically linked transactions, each execution stays well within the 100M instruction window, guaranteeing safe liqudation events under all network conditions.

---

### C. Proactive TTL Renewal (State Archival Protection)
Stellar Soroban implements a State Archival model where every ledger entry decays unless it is financially maintained. If an entry’s Time-to-Live (TTL) reaches zero, the record is **evicted (archived)**, freezing user balances.
*   UdonFi implements an automated **proactive renewal routine** inside every core transaction (`supply`, `borrow`, `repay`, `withdraw`).
*   Every client interaction triggers an internal `extend_ttl` instruction that updates the ledger entry’s expiration limit back to the maximum safety boundary of **6,000 blocks**, shielding users from state archival without requiring manual upkeep.

---

## 📂 3. Repository Architecture & Layout

The codebase is organized as a monorepo, cleanly separating contracts, real-time indexing, and client-side visualization:

```text
UdonFi/
├── contracts/                  # Soroban Smart Contracts (Rust)
│   ├── lending_pool/           # Pool core: Deposits, borrowings, APY calculation
│   ├── liquidation/            # 2-Step Liquidation engine implementation
│   ├── reserve/                # Caching structures for registered asset metadata
│   ├── price_oracle/           # Real-time mock asset pricing provider
│   ├── a_token/                # Dynamic dynamic interest-bearing yield tokens
│   ├── debt_token/             # Debt tracking token representation
│   ├── common/                 # Protocol-wide helper macros & state types
│   └── deploy.ps1              # Production powershell deployment script
│
├── indexer_bot/                # Stellar Events Tracker & Sync Server (Node.js)
│   ├── index.js                # Core event loop, XDR deserialization, and WebSockets
│   ├── firebase.js             # Real-time connection setups to cloud storage
│   └── package.json            # Indexer dependencies
│
└── frontend/                   # Futuristic Glassmorphism Web App (React + TS + Vite)
    ├── src/
    │   ├── types/              # Type-safe TypeScript representations of Web3 states
    │   ├── components/         # Highly refined cyber-neon UI blocks
    │   │   ├── Header.tsx      # Premium navigation, TVL statistics & Notification Center
    │   │   ├── SorobanBitmap.tsx # LED 128-bit Bitmap Matrix active visualization
    │   │   ├── SorobanKinked.tsx # Live dynamic APY SVG curve tracking
    │   │   ├── SimulatorPage.tsx # Built-in memory blockchain and sandbox state panel
    │   │   └── ConsoleLogger.tsx # Real-time stream of Soroban transaction logs
    │   ├── index.css           # Premium vanilla CSS styling variables & components
    │   └── App.tsx             # State manager and local math engine
    └── vite.config.ts          # Core Vite bundler configurations
```

---

## 🚀 4. Installation & Local Development Quickstart

You can test UdonFi in two ways: **Instant Offline Sandbox Mode** (runs purely in the browser with our built-in simulator — zero dependencies required) or **Full Local Network Mode** (with indexer bot, Firebase, and Soroban CLI).

### Method A: Instant Sandbox Setup (Recommended for Quick Demos)
The UdonFi client contains a **complete off-chain emulator** that simulates Stellar block production, ledger state decay, and transaction logs in local memory. You can run it in seconds:

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```
2.  **Install dependencies and boot the Vite server:**
    ```bash
    npm install
    npm run dev
    ```
3.  Open `http://localhost:5173` (or the printed port) and select the **"Trình Giả Lập" (Simulator)** tab in the header. You are ready to go!

---

### Method B: Full Event Indexer Setup (Production & Testnet Tracking)
To sync your live on-chain Soroban Testnet transactions with a database and push real-time broadcasts to the client, run the indexer:

1.  **Configure credentials:**
    Place your Firebase configuration credentials inside `indexer_bot/serviceAccountKey.json`.
2.  **Navigate to the indexer directory:**
    ```bash
    cd indexer_bot
    ```
3.  **Boot the indexing stream:**
    ```bash
    npm install
    npm start
    ```
    The bot will automatically spin up an Express server on port `3001`, establish a Socket.io bridge, fetch live ledger event sequences from the Soroban Testnet RPC endpoint, parse XDR schemas, and update your client app dynamically!

---

### Method C: Smart Contract Development & Deployment
To modify, test, or re-deploy the Rust contracts onto Stellar's Testnet:

1.  **Compile Rust contracts to WASM:**
    ```bash
    cd contracts
    cargo build --target wasm32v1-none --release
    ```
2.  **Run logic and mathematical unit tests:**
    ```bash
    cargo test
    ```
3.  **Deploy using the automation script (Requires Soroban CLI):**
    ```powershell
    ./deploy.ps1
    ```

---

## 🎨 5. Premium Cyberpunk UX/UI Highlights

UdonFi breaks away from typical, boring DeFi landing pages with a curated, harmonized design system:

*   **🍜 Pure CSS Animated Logo:** At the top-left, a neon-glowing bowl of Udon rises steaming using dynamic CSS keyframes—representing the "Warmth & Fluidity" of the protocol's liquidity pools.
*   **📈 Dynamic APY SVG Curve:** Visualizes interest rates interactively. Watch the green node glide in real-time along the Kinked APY path as you toggle deposit sizes or simulate high borrow demand.
*   **🟩 Interactive Bit-Matrix LED Panel:** Rendered directly under the "Soroban State" block. It displays a physical layout of the user's `u128` bitmap storage. You can click on LEDs to manually flip bits and watch the decoded state flags update in real time.
*   **🔕 Non-Blocking Notification Center:** Rather than forcing page jumps, redirecting, or scrolling when you trigger deposit or borrow simulation transactions, a premium **Bell Notification Center** in the Header handles background success state updates, complete with full diagnostic readouts.
*   **🕹️ Deep Time-Travel Simulator Sandbox:** The Built-in Simulator page features time travel (instantly advancing ledgers to accumulate compound interest over months) and faucet distribution, enabling developers to stress-test liquidations with absolute ease.

---

*Engineered with precision. Styled for the future of Web3. Welcome to UdonFi.*
