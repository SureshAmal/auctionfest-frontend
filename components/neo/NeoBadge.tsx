"use client";

import React from "react";

interface NeoBadgeProps {
    variant?: "success" | "danger" | "warning" | "info" | "neutral";
    children: React.ReactNode;
}

export default function NeoBadge({ variant = "neutral", children }: NeoBadgeProps) {
    const variants = {
        success: "bg-[var(--color-success)] text-[var(--color-text)]",
        danger: "bg-[var(--color-danger)] text-[var(--color-bg)]",
        warning: "bg-[var(--color-surface)] text-[var(--color-text)]",
        info: "bg-[var(--color-secondary)] text-[var(--color-bg)]",
        neutral: "bg-[var(--color-bg)] text-[var(--color-text)]",
    };

    return (
        <span
            className={`inline-block px-2 py-1 text-xs font-bold uppercase border-2 border-[var(--color-border)] ${variants[variant]}`}
            style={{ borderRadius: "var(--neo-radius)" }}
        >
            {children}
        </span>
    );
}
