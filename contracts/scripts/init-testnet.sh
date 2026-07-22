#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$CONTRACTS_DIR/.." && pwd)"
INIT_LOG="$REPO_ROOT/deployments/testnet-init.log"

load_env_file() {
  if [ -f "$1" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$1"
    set +a
  fi
}

load_env_file "$CONTRACTS_DIR/.env"
load_env_file "$CONTRACTS_DIR/.env.local"

SOROBAN_RPC_URL="${SOROBAN_RPC_URL:-https://soroban-testnet.stellar.org:443}"
SOROBAN_NETWORK_PASSPHRASE="${SOROBAN_NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
SOURCE_ACCOUNT="${SOURCE_ACCOUNT:-udonfi-testnet-deployer}"
ORACLE_MODE="${ORACLE_MODE:-reflector}"
REFLECTOR_CONTRACT_ID="${REFLECTOR_CONTRACT_ID:-}"
MAX_PRICE_STALENESS_LEDGERS="${MAX_PRICE_STALENESS_LEDGERS:-120}"
XLM_ASSET_CONTRACT_ID="${XLM_ASSET_CONTRACT_ID:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"
USD_BASE_ASSET_ID="${USD_BASE_ASSET_ID:-}"
STELLAR_EXPERT_BASE_URL="${STELLAR_EXPERT_BASE_URL:-https://stellar.expert/explorer/testnet}"

: "${LENDING_POOL_CONTRACT_ID:?Set LENDING_POOL_CONTRACT_ID by running deploy-testnet.sh first.}"
: "${A_TOKEN_CONTRACT_ID:?Set A_TOKEN_CONTRACT_ID by running deploy-testnet.sh first.}"
: "${DEBT_TOKEN_CONTRACT_ID:?Set DEBT_TOKEN_CONTRACT_ID by running deploy-testnet.sh first.}"
: "${PRICE_ORACLE_CONTRACT_ID:?Set PRICE_ORACLE_CONTRACT_ID by running deploy-testnet.sh first.}"
: "${LIQUIDATION_CONTRACT_ID:?Set LIQUIDATION_CONTRACT_ID by running deploy-testnet.sh first.}"

if [ "$ORACLE_MODE" = "reflector" ] && [ -z "$REFLECTOR_CONTRACT_ID" ]; then
  echo "REFLECTOR_CONTRACT_ID must be set when ORACLE_MODE=reflector." >&2
  exit 1
fi

if [ "$ORACLE_MODE" != "reflector" ] && [ "$ORACLE_MODE" != "manual" ]; then
  echo "ORACLE_MODE must be reflector or manual." >&2
  exit 1
fi

mkdir -p "$REPO_ROOT/deployments"
ADMIN_PUBLIC_KEY="$(stellar keys address "$SOURCE_ACCOUNT")"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

cat >"$TMP_DIR/reserve-config.json" <<JSON
{
  "a_token": "$A_TOKEN_CONTRACT_ID",
  "asset": "$XLM_ASSET_CONTRACT_ID",
  "debt_token": "$DEBT_TOKEN_CONTRACT_ID",
  "decimals": 7,
  "is_active": true,
  "is_borrowing_enabled": true,
  "liquidation_bonus": 500,
  "liquidation_threshold": 8250,
  "ltv": 7000,
  "reserve_factor": 1000,
  "reserve_index": 0
}
JSON

cat >"$TMP_DIR/rate-config.json" <<JSON
{
  "base_rate": 20000000000000000,
  "optimal_utilization": 800000000000000000,
  "slope1": 40000000000000000,
  "slope2": 3000000000000000000
}
JSON

: >"$INIT_LOG"

run_tx() {
  local label="$1"
  shift

  echo "Running $label..."
  local output
  output="$("$@" 2>&1)"
  echo "### $label" >>"$INIT_LOG"
  echo "$output" >>"$INIT_LOG"
  echo >>"$INIT_LOG"

  local tx_hash
  tx_hash="$(echo "$output" | grep -Eo '[0-9a-fA-F]{64}' | head -n 1 || true)"
  if [ -n "$tx_hash" ]; then
    echo "$label tx: $tx_hash"
    echo "$STELLAR_EXPERT_BASE_URL/tx/$tx_hash"
  else
    echo "$label submitted. See $INIT_LOG for Stellar CLI output."
  fi
}

stellar network add \
  --rpc-url "$SOROBAN_RPC_URL" \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  testnet >/dev/null 2>&1 || true

run_tx "initialize price oracle" \
  stellar contract invoke --id "$PRICE_ORACLE_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- initialize \
  --admin "$ADMIN_PUBLIC_KEY" \
  --reflector_address "${REFLECTOR_CONTRACT_ID:-$ADMIN_PUBLIC_KEY}"

run_tx "set oracle mode" \
  stellar contract invoke --id "$PRICE_ORACLE_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- set_oracle_mode \
  --mode "$ORACLE_MODE"

run_tx "set oracle staleness" \
  stellar contract invoke --id "$PRICE_ORACLE_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- set_max_price_staleness_ledgers \
  --max_staleness_ledgers "$MAX_PRICE_STALENESS_LEDGERS"

if [ "$ORACLE_MODE" = "reflector" ]; then
  run_tx "map XLM Reflector asset" \
    stellar contract invoke --id "$PRICE_ORACLE_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- set_reflector_stellar_asset \
    --asset "$XLM_ASSET_CONTRACT_ID" \
    --stellar_asset "$XLM_ASSET_CONTRACT_ID"
fi

run_tx "initialize lending pool" \
  stellar contract invoke --id "$LENDING_POOL_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- initialize \
  --admin "$ADMIN_PUBLIC_KEY" \
  --oracle "$PRICE_ORACLE_CONTRACT_ID" \
  --treasury "$ADMIN_PUBLIC_KEY"

run_tx "initialize liquidation engine" \
  stellar contract invoke --id "$LIQUIDATION_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- initialize \
  --admin "$ADMIN_PUBLIC_KEY" \
  --pool "$LENDING_POOL_CONTRACT_ID"

run_tx "link liquidation engine" \
  stellar contract invoke --id "$LENDING_POOL_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- set_liquidation_engine \
  --address "$LIQUIDATION_CONTRACT_ID"

run_tx "initialize XLM aToken" \
  stellar contract invoke --id "$A_TOKEN_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- initialize \
  --pool "$LENDING_POOL_CONTRACT_ID" \
  --underlying_asset "$XLM_ASSET_CONTRACT_ID" \
  --reserve_index 0 \
  --name "UdonFi Interest Bearing XLM" \
  --symbol aXLM \
  --decimals 7

run_tx "initialize XLM debtToken" \
  stellar contract invoke --id "$DEBT_TOKEN_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- initialize \
  --pool "$LENDING_POOL_CONTRACT_ID" \
  --underlying_asset "$XLM_ASSET_CONTRACT_ID" \
  --reserve_index 0 \
  --name "UdonFi Debt Bearing XLM" \
  --symbol dXLM \
  --decimals 7

run_tx "add XLM reserve" \
  stellar contract invoke --id "$LENDING_POOL_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- add_reserve \
  --config-file-path "$TMP_DIR/reserve-config.json" \
  --rate_config-file-path "$TMP_DIR/rate-config.json"

if [ "$ORACLE_MODE" = "manual" ]; then
  echo "WARNING: ORACLE_MODE=manual is intended for local tests only, not the Testnet demo."
  run_tx "set manual XLM oracle price" \
    stellar contract invoke --id "$PRICE_ORACLE_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=yes -- set_price \
    --asset "$XLM_ASSET_CONTRACT_ID" \
    --price_wad "${MANUAL_XLM_PRICE_WAD:-150000000000000000}"
fi

echo
echo "Initialization complete. Full CLI output: $INIT_LOG"
