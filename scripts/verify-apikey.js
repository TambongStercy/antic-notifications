const mongoose = require('mongoose');

const run = async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  const ApiKey = mongoose.model('ApiKey', new mongoose.Schema({
    name: String,
    key: String,
    keyHash: String,
    permissions: [String],
    isActive: Boolean,
    rateLimit: { requests: Number, windowMs: Number },
    expiresAt: Date,
    usageCount: Number,
    lastUsed: Date,
    createdAt: Date,
    updatedAt: Date
  }, { timestamps: true }));

  const keys = await ApiKey.find({});

  console.log('\n📊 All API Keys in Database:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  keys.forEach((k, i) => {
    console.log((i + 1) + '. ' + k.name);
    console.log('   ID: ' + k._id);
    console.log('   Key Preview: ' + k.key);
    console.log('   Rate Limit: ' + k.rateLimit.requests + ' req/hour');
    console.log('   Permissions: ' + k.permissions.join(', '));
    console.log('   Active: ' + k.isActive);
    console.log('   Expires: ' + (k.expiresAt ? k.expiresAt.toISOString().split('T')[0] : 'Never'));
    console.log('   Usage: ' + k.usageCount + ' requests');
    console.log('');
  });

  await mongoose.disconnect();
};

run().catch(console.error);
