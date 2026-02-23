"use client";

import React from "react";

interface NeoInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export default function NeoInput({ label, className = "", ...props }: NeoInputProps) {
    return (
        <div className="flex flex-col gap-2 w-full">
            {label && (
                <label className="font-bold uppercase tracking-wide text-sm">{label}</label>
            )}
            <input
                className={`neo-input bg-[var(--color-bg)] text-[var(--color-text)] placeholder:text-[var(--color-text)] opacity-50 w-full ${className}`}
                {...props}
            />
        </div>
    );
}
