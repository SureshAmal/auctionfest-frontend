"use client";

import React from "react";
import { motion } from "framer-motion";

interface NeoCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    onClick?: () => void;
}

export default function NeoCard({ children, className = "", hoverEffect = false, onClick }: NeoCardProps) {
    return (
        <motion.div
            onClick={onClick}
            initial={{ boxShadow: "var(--neo-shadow-offset-x) var(--neo-shadow-offset-y) 0 var(--neo-shadow-color)" }}
            whileHover={hoverEffect ? {
                x: -2,
                y: -2,
                boxShadow: "10px 10px 0 var(--neo-shadow-color)"
            } : {}}
            style={{ borderRadius: "var(--neo-radius)", overflow: "hidden" }}
            className={`bg-[var(--color-bg)] neo-border p-6 ${className}`}
        >
            {children}
        </motion.div>
    );
}
