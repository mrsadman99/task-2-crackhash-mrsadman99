import { MongoClient } from 'mongodb';

const { MONGO_ROOT_CONNECT_URL }= process.env;

let mongoClient: MongoClient | null = null;
const getClient = async () => {
    if (!mongoClient) {
        mongoClient = await MongoClient.connect(MONGO_ROOT_CONNECT_URL!);
    }
    return mongoClient;
};

export { getClient };
