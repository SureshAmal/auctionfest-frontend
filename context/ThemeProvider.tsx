"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSocket } from "./socket-context";

interface ThemeContextType {
    themeConfig: Record<string, string>;
    setThemeConfig: (config: Record<string, string>, isLocal?: boolean) => void;
    userThemeConfig: Record<string, string>;
    setUserTheme: (config: Record<string, string>) => void;
    isAdminForcedTheme: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
    themeConfig: {},
    setThemeConfig: () => { },
    userThemeConfig: {},
    setUserTheme: () => { },
    isAdminForcedTheme: false,
});

export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeConfig, setThemeConfig] = useState<Record<string, string>>({});
    const [userThemeConfig, setUserThemeConfig] = useState<Record<string, string>>({});
    const [isAdminForcedTheme, setIsAdminForcedTheme] = useState(false);
    const { socket, isConnected } = useSocket();

    // Fetch initial theme state from admin
    useEffect(() => {
        const fetchInitialState = async () => {
            try {
                const res = await fetch("/api/admin/state");
                if (res.ok) {
                    const data = await res.json();
                    // Check if admin has set a forced theme
                    if (data.admin_forced_theme) {
                        setThemeConfig(data.theme_config || {});
                        setIsAdminForcedTheme(true);
                    }
                    // Load user's local theme preference
                    const savedUserTheme = localStorage.getItem("user_theme_config");
                    if (savedUserTheme) {
                        const parsed = JSON.parse(savedUserTheme);
                        setUserThemeConfig(parsed);
                        // If no admin forced theme, apply user theme
                        if (!data.admin_forced_theme) {
                            setThemeConfig(parsed);
                        }
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

        const handleThemeUpdate = (data: { config: Record<string, string>; is_forced: boolean }) => {
            setThemeConfig(data.config);
            setIsAdminForcedTheme(data.is_forced || false);
            // If admin forces theme, save to localStorage but mark as forced
            if (data.is_forced) {
                localStorage.setItem("admin_forced_theme", "true");
            }
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

    // Set theme config - can be local (user) or broadcast (admin)
    const handleSetThemeConfig = (config: Record<string, string>, isLocal: boolean = false) => {
        if (isLocal) {
            // Save as user preference (local only)
            localStorage.setItem("user_theme_config", JSON.stringify(config));
            setUserThemeConfig(config);
            // Only apply if admin hasn't forced a theme
            if (!isAdminForcedTheme) {
                setThemeConfig(config);
            }
        } else {
            // Admin broadcast - overrides user preference
            setThemeConfig(config);
            setIsAdminForcedTheme(true);
            localStorage.setItem("admin_forced_theme", "true");
        }
    };

    // Set user theme only (local preference)
    const handleSetUserTheme = (config: Record<string, string>) => {
        localStorage.setItem("user_theme_config", JSON.stringify(config));
        setUserThemeConfig(config);
        // Only apply if admin hasn't forced a theme
        if (!isAdminForcedTheme) {
            setThemeConfig(config);
        }
    };

    return (
        <ThemeContext.Provider value={{ 
            themeConfig, 
            setThemeConfig: handleSetThemeConfig,
            userThemeConfig,
            setUserTheme: handleSetUserTheme,
            isAdminForcedTheme 
        }}>
            {children}
        </ThemeContext.Provider>
    );
}
