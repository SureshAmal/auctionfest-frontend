"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Plot {
    number: number;
    status: string; // 'pending', 'active', 'sold'
    winner_team_id: string | null;
}

interface MapProps {
    plots: Plot[];
    currentPlotNumber: number | null;
}

// Simple grid configuration for plot positions (just an example, real would need precise coordinates)
// For 12 plots, let's assume a 4x3 grid overlay on the image
const PLOT_POSITIONS = [
    { id: 1, x: 10, y: 10 }, { id: 2, x: 30, y: 10 }, { id: 3, x: 50, y: 10 }, { id: 4, x: 70, y: 10 },
    { id: 5, x: 10, y: 40 }, { id: 6, x: 30, y: 40 }, { id: 7, x: 50, y: 40 }, { id: 8, x: 70, y: 40 },
    { id: 9, x: 10, y: 70 }, { id: 10, x: 30, y: 70 }, { id: 11, x: 50, y: 70 }, { id: 12, x: 70, y: 70 },
];

export default function Map({ plots, currentPlotNumber }: MapProps) {
    return (
        <div className="relative w-full aspect-video bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/10">
            {/* Base Map (White/B&W) */}
            <Image
                src="/planomics-white.png"
                alt="Plot Map"
                fill
                className="object-cover opacity-50 grayscale"
            />

            {/* Overlay Plots */}
            <div className="absolute inset-0">
                {PLOT_POSITIONS.map((pos) => {
                    const plot = plots.find(p => p.number === pos.id);
                    const isActive = plot?.number === currentPlotNumber;
                    const isSold = plot?.status === 'sold';

                    return (
                        <motion.div
                            key={pos.id}
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: isSold ? 0.8 : isActive ? 1 : 0.3,
                                scale: isActive ? 1.1 : 1,
                                borderColor: isActive ? '#A855F7' : isSold ? '#22C55E' : 'transparent'
                            }}
                            className={`absolute w-[15%] h-[20%] flex items-center justify-center border-2 rounded-lg cursor-pointer transition-colors
                            ${isActive ? 'bg-purple-500/40 z-20' : isSold ? 'bg-green-500/40 z-10' : 'bg-white/5 hover:bg-white/10'}
                        `}
                            style={{ top: `${pos.y}%`, left: `${pos.x}%` }}
                        >
                            <span className={`font-bold ${isActive ? 'text-white text-xl' : 'text-gray-300'}`}>
                                {pos.id}
                            </span>
                            {isActive && (
                                <motion.div
                                    className="absolute inset-0 rounded-lg border-4 border-purple-500"
                                    animate={{ opacity: [0.5, 1, 0.5] }}
                                    transition={{ repeat: Infinity, duration: 1.5 }}
                                />
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
