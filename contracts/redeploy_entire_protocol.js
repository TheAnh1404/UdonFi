const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const adminAddr = "GCHCL7SUEVO2N46TPIVPAMQPK5BETF46RNAGN6Y5TKICVCZOWTHTNWQ4";
const xlmAsset = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const usdcAsset = "CAO2VFOWACEHKUJXGFDX5MOYFDGL2OANBOB3AK33CUR6R3A2Y5IC65XQ";

const runStellar = (args, maxRetries = 3) => {
    // Auto-append high inclusion fee (0.1 XLM) to prioritize tx processing on congested testnet
    if (!args.includes('--inclusion-fee')) {
        args.push('--inclusion-fee', '1000000');
    }
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`\n> Running (Attempt ${attempt}/${maxRetries}): stellar ${args.join(' ')}`);
        const res = spawnSync('stellar', args, { encoding: 'utf-8', shell: true });
        if (res.status === 0) {
            const cleaned = res.stdout.trim();
            console.log(cleaned);
            return cleaned;
        }
        console.warn(`⚠️ Attempt ${attempt} failed.`);
        console.error(`Error details:`, res.stderr || res.stdout);
        if (attempt === maxRetries) {
            throw new Error(`Stellar CLI failed after ${maxRetries} attempts.`);
        }
        console.log(`Waiting 10 seconds before retrying...`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10000);
    }
};

