import type { RequestHandler } from 'express';
import cors, { type CorsOptions } from 'cors';
import config from '@/config';

const corsOption: CorsOptions = {
  origin: config.server.ALLOW_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type'],
  // ต้องเปิดเพื่อให้เบราว์เซอร์ส่ง cookie ของ login มาด้วย
  credentials: true,
  maxAge: 3600,
};

const corsMiddleware = cors(corsOption) as RequestHandler;

export default corsMiddleware;
