import log4js from 'log4js';

const loggerConfig: log4js.Configuration = {
    appenders: {
        common: {
            type: 'file',
            filename: './logs/worker.log',
        },
        httpErrors: {
            type: 'file',
            filename: './logs/http-error.log',
        },
        http: {
            type: 'file',
            filename: './logs/http.log',
        },
        task: {
            type: 'multiFile',
            base: './logs/task',
            property: 'requestId',
            extension: '.log',
        },
    },
    categories: {
        default: { appenders: ['common'], level: 'debug' },
        http: { appenders: ['http', 'common'], level: 'info' },
        httpErrors: { appenders: ['httpErrors', 'http', 'common'], level: 'error' },
        task: { appenders: ['task'], level: 'info' },
    },
};
const loggerManager = log4js.configure(loggerConfig);

const httpLogger = loggerManager.getLogger('http');
const httpErrorsLogger = loggerManager.getLogger('httpErrors');
const taskLogger = loggerManager.getLogger('task');

export { loggerManager, httpErrorsLogger, httpLogger, taskLogger };
