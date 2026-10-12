import express from 'express';
import middleware from '@/middleware';
import authRoute from './auth';
import userRoute from './user';
import auditLogRoute from './auditLog';

const routes = express.Router();

routes.use('/auth', authRoute);
routes.use('/user', middleware.authentication, userRoute);
routes.use('/audit-log', middleware.authentication, auditLogRoute);

export default routes;
