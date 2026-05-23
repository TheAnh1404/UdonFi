const { db } = require('./firebase');
const fs = require('fs');
const path = require('path');

async function resetAllState() {
    console.log("--- 1. Resetting Users to 0 in Firestore ---");
    try {
        const usersSnapshot = await db.collection("users").get();
        const userBatch = db.batch();
        usersSnapshot.forEach(doc => {
            userBatch.update(db.collection("users").doc(doc.id), {
                suppliedScaled: { XLM: 0, USDC: 0 },
                debtScaled: { XLM: 0, USDC: 0 },
                bitmap: "0",
                lastUpdated: new Date().toISOString()
            });
        });
        await userBatch.commit();
        console.log("✅ Reset users completed.");
    } catch (e) {
        console.error("❌ Error resetting users:", e.message);
    }

    console.log("--- 2. Resetting Pool State in Firestore ---");
    try {
        await db.collection("pool_state").doc("current").set({
            globalTotalSupplied: 0,
            globalTotalBorrowed: 0,
            users: {},
            startLedger: 0,
            lastUpdated: new Date().toISOString()
        });
        console.log("✅ Reset pool_state/current completed.");
    } catch (e) {
        console.error("❌ Error resetting pool state:", e.message);
    }

    console.log("--- 3. Clearing Transaction History in Firestore ---");
    try {
        const txsSnapshot = await db.collection("transactions").get();
        if (txsSnapshot.empty) {
            console.log("No transactions found to delete.");
        } else {
            const txBatch = db.batch();
            txsSnapshot.forEach(doc => {
                txBatch.delete(db.collection("transactions").doc(doc.id));
            });
            await txBatch.commit();
            console.log(`✅ Deleted ${txsSnapshot.size} old transactions.`);
        }
    } catch (e) {
        console.error("❌ Error deleting transactions:", e.message);
    }

    console.log("--- 4. Resetting local state.json file ---");
    try {
        const stateFilePath = path.join(__dirname, 'state.json');
        const freshState = {
            state: {
                globalTotalSupplied: 0,
                globalTotalBorrowed: 0,
                reserves: {},
                users: {}
            },
            startLedger: null
        };
        fs.writeFileSync(stateFilePath, JSON.stringify(freshState, null, 2), 'utf8');
        console.log("✅ Wrote fresh state.json file.");
    } catch (e) {
        console.error("❌ Error writing state.json:", e.message);
    }

    console.log("\n⭐ ALL STATES CLEANED UP AND SYNCHRONIZED FOR NEW DEPLOYMENT!");
}

resetAllState();
