const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const poolId = "CDC7IHZSUWN47NVQSQ6PLW7XWIG4RLIGIIMSC47IYGQ5YYQRPPKAEXU4";
const aTokenXlmId = "CBABHXEUQWHFLVK2ZKXWCHPXQ3OOIYCFQTE4TJTI2ZU4SSXBFTM5S6F3";
const debtTokenXlmId = "CBTVDJXSYFBBH2RNKJ5QEEZE3577E3BB7RPNEPTU5G4GNM3TZJEN5KHF";
const aTokenUsdcId = "CBOZOAENB7X64THXQNERBI6N6XZT3RA4G24EFHAQ2AW34EYZXPLGUBZ5";
const debtTokenUsdcId = "CCSTHGQBPH5GQ7JKEVZQZC7E2NLNTIH3XD4FCMWTV6FPJLX4C7EUNDLJ";

// Define JSON structures
const xlmConfig = {
    a_token: aTokenXlmId,
    asset: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
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
    asset: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
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

// Write files
const xlmConfigFile = path.join(__dirname, 'xlm_config.json');
const usdcConfigFile = path.join(__dirname, 'usdc_config.json');
const rateConfigFile = path.join(__dirname, 'rate_config.json');

fs.writeFileSync(xlmConfigFile, JSON.stringify(xlmConfig, null, 2));
fs.writeFileSync(usdcConfigFile, JSON.stringify(usdcConfig, null, 2));
fs.writeFileSync(rateConfigFile, JSON.stringify(rateConfig, null, 2));

console.log("Config files written successfully!");

const runStellar = (args) => {
    console.log(`Running: stellar ${args.join(' ')}`);
    const res = spawnSync('stellar', args, { encoding: 'utf-8', shell: true });
    if (res.status !== 0) {
        console.error(`Error details:`, res.stderr);
        cleanup();
        throw new Error(`Stellar CLI failed with exit code ${res.status}`);
    }
    console.log(res.stdout);
};

const cleanup = () => {
    try {
        if (fs.existsSync(xlmConfigFile)) fs.unlinkSync(xlmConfigFile);
        if (fs.existsSync(usdcConfigFile)) fs.unlinkSync(usdcConfigFile);
        if (fs.existsSync(rateConfigFile)) fs.unlinkSync(rateConfigFile);
        console.log("Cleaned up config files.");
    } catch (e) {
        console.warn("Cleanup warning:", e.message);
    }
};

try {
    // 1. Add XLM Reserve
    console.log("\nAdding XLM Reserve to Lending Pool...");
    runStellar([
        'contract', 'invoke',
        '--id', poolId,
        '--source-account', 'admin',
        '--network', 'testnet',
        '--send', 'yes',
        '--',
        'add_reserve',
        '--config-file-path', xlmConfigFile,
        '--rate_config-file-path', rateConfigFile
    ]);

    // 2. Add USDC Reserve
    console.log("\nAdding USDC Reserve to Lending Pool...");
    runStellar([
        'contract', 'invoke',
        '--id', poolId,
        '--source-account', 'admin',
        '--network', 'testnet',
        '--send', 'yes',
        '--',
        'add_reserve',
        '--config-file-path', usdcConfigFile,
        '--rate_config-file-path', rateConfigFile
    ]);

    console.log("\n🌟 Reserves added successfully!");
    cleanup();

} catch (err) {
    console.error("\nFailed to add reserves:", err.message);
    process.exit(1);
}
