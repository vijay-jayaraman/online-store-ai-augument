// Runs in every integration test file: connects to the in-memory MongoDB and clears data between tests.

import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { connectDB, disconnectDB } from '../../src/config/db.js';
import { testDatabaseUri } from '../helpers/db.js';

beforeAll(async () => {
  await connectDB({ uri: testDatabaseUri() });
});

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) => collection.deleteMany({})),
  );
});

afterAll(async () => {
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase();
  }
  await disconnectDB();
});
