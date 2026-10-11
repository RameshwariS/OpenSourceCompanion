import app from './app.js';
import { env } from './config/env.js';
import { connectDB, disconnectDB } from './config/db.js';
import { closeRedis, getRedis, initRedis } from './config/redis.js';
import { startJobs } from './jobs/index.js';
import { initSockets } from './sockets/index.js';
import { setCacheStore } from './utils/cache.js';
import { createRedisStore } from './utils/cacheStores.js';

async function start() {
  await connectDB();

  if (initRedis()) {
    setCacheStore(createRedisStore(getRedis));
    console.log('Cache: Redis (falls back to memory if unreachable)');
  } else {
    console.log('Cache: in-memory (set REDIS_URL to use Redis)');
  }

  const server = app.listen(env.PORT, () => {
    console.log(`API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
  const io = initSockets(server);
  const stopJobs = startJobs();

  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    stopJobs();
    // io.close() disconnects every socket AND closes the HTTP server
    io.close(async () => {
      await closeRedis();
      await disconnectDB();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});