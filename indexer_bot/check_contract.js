const { rpc } = require('@stellar/stellar-sdk');

const POOL_CONTRACT_ID = 'CDC7IHZSUWN47NVQSQ6PLW7XWIG4RLIGIIMSC47IYGQ5YYQRPPKAEXU4';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);

async function checkContract() {
    console.log(`Checking contract ${POOL_CONTRACT_ID} on Soroban Testnet...`);
    try {
        // Query ledger entry for the contract code/wasm reference
        const response = await server.getLedgerEntries({
            keys: [
                {
                    type: 'contractData',
                    contractId: POOL_CONTRACT_ID,
                    key: 'ContractCode' // Or we can check if we can query contract metadata
                }
            ]
        });
        console.log("Ledger entries response:", JSON.stringify(response, null, 2));
    } catch (err) {
        console.error("Error querying contract:", err.message);
    }
}

checkContract();
