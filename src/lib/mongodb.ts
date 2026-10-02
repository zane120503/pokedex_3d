import { MongoClient, type Db } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB ?? 'pokedex';

// Reuse one client across hot reloads in development and across requests in production.
const globalForMongo = globalThis as unknown as { mongoClientPromise?: Promise<MongoClient> };

export function isMongoConfigured(): boolean {
  return Boolean(process.env.MONGODB_URI);
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }
  globalForMongo.mongoClientPromise ??= new MongoClient(uri, { serverSelectionTimeoutMS: 5000 })
    .connect()
    .catch(error => {
      // Allow the next request to retry instead of caching the failed connection.
      globalForMongo.mongoClientPromise = undefined;
      throw error;
    });
  const client = await globalForMongo.mongoClientPromise;
  return client.db(DB_NAME);
}