try {
    console.log("🚀 Starting complete UdonFi Protocol redeployment and initialization...");

    // 1. Deploy contracts
    console.log("\n--- [1] DEPLOYING WASM FILES ---");
    
    console.log("Deploying Price Oracle...");
    const oracleId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_price_oracle.wasm', '--source', 'admin', '--network', 'testnet']);
    console.log(`✅ Oracle Deployed: ${oracleId}`);

    console.log("Deploying Lending Pool Router...");
    const poolId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_lending_pool.wasm', '--source', 'admin', '--network', 'testnet']);
    console.log(`✅ Pool Deployed: ${poolId}`);

    console.log("Deploying Liquidation Engine...");
    const liquidationId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_liquidation.wasm', '--source', 'admin', '--network', 'testnet']);
    console.log(`✅ Liquidation Engine Deployed: ${liquidationId}`);

    console.log("Deploying XLM aToken...");
    const aTokenXlmId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_a_token.wasm', '--source', 'admin', '--network', 'testnet']);
    console.log(`✅ XLM aToken Deployed: ${aTokenXlmId}`);

    console.log("Deploying XLM debtToken...");
    const debtTokenXlmId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_debt_token.wasm', '--source', 'admin', '--network', 'testnet']);
    console.log(`✅ XLM debtToken Deployed: ${debtTokenXlmId}`);

    console.log("Deploying USDC aToken...");
    const aTokenUsdcId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_a_token.wasm', '--source', 'admin', '--network', 'testnet']);
    console.log(`✅ USDC aToken Deployed: ${aTokenUsdcId}`);

    console.log("Deploying USDC debtToken...");
    const debtTokenUsdcId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_debt_token.wasm', '--source', 'admin', '--network', 'testnet']);
    console.log(`✅ USDC debtToken Deployed: ${debtTokenUsdcId}`);

    // 2. Initialize contracts
    console.log("\n--- [2] INITIALIZING CONTRACTS ---");

    console.log("Initializing Price Oracle...");
    runStellar(['contract', 'invoke', '--id', oracleId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'initialize', '--admin', adminAddr, '--reflector_address', adminAddr]);

    console.log("Initializing Lending Pool...");
    runStellar(['contract', 'invoke', '--id', poolId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'initialize', '--admin', adminAddr, '--oracle', oracleId, '--treasury', adminAddr]);

    console.log("Initializing Liquidation Engine...");
    runStellar(['contract', 'invoke', '--id', liquidationId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'initialize', '--admin', adminAddr, '--pool', poolId]);

    console.log("Linking Liquidation Engine to Lending Pool...");
    runStellar(['contract', 'invoke', '--id', poolId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'set_liquidation_engine', '--address', liquidationId]);

    console.log("Initializing XLM aToken...");
    runStellar(['contract', 'invoke', '--id', aTokenXlmId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'initialize', '--pool', poolId, '--underlying_asset', xlmAsset, '--reserve_index', '0', '--name', '"UdonFi Interest Bearing XLM"', '--symbol', 'aXLM', '--decimals', '7']);

    console.log("Initializing XLM debtToken...");
    runStellar(['contract', 'invoke', '--id', debtTokenXlmId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'initialize', '--pool', poolId, '--underlying_asset', xlmAsset, '--reserve_index', '0', '--name', '"UdonFi Debt Bearing XLM"', '--symbol', 'dXLM', '--decimals', '7']);

    console.log("Initializing USDC aToken...");
    runStellar(['contract', 'invoke', '--id', aTokenUsdcId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'initialize', '--pool', poolId, '--underlying_asset', usdcAsset, '--reserve_index', '1', '--name', '"UdonFi Interest Bearing USDC"', '--symbol', 'aUSDC', '--decimals', '7']);

    console.log("Initializing USDC debtToken...");
    runStellar(['contract', 'invoke', '--id', debtTokenUsdcId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'initialize', '--pool', poolId, '--underlying_asset', usdcAsset, '--reserve_index', '1', '--name', '"UdonFi Debt Bearing USDC"', '--symbol', 'dUSDC', '--decimals', '7']);

    // 3. Add Reserves via files
    console.log("\n--- [3] ADDING RESERVES TO LENDING POOL ---");
    
    const xlmConfig = {
        a_token: aTokenXlmId,
        asset: xlmAsset,
        debt_token: debtTokenXlmId,
        decimals: 7,
        is_active: true,
        is_borrowing_enabled: true,
        liquidation_bonus: 500,
        liquidation_threshold: 8250,
        ltv: 7000,
        reserve_factor: 1000,
        reserve_index: 0
    };

    const usdcConfig = {
        a_token: aTokenUsdcId,
        asset: usdcAsset,
        debt_token: debtTokenUsdcId,
        decimals: 7,
        is_active: true,
        is_borrowing_enabled: true,
        liquidation_bonus: 500,
        liquidation_threshold: 8250,
        ltv: 7000,
        reserve_factor: 1000,
        reserve_index: 1
    };

    const rateConfig = {
        base_rate: "20000000000000000",
        optimal_utilization: "800000000000000000",
        slope1: "40000000000000000",
        slope2: "3000000000000000000"
    };

    const xlmConfigFile = path.join(__dirname, 'xlm_config_temp.json');
    const usdcConfigFile = path.join(__dirname, 'usdc_config_temp.json');
    const rateConfigFile = path.join(__dirname, 'rate_config_temp.json');

    fs.writeFileSync(xlmConfigFile, JSON.stringify(xlmConfig, null, 2));
    fs.writeFileSync(usdcConfigFile, JSON.stringify(usdcConfig, null, 2));
    fs.writeFileSync(rateConfigFile, JSON.stringify(rateConfig, null, 2));

    console.log("Adding XLM Reserve...");
    runStellar(['contract', 'invoke', '--id', poolId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'add_reserve', '--config-file-path', xlmConfigFile, '--rate_config-file-path', rateConfigFile]);

    console.log("Adding USDC Reserve...");
    runStellar(['contract', 'invoke', '--id', poolId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'add_reserve', '--config-file-path', usdcConfigFile, '--rate_config-file-path', rateConfigFile]);

    // Cleanup config files
    try {
        fs.unlinkSync(xlmConfigFile);
        fs.unlinkSync(usdcConfigFile);
        fs.unlinkSync(rateConfigFile);
    } catch(e) {}

    // 4. Set Oracle prices
    console.log("\n--- [4] CONFIGURE PRICE ORACLE ---");
    console.log("Setting XLM Price ($0.15)...");
    runStellar(['contract', 'invoke', '--id', oracleId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'set_price', '--asset', xlmAsset, '--price_wad', '150000000000000000']);

    console.log("Setting USDC Price ($1.00)...");
    runStellar(['contract', 'invoke', '--id', oracleId, '--source-account', 'admin', '--network', 'testnet', '--send', 'yes', '--', 'set_price', '--asset', usdcAsset, '--price_wad', '1000000000000000000']);

    console.log("\n==========================================");
    console.log("🌟 PROTOCOL REDEPLOYED & INITIALIZED SUCCESSFULLY!");
    console.log(`Lending Pool ID: ${poolId}`);
    console.log(`Price Oracle ID: ${oracleId}`);
    console.log(`Liquidation ID:  ${liquidationId}`);
    console.log(`aToken XLM ID:   ${aTokenXlmId}`);
    console.log(`debtToken XLM ID: ${debtTokenXlmId}`);
    console.log(`aToken USDC ID:  ${aTokenUsdcId}`);
    console.log(`debtToken USDC ID: ${debtTokenUsdcId}`);
    console.log("==========================================\n");

} catch (err) {
    console.error("❌ Protocol Redeployment failed:", err.message);
    process.exit(1);
}
