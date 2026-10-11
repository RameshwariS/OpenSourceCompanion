import mongoose from 'mongoose';
import { getRedis } from '../config/redis.js';

export function getHealth(req, res) {
  const dbConnected = mongoose.connection.readyState === 1;
  const redis = getRedis();
  // memory = no Redis configured, degraded = configured but unreachable (using the fallback)
  const cache = !redis ? 'memory' : redis.status === 'ready' ? 'redis' : 'degraded';

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      cache,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    message: 'Service is healthy',
  });
}