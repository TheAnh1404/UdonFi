$ErrorActionPreference = "Stop"

Write-Host "Updating PATH for cargo..."
$env:PATH = "$env:USERPROFILE\.cargo\bin;" + $env:PATH

Write-Host "Building Smart Contracts..."
# The new stellar-cli uses `stellar contract build`
cargo build --target wasm32v1-none --release

Write-Host "Setting up Stellar CLI Network (Testnet)..."
# Configure network if not exists
stellar network add --rpc-url "https://soroban-testnet.stellar.org:443" --network-passphrase "Test SDF Network ; September 2015" testnet

Write-Host "Generating and funding admin key..."
# Generate admin key if it doesn't exist
try {
    stellar keys generate admin --network testnet
    Write-Host "Funded new admin key via friendbot."
} catch {
    Write-Host "Admin key might already exist. Attempting to fund anyway..."
    stellar keys fund admin --network testnet
}

Write-Host "Generating and funding oracle_admin key..."
try {
    stellar keys generate oracle_admin --network testnet
} catch {}

Write-Host "Deploying Price Oracle..."
$oracleId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_price_oracle.wasm --source admin --network testnet
Write-Host "Oracle Deployed at: $oracleId"

Write-Host "Deploying Lending Pool Router..."
$poolId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_lending_pool.wasm --source admin --network testnet
Write-Host "Pool Deployed at: $poolId"

Write-Host "Deploying Liquidation Engine..."
$liquidationId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_liquidation.wasm --source admin --network testnet
Write-Host "Liquidation Engine Deployed at: $liquidationId"

Write-Host "Deploying Reserve Contract..."
$reserveId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_reserve.wasm --source admin --network testnet
Write-Host "Reserve Contract Deployed at: $reserveId"

Write-Host "Deploying aToken Contract..."
$aTokenId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_a_token.wasm --source admin --network testnet
Write-Host "aToken Deployed at: $aTokenId"

Write-Host "Deploying debtToken Contract..."
$debtTokenId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_debt_token.wasm --source admin --network testnet
Write-Host "debtToken Deployed at: $debtTokenId"

Write-Host "`n========== DEPLOYMENT SUMMARY =========="
Write-Host "Oracle: $oracleId"
Write-Host "Lending Pool: $poolId"
Write-Host "Liquidation: $liquidationId"
Write-Host "Reserve: $reserveId"
Write-Host "aToken: $aTokenId"
Write-Host "debtToken: $debtTokenId"
Write-Host "=========================================="

Write-Host "Note: Contracts are deployed but need initialization."
