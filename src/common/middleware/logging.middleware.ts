import { Inject, Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger;
  use(req: Request, res: Response, next: NextFunction) {
    const route = req.originalUrl;

    // todo req 전문 찍자
    const reqFormat = `[REQ] ${req.method} ${route}`;
    this.logger.http(reqFormat);
    next();
  }
}
