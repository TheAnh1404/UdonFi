# UdonFi V2 Web Client

This directory contains the premium React Web3 dashboard for UdonFi V2, built using TypeScript and Vite.

## 1. UI Architecture & Presentational Features

The web client provides a real-time dashboard for protocol depositors, borrowers, and liquidators:
- **Connected Wallet Actions**: Supply, Borrow, Repay, and Withdraw transaction flows using Freighter Wallet.
- **Dynamic Charting**: Renders the dynamic APY kink curve using interactive SVG math lines.
- **Bitmap LED Matrix Grid**: Renders an interactive 128-bit grid representing the bit-packing state configurations of the user's account.
- **In-Memory Simulator**: Contains a local blockchain environment allowing users to run time-travel simulations (accumulate interest, trigger liquidations) directly in the browser.

---

## 2. Directory Layout & Folder Conventions

```text
frontend/
├── public/                 # Static asset folders
├── src/
│   ├── components/         # Styled UI modules
│   │   ├── Header.tsx      # Navigation & notification drawer
│   │   ├── SorobanBitmap.tsx # Bit-packing LED matrix
│   │   ├── SorobanKinked.tsx # APY Kink SVG graph
│   │   ├── SimulatorPage.tsx # In-memory sandbox mode
│   │   └── ConsoleLogger.tsx # Real-time transaction feed
│   │
│   ├── hooks/              # Custom React hooks (Wallet, RPC queries)
│   ├── types/              # Type-safe contract declarations
│   ├── utils/              # Decimal conversion & math libraries
│   ├── App.tsx             # State coordinator & layout manager
│   └── index.css           # Global CSS variables & layout tokens
│
├── vite.config.ts
└── tsconfig.json
```

---

## 3. Styling & Cyberpunk Glassmorphism Tokens

UdonFi V2 uses vanilla CSS variables to maintain a premium **Cyberpunk Neon & Glassmorphism** design theme. The tokens are defined inside `src/index.css`:

```css
:root {
  /* Colors */
  --bg-primary: #040814;
  --bg-glass: rgba(8, 15, 36, 0.7);
  --border-glass: rgba(0, 242, 254, 0.15);
  
  --neon-cyan: #00f2fe;
  --neon-purple: #9d4edd;
  --neon-green: #39ff14;
  --neon-red: #ff0055;
  
  /* Textures */
  --glow-cyan: 0 0 15px rgba(0, 242, 254, 0.4);
  --glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
  --blur-filter: blur(12px);
}
```

### Components Checklist:
- Components must use the `--bg-glass` background, `--border-glass` borders, and `backdrop-filter: var(--blur-filter)` to maintain the premium glass look.
- Interactive elements must apply micro-transitions and glowing neon hover states.

---

## 4. State Management & Wallet Layer

### A. State Coordination
- State coordination is managed using standard React state combined with **Zustand** store containers for caching market yields and TVL figures.
- Live RPC transactions are coordinated within `App.tsx` and logged inside the `ConsoleLogger` component.

### B. Freighter Wallet Integration
Freighter is the official non-custodial wallet for the Stellar network. The app integrates with it using the `@stellar/freighter-api` package:
1. **Network Validation**: Ensures the wallet is set to **Testnet** (or Mainnet on deployment).
2. **Address Resolution**: Retrieves the active public key to display position metrics.
3. **Transaction Signing**: Receives raw transaction XDR payloads from contract simulations, prompts the Freighter interface for user signatures, and submits the signed payload to the Stellar RPC network.
