const mongoDB = process.env['MONGO_DB_NAME'];

db.createUser(
    {
        user: process.env['MONGO_USER'],
        pwd:  process.env['MONGO_PASSWORD'],
        roles: [ { role: 'readWrite', db: mongoDB }],
    },
);

use(mongoDB);

db.tasks.createIndex([{
    hash: 1,
    requestId: 1,
}, {
    unique: true,
    sparse: true,
}, 'majority']);
