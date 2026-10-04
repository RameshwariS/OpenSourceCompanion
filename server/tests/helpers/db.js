import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../src/models/User.js';

let mongod;

export async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await User.init(); // wait for unique indexes, since duplicate tests depend on them
}

export async function clearTestDB() {
  for (const collection of Object.values(mongoose.connection.collections)) {
    await collection.deleteMany({});
  }
}

export async function closeTestDB() {
  await mongoose.disconnect();
  await mongod?.stop();
}