import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCodeValue } from './error-codes';

export class BusinessException extends HttpException {
  constructor(
    readonly code: ErrorCodeValue,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}
