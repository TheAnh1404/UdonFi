# 🍜 UdonFi — Gemini Context

UdonFi is a high-performance, premium decentralized lending protocol built on the **Stellar Soroban** ecosystem. It features a sophisticated risk management system, optimized storage using bitmap packing, and a unique 2-step liquidation process to bypass Soroban VM CPU limits.

## 🏗️ Architecture & Project Structure

The project is organized as a monorepo:

- **`contracts/`**: Soroban smart contracts (Rust).
  - `lending_pool`: Core router for supply, withdraw, borrow, and repay logic.
  - `liquidation`: 2-step liquidation protocol (Prepare/Execute).
  - `reserve`: Configuration for supported assets.
  - `price_oracle`: Simulated price oracle for XLM/USDC.
  - `a_token` & `debt_token`: Interest-bearing and debt-tracking tokens.
  - `common`: Shared data structures, math, and bitmap logic.
- **`frontend/`**: Premium Web3 interface (React + TypeScript + Vite).
  - Uses Glassmorphism & Cyberpunk Neon aesthetics.
  - Integrated "Simulator" mode for local in-memory blockchain testing.
  - Communicates with Soroban RPC and the Indexer Bot.
- **`indexer_bot/`**: Real-time event indexer (Node.js).
  - Scans Soroban events, decodes XDR, and syncs to Firebase Firestore.
  - Broadcasts live updates via Socket.io.
- **`stellar-dev-skill/`**: Internal development resources and AI agent skills for Stellar.

## 🛠️ Technology Stack

- **Smart Contracts**: Rust, Soroban SDK (v25.0.1).
- **Frontend**: React 19, Vite 8, TypeScript, Tailwind-alternative (Custom CSS Glassmorphism), Lucide React.
- **Indexer & Bot**: Node.js, Stellar SDK, Socket.io, Firebase Admin.
- **Infrastructure**: Firebase Firestore (Realtime DB), Stellar Testnet.

## 🚀 Key Commands

### Smart Contracts (Rust)
- **Build**: `cd contracts && cargo build --target wasm32v1-none --release`
- **Test**: `cd contracts && cargo test`
- **Redeploy Entire Protocol**: `node contracts/redeploy_entire_protocol.js` (requires Soroban CLI and configured environment).

### Frontend (React)
- **Install**: `cd frontend && npm install`
- **Development**: `npm run dev`
- **Build**: `npm run build`

### Indexer Bot (Node.js)
- **Install**: `cd indexer_bot && npm install`
- **Run**: `npm start` (executes `run_indexer_loop.js`)

## 📐 Core Logic & Conventions

- **Bitmap Packing**: User account states (collateral/borrow flags) are packed into a single `u128` bitmap to minimize Ledger storage costs.
- **2-Step Liquidation**: Due to Soroban's 100M CPU instruction limit, liquidations are split into `prepare_liquidation` and `execute_liquidation`.
- **Kinked Interest Rate Curve**: Uses a dual-slope model for Borrow APY, with a kink at 80% utilization.
- **TTL Management**: Automatically extends storage TTL (Time To Live) to prevent ledger entry eviction.
- **Auto-Reset Protocol**: The system supports an "Auto-Reset" mode that redeploys contracts after successful transactions to maintain a clean testing environment.

## 📝 Development Guidelines

- **Surgical Edits**: When modifying contracts, ensure compatibility with `udonfi-common` types.
- **UI Consistency**: Maintain the "Neon Glow" and "Glassmorphism" styling defined in `frontend/src/index.css`.
- **State Sync**: Updates to the protocol logic must be reflected in both the `indexer_bot` (for decoding events) and the `frontend` (for simulation and display).
- **Validation**: Always verify changes against the `SimulatorPage.tsx` or by running the local indexer/bot loop.

## 🔗 Important References
- `README.md`: Detailed protocol math and technical deep dives.
- `DEPLOY_INSTRUCTIONS.md`: Step-by-step guide for Testnet/Mainnet deployment.
- `mainnet_deployment_plan.md`: Roadmap and checklists for production launch.
