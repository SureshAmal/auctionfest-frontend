"use client";

import React from "react";

interface NeoLayoutProps {
    children: React.ReactNode;
    className?: string;
    containerized?: boolean;
}

export default function NeoLayout({ children, className = "", containerized = true }: NeoLayoutProps) {
    return (
        <div className={`min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] transition-colors duration-300 font-sans ${className}`}>
            {containerized ? (
                <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
                    {children}
                </div>
            ) : (
                children
            )}
        </div>
    );
}
