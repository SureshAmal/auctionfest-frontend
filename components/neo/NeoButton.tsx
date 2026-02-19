"use client";

import React from "react";
import { motion } from "framer-motion";

interface NeoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "secondary" | "danger" | "success" | "base";
    size?: "sm" | "md" | "lg";
    children: React.ReactNode;
}

export default function NeoButton({
    variant = "primary",
    size = "md",
    children,
    className = "",
    ...props
}: NeoButtonProps) {
    const baseStyles = "font-bold uppercase tracking-wider neo-border flex items-center justify-center cursor-pointer select-none";

    const variants = {
        primary: "bg-[var(--color-primary)] text-white",
        secondary: "bg-[var(--color-secondary)] text-white",
        danger: "bg-[var(--color-danger)] text-white",
        success: "bg-[var(--color-success)] text-black",
        base: "bg-[var(--color-bg)] text-[var(--color-text)]",
    };

    const sizes = {
        sm: "px-3 py-1 text-sm h-8",
        md: "px-6 py-3 text-base h-12",
        lg: "px-8 py-4 text-lg h-14",
    };

    return (
        <motion.button
            whileHover={{
                x: -2,
                y: -2,
                boxShadow: "8px 8px 0 var(--neo-shadow-color)"
            }}
            whileTap={{
                x: 4,
                y: 4,
                boxShadow: "0px 0px 0 var(--neo-shadow-color)"
            }}
            initial={{ boxShadow: "6px 6px 0 var(--neo-shadow-color)" }}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props as any}
        >
            {children}
        </motion.button>
    );
}
