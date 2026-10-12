import z from 'zod/v4';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'qa', 'uat', 'production']).default('development'),
  HOST_API_PORT: z.coerce.number().default(3041),
  ALLOW_ORIGIN: z.string().default('http://localhost:5173'),
  // ต้องเป็น 'true' เมื่อ deploy บน HTTPS — ถ้าเป็น HTTP แล้วตั้ง true เบราว์เซอร์จะทิ้ง cookie และ login ไม่ได้
  COOKIE_SECURE: z.enum(['true', 'false']).default('false'),
  DATABASE_URL: z.string().min(1),
  KEK_CURRENT: z.string().default('v1'),
  BLIND_INDEX_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN_HOURS: z.coerce.number().positive().default(8),
  RETENTION_DAYS: z.coerce.number().int().positive().default(1825),
});

const env = envSchema.parse(Bun.env);

// KEK_V1, KEK_V2, ... → { v1: '<base64>', v2: '<base64>' }
const keks = Object.fromEntries(
  Object.entries(Bun.env)
    .map(([name, value]) => [/^KEK_(V\d+)$/.exec(name)?.[1]?.toLowerCase(), value] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[0] && entry[1]))
);

const config = {
  server: {
    NODE_ENV: env.NODE_ENV,
    HOST_API_PORT: env.HOST_API_PORT,
    ALLOW_ORIGIN: env.ALLOW_ORIGIN.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    COOKIE_SECURE: env.COOKIE_SECURE === 'true',
  },
  database: {
    DATABASE_URL: env.DATABASE_URL,
  },
  encryption: {
    KEKS: keks,
    KEK_CURRENT: env.KEK_CURRENT.toLowerCase(),
    BLIND_INDEX_KEY: env.BLIND_INDEX_KEY,
  },
  auth: {
    JWT_SECRET: env.JWT_SECRET,
    JWT_EXPIRES_IN_HOURS: env.JWT_EXPIRES_IN_HOURS,
    COOKIE_NAME: 'pdpa_poc_token',
    // ใส่รหัสผิดเกินกี่ครั้งถึงล็อกบัญชี และล็อกนานเท่าไร
    MAX_FAILED_LOGIN: 5,
    LOCK_MINUTES: 15,
  },
  pdpa: {
    RETENTION_DAYS: env.RETENTION_DAYS,
  },
};

export default config;
