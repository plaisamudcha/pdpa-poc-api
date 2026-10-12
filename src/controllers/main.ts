const httpStatusCodes = {
  OK: 200,
  Created: 201,
  BadRequest: 400,
  Unauthorized: 401,
  Forbidden: 403,
  NotFound: 404,
  Conflict: 409,
  ValidationFailed: 422,
  InternalServerError: 500,
} as const;

const statusCodes = {
  OK: 200000,
  BadRequest: 400000,
  Unauthorized: 401000,
  Forbidden: 403000,
  NotFound: 404000,
  Conflict: 409000,
  InternalServerError: 500000,
};

const errRes = {
  DATA_NOT_FOUND: (body: { message: string }, statusCode: number = statusCodes.NotFound) => ({
    code: 404,
    status: statusCode,
    errors: body,
    payload: null,
  }),
  INTERNAL_SERVER_ERROR: (body: { message: string }, statusCode: number = statusCodes.InternalServerError) => ({
    code: 500,
    status: statusCode,
    errors: body,
    payload: null,
  }),
  BAD_REQUEST: (body: { message: string; code?: string }, statusCode: number = statusCodes.BadRequest) => ({
    code: 400,
    status: statusCode,
    errors: body,
    payload: null,
  }),
  UNAUTHORIZED: (body: { message: string }, statusCode: number = statusCodes.Unauthorized) => ({
    code: 401,
    status: statusCode,
    errors: body,
    payload: null,
  }),
  ACCESS_DENIED: (body: { message: string }, statusCode: number = statusCodes.Forbidden) => ({
    code: 403,
    status: statusCode,
    errors: body,
    payload: null,
  }),
  CONFLICT: (body: { message: string }, statusCode: number = statusCodes.Conflict) => ({
    code: 409,
    status: statusCode,
    errors: body,
    payload: null,
  }),
};

function successRes<T>(payload: T): ISuccess<T> {
  return {
    code: httpStatusCodes.OK,
    status: statusCodes.OK,
    errors: null,
    payload,
  };
}

const config = {
  defaultPage: 1,
  maxLimit: 10,
};

export { httpStatusCodes, errRes, successRes, config };
