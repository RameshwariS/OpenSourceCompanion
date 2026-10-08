import mongoose from 'mongoose';
import { parse } from 'cookie';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { AUTH_COOKIE, verifyAuthToken } from '../utils/token.js';

let io = null; // stays null in tests and in standalone scripts, so emitting is a harmless no-op

export function initSockets(httpServer) {
  io = new Server(httpServer, { cors: { origin: env.CLIENT_URL, credentials: true } });

  // Same rules as the REST API: a valid cookie and an active account, or no connection
  io.use(async (socket, next) => {
    try {
      const token = parse(socket.handshake.headers.cookie ?? '')[AUTH_COOKIE];
      if (!token) return next(new Error('unauthorized'));

      const payload = verifyAuthToken(token);
      if (!mongoose.isValidObjectId(payload.sub)) return next(new Error('unauthorized'));

      const user = await User.findById(payload.sub).select('status');
      if (!user || user.status !== 'active') return next(new Error('unauthorized'));

      socket.data.userId = String(user._id);
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    // A private room per user: only this user's sockets receive their events
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  io?.to(`user-${userId}`).emit(event, payload);
}