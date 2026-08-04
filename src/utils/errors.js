class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
  }
}

function badRequest(message, code = 'BAD_REQUEST') {
  return new AppError(message, 400, code);
}

function unauthorized(message = 'Unauthorized', code = 'UNAUTHORIZED') {
  return new AppError(message, 401, code);
}

function forbidden(message = 'Forbidden', code = 'FORBIDDEN') {
  return new AppError(message, 403, code);
}

function notFound(message = 'Resource not found', code = 'NOT_FOUND') {
  return new AppError(message, 404, code);
}

function conflict(message, code = 'CONFLICT') {
  return new AppError(message, 409, code);
}

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
};
