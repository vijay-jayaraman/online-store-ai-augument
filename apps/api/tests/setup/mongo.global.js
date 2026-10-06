// Starts one in-memory MongoDB for the integration project and shares its URI with test files.
// The binary version is pinned in apps/api/package.json ("config.mongodbMemoryServer").

import { MongoMemoryServer } from 'mongodb-memory-server';

export default async function setup(project) {
  const server = await MongoMemoryServer.create();
  project.provide('mongoUri', server.getUri());

  return async () => {
    await server.stop();
  };
}
