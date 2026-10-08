import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import User from '../../src/models/User.js';
import Issue from '../../src/models/Issue.js';
import Bookmark from '../../src/models/Bookmark.js';
import Contribution from '../../src/models/Contribution.js';
import Project from '../../src/models/Project.js';
import ProjectFollow from '../../src/models/ProjectFollow.js';
import Notification from '../../src/models/Notification.js';
import OrgFollow from '../../src/models/OrgFollow.js';

let mongod;

export async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Wait for unique indexes: the duplicate tests depend on them
  await Promise.all(
    [User, Issue, Bookmark, Contribution, Project, ProjectFollow, Notification, OrgFollow].map((m) => m.init()),
  );
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