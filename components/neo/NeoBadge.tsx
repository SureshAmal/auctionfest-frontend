"use client";

import React from "react";

interface NeoBadgeProps {
    variant?: "success" | "danger" | "warning" | "info" | "neutral";
    children: React.ReactNode;
}

export default function NeoBadge({ variant = "neutral", children }: NeoBadgeProps) {
    const variants = {
        success: "bg-[var(--color-success)] text-black",
        danger: "bg-[var(--color-danger)] text-white",
        warning: "bg-[var(--color-surface)] text-black",
        info: "bg-[var(--color-secondary)] text-white",
        neutral: "bg-gray-200 text-black",
    };

    return (
        <span className={`inline-block px-2 py-1 text-xs font-bold uppercase border-2 border-black ${variants[variant]}`}>
            {children}
        </span>
    );
}
