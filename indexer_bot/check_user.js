const { Horizon } = require('@stellar/stellar-sdk');

async function check() {
    const userAddress = 'GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X';
    console.log(`Checking account: ${userAddress}`);
    try {
        const horizonServer = new Horizon.Server('https://horizon-testnet.stellar.org');
        const account = await horizonServer.loadAccount(userAddress);
        console.log("✅ Account found!");
        console.log("Balances:", JSON.stringify(account.balances, null, 2));
    } catch (e) {
        console.error("❌ Account load failed:", e.message);
    }
}
check();
