import winston from 'winston';
import winstonDaily from 'winston-daily-rotate-file';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6,
};

const dailyOption = (level: string) => {
  return {
    level,
    datePattern: 'YYYY-MM-DD',
    dirname: `./logs/${level}`,
    filename: `%DATE%.${level}.log`,
    maxFiles: 7,
    zippedArchive: true,
  };
};

const printFormat = (info) =>
  `[${process.env.APP_NAME}] ${info.level.padEnd(7, ' ')} [${info.timestamp}] ${
    info.message
  }`;

export const winstonConfig = () => ({
  levels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(printFormat),
  ),
  transports: [
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'http' : 'silly',
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(printFormat),
      ),
    }),
    new winstonDaily(dailyOption('error')),
    // new winstonDaily(dailyOption('warn')),
    // new winstonDaily(dailyOption('info')),
  ],
});
