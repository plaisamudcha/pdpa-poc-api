import mongoose from 'mongoose';
import config from '@/config';

/** host/db ที่จะต่อ (ไม่แสดง username/password) — log ไว้ให้เห็นชัดว่าต่อ DB ตัวไหน */
export function describeMongoUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.host}${u.pathname}`;
  } catch {
    return '(invalid DATABASE_URL)';
  }
}

mongoose.connection.on('error', (error: unknown) => {
  console.log(`\x1b[31merror!!\x1b[0m Error in MongoDb connection: ${error}`);
});
mongoose.connection.on('connected', () => {
  console.log(`\x1b[32minfo\x1b[0m Mongoose is connected to ${describeMongoUrl(config.database.DATABASE_URL)}`);
});
mongoose.connection.on('disconnected', () => {
  console.log('\x1b[33mwarning\x1b[0m Mongoose is disconnected');
});

try {
  await mongoose.connect(config.database.DATABASE_URL, {
    serverSelectionTimeoutMS: 5000,
  });
} catch (error) {
  console.error('Error connecting to MongoDB:', error);
  process.exit(1);
}
