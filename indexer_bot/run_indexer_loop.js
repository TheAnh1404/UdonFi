const { spawn } = require('child_process');

function run() {
    console.log("🚀 Starting Indexer Bot process...");
    
    // Spawn index.js in a child process, inherited stdio for console logging
    const child = spawn('node', ['index.js'], { stdio: 'inherit' });

    child.on('close', (code) => {
        console.log(`⚠️ Indexer process exited with code ${code}. Re-spawning in 2 seconds...`);
        setTimeout(run, 2000);
    });
}

run();
