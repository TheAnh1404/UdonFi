const { rpc, Contract, Address, nativeToScVal, TransactionBuilder, Networks, Account, Keypair } = require('@stellar/stellar-sdk');

const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);

const POOL_CDC7 = 'CDC7IHZSUWN47NVQSQ6PLW7XWIG4RLIGIIMSC47IYGQ5YYQRPPKAEXU4';
const POOL_CDKC = 'CDKCL2V7S4ELV7ZYLWSDQLVCVS77GO5CBN6AF5Y42FCM2TPCCLFOEPL3';

async function simulateSupply(poolId, label) {
    console.log(`\n🧪 Simulating Supply on Pool [${label}]: ${poolId}`);
    try {
        const poolContract = new Contract(poolId);
        
        // Correct wallet address
        const callerAddress = 'GAMMPBTYAA3OLZTN4JUOSBHC2VC5MJ3ZICC75UJMB7IOQFRKONMPHQ2X';
        const xlmAsset = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
        const amountStroop = 100000000n; // 10 XLM (in stroops)
        
        const operation = poolContract.call(
            'supply',
            nativeToScVal(Address.fromString(callerAddress)),
            nativeToScVal(Address.fromString(xlmAsset)),
            nativeToScVal(amountStroop, { type: 'i128' })
        );
        
        const sourceAccount = new Account(callerAddress, '0');
        const tx = new TransactionBuilder(sourceAccount, {
            fee: '100000',
            networkPassphrase: Networks.TESTNET
        })
        .addOperation(operation)
        .setTimeout(30)
        .build();
        
        const sim = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationSuccess(sim)) {
            console.log(`✅ Supply Simulation Success on ${label}!`);
            console.log(`Gas / Fee: ${sim.minResourceFee} Stroops`);
        } else {
            console.error(`❌ Supply Simulation Failed on ${label}:`, sim.error || (sim.result && sim.result.retval));
            if (sim.events) {
                console.log('Diagnostic Event logs:');
                sim.events.forEach((ev, idx) => {
                    const valueStr = ev.event.value ? JSON.stringify(ev.event.value) : 'none';
                    console.log(`[Event ${idx}] Contract: ${ev.event.contractId}, Topics: ${JSON.stringify(ev.event.topic)}, Data: ${valueStr}`);
                });
            }
        }
    } catch (err) {
        console.error(`Error simulating supply on ${label}:`, err.message);
    }
}

async function run() {
    await simulateSupply(POOL_CDC7, 'CDC7 (New Pool)');
    await simulateSupply(POOL_CDKC, 'CDKC (Old Pool)');
}

run();
