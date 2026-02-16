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

/**
 * Plot positions mapped from the PLANOMICS TOWN PLAN image.
 * Each plot has an id, x/y position (as % from top-left), and width/height (as %).
 * Positions are derived by analyzing the map image for number labels and plot boundaries.
 *
 * Layout reference:
 * - Central octagonal area with CENTRAL LAKE in the middle
 * - Inner ring: plots 1-9 (around the central lake)
 * - Middle ring: plots 10-20 (surrounding inner ring, along roads)
 * - Outer ring: plots 21-37 (along the diagonal and edge roads)
 * - Corner/edge: plots 38-43 (peripheral plots)
 */
const PLOT_POSITIONS: { id: number; x: number; y: number; w: number; h: number }[] = [
    // === Inner ring (around Central Lake) ===
    // Plot 1 - left of center lake
    { id: 1, x: 35.5, y: 46, w: 5, h: 5 },
    // Plot 2 - top-left of center (road junction)
    { id: 2, x: 39, y: 38, w: 4, h: 4 },
    // Plot 3 - top-center left
    { id: 3, x: 44, y: 35.5, w: 4, h: 3.5 },
    // Plot 4 - top-center right
    { id: 4, x: 49, y: 35.5, w: 4, h: 3.5 },
    // Plot 5 - right of center (upper)
    { id: 5, x: 55, y: 38, w: 4, h: 4 },
    // Plot 6 - right of center lake
    { id: 6, x: 57, y: 46, w: 5, h: 5 },
    // Plot 7 - bottom-right of center
    { id: 7, x: 55, y: 52.5, w: 4, h: 4 },
    // Plot 8 - bottom-center left
    { id: 8, x: 44, y: 54, w: 4, h: 3.5 },
    // Plot 9 - bottom-center right
    { id: 9, x: 49, y: 54, w: 4, h: 3.5 },

    // === Second ring (mid-ring, labeled on map) ===
    // Plot 10 - far left (below plot 1)
    { id: 10, x: 31, y: 50, w: 4, h: 4 },
    // Plot 11 - left of plot 1
    { id: 11, x: 33, y: 44, w: 4, h: 4 },
    // Plot 12 - above plot 2, left diagonal
    { id: 12, x: 37, y: 34, w: 3.5, h: 3.5 },
    // Plot 13 - top area, above inner plots (left)
    { id: 13, x: 43, y: 28, w: 4, h: 4 },
    // Plot 14 - top area, below 13 (left)
    { id: 14, x: 43, y: 32, w: 4.5, h: 3 },
    // Plot 15 - top-right diagonal
    { id: 15, x: 56, y: 34, w: 3.5, h: 3.5 },
    // Plot 16 - right of center lake (mid)
    { id: 16, x: 61, y: 44, w: 4, h: 4 },
    // Plot 17 - right below center, diagonal
    { id: 17, x: 60, y: 52, w: 3.5, h: 3.5 },
    // Plot 18 - bottom area (left)
    { id: 18, x: 43, y: 60, w: 4.5, h: 3 },
    // Plot 19 - bottom area (right)
    { id: 19, x: 48, y: 58, w: 4.5, h: 3 },
    // Plot 20 - bottom-left diagonal
    { id: 20, x: 37, y: 56, w: 3.5, h: 3.5 },

    // === Outer ring and diagonal roads ===
    // Plot 21 - left side, above center
    { id: 21, x: 27, y: 47, w: 4, h: 5 },
    // Plot 22 - left diagonal, below center
    { id: 22, x: 30, y: 40, w: 4, h: 4 },
    // Plot 23 - upper-left diagonal
    { id: 23, x: 33, y: 30, w: 4, h: 4 },
    // Plot 24 - upper area, slightly left
    { id: 24, x: 37, y: 22, w: 4, h: 4 },
    // Plot 25 - top center, above 26
    { id: 25, x: 43, y: 20, w: 5, h: 4 },
    // Plot 26 - top center (left)
    { id: 26, x: 48, y: 18, w: 5, h: 4 },
    // Plot 27 - below 25/26 (left)
    { id: 27, x: 45, y: 24, w: 4, h: 3.5 },
    // Plot 28 - upper-right diagonal
    { id: 28, x: 58, y: 22, w: 4, h: 4 },
    // Plot 29 - right side, upper
    { id: 29, x: 65, y: 29, w: 4, h: 4 },
    // Plot 30 - right side, center
    { id: 30, x: 66, y: 40, w: 4, h: 4 },
    // Plot 31 - right side, below center
    { id: 31, x: 66, y: 48, w: 4, h: 4 },
    // Plot 32 - lower-right diagonal
    { id: 32, x: 63, y: 56, w: 4, h: 4 },
    // Plot 33 - lower-right
    { id: 33, x: 60, y: 62, w: 4, h: 4 },
    // Plot 34 - bottom center (right)
    { id: 34, x: 52, y: 68, w: 5, h: 3.5 },
    // Plot 35 - bottom center (left pair)
    { id: 35, x: 46, y: 66, w: 4.5, h: 3.5 },
    // Plot 36 - bottom center left
    { id: 36, x: 40, y: 68, w: 5, h: 3.5 },
    // Plot 37 - lower-left diagonal
    { id: 37, x: 32, y: 63, w: 4, h: 4 },

    // === Edge/Corner plots ===
    // Plot 38 - far left, center
    { id: 38, x: 24, y: 56, w: 4, h: 4 },
    // Plot 39 - far left, above
    { id: 39, x: 19, y: 44, w: 4, h: 5 },
    // Plot 40 - far bottom-left
    { id: 40, x: 19, y: 65, w: 5, h: 5 },
    // Plot 41 - far right, center
    { id: 41, x: 74, y: 44, w: 5, h: 5 },
    // Plot 42 - far top-right
    { id: 42, x: 74, y: 22, w: 5, h: 5 },
    // Plot 43 - far top, right of center
    { id: 43, x: 65, y: 14, w: 5, h: 5 },
];

