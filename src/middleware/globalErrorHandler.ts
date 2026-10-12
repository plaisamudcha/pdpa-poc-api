import type { NextFunction, Request, Response } from 'express';
import { errRes } from '@/controllers/main';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function globalErrorHandler(error: Error, req: Request, res: Response, next: NextFunction): void {
  console.error('Unhandled error:', error.name, error.message);
  res.status(500).json(errRes.INTERNAL_SERVER_ERROR({ message: 'Internal Server Error' }));
}

export default globalErrorHandler;
