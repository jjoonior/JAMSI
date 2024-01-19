import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Catch()
export class CommonExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}
  catch(exception: Error, host: ArgumentsHost) {
    try {
      const response = host.switchToHttp().getResponse<Response>();
      const status = HttpStatus.INTERNAL_SERVER_ERROR;

      response.status(status).json({
        statusCode: status,
        message: 'INTERNAL_SERVER_ERROR',
      });
    } catch (e) {
      this.logger.error(e.stack);
    } finally {
      // stack의 길이가 너무 길지 않도록 5줄로 제한하여 저장
      const errorStack = exception.stack.split('\n').slice(0, 5).join('\n');
      this.logger.error(errorStack);
    }
  }
}
