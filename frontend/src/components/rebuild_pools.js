const fs = require('fs');
const { execSync } = require('child_process');

const filePath = 'd:/TheAnhProject/UdonFi/frontend/src/components/PoolsPage.tsx';

// Get the original content from git HEAD
const originalContent = execSync('git show HEAD:frontend/src/components/PoolsPage.tsx', {
    cwd: 'd:/TheAnhProject/UdonFi',
    encoding: 'utf8',
    maxBuffer: 1024 * 1024 * 10
});

const lines = originalContent.split('\n');
console.log('Original lines:', lines.length);

// Step 1: Fix imports (replace lines 1-26)
const newImports = `import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Activity, 
    TrendingUp, 
    Database, 
    Cpu, 
    ShieldAlert, 
    RefreshCw, 
    Layers, 
    Zap, 
    Sparkles
} from 'lucide-react';
import type { Reserve, Web3Tx, LiqSandbox } from '../types/lending';
import { AnimateNumber } from './AnimateNumber';
import { TokenFlowLedger } from './TokenFlowLedger';`;

// Step 2: Remove ledger states (lines 61-71 in original: searchTerm, filterType, etc.)
// Step 3: Remove filtering/pagination/telemetry logic (lines 132-188)
// Step 4: Replace lines 1217-2222 with proper closing + TokenFlowLedger

// Work with 0-indexed
let result = [];

// Lines 0-25 (imports) -> replace with new imports
result.push(newImports);

// Lines 26-55 (interface + component start + first 3 states) -> keep as-is
for (let i = 25; i <= 58; i++) result.push(lines[i]);

// Lines 59 (copiedTxId) keep
// Line 60-70 skip (ledger states + useEffect for expandedTxId)
// Keep line 59 (usdcPulse) - it's already at index 59

// Lines 60-70: skip ledger-specific states
// Lines 71-131: keep (flow pulse effect + stats + currentTvl)
for (let i = 68; i <= 130; i++) result.push(lines[i]);

// Lines 131: after currentTvl declaration
// Lines 132-188: skip (filtering/pagination/telemetry logic - moved to TokenFlowLedger)

// Lines 189-1216: keep (TVL chart, reserves grid, APY curve, curve params)
for (let i = 189; i <= 1216; i++) result.push(lines[i]);

// Lines 1217-2222: skip (entire inline ledger code)
// Instead, add proper closing of curve params + TokenFlowLedger
result.push('                                </div>');
result.push('                            </div>');
result.push('                        </div>');
result.push('                    </div>');
result.push('                </div>');
result.push('            </div>');
result.push('');
result.push('                {/* Token Flow Ledger (extracted component) */}');
result.push('                <TokenFlowLedger txHistory={txHistory} reserves={reserves} />');
result.push('');

// Lines 2223-end: keep (Liquidation Sandbox + closing)
for (let i = 2223; i < lines.length; i++) result.push(lines[i]);

const newContent = result.join('\n');
fs.writeFileSync(filePath, newContent, 'utf8');
console.log('New file lines:', newContent.split('\n').length);
console.log('Written successfully with proper UTF-8 encoding');
