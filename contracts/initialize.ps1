param (
    [string]$oracleId,
    [string]$poolId,
    [string]$liquidationId
)

$ErrorActionPreference = "Stop"

$adminAddr = "GCHCL7SUEVO2N46TPIVPAMQPK5BETF46RNAGN6Y5TKICVCZOWTHTNWQ4"

# 1. Initialize Price Oracle
Write-Host "Initializing Price Oracle..."
stellar contract invoke --id $oracleId --source-account admin --network testnet --send=yes -- initialize --admin $adminAddr --reflector_address $adminAddr

# 2. Initialize Lending Pool Router
Write-Host "Initializing Lending Pool Router..."
stellar contract invoke --id $poolId --source-account admin --network testnet --send=yes -- initialize --admin $adminAddr --oracle $oracleId --treasury $adminAddr

# 3. Initialize Liquidation Engine
Write-Host "Initializing Liquidation Engine..."
stellar contract invoke --id $liquidationId --source-account admin --network testnet --send=yes -- initialize --admin $adminAddr --pool $poolId

# 4. Link Liquidation Engine inside Lending Pool
Write-Host "Linking Liquidation Engine inside Lending Pool..."
stellar contract invoke --id $poolId --source-account admin --network testnet --send=yes -- set_liquidation_engine --address $liquidationId

# 5. Deploy XLM specific aToken and debtToken
Write-Host "Deploying XLM aToken and debtToken..."
$aTokenXlmId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_a_token.wasm --source admin --network testnet
$debtTokenXlmId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_debt_token.wasm --source admin --network testnet

# 6. Deploy USDC specific aToken and debtToken
Write-Host "Deploying USDC aToken and debtToken..."
$aTokenUsdcId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_a_token.wasm --source admin --network testnet
$debtTokenUsdcId = stellar contract deploy --wasm target/wasm32v1-none/release/udonfi_debt_token.wasm --source admin --network testnet

# 7. Initialize XLM aToken
Write-Host "Initializing XLM aToken..."
stellar contract invoke --id $aTokenXlmId --source-account admin --network testnet --send=yes -- initialize --pool $poolId --underlying_asset CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC --reserve_index 0 --name "UdonFi Interest Bearing XLM" --symbol aXLM --decimals 7

# 8. Initialize XLM debtToken
Write-Host "Initializing XLM debtToken..."
stellar contract invoke --id $debtTokenXlmId --source-account admin --network testnet --send=yes -- initialize --pool $poolId --underlying_asset CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC --reserve_index 0 --name "UdonFi Debt Bearing XLM" --symbol dXLM --decimals 7

# 9. Initialize USDC aToken
Write-Host "Initializing USDC aToken..."
stellar contract invoke --id $aTokenUsdcId --source-account admin --network testnet --send=yes -- initialize --pool $poolId --underlying_asset CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA --reserve_index 1 --name "UdonFi Interest Bearing USDC" --symbol aUSDC --decimals 7

# 10. Initialize USDC debtToken
Write-Host "Initializing USDC debtToken..."
stellar contract invoke --id $debtTokenUsdcId --source-account admin --network testnet --send=yes -- initialize --pool $poolId --underlying_asset CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA --reserve_index 1 --name "UdonFi Debt Bearing USDC" --symbol dUSDC --decimals 7

# 11. Add XLM Reserve to Lending Pool
Write-Host "Adding XLM Reserve to Lending Pool..."
stellar contract invoke --id $poolId --source-account admin --network testnet --send=yes -- add_reserve --config "{`"a_token`": `"$aTokenXlmId`", `"asset`": `"CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`", `"debt_token`": `"$debtTokenXlmId`", `"decimals`": 7, `"is_active`": true, `"is_borrowing_enabled`": true, `"liquidation_bonus`": 500, `"liquidation_threshold`": 8250, `"ltv`": 7000, `"reserve_factor`": 1000, `"reserve_index`": 0}" --rate_config "{`"base_rate`": 20000000000000000, `"optimal_utilization`": 800000000000000000, `"slope1`": 40000000000000000, `"slope2`": 3000000000000000000}"

# 12. Add USDC Reserve to Lending Pool
Write-Host "Adding USDC Reserve to Lending Pool..."
stellar contract invoke --id $poolId --source-account admin --network testnet --send=yes -- add_reserve --config "{`"a_token`": `"$aTokenUsdcId`", `"asset`": `"CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`", `"debt_token`": `"$debtTokenUsdcId`", `"decimals`": 7, `"is_active`": true, `"is_borrowing_enabled`": true, `"liquidation_bonus`": 500, `"liquidation_threshold`": 8250, `"ltv`": 7000, `"reserve_factor`": 1000, `"reserve_index`": 1}" --rate_config "{`"base_rate`": 20000000000000000, `"optimal_utilization`": 800000000000000000, `"slope1`": 40000000000000000, `"slope2`": 3000000000000000000}"

# 13. Set Oracle Price for XLM ($0.15 = 150000000000000000)
Write-Host "Setting Oracle Price for XLM..."
stellar contract invoke --id $oracleId --source-account admin --network testnet --send=yes -- set_price --asset CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC --price_wad 150000000000000000

# 14. Set Oracle Price for USDC ($1.00 = 1000000000000000000)
Write-Host "Setting Oracle Price for USDC..."
stellar contract invoke --id $oracleId --source-account admin --network testnet --send=yes -- set_price --asset CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA --price_wad 1000000000000000000

Write-Host "`n🌟 UdonFi Smart Contracts INITIALIZED & CONFIGURED Successfully on Testnet!"
Write-Host "Pool ID: $poolId"
Write-Host "Oracle ID: $oracleId"
Write-Host "aToken XLM: $aTokenXlmId"
Write-Host "aToken USDC: $aTokenUsdcId"
