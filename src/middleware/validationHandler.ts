import type { NextFunction, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { httpStatusCodes } from '@/controllers/main';

function validationHandler(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req).mapped();

  if (Object.keys(errors).length !== 0) {
    // ไม่ log ค่าที่ส่งมา (value) เพราะอาจเป็นข้อมูลส่วนบุคคล
    const safeErrors = Object.fromEntries(Object.entries(errors).map(([key, { msg }]) => [key, { msg }]));

    res.status(httpStatusCodes.ValidationFailed).json({ message: 'validate error', errors: safeErrors });
    return;
  }
  next();
}

export default validationHandler;
