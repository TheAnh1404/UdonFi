const { db } = require('./firebase');

async function checkUsers() {
    console.log("Fetching registered user addresses from Firestore...");
    try {
        const snapshot = await db.collection("users").get();
        console.log(`Found ${snapshot.size} users:`);
        snapshot.forEach(doc => {
            console.log(`- ${doc.id}: ${JSON.stringify(doc.data().wallet || {})}`);
        });
    } catch (e) {
        console.error("Error fetching users:", e.message);
    }
}
checkUsers();
