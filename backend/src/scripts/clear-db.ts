import mongoose from 'mongoose';
import { models } from '../models/index.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/infinia';

async function clearDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    console.log('\nClearing all collections...\n');

    for (const [name, model] of Object.entries(models)) {
      const count = await model.countDocuments();
      if (count > 0) {
        await model.deleteMany({});
        console.log(`  ✓ Cleared ${name}: ${count} documents deleted`);
      } else {
        console.log(`  - ${name}: already empty`);
      }
    }

    console.log('\n✅ Database cleared successfully!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
