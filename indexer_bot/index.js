// UdonFi Indexer Bot
// Listens to Stellar Testnet events and provides Realtime updates

const { rpc, scValToNative, xdr } = require('@stellar/stellar-sdk');
const express = require('express');
const { Server: SocketIOServer } = require('socket.io');
const fs = require('fs');
const path = require('path');
const { db } = require('./firebase');

// Config
const POOL_CONTRACT_ID = 'CDC7IHZSUWN47NVQSQ6PLW7XWIG4RLIGIIMSC47IYGQ5YYQRPPKAEXU4';
const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const sorobanServer = new rpc.Server(RPC_URL);
const STATE_FILE_PATH = path.join(__dirname, 'state.json');

const app = express();
const http = require('http').createServer(app);
const io = new SocketIOServer(http, {
    cors: { origin: '*' }
});

// Realtime Database State (Broadcasting to clients)
let state = {
    globalTotalSupplied: 0,
    globalTotalBorrowed: 0,
    reserves: {},
    users: {}
};

console.log('🚀 UdonFi Realtime Soroban Indexer Bot started');

let startLedger = null;

// Load persisted state if it exists
if (fs.existsSync(STATE_FILE_PATH)) {
    try {
        const fileContent = fs.readFileSync(STATE_FILE_PATH, 'utf8');
        const data = JSON.parse(fileContent);
        if (data.state) {
            state = data.state;
        }
        if (data.startLedger !== undefined && data.startLedger !== null) {
            startLedger = Number(data.startLedger);
            console.log(`💾 Loaded persisted state and startLedger sequence: ${startLedger}`);
        }
    } catch (err) {
        console.error('❌ Failed to load persisted state:', err.message);
    }
}

async function saveState() {
    try {
        const data = {
            state,
            startLedger
        };
        fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
        
        // Push state to Firestore
        await db.collection("pool_state").doc("current").set({
            globalTotalSupplied: Number(state.globalTotalSupplied) || 0,
            globalTotalBorrowed: Number(state.globalTotalBorrowed) || 0,
            users: state.users || {},
            startLedger: startLedger || 0,
            lastUpdated: new Date().toISOString()
        });
        console.log('🔥 Synchronized current state to Firestore!');
    } catch (err) {
        console.error('❌ Failed to persist state to file/Firestore:', err.message);
    }
}

// Polling Soroban Events from RPC
async function pollSorobanEvents() {
    console.log(`📡 Listening for Soroban events on contract: ${POOL_CONTRACT_ID}...`);
    
    if (startLedger === null) {
        try {
            const latestLedgerObj = await sorobanServer.getLatestLedger();
            startLedger = latestLedgerObj.sequence;
            console.log(`📈 Indexing started from latest ledger sequence: ${startLedger}`);
            saveState();
        } catch (err) {
            console.error('❌ Failed to fetch latest ledger from RPC. Retrying in 5s...', err.message);
            setTimeout(pollSorobanEvents, 5000);
            return;
        }
    } else {
        console.log(`📈 Indexing starting from loaded ledger sequence: ${startLedger}`);
    }

    setInterval(async () => {
        try {
            const currentLatest = await sorobanServer.getLatestLedger();
            if (startLedger > currentLatest.sequence) {
                return; // Ledger has not advanced
            }

            const response = await sorobanServer.getEvents({
                startLedger: startLedger,
                filters: [
                    {
                        type: 'contract',
                        contractIds: [POOL_CONTRACT_ID]
                    }
                ]
            });

            if (response && response.events && response.events.length > 0) {
                let maxLedger = startLedger;
                const eventsToProcess = [];

                for (const event of response.events) {
                    if (event.ledger > maxLedger) {
                        maxLedger = event.ledger;
                    }

                    // Safe decode XDR topics and value to native JS types
                    const decodedTopics = event.topic.map(t => {
                        try {
                            const scVal = xdr.ScVal.fromXDR(t, 'base64');
                            return scValToNative(scVal);
                        } catch (e) {
                            return null;
                        }
                    });

                    let decodedValue = null;
                    try {
                        let xdrStr = event.value;
                        if (event.value && typeof event.value === 'object' && event.value.xdr) {
                            xdrStr = event.value.xdr;
                        }
                        if (xdrStr && typeof xdrStr === 'string') {
                            const scVal = xdr.ScVal.fromXDR(xdrStr, 'base64');
                            decodedValue = scValToNative(scVal);
                        } else {
                            decodedValue = scValToNative(event.value);
                        }
                    } catch (e) {
                        // ignore
                    }

                    eventsToProcess.push({
                        type: decodedTopics[0],
                        user: decodedTopics[1],
                        asset: decodedTopics[2],
                        value: decodedValue,
                        ledger: event.ledger,
                        txHash: event.txHash
                    });
                }

                // Process event logs
                processEvents(eventsToProcess);

                // Advance pointer past processed events
                startLedger = maxLedger + 1;
                saveState();
            } else {
                // Advance pointer to the latest network ledger to keep up
                if (startLedger !== currentLatest.sequence) {
                    startLedger = currentLatest.sequence;
                    saveState();
                }
            }
        } catch (err) {
            console.error('⚠️ Error polling Soroban events:', err.message);
        }
    }, 5000);
}

