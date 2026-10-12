import { body, param, query, type ValidationChain } from 'express-validator';

/** ตรวจ checksum เลขบัตรประชาชนไทย 13 หลัก */
function isThaiCitizenId(value: string): boolean {
  const d = value.replace(/\D/g, '');
  if (d.length !== 13) return false;
  const sum = Array.from(d.slice(0, 12)).reduce((acc, n, i) => acc + Number(n) * (13 - i), 0);
  return (11 - (sum % 11)) % 10 === Number(d[12]);
}

const piiFields = (optional: boolean): ValidationChain[] => {
  const required = (chain: ValidationChain) => (optional ? chain.optional() : chain);
  return [
    required(body('firstName')).isString().trim().notEmpty().isLength({ max: 100 }),
    required(body('lastName')).isString().trim().notEmpty().isLength({ max: 100 }),
    required(body('email')).isString().trim().isEmail(),
    body('citizenId').optional({ values: 'falsy' }).isString().custom(isThaiCitizenId).withMessage('เลขบัตรประชาชนไม่ถูกต้อง'),
    body('phone')
      .optional({ values: 'falsy' })
      .isString()
      .matches(/^[\d\s+-]{9,15}$/),
    body('address').optional({ values: 'falsy' }).isString().isLength({ max: 500 }),
    body('healthNote').optional({ values: 'falsy' }).isString().isLength({ max: 1000 }),
  ];
};

function list(): ValidationChain[] {
  return [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 100 }),
    query('search').optional().isString(),
    query('desc').optional().isIn(['true', 'false']),
  ];
}

function getById(): ValidationChain[] {
  return [param('id').isMongoId(), query('reveal').optional().isIn(['true', 'false']), query('reason').optional().isString().isLength({ max: 300 })];
}

function byId(): ValidationChain[] {
  return [param('id').isMongoId()];
}

function create(): ValidationChain[] {
  return piiFields(false);
}

function update(): ValidationChain[] {
  return [param('id').isMongoId(), ...piiFields(true)];
}

function remove(): ValidationChain[] {
  return [param('id').isMongoId(), body('reason').isString().trim().notEmpty().isLength({ max: 300 })];
}

export default { list, getById, byId, create, update, remove };