/**
 * Map component that renders the PLANOMICS TOWN PLAN with interactive plot overlays.
 * Each plot is positioned based on coordinates derived from the actual map image.
 *
 * @param plots - Array of plot data from the backend
 * @param currentPlotNumber - The currently active plot number (if any)
 */
export default function Map({ plots, currentPlotNumber }: MapProps) {
    return (
        <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/10">
            {/* Base Map */}
            <Image
                src="/planomics-white.png"
                alt="Planomics Town Plan"
                fill
                className="object-contain opacity-60"
            />

            {/* Plot Overlays */}
            <div className="absolute inset-0">
                {PLOT_POSITIONS.map((pos) => {
                    const plot = plots.find(p => p.number === pos.id);
                    const isActive = pos.id === currentPlotNumber;
                    const isSold = plot?.status === 'sold';
                    const isPending = !isSold && !isActive;

                    return (
                        <motion.div
                            key={pos.id}
                            initial={{ opacity: 0 }}
                            animate={{
                                opacity: isActive ? 1 : isSold ? 0.7 : 0.15,
                                scale: isActive ? 1.05 : 1,
                            }}
                            whileHover={{ opacity: 0.9, scale: 1.03 }}
                            transition={{ duration: 0.3 }}
                            className={`absolute flex items-center justify-center rounded-md cursor-pointer border
                                ${isActive
                                    ? 'bg-purple-500/50 border-purple-400 z-20 shadow-lg shadow-purple-500/30'
                                    : isSold
                                        ? 'bg-green-500/40 border-green-400/60 z-10'
                                        : 'bg-white/5 border-white/10 hover:bg-white/15'
                                }
                            `}
                            style={{
                                top: `${pos.y}%`,
                                left: `${pos.x}%`,
                                width: `${pos.w}%`,
                                height: `${pos.h}%`,
                            }}
                        >
                            <span className={`font-bold text-[10px] sm:text-xs leading-none
                                ${isActive ? 'text-white' : isSold ? 'text-green-200' : 'text-gray-400'}
                            `}>
                                {pos.id}
                            </span>

                            {/* Active plot pulse animation */}
                            {isActive && (
                                <motion.div
                                    className="absolute inset-0 rounded-md border-2 border-purple-400"
                                    animate={{ opacity: [0.4, 1, 0.4] }}
                                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                />
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
}
