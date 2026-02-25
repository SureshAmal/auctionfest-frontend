"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeProvider";
import { Settings2, X, RotateCcw, Palette } from "lucide-react";
import NeoButton from "./neo/NeoButton";

// Define the keys we want to control
const THEME_VARIABLES = [
    { key: "--color-primary", label: "Primary", type: "color", default: "#FF4D00" },
    { key: "--color-surface", label: "Surface", type: "color", default: "#FFD700" },
    { key: "--color-bg", label: "Background", type: "color", default: "#FFFFFF" },
    { key: "--color-secondary", label: "Secondary", type: "color", default: "#0087FF" },
    { key: "--color-danger", label: "Destructive", type: "color", default: "#FF0000" },
    { key: "--neo-radius", label: "Border Radius", type: "range", min: 0, max: 24, step: 1, unit: "px", default: "0px" },
    { key: "--neo-shadow-offset-x", label: "Shadow X", type: "range", min: 0, max: 16, step: 1, unit: "px", default: "6px" },
    { key: "--neo-shadow-offset-y", label: "Shadow Y", type: "range", min: 0, max: 16, step: 1, unit: "px", default: "6px" },
];

// Define a type for the presets to fix type mismatch with Record<string, string>
type ThemePreset = {
    name: string;
    dataTheme: string;
    config: Record<string, string>;
};

