#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 WhatsApp Connection Recovery Script');
console.log('=====================================');

// Configuration
const SESSION_PATH = path.join(__dirname, '..', 'sessions', 'whatsapp');
const CACHE_PATH = path.join(__dirname, '..', '.wwebjs_cache');

async function killChromeProcesses() {
    console.log('🔪 Killing Chrome processes...');
    
    try {
        if (process.platform === 'win32') {
            execSync('taskkill /f /im chrome.exe /t', { stdio: 'ignore' });
            execSync('taskkill /f /im chromium.exe /t', { stdio: 'ignore' });
        } else {
            execSync('pkill -f chrome', { stdio: 'ignore' });
            execSync('pkill -f chromium', { stdio: 'ignore' });
        }
        console.log('✅ Chrome processes killed');
    } catch (error) {
        console.log('ℹ️  No Chrome processes found or already killed');
    }
}

async function cleanupSessionFiles() {
    console.log('🧹 Cleaning up session files...');
    
    const pathsToClean = [SESSION_PATH, CACHE_PATH];
    
    for (const cleanPath of pathsToClean) {
        if (fs.existsSync(cleanPath)) {
            try {
                console.log(`   Removing: ${cleanPath}`);
                fs.rmSync(cleanPath, { recursive: true, force: true });
                console.log(`   ✅ Removed: ${cleanPath}`);
            } catch (error) {
                console.log(`   ⚠️  Could not remove ${cleanPath}:`, error.message);
                
                // Try to rename instead
                try {
                    const backupPath = `${cleanPath}_backup_${Date.now()}`;
                    fs.renameSync(cleanPath, backupPath);
                    console.log(`   📁 Renamed to: ${backupPath}`);
                } catch (renameError) {
                    console.log(`   ❌ Could not even rename: ${renameError.message}`);
                }
            }
        } else {
            console.log(`   ℹ️  Path does not exist: ${cleanPath}`);
        }
    }
}

async function createFreshDirectories() {
    console.log('📁 Creating fresh directories...');
    
    const dirsToCreate = [
        path.dirname(SESSION_PATH),
        SESSION_PATH
    ];
    
    for (const dir of dirsToCreate) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(`   ✅ Created: ${dir}`);
        }
    }
}

async function checkPermissions() {
    console.log('🔐 Checking permissions...');
    
    try {
        const testFile = path.join(SESSION_PATH, 'test.tmp');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        console.log('   ✅ Write permissions OK');
    } catch (error) {
        console.log('   ❌ Permission issue:', error.message);
        return false;
    }
    
    return true;
}

async function main() {
    try {
        console.log('Starting WhatsApp connection recovery...\n');
        
        // Step 1: Kill Chrome processes
        await killChromeProcesses();
        
        // Step 2: Wait for processes to fully terminate
        console.log('⏳ Waiting for processes to terminate...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Step 3: Clean up session files
        await cleanupSessionFiles();
        
        // Step 4: Create fresh directories
        await createFreshDirectories();
        
        // Step 5: Check permissions
        const permissionsOK = await checkPermissions();
        
        console.log('\n🎉 Recovery completed!');
        console.log('=====================================');
        
        if (permissionsOK) {
            console.log('✅ All checks passed');
            console.log('🚀 You can now try connecting to WhatsApp again');
            console.log('');
            console.log('Next steps:');
            console.log('1. Restart your application');
            console.log('2. Try connecting to WhatsApp');
            console.log('3. Scan the QR code when it appears');
        } else {
            console.log('⚠️  Permission issues detected');
            console.log('Try running this script as administrator');
        }
        
    } catch (error) {
        console.error('❌ Recovery failed:', error.message);
        process.exit(1);
    }
}

// Run the recovery
main();