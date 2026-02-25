"use client";

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    isIntentionalDisconnect: boolean;
    setIntentionalDisconnect: (value: boolean) => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    isIntentionalDisconnect: false,
    setIntentionalDisconnect: () => {},
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isIntentionalDisconnect, setIsIntentionalDisconnect] = useState(false);
    
    const socketRef = useRef<Socket | null>(null);

    useEffect(() => {
        const socketUrl = `http://${window.location.hostname || "localhost"}:8000`;
        const socketInstance = io(socketUrl, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 50,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 10000,
            timeout: 20000,
            autoConnect: true,
        });

        socketInstance.on("connect", () => {
            console.log("[Socket] Connected:", socketInstance.id);
            setIsConnected(true);
        });

        socketInstance.on("disconnect", (reason) => {
            console.log("[Socket] Disconnected:", reason);
            setIsConnected(false);
        });

        socketInstance.on("connect_error", (error) => {
            console.error("[Socket] Connection error:", error.message);
        });

        socketInstance.on("reconnect", (attemptNumber) => {
            console.log("[Socket] Reconnected after", attemptNumber, "attempts");
        });

        socketInstance.on("reconnect_attempt", (attemptNumber) => {
            console.log("[Socket] Reconnection attempt:", attemptNumber);
        });

        socketInstance.on("reconnect_failed", () => {
            console.error("[Socket] Reconnection failed after all attempts");
        });

        socketRef.current = socketInstance;
        setSocket(socketInstance);

        return () => {
            console.log("[Socket] Cleaning up socket connection");
            socketInstance.disconnect();
        };
    }, []);

    const setIntentionalDisconnect = useCallback((value: boolean) => {
        setIsIntentionalDisconnect(value);
        if (value && socketRef.current) {
            socketRef.current.disconnect();
        }
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, isIntentionalDisconnect, setIntentionalDisconnect }}>
            {children}
        </SocketContext.Provider>
    );
};
