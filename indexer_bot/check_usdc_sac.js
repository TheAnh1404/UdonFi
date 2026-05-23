const StellarSdk = require('@stellar/stellar-sdk');

async function main() {
    console.log("Checking contract CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA on Testnet...");
    // Let's print the SAC's classic asset details
    const server = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
    
    // We can fetch the contract's Wasm or look it up.
    // But we can also test if we can find the issuer by deriving the contract ID for different issuers:
    // Let's test the issuer in App.tsx: GB2DLVR5G6IHKSQ63QBA24QCJZ2645GZVEIQH2JGFLVK7ZIO543S3V6W
    const testIssuer1 = 'GB2DLVR5G6IHKSQ63QBA24QCJZ2645GZVEIQH2JGFLVK7ZIO543S3V6W';
    // Let's test the issuer in SKILL.md: GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
    const testIssuer2 = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    
    try {
        const asset1 = new StellarSdk.Asset('USDC', testIssuer1);
        const cid1 = asset1.contractId(StellarSdk.Networks.TESTNET);
        console.log(`Contract ID for GB2DLVR5G6IHKSQ63QBA24QCJZ2645GZVEIQH2JGFLVK7ZIO543S3V6W: ${cid1}`);
        if (cid1 === 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA') {
            console.log("🎯 MATCH! GB2DLVR5G6IHKSQ63QBA24QCJZ2645GZVEIQH2JGFLVK7ZIO543S3V6W is the issuer!");
        }
    } catch(e) {
        console.log(`Error test1: ${e.message}`);
    }

    try {
        const asset2 = new StellarSdk.Asset('USDC', testIssuer2);
        const cid2 = asset2.contractId(StellarSdk.Networks.TESTNET);
        console.log(`Contract ID for GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5: ${cid2}`);
        if (cid2 === 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA') {
            console.log("🎯 MATCH! GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 is the issuer!");
        }
    } catch(e) {
        console.log(`Error test2: ${e.message}`);
    }
}

main();
