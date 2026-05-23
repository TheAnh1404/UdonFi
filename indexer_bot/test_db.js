const { db } = require('./firebase');

async function checkUsers() {
    console.log("Fetching all users from Firestore...");
    const snapshot = await db.collection("users").get();
    if (snapshot.empty) {
        console.log("No users found.");
        return;
    }
    snapshot.forEach(doc => {
        console.log(doc.id, "=>", doc.data());
    });
}

checkUsers().catch(console.error);
