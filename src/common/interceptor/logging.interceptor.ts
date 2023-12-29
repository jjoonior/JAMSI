import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();

    const route = req.originalUrl;
    const date = new Date();

    // todo req 전문 찍자
    const reqFormat = `[REQ] ${req.method} ${route}`;
    this.logger.http(reqFormat);

    const resFormat = (statusCode) => {
      return `[RES] ${req.method} ${route} ${statusCode} ${
        new Date().getMilliseconds() - date.getMilliseconds()
      } ms`;
    };

    return next.handle().pipe(
      tap(() => {
        this.logger.info(resFormat(res.statusCode));
      }),
      catchError((e) => {
        if (!e.status || e.status >= 500) {
          this.logger.error(resFormat(e.status || 500));
        } else {
          this.logger.warn(resFormat(e.status));
        }
        return throwError(e);
      }),
    );
  }
}
