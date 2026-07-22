#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$CONTRACTS_DIR/.." && pwd)"
DEPLOYMENT_FILE="$REPO_ROOT/deployments/testnet.json"
CONTRACT_ENV_FILE="$CONTRACTS_DIR/.env.local"
FRONTEND_ENV_FILE="$REPO_ROOT/frontend/.env.local"

if [ -f "$CONTRACTS_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  . "$CONTRACTS_DIR/.env"
  set +a
fi

SOROBAN_RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org:443}"
SOROBAN_NETWORK_PASSPHRASE="${SOROBAN_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-udonfi-testnet-deployer}"
STELLAR_EXPERT_BASE_URL="${STELLAR_EXPERT_BASE_URL:-https://stellar.expert/explorer/testnet}"
ORACLE_MODE="${ORACLE_MODE:-reflector}"
REFLECTOR_CONTRACT_ID="${REFLECTOR_CONTRACT_ID:-}"
MAX_PRICE_STALENESS_LEDGERS="${MAX_PRICE_STALENESS_LEDGERS:-120}"
XLM_ASSET_CONTRACT_ID="${XLM_ASSET_CONTRACT_ID:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
USDC_ASSET_CONTRACT_ID="${USDC_ASSET_CONTRACT_ID:-CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA}"
USD_BASE_ASSET_ID="${USD_BASE_ASSET_ID:-}"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_command cargo
require_command stellar

if [ -z "${DEPLOYER_SECRET_KEY:-}" ]; then
  echo "DEPLOYER_SECRET_KEY must be set in contracts/.env or the shell environment." >&2
  exit 1
fi

mkdir -p "$REPO_ROOT/deployments"

echo "Configuring Stellar Testnet network..."
stellar network add \
  --rpc-url "$SOROBAN_RPC_URL" \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  testnet >/dev/null 2>&1 || true

if ! stellar keys address "$SOURCE_ACCOUNT" >/dev/null 2>&1; then
  echo "Importing deployer identity: $SOURCE_ACCOUNT"
  printf '%s\n' "$DEPLOYER_SECRET_KEY" | stellar keys add "$SOURCE_ACCOUNT" --secret-key --overwrite
fi

echo "Building Soroban contracts..."
(
  cd "$CONTRACTS_DIR"
  cargo build --target wasm32v1-none --release
)

deploy_contract() {
  local label="$1"
  local wasm_path="$2"

  echo "Deploying $label..." >&2
  local output
  output="$(stellar contract deploy --wasm "$wasm_path" --source "$SOURCE_ACCOUNT" --network testnet)"
  echo "$output" | tail -n 1 | tr -d '\r'
}

PRICE_ORACLE_CONTRACT_ID="$(deploy_contract price_oracle "$CONTRACTS_DIR/target/wasm32v1-none/release/udonfi_price_oracle.wasm")"
LENDING_POOL_CONTRACT_ID="$(deploy_contract lending_pool "$CONTRACTS_DIR/target/wasm32v1-none/release/udonfi_lending_pool.wasm")"
LIQUIDATION_CONTRACT_ID="$(deploy_contract liquidation "$CONTRACTS_DIR/target/wasm32v1-none/release/udonfi_liquidation.wasm")"
RESERVE_CONTRACT_ID="$(deploy_contract reserve "$CONTRACTS_DIR/target/wasm32v1-none/release/udonfi_reserve.wasm")"
A_TOKEN_CONTRACT_ID="$(deploy_contract a_token "$CONTRACTS_DIR/target/wasm32v1-none/release/udonfi_a_token.wasm")"
DEBT_TOKEN_CONTRACT_ID="$(deploy_contract debt_token "$CONTRACTS_DIR/target/wasm32v1-none/release/udonfi_debt_token.wasm")"

DEPLOYED_AT="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

cat >"$DEPLOYMENT_FILE" <<JSON
{
  "network": "testnet",
  "rpcUrl": "$SOROBAN_RPC_URL",
  "networkPassphrase": "$SOROBAN_NETWORK_PASSPHRASE",
  "deployedAt": "$DEPLOYED_AT",
  "contracts": {
    "lendingPool": "$LENDING_POOL_CONTRACT_ID",
    "aToken": "$A_TOKEN_CONTRACT_ID",
    "debtToken": "$DEBT_TOKEN_CONTRACT_ID",
    "reserve": "$RESERVE_CONTRACT_ID",
    "priceOracle": "$PRICE_ORACLE_CONTRACT_ID",
    "liquidation": "$LIQUIDATION_CONTRACT_ID"
  },
  "oracle": {
    "mode": "$ORACLE_MODE",
    "reflectorContractId": "$REFLECTOR_CONTRACT_ID",
    "maxPriceStalenessLedgers": $MAX_PRICE_STALENESS_LEDGERS,
    "assets": {
      "xlm": "$XLM_ASSET_CONTRACT_ID",
      "usdc": "$USDC_ASSET_CONTRACT_ID",
      "usdBase": "$USD_BASE_ASSET_ID"
    }
  },
  "stellarExpert": {
    "baseUrl": "$STELLAR_EXPERT_BASE_URL"
  }
}
JSON

