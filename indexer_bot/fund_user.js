async function fund() {
    const userAddress = 'GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X';
    console.log(`Funding account: ${userAddress} via Stellar Friendbot...`);
    try {
        const response = await fetch(`https://friendbot.stellar.org/?addr=${userAddress}`);
        if (response.ok) {
            const data = await response.json();
            console.log("✅ Successfully funded account!");
            console.log(`Hash: ${data.hash}`);
        } else {
            const errText = await response.text();
            console.error(`❌ Friendbot funding failed: ${errText}`);
        }
    } catch (e) {
        console.error("Error calling Friendbot:", e.message);
    }
}
fund();
