"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface NeoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
}

export default function NeoModal({ isOpen, onClose, title, children }: NeoModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                    >
                        <div className="bg-[var(--color-bg)] neo-border p-6 shadow-[8px_8px_0_var(--neo-shadow-color)] relative">
                            <div className="flex justify-between items-center mb-6 border-b-4 border-[var(--color-border)] pb-2">
                                {title && <h2 className="text-xl font-bold uppercase">{title}</h2>}
                                <button
                                    onClick={onClose}
                                    className="hover:bg-[var(--color-danger)] hover:text-[var(--color-bg)] p-1 transition-colors neo-border"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                            <div className="max-h-[80vh] overflow-y-auto">
                                {children}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
