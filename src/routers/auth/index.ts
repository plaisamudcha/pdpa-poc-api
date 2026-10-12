import express from 'express';
import { body } from 'express-validator';
import controllers from '@/controllers/auth';
import middleware from '@/middleware';

const routers = express.Router();

routers.post(
  '/login',
  [body('username').isString().trim().notEmpty().isLength({ max: 50 }), body('password').isString().notEmpty().isLength({ max: 200 })],
  middleware.validationHandler,
  controllers.login
);
routers.post('/logout', middleware.authentication, controllers.logout);
routers.get('/me', middleware.authentication, controllers.me);

export default routers;