function mapAssetSymbol(assetAddress) {
    if (!assetAddress) return 'XLM';
    const addrStr = String(assetAddress);
    if (addrStr.includes('CDLZFC') || addrStr === 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC') {
        return 'XLM';
    }
    if (addrStr.includes('CBIELT') || addrStr === 'CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA') {
        return 'USDC';
    }
    return 'XLM';
}

function processEvents(events) {
    events.forEach(async (event) => {
        const type = event.type; // "supply", "borrow", "repay", "wdraw"
        const user = event.user;
        const rawAmount = Number(event.value);
        const amount = rawAmount / 10000000.0; // Scale Stroops (10^7) to native asset amount

        if (!type || isNaN(amount)) return;

        console.log(`🔔 Decoded Soroban Event [Ledger ${event.ledger}]: ${type} by ${user} for ${amount} (Raw: ${rawAmount})`);
        
        // Update indexing state
        if (type === 'supply') {
            state.globalTotalSupplied += amount;
            if (!state.users[user]) state.users[user] = { supplied: 0, borrowed: 0 };
            state.users[user].supplied += amount;
        } else if (type === 'borrow') {
            state.globalTotalBorrowed += amount;
            if (!state.users[user]) state.users[user] = { supplied: 0, borrowed: 0 };
            state.users[user].borrowed += amount;
        } else if (type === 'repay') {
            state.globalTotalBorrowed = Math.max(0, state.globalTotalBorrowed - amount);
            if (state.users[user]) {
                state.users[user].borrowed = Math.max(0, state.users[user].borrowed - amount);
            }
        } else if (type === 'wdraw') {
            state.globalTotalSupplied = Math.max(0, state.globalTotalSupplied - amount);
            if (state.users[user]) {
                state.users[user].supplied = Math.max(0, state.users[user].supplied - amount);
            }
        }

        // Broadcast updated state to all connected web interfaces (Real-time synchronization)
        io.emit('protocol_update', state);

        // Store transaction history to Firestore
        try {
            const txType = type === 'supply' ? 'SUPPLY' 
                : type === 'borrow' ? 'BORROW' 
                : type === 'repay' ? 'REPAY' 
                : type === 'wdraw' ? 'WITHDRAW' 
                : type.toUpperCase();

            const assetSymbol = mapAssetSymbol(event.asset);
            const txHash = event.txHash || `GC${Math.random().toString(36).substring(2, 12).toUpperCase()}${Math.random().toString(36).substring(2, 12).toUpperCase()}`;

            // Prevent duplicate transaction entries if frontend already saved it
            if (event.txHash) {
                const querySnapshot = await db.collection("transactions").where("hash", "==", event.txHash).get();
                if (!querySnapshot.empty) {
                    console.log(`ℹ️ Transaction with hash ${event.txHash} already exists in Firestore. Skipping duplicate index.`);
                    return;
                }
            }

            await db.collection("transactions").add({
                id: `tx-${Math.random().toString(36).substring(2, 9)}`,
                timestamp: new Date().toLocaleTimeString(),
                type: txType,
                asset: assetSymbol,
                unit: assetSymbol,
                currency: "USD",
                amount: amount,
                hash: txHash,
                ledger: event.ledger,
                account: user,
                cpuInstructions: txType === 'SUPPLY' ? 12000000 
                    : txType === 'WITHDRAW' ? 15000000 
                    : txType === 'BORROW' ? 18000000 
                    : txType === 'REPAY' ? 14000000 
                    : 30000000,
                createdAt: new Date().toISOString()
            });
            console.log(`🔥 Transaction successfully indexed to Firestore: ${txType} of ${amount} for ${user}`);
        } catch (dbErr) {
            console.error('❌ Failed to save transaction event to Firestore:', dbErr.message);
        }
    });
}

// Global Firestore Real-time Listeners via Admin SDK (Bypass rules, leak-safe)
console.log('📡 Registering Firestore Admin SDK Real-time Listeners...');

// 1. Real-time Listener for Pool State
db.collection("pool_state").doc("current").onSnapshot((docSnap) => {
    if (docSnap.exists) {
        const data = docSnap.data();
        io.emit("pool_state_update", data);
        
        // Sync with local memory state
        state.globalTotalSupplied = Number(data.globalTotalSupplied) || state.globalTotalSupplied;
        state.globalTotalBorrowed = Number(data.globalTotalBorrowed) || state.globalTotalBorrowed;
        console.log(`🔥 Real-time sync: pool_state updated. Supplied: ${state.globalTotalSupplied}, Borrowed: ${state.globalTotalBorrowed}`);
    }
}, (err) => {
    console.error("❌ Firestore Admin SDK pool_state listener failed:", err.message);
});

