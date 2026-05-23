const { rpc } = require('@stellar/stellar-sdk');

const POOL_CONTRACT_ID = 'CDC7IHZSUWN47NVQSQ6PLW7XWIG4RLIGIIMSC47IYGQ5YYQRPPKAEXU4';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);

async function checkEvents() {
    console.log("Fetching latest Soroban events from RPC...");
    try {
        const latestLedger = await server.getLatestLedger();
        console.log(`Latest ledger: ${latestLedger.sequence}`);
        
        // Fetch from 10,000 ledgers back to guarantee finding past events
        const startLedger = Math.max(1, latestLedger.sequence - 10000);
        
        const response = await server.getEvents({
            startLedger: startLedger,
            filters: [
                {
                    type: 'contract',
                    contractIds: [POOL_CONTRACT_ID]
                }
            ],
            limit: 5
        });
        
        console.log(`Fetched ${response.events ? response.events.length : 0} events.`);
        if (response.events && response.events.length > 0) {
            console.log("First event raw structure:", JSON.stringify(response.events[0], null, 2));
            console.log("Keys in event:", Object.keys(response.events[0]));
        } else {
            console.log("No events found in the last 10,000 ledgers. Trying 50,000 ledgers back...");
            const responseFar = await server.getEvents({
                startLedger: Math.max(1, latestLedger.sequence - 50000),
                filters: [
                    {
                        type: 'contract',
                        contractIds: [POOL_CONTRACT_ID]
                    }
                ],
                limit: 5
            });
            console.log(`Fetched ${responseFar.events ? responseFar.events.length : 0} events.`);
            if (responseFar.events && responseFar.events.length > 0) {
                console.log("First event raw structure:", JSON.stringify(responseFar.events[0], null, 2));
                console.log("Keys in event:", Object.keys(responseFar.events[0]));
            }
        }
    } catch (err) {
        console.error("Error fetching events:", err.message);
    }
}

checkEvents();
