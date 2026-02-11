import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface TaskProgress {
  taskId: string;
  status: string;
  step?: string;
  filesChanged?: number;
  pullRequestUrl?: string;
  duration?: number;
  totalCost?: number;
  error?: string;
}

const SOCKET_URL = import.meta.env.VITE_API_URL || '';

export function useSocket(userId?: string) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [taskUpdates, setTaskUpdates] = useState<Map<string, TaskProgress>>(new Map());

  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('subscribe:tasks', userId);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('task:progress', (data: TaskProgress) => {
      setTaskUpdates((prev) => {
        const next = new Map(prev);
        next.set(data.taskId, data);
        return next;
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [userId]);

  const getTaskProgress = useCallback((taskId: string): TaskProgress | undefined => {
    return taskUpdates.get(taskId);
  }, [taskUpdates]);

  const clearTaskUpdate = useCallback((taskId: string) => {
    setTaskUpdates((prev) => {
      const next = new Map(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  return { isConnected, taskUpdates, getTaskProgress, clearTaskUpdate };
}
