const { spawnSync, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { db } = require('./firebase');

async function main() {
    console.log("🚀 Starting automated redeployment and reset flow...");

    // 1. Run redeployment of contracts
    const contractsDir = path.join(__dirname, '..', 'contracts');
    console.log(`Running redeployment in: ${contractsDir}`);
    
    const deployResult = spawnSync('node', ['redeploy_entire_protocol.js'], {
        cwd: contractsDir,
        encoding: 'utf-8',
        shell: true
    });

    if (deployResult.status !== 0) {
        console.error("❌ Redeployment failed!");
        console.error(deployResult.stderr);
        process.exit(1);
    }

    const stdout = deployResult.stdout;
    console.log(stdout);

    // 2. Parse new Lending Pool ID
    const poolIdMatch = stdout.match(/Lending Pool ID:\s+(\S+)/);
    if (!poolIdMatch) {
        console.error("❌ Could not parse new Lending Pool ID from stdout!");
        process.exit(1);
    }
    const newPoolId = poolIdMatch[1];
    console.log(`✨ Found New Lending Pool ID: ${newPoolId}`);

    // 3. Update App.tsx
    const appTsxPath = path.join(__dirname, '..', 'frontend', 'src', 'App.tsx');
    let appTsxContent = fs.readFileSync(appTsxPath, 'utf8');
    appTsxContent = appTsxContent.replace(
        /const POOL_CONTRACT_ID = '[^']+';/,
        `const POOL_CONTRACT_ID = '${newPoolId}';`
    );
    fs.writeFileSync(appTsxPath, appTsxContent, 'utf8');
    console.log("✅ Updated frontend/src/App.tsx");

    // 4. Update index.js
    const indexJsPath = path.join(__dirname, 'index.js');
    let indexJsContent = fs.readFileSync(indexJsPath, 'utf8');
    indexJsContent = indexJsContent.replace(
        /const POOL_CONTRACT_ID = '[^']+';/,
        `const POOL_CONTRACT_ID = '${newPoolId}';`
    );
    fs.writeFileSync(indexJsPath, indexJsContent, 'utf8');
    console.log("✅ Updated indexer_bot/index.js");

    // 5. Reset Firestore
    console.log("--- Resetting Users to 0 in Firestore ---");
    const usersSnapshot = await db.collection("users").get();
    const userBatch = db.batch();
    usersSnapshot.forEach(doc => {
        userBatch.update(db.collection("users").doc(doc.id), {
            wallet: { XLM: 100000, USDC: 1000000 },
            suppliedScaled: { XLM: 0, USDC: 0 },
            debtScaled: { XLM: 0, USDC: 0 },
            bitmap: "0",
            lastUpdated: new Date().toISOString()
        });
    });
    await userBatch.commit();
    console.log("✅ Reset users completed.");

    console.log("--- Resetting Pool State in Firestore ---");
    await db.collection("pool_state").doc("current").set({
        globalTotalSupplied: 0,
        globalTotalBorrowed: 0,
        users: {},
        startLedger: 0,
        lastUpdated: new Date().toISOString()
    });
    console.log("✅ Reset pool_state/current completed.");

    console.log("--- Clearing Transaction History in Firestore ---");
    const txsSnapshot = await db.collection("transactions").get();
    if (!txsSnapshot.empty) {
        const txBatch = db.batch();
        txsSnapshot.forEach(doc => {
            txBatch.delete(db.collection("transactions").doc(doc.id));
        });
        await txBatch.commit();
        console.log(`✅ Deleted ${txsSnapshot.size} old transactions.`);
    }

    // 6. Reset state.json
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
    console.log("✅ Wrote fresh state.json");

    // 7. Kill old indexer on port 3001
    console.log("--- Killing process on port 3001 ---");
    try {
        execSync('npx kill-port 3001', { stdio: 'inherit' });
        console.log("✅ Killed process on port 3001");
    } catch (e) {
        console.log("⚠️ Could not kill port 3001 (maybe already free):", e.message);
    }

    console.log("\n⭐ ALL PROTOCOL RESET & ALIGNED SUCCESSFULLY!");
}

main().catch(e => {
    console.error("❌ Orchestration flow failed:", e);
    process.exit(1);
});
