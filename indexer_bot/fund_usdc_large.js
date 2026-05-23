const StellarSdk = require('@stellar/stellar-sdk');
const { db } = require('./firebase');

const USER_ADDRESS = 'GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X';
const ADMIN_SECRET = 'SA5Q4YWCR75MAWDRJPETVBPDOSH3KQ6WB5JIO5DYULFIZMUCKCJ3HGJ4';
const ADMIN_PUBLIC = 'GCHCL7SUEVO2N46TPIVPAMQPK5BETF46RNAGN6Y5TKICVCZOWTHTNWQ4';

const USDC_ASSET = new StellarSdk.Asset('USDC', ADMIN_PUBLIC);

async function main() {
    console.log("==================================================");
    console.log(`🚀 STARTING ON-CHAIN FUNDING PROCESS FOR USER WALLET`);
    console.log(`Address: ${USER_ADDRESS}`);
    console.log("==================================================\n");

    const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

    // 1. Fund XLM via Friendbot
    console.log("Step 1: Funding XLM via Friendbot...");
    try {
        const response = await fetch(`https://friendbot.stellar.org/?addr=${USER_ADDRESS}`);
        if (response.ok) {
            console.log("✅ Successfully requested Friendbot XLM!");
        } else {
            console.warn("⚠️ Friendbot returned status:", response.status, "- Account may already have enough XLM.");
        }
    } catch (e) {
        console.error("❌ Friendbot call failed:", e.message);
    }

    // Load user account from Horizon
    let userAccount = null;
    try {
        userAccount = await horizonServer.loadAccount(USER_ADDRESS);
        console.log(`✅ Loaded user account. Current XLM Balance: ${userAccount.balances.find(b => b.asset_type === 'native').balance} XLM`);
    } catch (e) {
        console.error("❌ Failed to load user account on Testnet. Account must be activated first!");
        return;
    }

    // 2. Check USDC Trustline
    console.log("\nStep 2: Checking USDC Trustline...");
    const hasTrustline = userAccount.balances.some(
        b => b.asset_type !== 'native' && b.asset_code === 'USDC' && b.asset_issuer === ADMIN_PUBLIC
    );

    if (!hasTrustline) {
        console.log("\n❌ ERROR: Trustline to custom USDC not found!");
        console.log("👉 Vui lòng truy cập UdonFi, kết nối ví Freighter và nhấn nút 'Đăng ký Trustline USDC'!");
        console.log("👉 Custom USDC Details: Code = USDC, Issuer = GCHCL7SUEVO2N46TPIVPAMQPK5BETF46RNAGN6Y5TKICVCZOWTHTNWQ4");
        console.log("\nScript sẽ chỉ cập nhật số dư XLM giả lập. Vui lòng đăng ký Trustline rồi chạy lại script để nhận 1.000.000 USDC!");
        
        // Update Firestore anyway (with current real XLM and mock USDC)
        await updateFirestoreBalances(USER_ADDRESS, 100000, 1000000);
        return;
    }

    console.log("✅ USDC Trustline confirmed!");

    // 3. Send 1,000,000 USDC from Admin issuer to User
    console.log("\nStep 3: Sending 1,000,000 USDC on-chain from Admin Issuer...");
    try {
        const adminKeypair = StellarSdk.Keypair.fromSecret(ADMIN_SECRET);
        const adminAccount = await horizonServer.loadAccount(ADMIN_PUBLIC);

        const tx = new StellarSdk.TransactionBuilder(adminAccount, {
            fee: '1000000', // Prioritize transaction (0.1 XLM fee)
            networkPassphrase: StellarSdk.Networks.TESTNET
        })
        .addOperation(StellarSdk.Operation.payment({
            destination: USER_ADDRESS,
            asset: USDC_ASSET,
            amount: '1000000.0000000' // 1,000,000 USDC (7 decimals)
        }))
        .setTimeout(60)
        .build();

        tx.sign(adminKeypair);
        const submitResponse = await horizonServer.submitTransaction(tx);
        console.log(`✅ On-chain payment successful! Tx Hash: ${submitResponse.hash}`);

        // Update Firestore to align
        await updateFirestoreBalances(USER_ADDRESS, 100000, 1000000);

    } catch (err) {
        console.error("❌ On-chain payment failed:", err.message || err);
    }
}

async function updateFirestoreBalances(userAddress, xlmBalance, usdcBalance) {
    console.log(`\nStep 4: Synchronizing Firestore balances...`);
    try {
        const userRef = db.collection("users").doc(userAddress);
        await userRef.set({
            wallet: {
                USDC: usdcBalance,
                XLM: xlmBalance
            },
            lastUpdated: new Date().toISOString()
        }, { merge: true });
        console.log(`✅ Successfully updated Firestore: USDC = ${usdcBalance}, XLM = ${xlmBalance}`);
    } catch (e) {
        console.error("❌ Error updating Firestore:", e.message);
    }
}

main();
