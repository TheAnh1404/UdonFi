# Changelog

All notable changes to the UdonFi protocol will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0-rc.1] - 2026-06-26

This release introduces the technical design and architectural specifications for **UdonFi V2**, transitioning the project from a hackathon prototype into a production-grade decentralized lending protocol.

### Added
- **Modular Smart Contract Spec**: Redesigned the monolithic router into decoupled contracts: `lending_pool`, `reserve_config`, `risk_engine`, `interest_rate_engine`, `liquidation_coordinator`, `price_oracle_aggregator`, and `governance`.
- **PostgreSQL Database Schema**: Added database schemas replacing Firebase Firestore to ensure transactional integrity and complex querying for analytics.
- **Multi-Oracle Aggregator Architecture**: Spec for combining Pyth, Band, and a custom fallback oracle to prevent oracle-manipulation attacks.
- **Decentralized Governance Specs**: Detailed proposal lifecycles, voting delays, timelocks, and token voting mechanics.
- **Enterprise Testing Suite Design**: Testing spec outlining unit, integration, contract, property, fuzz, load, and security testing requirements.
- **Mermaid Diagrams**: Visual blueprints for system context, containers, components, deployment models, and transaction sequence flows.

## [1.0.0] - 2026-06-15

### Added
- **Soroban Smart Contracts**: Rust contracts managing supply, withdraw, borrow, repay operations.
- **u128 Bitmap Packing**: Storage optimization packing account configuration flags to reduce ledger fees.
- **2-Step Liquidation**: Bypassing Soroban 100M instruction VM limits via prepare and execute phases.
- **TTL Extension**: Automated contract storage extension.
- **React Frontend**: Glassmorphism and Neon-styled Web3 UI with interactive SVG APY curves and LED state display.
- **Indexer Bot**: Event parser decoding on-chain events to Firebase Firestore and Socket.io.
