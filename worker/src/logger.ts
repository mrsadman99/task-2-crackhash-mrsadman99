import log4js from 'log4js';

const loggerConfig: log4js.Configuration = {
    appenders: {
        common: {
            type: 'file',
            filename: './logs/worker.log',
        },
        commonErrors: {
            type: 'file',
            filename: './logs/worker-error.log',
        },
        task: {
            type: 'file',
            filename: './logs/task.log',
        },
    },
    categories: {
        default: { appenders: ['common'], level: 'debug' },
        defaultErrors: { appenders: ['commonErrors', 'common'], level: 'error' },
        task: { appenders: ['task', 'common'], level: 'info' },
    },
};
const loggerManager = log4js.configure(loggerConfig);

const logger = loggerManager.getLogger();
const errorLogger = loggerManager.getLogger('defaultErrors');
const httpLogger = loggerManager.getLogger('http');
const httpErrorsLogger = loggerManager.getLogger('httpErrors');
const taskLogger = loggerManager.getLogger('task');

export { logger, errorLogger, loggerManager, httpErrorsLogger, httpLogger, taskLogger };
