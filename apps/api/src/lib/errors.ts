export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function badRequest(message: string, code?: string) {
  return new AppError(400, message, code ?? 'BAD_REQUEST');
}

export function unauthorized(message = 'Unauthorized') {
  return new AppError(401, message, 'UNAUTHORIZED');
}

export function forbidden(message = 'Forbidden') {
  return new AppError(403, message, 'FORBIDDEN');
}

export function notFound(message = 'Resource not found') {
  return new AppError(404, message, 'NOT_FOUND');
}

export function conflict(message: string) {
  return new AppError(409, message, 'CONFLICT');
}
