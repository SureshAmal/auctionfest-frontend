"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

/**
 * Singleton socket instance — lives outside React lifecycle to survive
 * React strict-mode double-mount and page refreshes.
 */
let globalSocket: Socket | null = null;

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    // Prevent React strict-mode double initialization
    if (initialized.current && globalSocket) {
      setSocket(globalSocket);
      setIsConnected(globalSocket.connected);
      return;
    }
    initialized.current = true;

    const socketUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      `http://${window.location.hostname || "localhost"}:8000`;

    // Reuse existing socket if available (e.g. HMR), otherwise create new
    if (!globalSocket || globalSocket.disconnected) {
      globalSocket = io(socketUrl, {
        transports: ["polling", "websocket"],
        upgrade: true,
        rememberUpgrade: true,
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 30000,
      });
    }

    const socketInstance = globalSocket;

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = (reason: string) => {
      setIsConnected(false);
    };

    const onConnectError = (err: Error) => {
      console.warn("Socket connect_error:", err.message);
      setIsConnected(false);
    };

    const onReconnect = (attempt: number) => {
      setIsConnected(true);
    };

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);
    socketInstance.on("connect_error", onConnectError);
    socketInstance.io.on("reconnect", onReconnect);

    // If already connected (HMR/strict-mode), sync state
    if (socketInstance.connected) {
      setIsConnected(true);
    }

    setSocket(socketInstance);

    return () => {
      // Only remove listeners, do NOT disconnect the socket.
      // The socket persists across React strict-mode remounts.
      socketInstance.off("connect", onConnect);
      socketInstance.off("disconnect", onDisconnect);
      socketInstance.off("connect_error", onConnectError);
      socketInstance.io.off("reconnect", onReconnect);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};