const PRESETS: ThemePreset[] = [
    {
        name: "Neo Brutalism (Light)",
        dataTheme: "",
        config: {
            "--color-bg": "#FFFFFF",
            "--color-surface": "#FFD700",
            "--color-primary": "#FF4D00",
            "--color-text": "#000000",
            "--color-border": "#000000",
            "--color-secondary": "#0087FF",
            "--color-danger": "#FF0000",
            "--color-success": "#00FF00",
            "--neo-radius": "0px",
            "--neo-shadow-offset-x": "6px",
            "--neo-shadow-offset-y": "6px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "#000000",
            "--font-family": "inherit"
        }
    },
    {
        name: "Neo Brutalism (Dark)",
        dataTheme: "",
        config: {
            "--color-bg": "#121212",
            "--color-surface": "#1E1E1E",
            "--color-primary": "#FF4D00",
            "--color-text": "#E0E0E0",
            "--color-border": "#333333",
            "--color-secondary": "#03DAC6",
            "--color-danger": "#CF6679",
            "--color-success": "#4CAF50",
            "--neo-radius": "0px",
            "--neo-shadow-offset-x": "6px",
            "--neo-shadow-offset-y": "6px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "#000000",
            "--font-family": "inherit"
        }
    },
    {
        name: "Modern UI (Light)",
        dataTheme: "",
        config: {
            "--color-bg": "#F8F9FA",
            "--color-surface": "#FFFFFF",
            "--color-primary": "#0D6EFD",
            "--color-text": "#212529",
            "--color-border": "#DEE2E6",
            "--color-secondary": "#6C757D",
            "--color-danger": "#DC3545",
            "--color-success": "#198754",
            "--neo-radius": "12px",
            "--neo-shadow-offset-x": "0px",
            "--neo-shadow-offset-y": "4px",
            "--neo-shadow-blur": "16px",
            "--neo-shadow-color": "rgba(0,0,0,0.1)",
            "--font-family": "inherit"
        }
    },
    {
        name: "Modern UI (Dark)",
        dataTheme: "",
        config: {
            "--color-bg": "#212529",
            "--color-surface": "#343A40",
            "--color-primary": "#0D6EFD",
            "--color-text": "#F8F9FA",
            "--color-border": "#495057",
            "--color-secondary": "#6C757D",
            "--color-danger": "#DC3545",
            "--color-success": "#198754",
            "--neo-radius": "12px",
            "--neo-shadow-offset-x": "0px",
            "--neo-shadow-offset-y": "4px",
            "--neo-shadow-blur": "16px",
            "--neo-shadow-color": "rgba(0,0,0,0.4)",
            "--font-family": "inherit"
        }
    },
    {
        name: "Pixel Art (Light)",
        dataTheme: "pixel-art-light",
        config: {
            "--color-bg": "#e0e8d0",
            "--color-surface": "#c8d0a8",
            "--color-primary": "#306230",
            "--color-text": "#0f380f",
            "--color-border": "#0f380f",
            "--color-secondary": "#8bac0f",
            "--color-danger": "#9b1b30",
            "--color-success": "#306230",
            "--neo-radius": "0px",
            "--neo-shadow-offset-x": "0px",
            "--neo-shadow-offset-y": "0px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "rgba(15,56,15,0.3)",
            "--font-family": "var(--font-pixel), 'Courier New', monospace"
        }
    },
    {
        name: "Pixel Art (Dark)",
        dataTheme: "pixel-art",
        config: {
            "--color-bg": "#0f0e17",
            "--color-surface": "#1a1932",
            "--color-primary": "#ff6e96",
            "--color-text": "#fffffe",
            "--color-border": "#fffffe",
            "--color-secondary": "#7f5af0",
            "--color-danger": "#e53170",
            "--color-success": "#2cb67d",
            "--neo-radius": "0px",
            "--neo-shadow-offset-x": "0px",
            "--neo-shadow-offset-y": "0px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "rgba(0,0,0,0.4)",
            "--font-family": "var(--font-pixel), 'Courier New', monospace"
        }
    },
    {
        name: "⚡ Cyberpunk (Light)",
        dataTheme: "",
        config: {
            "--color-bg": "#FFFFFF",
            "--color-surface": "#F0F0F0",
            "--color-primary": "#FF003C",
            "--color-text": "#1A1A1A",
            "--color-border": "#FF003C",
            "--color-secondary": "#00F0FF",
            "--color-danger": "#FF003C",
            "--color-success": "#00FF41",
            "--neo-border-width": "2px",
            "--neo-radius": "0px",
            "--neo-shadow-offset-x": "6px",
            "--neo-shadow-offset-y": "6px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "#FF003C",
            "--font-family": "inherit"
        }
    },
    {
        name: "⚡ Cyberpunk (Dark)",
        dataTheme: "",
        config: {
            "--color-bg": "#0a0a0f",
            "--color-surface": "#1a1a2e",
            "--color-primary": "#00ff41",
            "--color-text": "#00ff41",
            "--color-border": "#00ff41",
            "--color-secondary": "#ff00ff",
            "--color-danger": "#ff0055",
            "--color-success": "#00ff41",
            "--neo-border-width": "2px",
            "--neo-radius": "0px",
            "--neo-shadow-offset-x": "6px",
            "--neo-shadow-offset-y": "6px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "rgba(0,255,65,0.4)",
            "--font-family": "inherit"
        }
    },
    {
        name: "Fantasy (Light)",
        dataTheme: "",
        config: {
            "--color-bg": "#fdf6e3",
            "--color-surface": "#eee8d5",
            "--color-primary": "#8b4513",
            "--color-text": "#3e2723",
            "--color-border": "#5d4037",
            "--color-secondary": "#b8860b",
            "--color-danger": "#c0392b",
            "--color-success": "#27ae60",
            "--neo-radius": "6px",
            "--neo-shadow-offset-x": "5px",
            "--neo-shadow-offset-y": "5px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "#3e2723",
            "--font-family": "inherit"
        }
    },
    {
        name: "Fantasy (Dark)",
        dataTheme: "",
        config: {
            "--color-bg": "#2c1c16",
            "--color-surface": "#3e2723",
            "--color-primary": "#d4af37",
            "--color-text": "#fdf6e3",
            "--color-border": "#8b4513",
            "--color-secondary": "#8b0000",
            "--color-danger": "#ff4500",
            "--color-success": "#228b22",
            "--neo-radius": "6px",
            "--neo-shadow-offset-x": "5px",
            "--neo-shadow-offset-y": "5px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "rgba(0,0,0,0.5)",
            "--font-family": "inherit"
        }
    },
    {
        name: "Monopoly (Light)",
        dataTheme: "",
        config: {
            "--color-bg": "#c8e6c9",
            "--color-surface": "#e8f5e9",
            "--color-primary": "#d32f2f",
            "--color-text": "#1b5e20",
            "--color-border": "#1b5e20",
            "--color-secondary": "#1565c0",
            "--color-danger": "#d32f2f",
            "--color-success": "#2e7d32",
            "--neo-radius": "8px",
            "--neo-shadow-offset-x": "4px",
            "--neo-shadow-offset-y": "4px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "#1b5e20",
            "--font-family": "inherit"
        }
    },
    {
        name: "Monopoly (Dark)",
        dataTheme: "",
        config: {
            "--color-bg": "#1b5e20",
            "--color-surface": "#2e7d32",
            "--color-primary": "#ff5252",
            "--color-text": "#e8f5e9",
            "--color-border": "#a5d6a7",
            "--color-secondary": "#64b5f6",
            "--color-danger": "#ff5252",
            "--color-success": "#81c784",
            "--neo-radius": "8px",
            "--neo-shadow-offset-x": "4px",
            "--neo-shadow-offset-y": "4px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "rgba(0,0,0,0.5)",
            "--font-family": "inherit"
        }
    },
    {
        name: "Civil Engineering (Light)",
        dataTheme: "",
        config: {
            "--color-bg": "#f4f4f4",
            "--color-surface": "#e0e0e0",
            "--color-primary": "#ffcc00",
            "--color-text": "#111111",
            "--color-border": "#111111",
            "--color-secondary": "#ff6600",
            "--color-danger": "#cc0000",
            "--color-success": "#009933",
            "--neo-radius": "0px",
            "--neo-shadow-offset-x": "8px",
            "--neo-shadow-offset-y": "8px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "#111111",
            "--font-family": "inherit"
        }
    },
    {
        name: "Civil Engineering (Dark)",
        dataTheme: "",
        config: {
            "--color-bg": "#111111",
            "--color-surface": "#222222",
            "--color-primary": "#ffcc00",
            "--color-text": "#f4f4f4",
            "--color-border": "#ffcc00",
            "--color-secondary": "#ff6600",
            "--color-danger": "#cc0000",
            "--color-success": "#009933",
            "--neo-radius": "0px",
            "--neo-shadow-offset-x": "8px",
            "--neo-shadow-offset-y": "8px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "rgba(255, 204, 0, 0.4)",
            "--font-family": "inherit"
        }
    },
    {
        name: "Architecture (Light)",
        dataTheme: "",
        config: {
            "--color-bg": "#ffffff",
            "--color-surface": "#f0f4f8",
            "--color-primary": "#1d4ed8",
            "--color-text": "#0f172a",
            "--color-border": "#1d4ed8",
            "--color-secondary": "#60a5fa",
            "--color-danger": "#ef4444",
            "--color-success": "#22c55e",
            "--neo-radius": "4px",
            "--neo-shadow-offset-x": "4px",
            "--neo-shadow-offset-y": "4px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "#1d4ed8",
            "--font-family": "inherit"
        }
    },
    {
        name: "Architecture Blueprint",
        dataTheme: "",
        config: {
            "--color-bg": "#1e3a8a",
            "--color-surface": "#1d4ed8",
            "--color-primary": "#ffffff",
            "--color-text": "#ffffff",
            "--color-border": "#ffffff",
            "--color-secondary": "#93c5fd",
            "--color-danger": "#fca5a5",
            "--color-success": "#fef08a",
            "--neo-radius": "4px",
            "--neo-shadow-offset-x": "4px",
            "--neo-shadow-offset-y": "4px",
            "--neo-shadow-blur": "0px",
            "--neo-shadow-color": "rgba(255,255,255,0.3)",
            "--font-family": "inherit"
        }
    },
    {
        name: "🔮 Glassmorphism (Light)",
        dataTheme: "glass-light",
        config: {
            "--color-bg": "rgba(255, 255, 255, 0.4)",
            "--color-surface": "rgba(255, 255, 255, 0.7)", /* Increased opacity for better card contrast */
            "--color-primary": "#4f46e5", /* Deeper indigo for better readability */
            "--color-text": "#000000", /* Pure black text */
            "--color-border": "rgba(0, 0, 0, 0.1)", /* Subtle dark border instead of white */
            "--color-secondary": "#db2777", /* Deeper pink */
            "--color-danger": "#dc2626",
            "--color-success": "#059669",
            "--neo-radius": "16px",
            "--neo-shadow-offset-x": "0px",
            "--neo-shadow-offset-y": "8px",
            "--neo-shadow-blur": "32px",
            "--neo-shadow-color": "rgba(0, 0, 0, 0.15)", /* Slightly stronger shadow */
            "--font-family": "inherit"
        }
    },
    {
        name: "🔮 Glassmorphism (Dark)",
        dataTheme: "glass",
        config: {
            "--color-bg": "rgba(15, 23, 42, 0.6)",
            "--color-surface": "rgba(30, 41, 59, 0.7)",
            "--color-primary": "#818cf8",
            "--color-text": "#f8fafc",
            "--color-border": "rgba(255, 255, 255, 0.1)",
            "--color-secondary": "#f472b6",
            "--color-danger": "#f87171",
            "--color-success": "#34d399",
            "--neo-radius": "16px",
            "--neo-shadow-offset-x": "0px",
            "--neo-shadow-offset-y": "8px",
            "--neo-shadow-blur": "32px",
            "--neo-shadow-color": "rgba(0, 0, 0, 0.4)",
            "--font-family": "inherit"
        }
    }
];

