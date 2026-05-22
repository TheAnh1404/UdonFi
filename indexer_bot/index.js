// UdonFi Indexer Bot
// Listens to Stellar Testnet events and provides Realtime updates

const { rpc, scValToNative } = require('@stellar/stellar-sdk');
const express = require('express');
const { Server: SocketIOServer } = require('socket.io');

// Config
const POOL_CONTRACT_ID = process.env.POOL_CONTRACT_ID || 'CAQRYQXLNBFXCKNCN3UIVGL2OCR6EL3QURZ56ZC2B4YMPYY6JAVXLBBH';
const RPC_URL = process.env.SOROBAN_RPC_URL || 'https://soroban-testnet.stellar.org';
const sorobanServer = new rpc.Server(RPC_URL);

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

// Polling Soroban Events from RPC
async function pollSorobanEvents() {
    console.log(`📡 Listening for Soroban events on contract: ${POOL_CONTRACT_ID}...`);
    
    try {
        const latestLedgerObj = await sorobanServer.getLatestLedger();
        startLedger = latestLedgerObj.sequence;
        console.log(`📈 Indexing started from ledger sequence: ${startLedger}`);
    } catch (err) {
        console.error('❌ Failed to fetch latest ledger from RPC. Retrying in 5s...', err.message);
        setTimeout(pollSorobanEvents, 5000);
        return;
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
                            return scValToNative(t);
                        } catch (e) {
                            return null;
                        }
                    });

                    let decodedValue = null;
                    try {
                        decodedValue = scValToNative(event.value);
                    } catch (e) {
                        // ignore
                    }

                    eventsToProcess.push({
                        type: decodedTopics[0],
                        user: decodedTopics[1],
                        asset: decodedTopics[2],
                        value: decodedValue,
                        ledger: event.ledger
                    });
                }

                // Process event logs
                processEvents(eventsToProcess);

                // Advance pointer past processed events
                startLedger = maxLedger + 1;
            } else {
                // Advance pointer to the latest network ledger to keep up
                startLedger = currentLatest.sequence;
            }
        } catch (err) {
            console.error('⚠️ Error polling Soroban events:', err.message);
        }
    }, 5000);
}

function processEvents(events) {
    events.forEach(event => {
        const type = event.type; // "supply", "borrow", "repay", "wdraw"
        const user = event.user;
        const amount = Number(event.value);

        if (!type || isNaN(amount)) return;

        console.log(`🔔 Decoded Soroban Event [Ledger ${event.ledger}]: ${type} by ${user} for ${amount}`);
        
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
    });
}

// WebSocket Connection Setup
io.on('connection', (socket) => {
    console.log('💻 Frontend client connected via WebSocket');
    // Supply client with latest synced state immediately
    socket.emit('protocol_update', state);
});

// Start API Server
const PORT = process.env.PORT || 3001;
http.listen(PORT, () => {
    console.log(`🌐 Realtime WebSocket API running on port ${PORT}`);
    pollSorobanEvents();
});
