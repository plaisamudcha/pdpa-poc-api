import express from 'express';
import middleware from '@/middleware';
import authRoute from './auth';
import userRoute from './user';
import auditLogRoute from './auditLog';
import consentDocumentRoute from './consentDocument';

const routes = express.Router();

routes.use('/auth', authRoute);
routes.use('/user', middleware.authentication, userRoute);
routes.use('/audit-log', middleware.authentication, auditLogRoute);
routes.use('/consent-document', middleware.authentication, consentDocumentRoute);

export default routes;
