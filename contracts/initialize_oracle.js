const { spawnSync } = require('child_process');

const oracleId = "CA7QMY2RJC7DRYNH3ZOW5U4GEMCF6N7XZ2V7J3YHP5YTBTSO4XKY7DWJ";

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
    // 1. Set XLM Price ($0.15 = 150000000000000000)
    console.log("\nSetting Oracle price for XLM ($0.15)...");
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

    // 2. Set USDC Price ($1.00 = 1000000000000000000)
    console.log("\nSetting Oracle price for USDC ($1.00)...");
    runStellar([
        'contract', 'invoke',
        '--id', oracleId,
        '--source-account', 'admin',
        '--network', 'testnet',
        '--send', 'yes',
        '--',
        'set_price',
        '--asset', "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
        '--price_wad', "1000000000000000000"
    ]);

    console.log("\n🌟 Oracle prices set successfully!");

} catch (err) {
    console.error("\nFailed to set Oracle prices:", err.message);
    process.exit(1);
}
