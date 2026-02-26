"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeProvider";
import { Settings2, X, Palette, ChevronDown, Check } from "lucide-react";
import NeoButton from "./neo/NeoButton";

const THEME_VARIABLES = [
  {
    key: "--color-primary",
    label: "Primary",
    type: "color",
    default: "#FF4D00",
  },
  {
    key: "--color-surface",
    label: "Surface",
    type: "color",
    default: "#FFD700",
  },
  { key: "--color-bg", label: "Background", type: "color", default: "#FFFFFF" },
  {
    key: "--color-secondary",
    label: "Secondary",
    type: "color",
    default: "#0087FF",
  },
  {
    key: "--color-danger",
    label: "Destructive",
    type: "color",
    default: "#FF0000",
  },
  { key: "--color-plots", label: "plots", type: "color", default: "#ff6347" },
  {
    key: "--neo-radius",
    label: "Border Radius",
    type: "range",
    min: 0,
    max: 24,
    step: 1,
    unit: "px",
    default: "0px",
  },
  {
    key: "--neo-shadow-offset-x",
    label: "Shadow X",
    type: "range",
    min: 0,
    max: 16,
    step: 1,
    unit: "px",
    default: "6px",
  },
  {
    key: "--neo-shadow-offset-y",
    label: "Shadow Y",
    type: "range",
    min: 0,
    max: 16,
    step: 1,
    unit: "px",
    default: "6px",
  },
];

type ThemePreset = {
  name: string;
  category: string;
  dataTheme: string;
  config: Record<string, string>;
};

