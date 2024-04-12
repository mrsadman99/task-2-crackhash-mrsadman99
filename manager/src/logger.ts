import winston from 'winston';

const createLogger = (errLogPath: string, infoLogPath: string) => winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: errLogPath, level: 'error' }),
        new winston.transports.File({ filename: infoLogPath }),
    ],
});

const internalLogger = createLogger('./logs/error-internal.log', './logs/info-internal.log');
const externalLogger = createLogger('./logs/error-external.log', './logs/info-external.log');

export { internalLogger, externalLogger };