export function ThemeChanger({ className }: { className?: string }) {
    const { themeConfig, setThemeConfig } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [localConfig, setLocalConfig] = useState<Record<string, string>>({});
    const [isSaving, setIsSaving] = useState(false);

    // Sync local state when external theme changes (unless we are actively editing)
    useEffect(() => {
        if (!isOpen) {
            setLocalConfig(themeConfig);
        }
    }, [themeConfig, isOpen]);

    const handleValueChange = (key: string, value: string) => {
        const newConfig = { ...localConfig, [key]: value };
        setLocalConfig(newConfig);

        // Optimistically apply locally
        const root = document.documentElement;
        if (key.startsWith('--')) {
            root.style.setProperty(key, value);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await fetch("/api/admin/theme", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ variables: localConfig }),
            });
            // Update context so other local components know
            setThemeConfig(localConfig);
        } catch (err) {
            console.error("Failed to save theme:", err);
        } finally {
            setIsSaving(false);
            setIsOpen(false);
        }
    };

    const applyPreset = (presetConfig: Record<string, string>, dataTheme: string) => {
        const configWithTheme = { ...localConfig, ...presetConfig, "--data-theme": dataTheme };
        setLocalConfig(configWithTheme);
        const root = document.documentElement;
        Object.entries(presetConfig).forEach(([key, value]) => {
            if (key.startsWith('--')) {
                root.style.setProperty(key, value);
            }
        });
        // Set or remove data-theme attribute for CSS-scoped styles
        if (dataTheme) {
            document.body.setAttribute('data-theme', dataTheme);
        } else {
            document.body.removeAttribute('data-theme');
        }
    };

    return (
        <>
            <NeoButton
                variant="secondary"
                onClick={() => setIsOpen(true)}
                className={`flex items-center gap-2 ${className || ""}`}
            >
                <Palette size={18} />
                <span>Theme</span>
            </NeoButton>

            {/* Sidebar Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Panel */}
            <div
                className={`fixed top-0 right-0 h-full w-full sm:w-[400px] bg-[var(--color-bg)] border-l-[var(--neo-border-width)] border-[var(--color-border)] z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-[-10px_0_0_rgba(0,0,0,1)] ${isOpen ? "translate-x-0" : "translate-x-[110%]"}`}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b-[var(--neo-border-width)] border-[var(--color-border)] bg-[var(--color-surface)]">
                        <h2 className="text-xl font-black uppercase flex items-center gap-2">
                            <Settings2 size={24} /> Theme Options
                        </h2>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-1 hover:bg-black/10 rounded"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">

                        {/* Presets */}
                        <div className="space-y-2">
                            <h3 className="font-bold uppercase text-xs opacity-70">Presets</h3>
                            <div className="grid gap-2">
                                {PRESETS.map((preset) => (
                                    <NeoButton
                                        key={preset.name}
                                        variant="base"
                                        onClick={() => applyPreset(preset.config, preset.dataTheme)}
                                        className="text-left py-2 text-sm justify-start"
                                    >
                                        <RotateCcw size={14} className="mr-2" />
                                        {preset.name}
                                    </NeoButton>
                                ))}
                            </div>
                        </div>

                        <hr className="border-[var(--color-border)] border-dashed border-t-2" />

                        {/* Theme Variables List */}
                        <div className="space-y-4">
                            <h3 className="font-bold uppercase text-xs opacity-70">Brand Colors &amp; Styling</h3>

                            {THEME_VARIABLES.map((v) => {
                                const val = localConfig[v.key] ?? v.default;

                                if (v.type === "color") {
                                    return (
                                        <div key={v.key} className="flex items-center justify-between gap-4">
                                            <label className="text-sm font-bold truncate flex-1">{v.label}</label>
                                            <div className="flex items-center gap-2 shrink-0" dir="rtl">
                                                <input
                                                    type="text"
                                                    value={val}
                                                    onChange={(e) => handleValueChange(v.key, e.target.value)}
                                                    className="neo-input py-1 px-2 text-sm w-24 font-mono uppercase"
                                                    dir="ltr"
                                                />
                                                <input
                                                    type="color"
                                                    value={val.length === 7 ? val : v.default}
                                                    onChange={(e) => handleValueChange(v.key, e.target.value.toUpperCase())}
                                                    className="w-8 h-8 rounded border-2 border-[var(--color-border)] cursor-pointer p-0 bg-transparent"
                                                    style={{ appearance: "none", WebkitAppearance: "none" }}
                                                />
                                            </div>
                                        </div>
                                    );
                                }

                                if (v.type === "range") {
                                    const numVal = parseInt(val.replace(v.unit!, "")) || 0;
                                    return (
                                        <div key={v.key} className="space-y-1">
                                            <div className="flex justify-between items-center text-sm font-bold">
                                                <label>{v.label}</label>
                                                <span className="font-mono bg-[var(--color-surface)] px-1 border border-black">{val}</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={v.min}
                                                max={v.max}
                                                step={v.step}
                                                value={numVal}
                                                onChange={(e) => handleValueChange(v.key, `${e.target.value}${v.unit}`)}
                                                className="w-full accent-[var(--color-primary)]"
                                            />
                                        </div>
                                    );
                                }

                                return null;
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t-[var(--neo-border-width)] border-[var(--color-border)] bg-[var(--color-bg)] mt-auto">
                        <NeoButton
                            variant="primary"
                            className="w-full text-lg shadow-[4px_4px_0_var(--color-primary)] hover:translate-x-[2px] border-[var(--color-primary)]"
                            onClick={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? "SAVING..." : "SAVE & BROADCAST THEME"}
                        </NeoButton>
                    </div>
                </div>
            </div>
        </>
    );
}
