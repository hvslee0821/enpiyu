import { MongoClient, Db, ObjectId } from 'mongodb';

const DB_NAME = process.env.MONGODB_DB_NAME || 'imafaker';

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI || MONGODB_URI.trim() === '') {
    throw new Error('MONGODB_URI is not set. Add it to .env.local');
  }
  const client = new MongoClient(MONGODB_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  cachedClient = client;
  cachedDb = db;
  return { client, db };
}

export type CodeStatus = 'active' | 'used';

export interface CodeDoc {
  _id?: ObjectId;
  code: string;
  status: CodeStatus;
  createdAt: Date;
}

export const CODES_COLLECTION = 'codes';