const PRESETS: ThemePreset[] = [
  // Real Estate / Auction Themes
  {
    name: "Luxury Estate",
    category: "Real Estate",
    dataTheme: "",
    config: {
      "--color-bg": "#1a1a1a",
      "--color-surface": "#2d2d2d",
      "--color-primary": "#d4af37",
      "--color-text": "#f5f5f5",
      "--color-border": "#4a4a4a",
      "--color-secondary": "#8b7355",
      "--color-danger": "#c0392b",
      "--color-success": "#27ae60",
      "--neo-radius": "8px",
      "--neo-shadow-offset-x": "4px",
      "--neo-shadow-offset-y": "4px",
      "--neo-shadow-blur": "12px",
      "--neo-shadow-color": "rgba(212,175,55,0.3)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Modern Realty",
    category: "Real Estate",
    dataTheme: "",
    config: {
      "--color-bg": "#f8f9fa",
      "--color-surface": "#ffffff",
      "--color-primary": "#2c3e50",
      "--color-text": "#2c3e50",
      "--color-border": "#bdc3c7",
      "--color-secondary": "#3498db",
      "--color-danger": "#e74c3c",
      "--color-success": "#27ae60",
      "--neo-radius": "4px",
      "--neo-shadow-offset-x": "2px",
      "--neo-shadow-offset-y": "2px",
      "--neo-shadow-blur": "8px",
      "--neo-shadow-color": "rgba(0,0,0,0.08)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Premium Property",
    category: "Real Estate",
    dataTheme: "",
    config: {
      "--color-bg": "#0f0f0f",
      "--color-surface": "#1a1a1a",
      "--color-primary": "#ff6b35",
      "--color-text": "#ffffff",
      "--color-border": "#333333",
      "--color-secondary": "#f7c59f",
      "--color-danger": "#ff4757",
      "--color-success": "#2ed573",
      "--neo-radius": "12px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "8px",
      "--neo-shadow-blur": "24px",
      "--neo-shadow-color": "rgba(255,107,53,0.25)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Urban Development",
    category: "Real Estate",
    dataTheme: "",
    config: {
      "--color-bg": "#ecf0f1",
      "--color-surface": "#ffffff",
      "--color-primary": "#16a085",
      "--color-text": "#2c3e50",
      "--color-border": "#bdc3c7",
      "--color-secondary": "#2980b9",
      "--color-danger": "#c0392b",
      "--color-success": "#27ae60",
      "--neo-radius": "6px",
      "--neo-shadow-offset-x": "4px",
      "--neo-shadow-offset-y": "4px",
      "--neo-shadow-blur": "0px",
      "--neo-shadow-color": "#16a085",
      "--font-family": "inherit",
    },
  },
  {
    name: "Classic Auction",
    category: "Real Estate",
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
      "--neo-radius": "2px",
      "--neo-shadow-offset-x": "3px",
      "--neo-shadow-offset-y": "3px",
      "--neo-shadow-blur": "0px",
      "--neo-shadow-color": "rgba(62,39,35,0.3)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Corporate Realty",
    category: "Real Estate",
    dataTheme: "",
    config: {
      "--color-bg": "#ffffff",
      "--color-surface": "#f5f5f5",
      "--color-primary": "#0066cc",
      "--color-text": "#333333",
      "--color-border": "#dddddd",
      "--color-secondary": "#666666",
      "--color-danger": "#cc0000",
      "--color-success": "#008800",
      "--neo-radius": "2px",
      "--neo-shadow-offset-x": "2px",
      "--neo-shadow-offset-y": "2px",
      "--neo-shadow-blur": "4px",
      "--neo-shadow-color": "rgba(0,0,0,0.1)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Sunset Properties",
    category: "Real Estate",
    dataTheme: "",
    config: {
      "--color-bg": "#fff5ee",
      "--color-surface": "#ffffff",
      "--color-primary": "#e67e22",
      "--color-text": "#5d4e37",
      "--color-border": "#d5c4a1",
      "--color-secondary": "#f39c12",
      "--color-danger": "#c0392b",
      "--color-success": "#27ae60",
      "--neo-radius": "8px",
      "--neo-shadow-offset-x": "4px",
      "--neo-shadow-offset-y": "4px",
      "--neo-shadow-blur": "8px",
      "--neo-shadow-color": "rgba(230,126,34,0.2)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Ocean View",
    category: "Real Estate",
    dataTheme: "",
    config: {
      "--color-bg": "#e8f4f8",
      "--color-surface": "#ffffff",
      "--color-primary": "#1abc9c",
      "--color-text": "#2c3e50",
      "--color-border": "#b8d4e3",
      "--color-secondary": "#3498db",
      "--color-danger": "#e74c3c",
      "--color-success": "#27ae60",
      "--neo-radius": "16px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "4px",
      "--neo-shadow-blur": "16px",
      "--neo-shadow-color": "rgba(26,188,156,0.2)",
      "--font-family": "inherit",
    },
  },
  // Modern UI
  {
    name: "Minimal Light",
    category: "Modern",
    dataTheme: "",
    config: {
      "--color-bg": "#ffffff",
      "--color-surface": "#fafafa",
      "--color-primary": "#000000",
      "--color-text": "#111111",
      "--color-border": "#e5e5e5",
      "--color-secondary": "#666666",
      "--color-danger": "#dc2626",
      "--color-success": "#16a34a",
      "--neo-radius": "8px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "2px",
      "--neo-shadow-blur": "8px",
      "--neo-shadow-color": "rgba(0,0,0,0.05)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Minimal Dark",
    category: "Modern",
    dataTheme: "",
    config: {
      "--color-bg": "#0a0a0a",
      "--color-surface": "#171717",
      "--color-primary": "#ffffff",
      "--color-text": "#ededed",
      "--color-border": "#262626",
      "--color-secondary": "#a3a3a3",
      "--color-danger": "#f87171",
      "--color-success": "#4ade80",
      "--neo-radius": "8px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "2px",
      "--neo-shadow-blur": "8px",
      "--neo-shadow-color": "rgba(0,0,0,0.3)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Tech Startup",
    category: "Modern",
    dataTheme: "",
    config: {
      "--color-bg": "#0f172a",
      "--color-surface": "#1e293b",
      "--color-primary": "#6366f1",
      "--color-text": "#f1f5f9",
      "--color-border": "#334155",
      "--color-secondary": "#22d3ee",
      "--color-danger": "#f43f5e",
      "--color-success": "#10b981",
      "--neo-radius": "12px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "4px",
      "--neo-shadow-blur": "16px",
      "--neo-shadow-color": "rgba(99,102,241,0.3)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Clean Professional",
    category: "Modern",
    dataTheme: "",
    config: {
      "--color-bg": "#ffffff",
      "--color-surface": "#f8fafc",
      "--color-primary": "#3b82f6",
      "--color-text": "#1e293b",
      "--color-border": "#e2e8f0",
      "--color-secondary": "#64748b",
      "--color-danger": "#ef4444",
      "--color-success": "#22c55e",
      "--neo-radius": "6px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "2px",
      "--neo-shadow-blur": "6px",
      "--neo-shadow-color": "rgba(0,0,0,0.06)",
      "--font-family": "inherit",
    },
  },
  // Neo Brutalism
  {
    name: "Neo Bold",
    category: "Neo Brutalism",
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
      "--font-family": "inherit",
    },
  },
  {
    name: "Neo Dark",
    category: "Neo Brutalism",
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
      "--font-family": "inherit",
    },
  },
  // Glassmorphism
  {
    name: "Glass Light",
    category: "Glassmorphism",
    dataTheme: "glass-light",
    config: {
      "--color-bg": "rgba(255, 255, 255, 0.5)",
      "--color-surface": "rgba(255, 255, 255, 0.75)",
      "--color-primary": "#6366f1",
      "--color-text": "#1e293b",
      "--color-border": "rgba(0, 0, 0, 0.1)",
      "--color-secondary": "#ec4899",
      "--color-danger": "#dc2626",
      "--color-success": "#16a34a",
      "--neo-radius": "20px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "8px",
      "--neo-shadow-blur": "32px",
      "--neo-shadow-color": "rgba(0, 0, 0, 0.1)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Glass Dark",
    category: "Glassmorphism",
    dataTheme: "glass",
    config: {
      "--color-bg": "rgba(15, 23, 42, 0.7)",
      "--color-surface": "rgba(30, 41, 59, 0.75)",
      "--color-primary": "#818cf8",
      "--color-text": "#f1f5f9",
      "--color-border": "rgba(255, 255, 255, 0.15)",
      "--color-secondary": "#f472b6",
      "--color-danger": "#f87171",
      "--color-success": "#34d399",
      "--neo-radius": "20px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "8px",
      "--neo-shadow-blur": "32px",
      "--neo-shadow-color": "rgba(0, 0, 0, 0.4)",
      "--font-family": "inherit",
    },
  },
  // Retro / Gaming
  {
    name: "Retro Arcade",
    category: "Retro Gaming",
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
      "--font-family": "var(--font-pixel), 'Courier New', monospace",
    },
  },
  {
    name: "Game Boy Classic",
    category: "Retro Gaming",
    dataTheme: "pixel-art-light",
    config: {
      "--color-bg": "#9bbc0f",
      "--color-surface": "#8bac0f",
      "--color-primary": "#0f380f",
      "--color-text": "#0f380f",
      "--color-border": "#0f380f",
      "--color-secondary": "#306230",
      "--color-danger": "#8b0000",
      "--color-success": "#0f380f",
      "--neo-radius": "0px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "0px",
      "--neo-shadow-blur": "0px",
      "--neo-shadow-color": "rgba(15,56,15,0.2)",
      "--font-family": "var(--font-pixel), 'Courier New', monospace",
    },
  },
  {
    name: "NES Classic",
    category: "Retro Gaming",
    dataTheme: "pixel-art",
    config: {
      "--color-bg": "#000000",
      "--color-surface": "#1a1a1a",
      "--color-primary": "#e60012",
      "--color-text": "#ffffff",
      "--color-border": "#ffffff",
      "--color-secondary": "#0097e6",
      "--color-danger": "#e60012",
      "--color-success": "#44bd32",
      "--neo-radius": "0px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "0px",
      "--neo-shadow-blur": "0px",
      "--neo-shadow-color": "rgba(255,255,255,0.1)",
      "--font-family": "var(--font-pixel), 'Courier New', monospace",
    },
  },
  // Cyberpunk
  {
    name: "Cyberpunk Neon",
    category: "Cyberpunk",
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
      "--font-family": "inherit",
    },
  },
  {
    name: "Cyberpunk Pink",
    category: "Cyberpunk",
    dataTheme: "",
    config: {
      "--color-bg": "#0f0f1a",
      "--color-surface": "#1a1a2f",
      "--color-primary": "#ff2a6d",
      "--color-text": "#05d9e8",
      "--color-border": "#05d9e8",
      "--color-secondary": "#d1f7ff",
      "--color-danger": "#ff2a6d",
      "--color-success": "#00ff9f",
      "--neo-border-width": "2px",
      "--neo-radius": "0px",
      "--neo-shadow-offset-x": "4px",
      "--neo-shadow-offset-y": "4px",
      "--neo-shadow-blur": "0px",
      "--neo-shadow-color": "#ff2a6d",
      "--font-family": "inherit",
    },
  },
  // Special
  {
    name: "Architecture Blueprint",
    category: "Special",
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
      "--font-family": "inherit",
    },
  },
  {
    name: "Monopoly Classic",
    category: "Special",
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
      "--font-family": "inherit",
    },
  },
  {
    name: "Blueprint Night",
    category: "Special",
    dataTheme: "",
    config: {
      "--color-bg": "#0c1929",
      "--color-surface": "#132f4c",
      "--color-primary": "#4fc3f7",
      "--color-text": "#b2bac2",
      "--color-border": "#1e4976",
      "--color-secondary": "#81d4fa",
      "--color-danger": "#ff6b6b",
      "--color-success": "#69f0ae",
      "--neo-radius": "4px",
      "--neo-shadow-offset-x": "2px",
      "--neo-shadow-offset-y": "2px",
      "--neo-shadow-blur": "8px",
      "--neo-shadow-color": "rgba(79,195,247,0.25)",
      "--font-family": "inherit",
    },
  },
  {
    name: "Construction Site",
    category: "Special",
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
      "--font-family": "inherit",
    },
  },
  {
    name: "Golden Luxury",
    category: "Special",
    dataTheme: "",
    config: {
      "--color-bg": "#0a0a0a",
      "--color-surface": "#1c1c1c",
      "--color-primary": "#ffd700",
      "--color-text": "#f5f5f5",
      "--color-border": "#333333",
      "--color-secondary": "#b8860b",
      "--color-danger": "#dc143c",
      "--color-success": "#228b22",
      "--neo-radius": "4px",
      "--neo-shadow-offset-x": "0px",
      "--neo-shadow-offset-y": "4px",
      "--neo-shadow-blur": "16px",
      "--neo-shadow-color": "rgba(255,215,0,0.3)",
      "--font-family": "inherit",
    },
  },
];

const CATEGORIES = [
  "All",
  "Real Estate",
  "Modern",
  "Neo Brutalism",
  "Glassmorphism",
  "Retro Gaming",
  "Cyberpunk",
  "Special",
];

function CustomSelect({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; color?: string }[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (e.key === "Enter" && isOpen && highlightedIndex >= 0) {
      e.preventDefault();
      onChange(options[highlightedIndex].value);
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className="neo-input w-full text-left flex items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2">
          {selectedOption?.color && (
            <span
              className="w-4 h-4 rounded-full border-2 border-[var(--color-border)]"
              style={{ backgroundColor: selectedOption.color }}
            />
          )}
          <span className={selectedOption ? "" : "opacity-50"}>
            {selectedOption?.label || placeholder || "Select..."}
          </span>
        </span>
        <ChevronDown
          size={18}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 max-h-[300px] overflow-y-auto bg-[var(--color-surface)] border-[var(--neo-border-width)] border-[var(--color-border)] shadow-lg">
          {options.map((option, index) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                setHighlightedIndex(-1);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                value === option.value
                  ? "bg-[var(--color-primary)] text-white"
                  : index === highlightedIndex
                    ? "bg-[var(--color-primary)]/30 text-[var(--color-text)]"
                    : "text-[var(--color-text)] hover:bg-[var(--color-primary)]/20"
              }`}
            >
              {option.color && (
                <span
                  className="w-4 h-4 rounded-full border-2 border-current"
                  style={{ backgroundColor: option.color }}
                />
              )}
              <span className="flex-1">{option.label}</span>
              {value === option.value && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThemeChanger({ className }: { className?: string }) {
  const { themeConfig, setThemeConfig } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [localConfig, setLocalConfig] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string>("");

  const filteredPresets = PRESETS;

  useEffect(() => {
    if (!isOpen) {
      setLocalConfig(themeConfig);
      const match = PRESETS.find((p) =>
        Object.keys(p.config).every(
          (k) =>
            localConfig[k] === p.config[k] || themeConfig[k] === p.config[k],
        ),
      );
      if (match) {
        setSelectedTheme(match.name);
      }
    }
  }, [themeConfig, isOpen]);

  const handleValueChange = (key: string, value: string) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    const root = document.documentElement;
    if (key.startsWith("--")) {
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
      setThemeConfig(localConfig);
    } catch (err) {
      console.error("Failed to save theme:", err);
    } finally {
      setIsSaving(false);
      setIsOpen(false);
    }
  };

  const applyPreset = (
    presetConfig: Record<string, string>,
    dataTheme: string,
    presetName: string,
  ) => {
    setSelectedTheme(presetName);
    const configWithTheme = {
      ...localConfig,
      ...presetConfig,
      "--data-theme": dataTheme,
    };
    setLocalConfig(configWithTheme);
    const root = document.documentElement;
    Object.entries(presetConfig).forEach(([key, value]) => {
      if (key.startsWith("--")) {
        root.style.setProperty(key, value);
      }
    });
    if (dataTheme) {
      document.body.setAttribute("data-theme", dataTheme);
    } else {
      document.body.removeAttribute("data-theme");
    }
  };

  const getThemeColor = (theme: ThemePreset): string => {
    return theme.config["--color-primary"] || "#6366f1";
  };

  const selectOptions = PRESETS.map((p) => ({
    value: p.name,
    label: p.name,
    color: getThemeColor(p),
  }));

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

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-[var(--color-bg)] border-l-[var(--neo-border-width)] border-[var(--color-border)] z-50 transform transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-[-10px_0_0_rgba(0,0,0,1)] ${isOpen ? "translate-x-0" : "translate-x-[110%]"}`}
      >
        <div className="flex flex-col h-full">
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

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="space-y-2">
              <h3 className="font-bold uppercase text-xs opacity-70">Theme</h3>
              <CustomSelect
                value={selectedTheme}
                onChange={(name) => {
                  const preset = PRESETS.find((p) => p.name === name);
                  if (preset) {
                    applyPreset(preset.config, preset.dataTheme, preset.name);
                  }
                }}
                options={selectOptions}
                placeholder="-- Choose a Theme --"
              />
            </div>

            <hr className="border-[var(--color-border)] border-dashed border-t-2" />

            <div className="space-y-4">
              <h3 className="font-bold uppercase text-xs opacity-70">
                Brand Colors &amp; Styling
              </h3>

              {THEME_VARIABLES.map((v) => {
                const val = localConfig[v.key] ?? v.default;

                if (v.type === "color") {
                  return (
                    <div
                      key={v.key}
                      className="flex items-center justify-between gap-4"
                    >
                      <label className="text-sm font-bold truncate flex-1">
                        {v.label}
                      </label>
                      <div
                        className="flex items-center gap-2 shrink-0"
                        dir="rtl"
                      >
                        <input
                          type="text"
                          value={val}
                          onChange={(e) =>
                            handleValueChange(v.key, e.target.value)
                          }
                          className="neo-input py-1 px-2 text-sm w-24 font-mono uppercase"
                          dir="ltr"
                        />
                        <input
                          type="color"
                          value={val.length === 7 ? val : v.default}
                          onChange={(e) =>
                            handleValueChange(
                              v.key,
                              e.target.value.toUpperCase(),
                            )
                          }
                          className="w-8 h-8 rounded border-2 border-[var(--color-border)] cursor-pointer p-0 bg-transparent"
                          style={{
                            appearance: "none",
                            WebkitAppearance: "none",
                          }}
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
                        <span className="font-mono bg-[var(--color-surface)] px-1 border border-black">
                          {val}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={v.min}
                        max={v.max}
                        step={v.step}
                        value={numVal}
                        onChange={(e) =>
                          handleValueChange(v.key, `${e.target.value}${v.unit}`)
                        }
                        className="w-full accent-[var(--color-primary)]"
                      />
                    </div>
                  );
                }

                return null;
              })}
            </div>
          </div>

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
