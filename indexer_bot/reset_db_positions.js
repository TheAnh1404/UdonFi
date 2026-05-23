const { db } = require('./firebase');

async function resetDbPositions() {
    console.log("Resetting all user positions in Firestore to 0...");
    try {
        const snapshot = await db.collection("users").get();
        if (snapshot.empty) {
            console.log("No users found to reset.");
            return;
        }

        const batch = db.batch();
        snapshot.forEach(doc => {
            const userRef = db.collection("users").doc(doc.id);
            batch.update(userRef, {
                suppliedScaled: { XLM: 0, USDC: 0 },
                debtScaled: { XLM: 0, USDC: 0 },
                bitmap: "0",
                lastUpdated: new Date().toISOString()
            });
            console.log(`- Queued reset for user: ${doc.id}`);
        });

        await batch.commit();
        console.log("✅ Successfully reset all user positions in Firestore!");
    } catch (e) {
        console.error("❌ Error resetting user positions:", e.message);
    }
}

resetDbPositions();
