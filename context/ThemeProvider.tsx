"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "high-energy" | "modern-tech" | "corporate-fun";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("high-energy");

    useEffect(() => {
        // Check local storage or system preference on mount if needed
        const savedTheme = localStorage.getItem("neo-theme") as Theme;
        if (savedTheme) {
            setTheme(savedTheme);
        }
    }, []);

    useEffect(() => {
        // Apply theme to body
        document.body.setAttribute("data-theme", theme);
        localStorage.setItem("neo-theme", theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
