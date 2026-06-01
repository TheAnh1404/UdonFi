const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Target mainnet account funded with 110 XLM:
// GCFL6TIBKQNRZ5RS4H26WEAZXERX3WABME3V2T4VAZ53QTMZ2S3WA5BF created GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X
const adminAddr = "GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X";

// Stellar Mainnet Core Assets:
const xlmAsset = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";
const usdcAsset = "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

// Reflector Oracle contract address on Mainnet (External CEX & DEX price feed):
const reflectorOracleMainnet = "CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LFTK6JLN34DLN";

const identityName = process.env.STELLAR_IDENTITY || "mainnet_admin";

const runStellar = (args, maxRetries = 3) => {
    // Add default fee prioritization just in case of congested mainnet ledger
    if (!args.includes('--inclusion-fee')) {
        args.push('--inclusion-fee', '10000');
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
        console.log(`Waiting 5 seconds before retrying...`);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000);
    }
};

try {
    console.log("🚀 Starting complete UdonFi Protocol deployment to Stellar Soroban Mainnet...");
    console.log(`Using administrative identity: ${identityName}`);
    console.log(`Using admin address: ${adminAddr}`);

    // 1. Optimize WASMs (build for size & cost optimization)
    console.log("\n--- [1] OPTIMIZING SMART CONTRACT WASMS ---");
    const wasmFiles = [
        'udonfi_price_oracle.wasm',
        'udonfi_lending_pool.wasm',
        'udonfi_liquidation.wasm',
        'udonfi_a_token.wasm',
        'udonfi_debt_token.wasm'
    ];
    for (const wasm of wasmFiles) {
        const sourcePath = path.join('target', 'wasm32v1-none', 'release', wasm);
        const destPath = path.join('target', 'wasm32v1-none', 'release', wasm.replace('.wasm', '.optimized.wasm'));
        console.log(`Optimizing ${wasm}...`);
        runStellar(['contract', 'optimize', '--wasm', sourcePath]);
    }

    // 2. Deploy contracts to Mainnet
    console.log("\n--- [2] DEPLOYING CONTRACTS TO MAINNET ---");
    
    console.log("Deploying Price Oracle...");
    const oracleId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_price_oracle.optimized.wasm', '--source', identityName, '--network', 'mainnet']);
    console.log(`✅ Mainnet Oracle Deployed: ${oracleId}`);

    console.log("Deploying Lending Pool Router...");
    const poolId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_lending_pool.optimized.wasm', '--source', identityName, '--network', 'mainnet']);
    console.log(`✅ Mainnet Pool Deployed: ${poolId}`);

    console.log("Deploying Liquidation Engine...");
    const liquidationId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_liquidation.optimized.wasm', '--source', identityName, '--network', 'mainnet']);
    console.log(`✅ Mainnet Liquidation Engine Deployed: ${liquidationId}`);

    console.log("Deploying XLM aToken...");
    const aTokenXlmId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_a_token.optimized.wasm', '--source', identityName, '--network', 'mainnet']);
    console.log(`✅ Mainnet XLM aToken Deployed: ${aTokenXlmId}`);

    console.log("Deploying XLM debtToken...");
    const debtTokenXlmId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_debt_token.optimized.wasm', '--source', identityName, '--network', 'mainnet']);
    console.log(`✅ Mainnet XLM debtToken Deployed: ${debtTokenXlmId}`);

    console.log("Deploying USDC aToken...");
    const aTokenUsdcId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_a_token.optimized.wasm', '--source', identityName, '--network', 'mainnet']);
    console.log(`✅ Mainnet USDC aToken Deployed: ${aTokenUsdcId}`);

    console.log("Deploying USDC debtToken...");
    const debtTokenUsdcId = runStellar(['contract', 'deploy', '--wasm', 'target/wasm32v1-none/release/udonfi_debt_token.optimized.wasm', '--source', identityName, '--network', 'mainnet']);
    console.log(`✅ Mainnet USDC debtToken Deployed: ${debtTokenUsdcId}`);

    // 3. Initialize contracts
    console.log("\n--- [3] INITIALIZING MAINNET CONTRACTS ---");

    console.log("Initializing Price Oracle with Reflector Mainnet Address...");
    runStellar(['contract', 'invoke', '--id', oracleId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'initialize', '--admin', adminAddr, '--reflector_address', reflectorOracleMainnet]);

    console.log("Initializing Lending Pool...");
    runStellar(['contract', 'invoke', '--id', poolId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'initialize', '--admin', adminAddr, '--oracle', oracleId, '--treasury', adminAddr]);

    console.log("Initializing Liquidation Engine...");
    runStellar(['contract', 'invoke', '--id', liquidationId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'initialize', '--admin', adminAddr, '--pool', poolId]);

    console.log("Linking Liquidation Engine to Lending Pool...");
    runStellar(['contract', 'invoke', '--id', poolId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'set_liquidation_engine', '--address', liquidationId]);

    console.log("Initializing XLM aToken...");
    runStellar(['contract', 'invoke', '--id', aTokenXlmId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'initialize', '--pool', poolId, '--underlying_asset', xlmAsset, '--reserve_index', '0', '--name', '"UdonFi Interest Bearing XLM"', '--symbol', 'aXLM', '--decimals', '7']);

    console.log("Initializing XLM debtToken...");
    runStellar(['contract', 'invoke', '--id', debtTokenXlmId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'initialize', '--pool', poolId, '--underlying_asset', xlmAsset, '--reserve_index', '0', '--name', '"UdonFi Debt Bearing XLM"', '--symbol', 'dXLM', '--decimals', '7']);

    console.log("Initializing USDC aToken...");
    runStellar(['contract', 'invoke', '--id', aTokenUsdcId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'initialize', '--pool', poolId, '--underlying_asset', usdcAsset, '--reserve_index', '1', '--name', '"UdonFi Interest Bearing USDC"', '--symbol', 'aUSDC', '--decimals', '7']);

    console.log("Initializing USDC debtToken...");
    runStellar(['contract', 'invoke', '--id', debtTokenUsdcId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'initialize', '--pool', poolId, '--underlying_asset', usdcAsset, '--reserve_index', '1', '--name', '"UdonFi Debt Bearing USDC"', '--symbol', 'dUSDC', '--decimals', '7']);

    // 4. Mapped assets to Reflector Oracle Symbols for dynamic price queries on Mainnet
    console.log("\n--- [4] CONFIGURING MAINNET ORACLE SYMBOL MAPPINGS ---");
    console.log("Mapping XLM Asset to 'XLM' Reflector symbol...");
    runStellar(['contract', 'invoke', '--id', oracleId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'set_asset_symbol', '--asset', xlmAsset, '--symbol', 'XLM']);

    console.log("Mapping USDC Asset to 'USDC' Reflector symbol...");
    runStellar(['contract', 'invoke', '--id', oracleId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'set_asset_symbol', '--asset', usdcAsset, '--symbol', 'USDC']);

    // Configure mainnet fallback mock prices (circuit breaker initialization)
    console.log("Setting mainnet XLM fallback price ($0.15)...");
    runStellar(['contract', 'invoke', '--id', oracleId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'set_price', '--asset', xlmAsset, '--price_wad', '150000000000000000']);

    console.log("Setting mainnet USDC fallback price ($1.00)...");
    runStellar(['contract', 'invoke', '--id', oracleId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'set_price', '--asset', usdcAsset, '--price_wad', '1000000000000000000']);

    // 5. Add Reserves to Mainnet Lending Pool
    console.log("\n--- [5] ADDING RESERVES TO LENDING POOL ---");
    
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

    const xlmConfigFile = path.join(__dirname, 'xlm_config_mainnet.json');
    const usdcConfigFile = path.join(__dirname, 'usdc_config_mainnet.json');
    const rateConfigFile = path.join(__dirname, 'rate_config_mainnet.json');

    fs.writeFileSync(xlmConfigFile, JSON.stringify(xlmConfig, null, 2));
    fs.writeFileSync(usdcConfigFile, JSON.stringify(usdcConfig, null, 2));
    fs.writeFileSync(rateConfigFile, JSON.stringify(rateConfig, null, 2));

    console.log("Adding XLM Reserve to Mainnet Pool...");
    runStellar(['contract', 'invoke', '--id', poolId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'add_reserve', '--config-file-path', xlmConfigFile, '--rate_config-file-path', rateConfigFile]);

    console.log("Adding USDC Reserve to Mainnet Pool...");
    runStellar(['contract', 'invoke', '--id', poolId, '--source-account', identityName, '--network', 'mainnet', '--send', 'yes', '--', 'add_reserve', '--config-file-path', usdcConfigFile, '--rate_config-file-path', rateConfigFile]);

    // Cleanup config files
    try {
        fs.unlinkSync(xlmConfigFile);
        fs.unlinkSync(usdcConfigFile);
        fs.unlinkSync(rateConfigFile);
    } catch(e) {}

    console.log("\n==========================================");
    console.log("🍜 UDONFI PROTOCOL DEPLOYED SUCCESSFULLY TO MAINNET!");
    console.log(`Lending Pool ID: ${poolId}`);
    console.log(`Price Oracle ID: ${oracleId}`);
    console.log(`Liquidation ID:  ${liquidationId}`);
    console.log(`aToken XLM ID:   ${aTokenXlmId}`);
    console.log(`debtToken XLM ID: ${debtTokenXlmId}`);
    console.log(`aToken USDC ID:  ${aTokenUsdcId}`);
    console.log(`debtToken USDC ID: ${debtTokenUsdcId}`);
    console.log("==========================================\n");

} catch (err) {
    console.error("❌ Mainnet Deployment failed:", err.message);
    process.exit(1);
}