cat >"$CONTRACT_ENV_FILE" <<EOF_ENV
SOROBAN_RPC_URL=$SOROBAN_RPC_URL
SOROBAN_NETWORK_PASSPHRASE="$SOROBAN_NETWORK_PASSPHRASE"
SOURCE_ACCOUNT=$SOURCE_ACCOUNT
LENDING_POOL_CONTRACT_ID=$LENDING_POOL_CONTRACT_ID
A_TOKEN_CONTRACT_ID=$A_TOKEN_CONTRACT_ID
DEBT_TOKEN_CONTRACT_ID=$DEBT_TOKEN_CONTRACT_ID
RESERVE_CONTRACT_ID=$RESERVE_CONTRACT_ID
PRICE_ORACLE_CONTRACT_ID=$PRICE_ORACLE_CONTRACT_ID
LIQUIDATION_CONTRACT_ID=$LIQUIDATION_CONTRACT_ID
ORACLE_MODE=$ORACLE_MODE
REFLECTOR_CONTRACT_ID=$REFLECTOR_CONTRACT_ID
MAX_PRICE_STALENESS_LEDGERS=$MAX_PRICE_STALENESS_LEDGERS
XLM_ASSET_CONTRACT_ID=$XLM_ASSET_CONTRACT_ID
USDC_ASSET_CONTRACT_ID=$USDC_ASSET_CONTRACT_ID
USD_BASE_ASSET_ID=$USD_BASE_ASSET_ID
STELLAR_EXPERT_BASE_URL=$STELLAR_EXPERT_BASE_URL
EOF_ENV

cat >"$FRONTEND_ENV_FILE" <<EOF_ENV
VITE_SOROBAN_RPC_URL=$SOROBAN_RPC_URL
VITE_SOROBAN_NETWORK_PASSPHRASE="$SOROBAN_NETWORK_PASSPHRASE"
VITE_LENDING_POOL_CONTRACT_ID=$LENDING_POOL_CONTRACT_ID
VITE_A_TOKEN_CONTRACT_ID=$A_TOKEN_CONTRACT_ID
VITE_DEBT_TOKEN_CONTRACT_ID=$DEBT_TOKEN_CONTRACT_ID
VITE_RESERVE_CONTRACT_ID=$RESERVE_CONTRACT_ID
VITE_PRICE_ORACLE_CONTRACT_ID=$PRICE_ORACLE_CONTRACT_ID
VITE_LIQUIDATION_CONTRACT_ID=$LIQUIDATION_CONTRACT_ID
VITE_ORACLE_MODE=$ORACLE_MODE
VITE_REFLECTOR_CONTRACT_ID=$REFLECTOR_CONTRACT_ID
VITE_MAX_PRICE_STALENESS_LEDGERS=$MAX_PRICE_STALENESS_LEDGERS
VITE_XLM_ASSET_CONTRACT_ID=$XLM_ASSET_CONTRACT_ID
VITE_USDC_ASSET_CONTRACT_ID=$USDC_ASSET_CONTRACT_ID
VITE_USD_BASE_ASSET_ID=$USD_BASE_ASSET_ID
VITE_STELLAR_EXPERT_BASE_URL=$STELLAR_EXPERT_BASE_URL
EOF_ENV

echo
echo "Deployment complete."
echo "LENDING_POOL_CONTRACT_ID=$LENDING_POOL_CONTRACT_ID"
echo "A_TOKEN_CONTRACT_ID=$A_TOKEN_CONTRACT_ID"
echo "DEBT_TOKEN_CONTRACT_ID=$DEBT_TOKEN_CONTRACT_ID"
echo "RESERVE_CONTRACT_ID=$RESERVE_CONTRACT_ID"
echo "PRICE_ORACLE_CONTRACT_ID=$PRICE_ORACLE_CONTRACT_ID"
echo "LIQUIDATION_CONTRACT_ID=$LIQUIDATION_CONTRACT_ID"
echo "Wrote $DEPLOYMENT_FILE"
echo "Wrote $CONTRACT_ENV_FILE"
echo "Wrote $FRONTEND_ENV_FILE"
