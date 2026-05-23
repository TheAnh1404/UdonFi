const { db } = require('./firebase');

async function checkRealTxs() {
    console.log("Checking all transactions in Firestore to see if any have real Stellar transaction hashes (64-char hex)...");
    const snapshot = await db.collection("transactions").get();
    if (snapshot.empty) {
        console.log("No transactions found in Firestore.");
        return;
    }
    
    let realTxs = [];
    let mockTxs = [];
    
    snapshot.forEach(doc => {
        const d = doc.data();
        const hash = d.hash || '';
        // Real Stellar tx hashes are 64 characters hex
        const isReal = hash.length === 64 && /^[0-9a-fA-F]+$/.test(hash);
        if (isReal) {
            realTxs.push(d);
        } else {
            mockTxs.push(d);
        }
    });
    
    console.log(`Total transactions in Firestore: ${snapshot.size}`);
    console.log(`Mock/Fallback transactions (starting with GC or not 64-char hex): ${mockTxs.length}`);
    console.log(`Real Stellar transactions (64-char hex): ${realTxs.length}`);
    
    if (realTxs.length > 0) {
        console.log("\nFound real transactions:");
        realTxs.forEach((tx, i) => {
            console.log(`${i+1}. Type: ${tx.type}, Hash: ${tx.hash}, Asset: ${tx.asset}, Amount: ${tx.amount}`);
        });
    } else {
        console.log("\nNo real transaction hashes found yet in the database.");
    }
}

checkRealTxs().catch(console.error);
