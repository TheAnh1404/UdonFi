const { spawnSync } = require('child_process');

const poolId = "CDC7IHZSUWN47NVQSQ6PLW7XWIG4RLIGIIMSC47IYGQ5YYQRPPKAEXU4";
const oracleId = "CCYXEPE33R6BWS5XAFKECVSDX3V6Y736XOQ4PQOAIHJITJNWFAP6WVB7";
const aTokenXlmId = "CBABHXEUQWHFLVK2ZKXWCHPXQ3OOIYCFQTE4TJTI2ZU4SSXBFTM5S6F3";
const debtTokenXlmId = "CBTVDJXSYFBBH2RNKJ5QEEZE3577E3BB7RPNEPTU5G4GNM3TZJEN5KHF";
const aTokenUsdcId = "CBOZOAENB7X64THXQNERBI6N6XZT3RA4G24EFHAQ2AW34EYZXPLGUBZ5";
const debtTokenUsdcId = "CCSTHGQBPH5GQ7JKEVZQZC7E2NLNTIH3XD4FCMWTV6FPJLX4C7EUNDLJ";

const runStellar = (args) => {
    console.log(`Running: stellar ${args.join(' ')}`);
    const res = spawnSync('stellar', args, { encoding: 'utf-8', shell: true });
    if (res.status !== 0) {
        console.error(`Error details:`, res.stderr);
        throw new Error(`Stellar CLI failed with exit code ${res.status}`);
    }
    console.log(res.stdout);
};

try {
    // 1. Add XLM Reserve
    console.log("Adding XLM Reserve...");
    runStellar([
        'contract', 'invoke',
        '--id', poolId,
        '--source-account', 'admin',
        '--network', 'testnet',
        '--send', 'yes',
        '--',
        'add_reserve',
        '--config', JSON.stringify({
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
        }),
        '--rate_config', JSON.stringify({
            base_rate: "20000000000000000",
            optimal_utilization: "800000000000000000",
            slope1: "40000000000000000",
            slope2: "3000000000000000000"
        })
    ]);

    // 2. Add USDC Reserve
    console.log("Adding USDC Reserve...");
    runStellar([
        'contract', 'invoke',
        '--id', poolId,
        '--source-account', 'admin',
        '--network', 'testnet',
        '--send', 'yes',
        '--',
        'add_reserve',
        '--config', JSON.stringify({
            a_token: aTokenUsdcId,
            asset: "CAO2VFOWACEHKUJXGFDX5MOYFDGL2OANBOB3AK33CUR6R3A2Y5IC65XQ",
            debt_token: debtTokenUsdcId,
            decimals: 7,
            is_active: true,
            is_borrowing_enabled: true,
            liquidation_bonus: 500,
            liquidation_threshold: 8250,
            ltv: 7000,
            reserve_factor: 1000,
            reserve_index: 1
        }),
        '--rate_config', JSON.stringify({
            base_rate: "20000000000000000",
            optimal_utilization: "800000000000000000",
            slope1: "40000000000000000",
            slope2: "3000000000000000000"
        })
    ]);

    // 3. Set XLM Price
    console.log("Setting Oracle price for XLM...");
    runStellar([
        'contract', 'invoke',
        '--id', oracleId,
        '--source-account', 'admin',
        '--network', 'testnet',
        '--send', 'yes',
        '--',
        'set_price',
        '--asset', "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
        '--price_wad', "150000000000000000"
    ]);

    // 4. Set USDC Price
    console.log("Setting Oracle price for USDC...");
    runStellar([
        'contract', 'invoke',
        '--id', oracleId,
        '--source-account', 'admin',
        '--network', 'testnet',
        '--send', 'yes',
        '--',
        'set_price',
        '--asset', "CAO2VFOWACEHKUJXGFDX5MOYFDGL2OANBOB3AK33CUR6R3A2Y5IC65XQ",
        '--price_wad', "1000000000000000000"
    ]);

    console.log("🌟 UdonFi Smart Contracts INITIALIZED & CONFIGURED Successfully on Testnet!");

} catch (err) {
    console.error("Initialization failed:", err.message);
    process.exit(1);
}
