#!/usr/bin/env ts-node

/**
 * Database Initialization Script
 * 
 * This script populates the database with:
 * - Default admin user
 * - Default service statuses
 * - Sample messages (optional)
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Import models
import { AdminUser } from '../src/database/models/AdminUser';
import { ServiceStatus } from '../src/database/models/ServiceStatus';
import { Message } from '../src/database/models/Message';

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

async function createDefaultAdmin() {
    const username = process.env['ADMIN_USERNAME'] || 'admin';
    const password = process.env['ADMIN_PASSWORD'] || 'admin123';

    try {
        // Check if admin already exists
        const existingAdmin = await AdminUser.findOne({ username });

        if (existingAdmin) {
            console.log(`ℹ️  Admin user '${username}' already exists`);
            return existingAdmin;
        }

        // Create new admin user
        // Note: The password will be automatically hashed by the model's pre-save middleware
        const admin = new AdminUser({
            username,
            passwordHash: password, // This will be hashed by pre-save middleware
            role: 'admin',
            createdAt: new Date()
        });

        await admin.save();
        console.log(`✅ Created admin user: ${username}`);
        console.log(`🔑 Admin password: ${password}`);

        return admin;
    } catch (error) {
        console.error('❌ Failed to create admin user:', error);
        throw error;
    }
}

async function initializeServiceStatuses() {
    const services = ['whatsapp', 'telegram'];

    for (const service of services) {
        try {
            const existingStatus = await ServiceStatus.findOne({ service });

            if (existingStatus) {
                console.log(`ℹ️  Service status for '${service}' already exists`);
                continue;
            }

            const serviceStatus = new ServiceStatus({
                service,
                status: 'not_configured',
                lastUpdated: new Date(),
                metadata: {}
            });

            await serviceStatus.save();
            console.log(`✅ Initialized ${service} service status`);
        } catch (error) {
            console.error(`❌ Failed to initialize ${service} service:`, error);
        }
    }
}

async function createSampleMessages(count: number = 10) {
    try {
        const existingMessages = await Message.countDocuments();

        if (existingMessages > 0) {
            console.log(`ℹ️  Database already contains ${existingMessages} messages`);
            return;
        }

        const sampleMessages: any[] = [];
        const services = ['whatsapp', 'telegram'] as const;
        const statuses = ['sent', 'failed', 'pending'] as const;

        for (let i = 0; i < count; i++) {
            const service = services[Math.floor(Math.random() * services.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];

            const recipient = service === 'whatsapp'
                ? `+237${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`
                : `@user${i + 1}`;

            const messageData = {
                service,
                recipient,
                message: `Sample ${service} message #${i + 1}`,
                status,
                timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
                messageId: status === 'sent' ? `${service}_${Date.now()}_${i}` : undefined,
                errorMessage: status === 'failed' ? 'Sample error message' : undefined,
                metadata: {
                    source: 'sample-data',
                    campaign: 'initialization'
                }
            };

            sampleMessages.push(messageData);
        }

        await Message.insertMany(sampleMessages);
        console.log(`✅ Created ${count} sample messages`);
    } catch (error) {
        console.error('❌ Failed to create sample messages:', error);
    }
}

async function createIndexes() {
    try {
        // Create indexes for better query performance
        await AdminUser.createIndexes();
        await ServiceStatus.createIndexes();
        await Message.createIndexes();
        console.log('✅ Database indexes created');
    } catch (error) {
        console.error('❌ Failed to create indexes:', error);
    }
}

async function displayDatabaseStats() {
    try {
        const adminCount = await AdminUser.countDocuments();
        const serviceCount = await ServiceStatus.countDocuments();
        const messageCount = await Message.countDocuments();

        console.log('\n📊 Database Statistics:');
        console.log(`   Admin Users: ${adminCount}`);
        console.log(`   Service Statuses: ${serviceCount}`);
        console.log(`   Messages: ${messageCount}`);

        // Show message stats by service and status
        const messageStats = await Message.aggregate([
            {
                $group: {
                    _id: { service: '$service', status: '$status' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id.service': 1, '_id.status': 1 }
            }
        ]);

        if (messageStats.length > 0) {
            console.log('\n📈 Message Statistics:');
            messageStats.forEach(stat => {
                console.log(`   ${stat._id.service} - ${stat._id.status}: ${stat.count}`);
            });
        }
    } catch (error) {
        console.error('❌ Failed to get database stats:', error);
    }
}

async function main() {
    console.log('🚀 Starting database initialization...\n');

    await connectToDatabase();

    try {
        // Initialize core data
        await createDefaultAdmin();
        await initializeServiceStatuses();
        await createIndexes();

        // Ask user if they want sample data
        const createSamples = process.argv.includes('--samples') || process.argv.includes('-s');

        if (createSamples) {
            const sampleCount = parseInt(process.argv.find(arg => arg.startsWith('--count='))?.split('=')[1] || '10');
            await createSampleMessages(sampleCount);
        }

        await displayDatabaseStats();

        console.log('\n✅ Database initialization completed successfully!');
        console.log('\n🔗 You can now:');
        console.log('   1. Start the service: npm run start:dev');
        console.log('   2. Login with admin credentials');
        console.log('   3. Configure WhatsApp and Telegram services');
        console.log('   4. Start sending notifications!');

    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

// Handle script arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
📖 Database Initialization Script

Usage: npm run init-db [options]

Options:
  --samples, -s          Create sample messages
  --count=N              Number of sample messages to create (default: 10)
  --help, -h             Show this help message

Examples:
  npm run init-db                    # Basic initialization
  npm run init-db --samples          # With 10 sample messages
  npm run init-db -s --count=50      # With 50 sample messages
`);
    process.exit(0);
}

// Run the script
main().catch(error => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
});
