#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACTS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

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
XLM_ASSET_CONTRACT_ID="${XLM_ASSET_CONTRACT_ID:-CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC}"

: "${LENDING_POOL_CONTRACT_ID:?Set LENDING_POOL_CONTRACT_ID.}"
: "${PRICE_ORACLE_CONTRACT_ID:?Set PRICE_ORACLE_CONTRACT_ID.}"
: "${LIQUIDATION_CONTRACT_ID:?Set LIQUIDATION_CONTRACT_ID.}"

stellar network add \
  --rpc-url "$SOROBAN_RPC_URL" \
  --network-passphrase "$SOROBAN_NETWORK_PASSPHRASE" \
  testnet >/dev/null 2>&1 || true

read_contract() {
  local label="$1"
  shift

  echo
  echo "== $label =="
  "$@"
}

read_contract "lending pool reserve count" \
  stellar contract invoke --id "$LENDING_POOL_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=no -- get_reserve_count

read_contract "lending pool oracle" \
  stellar contract invoke --id "$LENDING_POOL_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=no -- oracle

read_contract "XLM reserve info" \
  stellar contract invoke --id "$LENDING_POOL_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=no -- get_reserve_info \
  --asset "$XLM_ASSET_CONTRACT_ID"

read_contract "XLM price" \
  stellar contract invoke --id "$PRICE_ORACLE_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=no -- get_price_usd \
  --asset "$XLM_ASSET_CONTRACT_ID"

read_contract "liquidation pool" \
  stellar contract invoke --id "$LIQUIDATION_CONTRACT_ID" --source-account "$SOURCE_ACCOUNT" --network testnet --send=no -- pool

echo
echo "Verification complete."
