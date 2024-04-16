import winston from 'winston';
const { combine, timestamp, prettyPrint } = winston.format;

const apiLogger = winston.createLogger({
    level: 'info',
    format: combine(timestamp(), prettyPrint()),
    transports: [
        new winston.transports.File({ filename: './logs/api-error.log', level: 'error' }),
        new winston.transports.File({ filename: './logs/api-info.log' }),
    ],
});

const taskLogger = winston.createLogger({
    level: 'info',
    format: combine(timestamp(), prettyPrint()),
    transports: [
        new winston.transports.File({ filename: './logs/task-info.log', options: { flags: 'as' } }),
    ],
});

export { apiLogger, taskLogger };
