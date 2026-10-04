import mongoose from 'mongoose';

export function getHealth(req, res) {
  const dbConnected = mongoose.connection.readyState === 1;

  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
    message: 'Service is healthy',
  });
}