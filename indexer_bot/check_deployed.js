const { rpc, Contract, Address, nativeToScVal, TransactionBuilder, Networks, Account, Keypair } = require('@stellar/stellar-sdk');

const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);

const POOL_CDC7 = 'CDC7IHZSUWN47NVQSQ6PLW7XWIG4RLIGIIMSC47IYGQ5YYQRPPKAEXU4';
const POOL_CDKC = 'CDKCL2V7S4ELV7ZYLWSDQLVCVS77GO5CBN6AF5Y42FCM2TPCCLFOEPL3';

async function checkPool(poolId, label) {
    console.log(`\n🔍 Checking Pool Contract [${label}]: ${poolId}`);
    try {
        const poolContract = new Contract(poolId);
        
        // Let's do a simulation of get_reserve_info for XLM
        // XLM asset address: CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC
        const xlmAsset = 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC';
        const operation = poolContract.call('get_reserve_info', nativeToScVal(Address.fromString(xlmAsset)));
        
        const sourceKeypair = Keypair.random();
        const sourceAccount = new Account(sourceKeypair.publicKey(), '0');
        const tx = new TransactionBuilder(sourceAccount, {
            fee: '100',
            networkPassphrase: Networks.TESTNET
        })
        .addOperation(operation)
        .setTimeout(30)
        .build();
        
        console.log(`Simulating get_reserve_info on ${label}...`);
        const sim = await server.simulateTransaction(tx);
        if (rpc.Api.isSimulationSuccess(sim)) {
            console.log(`✅ Simulation Success on ${label}!`);
            console.log('Result raw:', JSON.stringify(sim.result, null, 2));
        } else {
            console.error(`❌ Simulation Failed on ${label}:`, sim.error || (sim.result && sim.result.retval));
            if (sim.events) {
                console.log('Events:', sim.events.map(ev => ev.event.type + ': ' + ev.event.contractId).join('\n'));
            }
        }
    } catch (err) {
        console.error(`Error checking pool ${label}:`, err.message);
    }
}

async function run() {
    await checkPool(POOL_CDC7, 'CDC7 (Newly deployed?)');
    await checkPool(POOL_CDKC, 'CDKC (Old pool)');
}

run();
