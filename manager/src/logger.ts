import log4js from 'log4js';

const loggerConfig: log4js.Configuration = {
    appenders: {
        common: {
            type: 'file',
            filename: './logs/manager.log',
        },
        db: {
            type: 'file',
            filename: './logs/db.log',
        },
        commonErrors: {
            type: 'file',
            filename: './logs/manager-error.log',
        },
        externalHttpErrors: {
            type: 'file',
            filename: './logs/external-http-error.log',
        },
        externalHttp: {
            type: 'file',
            filename: './logs/external-http.log',
        },
    },
    categories: {
        default: { appenders: ['common'], level: 'debug' },
        commonErrors: { appenders: ['commonErrors', 'common'], level: 'error' },
        db: { appenders: ['db'], level: 'debug' },
        externalHttp: { appenders: ['externalHttp'], level: 'info' },
        externalHttpErrors: {
            appenders: ['externalHttpErrors', 'externalHttp'],
            level: 'error',
        },
    },
};
const loggerManager = log4js.configure(loggerConfig);
const logger = loggerManager.getLogger();
const errorLogger = loggerManager.getLogger('commonErrors');
const dbLoger = loggerManager.getLogger('db');

export { loggerManager, logger, errorLogger, dbLoger };
