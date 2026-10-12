import '@/databases/mongo';
import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import config from '@/config/index';
import middleware from '@/middleware';
import routes from '@/routers/index';
import startRetentionJob from '@/jobs/retention';

const app = express();
const { HOST_API_PORT } = config.server;

app.use(middleware.cors);
app.use(helmet());
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));

if (config.server.NODE_ENV !== 'production') {
  // log แค่ method/path/status — ไม่ log body หรือ query string (คำค้นอาจเป็นอีเมล/เลขบัตร)
  morgan.token('path', (req: express.Request) => req.originalUrl.split('?')[0]);
  app.use(morgan(':method :path :status :response-time ms'));
}

app.get('/', (req, res) => {
  res.send('pdpa-poc-api');
});

app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({
    message: 'Not Found',
  });
});

app.use(middleware.globalErrorHandler);

app.listen(HOST_API_PORT, () => {
  console.log(`listening on port ${HOST_API_PORT}`);
});

startRetentionJob();
