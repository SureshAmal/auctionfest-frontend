"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./socket-context";

interface ThemeContextType {
    themeConfig: Record<string, string>;
    setThemeConfig: (config: Record<string, string>) => void;
}

const ThemeContext = createContext<ThemeContextType>({
    themeConfig: {},
    setThemeConfig: () => { },
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeConfig, setThemeConfig] = useState<Record<string, string>>({});
    const { socket, isConnected } = useSocket();

    // Fetch initial theme state
    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const res = await fetch("/api/admin/state");
                if (res.ok) {
                    const data = await res.json();
                    if (data.theme_config && Object.keys(data.theme_config).length > 0) {
                        setThemeConfig(data.theme_config);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch initial theme:", err);
            }
        };

        fetchInitialState();
    }, []);

    // Listen for WebSocket theme updates
    useEffect(() => {
        if (!socket) return;

        const handleThemeUpdate = (newConfig: Record<string, string>) => {
            setThemeConfig(newConfig);
        };

        socket.on("theme_update", handleThemeUpdate);

        return () => {
            socket.off("theme_update", handleThemeUpdate);
        };
    }, [socket]);

    // Apply CSS variables to the root element whenever the config changes
    useEffect(() => {
        if (!themeConfig || Object.keys(themeConfig).length === 0) return;

        const root = document.documentElement;
        Object.entries(themeConfig).forEach(([key, value]) => {
            if (key.startsWith('--') && value) {
                root.style.setProperty(key, value);
            }
        });

        // Set data-theme attribute for CSS-scoped styles (pixel art themes)
        const dataTheme = themeConfig['--data-theme'] || '';
        if (dataTheme) {
            document.body.setAttribute('data-theme', dataTheme);
        } else {
            document.body.removeAttribute('data-theme');
        }
    }, [themeConfig]);

    return (
        <ThemeContext.Provider value={{ themeConfig, setThemeConfig }}>
            {children}
        </ThemeContext.Provider>
    );
}
