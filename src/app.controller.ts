import { Controller, Get, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { Logger as WinstonLogger } from 'winston';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: WinstonLogger,
  ) {}

  @Get()
  getHello(): string {
    this.logger.error('error: ');
    this.logger.warn('warn: ');
    this.logger.info('info: ');
    this.logger.http('http: ');
    this.logger.verbose('verbose: ');
    this.logger.debug('debug: ');
    this.logger.silly('silly: ');
    return this.appService.getHello();
  }
}
