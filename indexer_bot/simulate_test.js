const { rpc, Contract, Address, nativeToScVal, TransactionBuilder, Networks, BASE_FEE, Account } = require('@stellar/stellar-sdk');

const POOL_CONTRACT_ID = 'CDC7IHZSUWN47NVQSQ6PLW7XWIG4RLIGIIMSC47IYGQ5YYQRPPKAEXU4';
const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);

// Use the user's actual active address
const mockUserAddress = 'GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X';
const assetAddress = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC'; // XLM

async function run() {
    console.log(`Starting simulation diagnostic with address: ${mockUserAddress}`);
    try {
        console.log("Loading source account details...");
        const response = await fetch(`https://horizon-testnet.stellar.org/accounts/${mockUserAddress}`);
        const accountData = await response.json();
        const sourceAccount = new Account(mockUserAddress, accountData.sequence || '100');
        
        console.log(`Source account sequence: ${sourceAccount.sequenceNumber()}`);

        const amountStroop = BigInt(10_000_000); // 1 XLM

        const contractArgs = [
            nativeToScVal(Address.fromString(mockUserAddress)),
            nativeToScVal(Address.fromString(assetAddress)),
            nativeToScVal(amountStroop, { type: 'i128' })
        ];

        const poolContract = new Contract(POOL_CONTRACT_ID);
        const operation = poolContract.call('supply', ...contractArgs);

        console.log("Building transaction...");
        let tx = new TransactionBuilder(sourceAccount, {
            fee: BASE_FEE,
            networkPassphrase: Networks.TESTNET
        })
        .addOperation(operation)
        .setTimeout(30)
        .build();

        console.log("Simulating transaction on Soroban RPC...");
        const result = await server.simulateTransaction(tx);
        console.log("Simulation Result:", JSON.stringify(result, null, 2));

    } catch (err) {
        console.error("Simulation failed:", err);
    }
}

run();
