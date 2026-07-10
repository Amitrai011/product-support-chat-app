import { io, Socket } from 'socket.io-client';
import { API_BASE } from './api';

let socket: Socket | null = null;
let currentToken: string | null = null;

/**
 * Returns a single shared Socket.IO connection for the given token. If the
 * token changes (login as a different user) the old socket is torn down and a
 * new one is created. The JWT is sent in the handshake `auth` payload, which the
 * gateway verifies on connect.
 */
export function getSocket(token: string): Socket {
  if (socket && currentToken === token) return socket;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;
  socket = io(API_BASE, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
  });
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
  currentToken = null;
}