// 2. Real-time Listener for Transactions
let isFirstTxLoad = true;
db.collection("transactions")
    .orderBy("createdAt", "desc")
    .limit(50)
    .onSnapshot((snapshot) => {
        const txs = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            txs.push({
                id: data.id || docSnap.id,
                timestamp: data.timestamp || 'N/A',
                type: data.type,
                asset: data.asset,
                amount: Number(data.amount) || 0,
                hash: data.hash || 'N/A',
                ledger: Number(data.ledger) || 0,
                account: data.account || 'N/A',
                cpuInstructions: Number(data.cpuInstructions) || 0,
                createdAt: data.createdAt
            });
        });

        // Broadcast updated transaction list to all connected frontends
        io.emit("transactions_update", txs);
        console.log(`🔥 Real-time sync: transactions list updated (${txs.length} items)`);

        // Trigger Money Flow visual overlay on frontend for new transactions only
        if (!isFirstTxLoad) {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    io.emit("new_transaction_added", {
                        type: data.type,
                        asset: data.asset,
                        amount: Number(data.amount) || 0,
                        createdAt: data.createdAt
                    });
                    console.log(`🔥 Broadcasting money flow for new transaction: ${data.type} of ${data.amount}`);
                }
            });
        }
        isFirstTxLoad = false;
    }, (err) => {
        console.error("❌ Firestore Admin SDK transactions listener failed:", err.message);
    });

// WebSocket Connection Setup
io.on('connection', (socket) => {
    console.log('💻 Frontend client connected via WebSocket');
    
    // 1. Supply client with latest indexer memory state immediately
    socket.emit('protocol_update', state);

    // 2. Supply client with 50 latest transactions immediately
    db.collection("transactions")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get()
        .then((snapshot) => {
            const txs = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                txs.push({
                    id: data.id || docSnap.id,
                    timestamp: data.timestamp || 'N/A',
                    type: data.type,
                    asset: data.asset,
                    amount: Number(data.amount) || 0,
                    hash: data.hash || 'N/A',
                    ledger: Number(data.ledger) || 0,
                    account: data.account || 'N/A',
                    cpuInstructions: Number(data.cpuInstructions) || 0,
                    createdAt: data.createdAt
                });
            });
            socket.emit("transactions_update", txs);
            console.log(`🔥 Sent ${txs.length} initial transactions to newly connected client`);
        })
        .catch((err) => {
            console.error("❌ Failed to fetch initial transactions for new client:", err.message);
        });

    // Socket Proxy Callback: Get User Balances (Read via Admin SDK)
    socket.on("get_user_balances", async (data, callback) => {
        try {
            const { userAddress } = data;
            if (!userAddress) {
                return callback({ success: false, error: "Missing userAddress" });
            }
            
            console.log(`📡 Fetching user position via Admin SDK for: ${userAddress}`);
            const docRef = db.collection("users").doc(userAddress);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                callback({ success: true, data: docSnap.data() });
            } else {
                callback({ success: true, data: null });
            }
        } catch (err) {
            console.error(`❌ Failed to get user balances via socket callback for ${data.userAddress}:`, err.message);
            callback({ success: false, error: err.message });
        }
    });

    // Socket Proxy: Save User Balances to Firestore using Admin SDK
    socket.on("save_user_balance", async (data) => {
        try {
            const { userAddress, balances } = data;
            if (!userAddress || !balances) return;
            
            await db.collection("users").doc(userAddress).set({
                wallet: balances.wallet || {},
                suppliedScaled: balances.suppliedScaled || {},
                debtScaled: balances.debtScaled || {},
                bitmap: balances.bitmap || "0",
                ttl: Number(balances.ttl) || 6000,
                currentLedger: Number(balances.currentLedger) || 641829,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            console.log(`🔥 User position synced via socket proxy for: ${userAddress}`);
        } catch (err) {
            console.error("❌ Failed to save user balances via socket proxy:", err.message);
        }
    });

    // Socket Proxy: Save Transaction to Firestore using Admin SDK
    socket.on("save_tx", async (tx) => {
        try {
            if (!tx) return;
            
            await db.collection("transactions").add({
                ...tx,
                createdAt: new Date().toISOString()
            });
            console.log(`🔥 Transaction synced via socket proxy: ${tx.type} of ${tx.amount} ${tx.asset}`);
        } catch (err) {
            console.error("❌ Failed to save transaction via socket proxy:", err.message);
        }
    });

    // Socket Proxy: Update Pool State in Firestore using Admin SDK
    socket.on("update_pool_state", async (data) => {
        try {
            const { globalTotalSupplied, globalTotalBorrowed } = data;
            
            await db.collection("pool_state").doc("current").set({
                globalTotalSupplied: Number(globalTotalSupplied) || 0,
                globalTotalBorrowed: Number(globalTotalBorrowed) || 0,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
            
            console.log(`🔥 Pool state updated via socket proxy. Supplied: ${globalTotalSupplied}, Borrowed: ${globalTotalBorrowed}`);
        } catch (err) {
            console.error("❌ Failed to update pool state via socket proxy:", err.message);
        }
    });
});

// Start API Server
const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
    console.log(`🌐 Realtime WebSocket API running on port ${PORT}`);
    pollSorobanEvents();
});
