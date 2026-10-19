import express from 'express';
import controllers from '@/controllers/user';
import consentControllers from '@/controllers/consent';
import middleware from '@/middleware';
import validate from './validation';

const routers = express.Router();

routers.get('/', validate.list(), middleware.validationHandler, controllers.list);
routers.post('/', validate.create(), middleware.validationHandler, controllers.create);
routers.get('/:id', validate.getById(), middleware.validationHandler, controllers.get);
routers.get('/:id/export', validate.byId(), middleware.validationHandler, controllers.exportData);
routers.get('/:id/consent', validate.byId(), middleware.validationHandler, consentControllers.getUser);
routers.post('/:id/consent', validate.recordConsent(), middleware.validationHandler, consentControllers.recordUser);
routers.put('/:id',validate.update(), middleware.validationHandler, controllers.update);
routers.delete('/:id', validate.remove(), middleware.validationHandler, controllers.remove);

export default routers;
