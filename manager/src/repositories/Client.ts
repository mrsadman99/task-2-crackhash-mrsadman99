import { MongoClient } from 'mongodb';

const { MONGO_CONNECT_URL }= process.env;

let mongoClient: MongoClient | null = null;
const getClient = async () => {
    if (!mongoClient) {
        mongoClient = await MongoClient.connect(MONGO_CONNECT_URL!);
    }
    return mongoClient;
};

export { getClient };
