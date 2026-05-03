#!/usr/bin/env ts-node

/**
 * Add API Key Script
 *
 * This script creates a new API key with custom settings
 * Usage: npm run add-apikey [name]
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Load environment variables
dotenv.config();

// Import models
import { ApiKey } from '@/database/models/ApiKey';

const MONGODB_URI = process.env['MONGODB_URI'] || 'mongodb://localhost:27017/notification-service';

async function connectToDatabase() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');
    } catch (error) {
        console.error('❌ Failed to connect to MongoDB:', error);
        process.exit(1);
    }
}

function generateApiKey(): string {
    const prefix = 'ak_';
    const randomBytes = crypto.randomBytes(16).toString('hex');
    return `${prefix}${randomBytes}`;
}

async function createApiKey(name?: string, customKey?: string) {
    const apiKeyName = name || `API Key ${new Date().toISOString()}`;

    try {
        // Use provided key or generate a secure API key
        const plainKey = customKey || generateApiKey();
        const keyHash = await bcrypt.hash(plainKey, 12);

        // Calculate expiration date (1000 years from now, essentially never)
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1000);

        // All available permissions
        const permissions = [
            'whatsapp:send',
            'telegram:send',
            'mattermost:send',
            'messages:read',
            'status:read'
        ];

        const apiKey = new ApiKey({
            name: apiKeyName,
            key: plainKey.substring(0, 8) + '...', // Store partial key for display
            keyHash,
            permissions,
            isActive: true,
            rateLimit: {
                requests: 10000, // 10,000 requests
                windowMs: 3600000 // per hour (1 hour in ms)
            },
            expiresAt, // 1000 years from now
            usageCount: 0
        });

        await apiKey.save();

        console.log('\n✅ API Key created successfully!\n');
        console.log('📋 API Key Details:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Name:         ${apiKey.name}`);
        console.log(`   ID:           ${apiKey._id}`);
        console.log(`   Rate Limit:   ${apiKey.rateLimit.requests} requests/hour`);
        console.log(`   Permissions:  ${permissions.join(', ')}`);
        console.log(`   Expires:      ${apiKey.expiresAt?.toISOString()} (Never)`);
        console.log(`   Status:       ${apiKey.isActive ? 'Active' : 'Inactive'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n🔑 IMPORTANT - Save this API key securely:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\n   ${plainKey}\n`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n⚠️  This is the only time you will see the full API key!');
        console.log('   Store it securely - it cannot be recovered later.\n');

        return { apiKey, plainKey };
    } catch (error) {
        console.error('❌ Failed to create API key:', error);
        throw error;
    }
}

async function displayExistingKeys() {
    try {
        const apiKeys = await ApiKey.find({}).sort({ createdAt: -1 });

        if (apiKeys.length === 0) {
            console.log('\nℹ️  No existing API keys found.');
            return;
        }

        console.log(`\n📊 Existing API Keys (${apiKeys.length}):`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        apiKeys.forEach((key, index) => {
            const status = key.isActive ? '🟢 Active' : '🔴 Inactive';
            const expired = key.expiresAt && key.expiresAt < new Date() ? ' (EXPIRED)' : '';
            console.log(`\n${index + 1}. ${key.name} ${status}${expired}`);
            console.log(`   ID:          ${key._id}`);
            console.log(`   Key Preview: ${key.key}`);
            console.log(`   Rate Limit:  ${key.rateLimit.requests} req/hour`);
            console.log(`   Usage:       ${key.usageCount} requests`);
            console.log(`   Created:     ${key.createdAt.toISOString()}`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
        console.error('❌ Failed to display existing keys:', error);
    }
}

async function main() {
    console.log('🔑 API Key Generator\n');

    await connectToDatabase();

    try {
        // Get arguments from command line
        const args = process.argv.slice(2);
        const nameArg = args.find(arg => !arg.startsWith('--') && !arg.startsWith('ak_'));
        const keyArg = args.find(arg => arg.startsWith('ak_'));

        if (args.includes('--list') || args.includes('-l')) {
            await displayExistingKeys();
        } else {
            await createApiKey(nameArg, keyArg);

            // Show all keys if requested
            if (args.includes('--show-all')) {
                await displayExistingKeys();
            }
        }

        console.log('\n✅ Operation completed successfully!');

    } catch (error) {
        console.error('❌ Operation failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB\n');
    }
}

// Handle script arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
🔑 API Key Generator Script

Usage: npm run add-apikey [name] [ak_xxxxx] [options]

Arguments:
  name                   Optional name for the API key
  ak_xxxxx              Optional custom API key (must start with 'ak_')

Options:
  --list, -l            List all existing API keys
  --show-all            Show all API keys after creating new one
  --help, -h            Show this help message

Examples:
  npm run add-apikey                                    # Create with auto-generated name and key
  npm run add-apikey "Production API"                   # Create with custom name
  npm run add-apikey ak_4b2eee5433ba901033f5a741ca48c452  # Create with custom key
  npm run add-apikey "Production" ak_custom123          # Create with custom name and key
  npm run add-apikey --list                             # List all existing keys
  npm run add-apikey "Mobile App" --show-all            # Create and show all keys

API Key Configuration:
  - Rate Limit: 10,000 requests per hour
  - Expiration: Never (1000 years)
  - Permissions: All (whatsapp:send, telegram:send, mattermost:send, messages:read, status:read)
  - Status: Active
`);
    process.exit(0);
}

// Run the script
main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});
