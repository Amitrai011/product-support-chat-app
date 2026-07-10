'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { Socket } from 'socket.io-client';
import { tokenStore } from './api';
import { getSocket } from './socket';

/**
 * Returns the shared Socket.IO connection for the logged-in user, or null until
 * a token is available, plus a live `connected` flag. The connection is a
 * module-level singleton; connection status is read via useSyncExternalStore so
 * React stays in sync with the socket without setState-in-effect churn.
 */
export function useSocket(): { socket: Socket | null; connected: boolean } {
  const socket = useMemo(() => {
    const token = tokenStore.get();
    return token ? getSocket(token) : null;
  }, []);

  const connected = useSyncExternalStore(
    (onChange) => {
      if (!socket) return () => {};
      socket.on('connect', onChange);
      socket.on('disconnect', onChange);
      return () => {
        socket.off('connect', onChange);
        socket.off('disconnect', onChange);
      };
    },
    () => socket?.connected ?? false,
    () => false,
  );

  return { socket, connected };
}
