import log4js from 'log4js';

const loggerConfig: log4js.Configuration = {
    appenders: {
        common: {
            type: 'file',
            filename: './logs/manager.log',
        },
        internalHttpErrors: {
            type: 'file',
            filename: './logs/internal-http-error.log',
        },
        internalHttp: {
            type: 'file',
            filename: './logs/internal-http.log',
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
        internalHttp: { appenders: ['internalHttp', 'common'], level: 'info' },
        internalHttpErrors: { appenders: ['internalHttpErrors', 'internalHttp', 'common'], level: 'error' },
        externalHttp: { appenders: ['externalHttp', 'common'], level: 'info' },
        externalHttpErrors: { appenders: ['externalHttpErrors', 'externalHttp', 'common'], level: 'error' },
    },
};
const loggerManager = log4js.configure(loggerConfig);
const logger = loggerManager.getLogger();

export { loggerManager, logger };
