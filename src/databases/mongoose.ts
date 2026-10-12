import config from '@/config';
import mongoose from 'mongoose';

export async function initMongo() {
  if (mongoose.connection.readyState === 1) return;

  await mongoose.connect(config.database.DATABASE_URL, {
    serverSelectionTimeoutMS: 5000,
  });
}

export default mongoose;
