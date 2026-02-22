"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
// import plotData from "@/app/data/plots.json"; // REMOVED: Fetching from API

interface PlotData {
    id: number | string; // ID might be string from DXF
    cx: number;
    cy: number;
    is_red?: boolean;
    color?: string;
    polygon: number[][]; // [[x,y], [x,y], ...]
}

interface Plot {
    number: number;
    status: string; // 'pending', 'active', 'sold'
    winner_team_id: string | null;
}

interface MapProps {
    plots: Plot[]; // Backend status data
    currentPlotNumber: number | null;
}

export default function Map({ plots, currentPlotNumber }: MapProps) {
    const [geometryData, setGeometryData] = useState<PlotData[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch geometry from backend
    useEffect(() => {
        const fetchGeometry = async () => {
            try {
                // Use window.location.hostname to support network access
                const hostname = window.location.hostname;
                const res = await fetch(`http://${hostname}:8000/map/plots`);
                if (res.ok) {
                    const data = await res.json();
                    setGeometryData(data);
                } else {
                    console.error("Failed to fetch map data");
                }
            } catch (err) {
                console.error("Error fetching map geometry:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchGeometry();
    }, []);

    // Merge static geometry data with dynamic status data
    const mapPlots = useMemo(() => {
        if (!geometryData.length) return [];

        return geometryData.map(geo => {
            // Flexible matching (string/number)
            const statusInfo = plots.find(p => p.number == geo.id);
            return {
                ...geo,
                status: statusInfo?.status || 'pending',
                isCurrent: geo.id == currentPlotNumber, // Loose equality for string/number match
                winner: statusInfo?.winner_team_id
            };
        });
    }, [plots, currentPlotNumber, geometryData]);

    // Calculate Focus: Find center of current plot(s)
    const focusState = useMemo(() => {
        if (!currentPlotNumber) return { x: 50, y: 50, scale: 1 };

        const currentGeos = mapPlots.filter(p => p.id == currentPlotNumber);
        if (currentGeos.length === 0) return { x: 50, y: 50, scale: 1 };

        // Average center if multiple polygons (split plots)
        const avgX = currentGeos.reduce((sum, p) => sum + p.cx, 0) / currentGeos.length;
        const avgY = currentGeos.reduce((sum, p) => sum + p.cy, 0) / currentGeos.length;

        // Higher zoom for better look (Increased to 6 as requested)
        return { x: avgX, y: avgY, scale: 6 };
    }, [currentPlotNumber, mapPlots]);

    const activePlots = mapPlots.filter(p => p.isCurrent);

    if (loading && geometryData.length === 0) {
        return <div className="text-white text-center p-4">Loading Map...</div>;
    }

    return (
        // Aspect Ratio set to match Polygon Data Origin (approx 1.414 Landscape)
        // The user provided images are Square, but the polygons were traced on a 1.414 map.
        // We MUST use aspect-[1.414] for the polygons to align correctly.
        // The Image will be stretched (object-fill) to fit this container, resolving the misalignment.
        <div className="relative max-h-[80vh] w-auto aspect-[1.414] mx-auto bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-white/10 group">

            {/* Movable Container (Pan & Zoom) */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentPlotNumber || 'overview'}
                    className="relative w-full h-full"
                    initial={{
                        opacity: 0,
                        scale: 1, // Start zoomed out
                        x: `${(50 - focusState.x) * focusState.scale}%`,
                        y: `${(50 - focusState.y) * focusState.scale}%`,
                    }}
                    animate={{
                        opacity: 1,
                        scale: focusState.scale, // Zoom in to target
                        x: `${(50 - focusState.x) * focusState.scale}%`, // Pan to center
                        y: `${(50 - focusState.y) * focusState.scale}%`,
                    }}
                    exit={{
                        opacity: 0,
                        scale: 1, // Zoom out when exiting
                        x: `${(50 - focusState.x) * focusState.scale}%`,
                        y: `${(50 - focusState.y) * focusState.scale}%`,
                    }}
                    transition={{ duration: 1.0, ease: "easeInOut" }}
                    style={{ originX: 0.5, originY: 0.5 }} // Scale from center of view
                >
                    {/* 1. Base Map - BACKGROUND */}
                    <div className="absolute inset-0 w-full h-full">
                        <Image
                            src="/planomics.png"
                            alt="Planomics Town Plan"
                            fill
                            className="object-fill"
                            style={{ transform: "scale(0.94) translate(-0.5%, -2.5%)", transformOrigin: "center" }}
                            priority
                        />
                    </div>

                    {/* 2. Highlight Layer - Only the active plot reveals the Full Color Bright Image */}
                    <svg
                        viewBox="0 0 100 100"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        preserveAspectRatio="none"
                    >
                        <defs>
                            {/* Define Clip Path for Active Plots */}
                            <clipPath id="active-clip">
                                {activePlots.map((plot, i) => (
                                    <polygon
                                        key={i}
                                        points={plot.polygon.map(pt => `${pt[0]},${pt[1]}`).join(" ")}
                                    />
                                ))}
                            </clipPath>

                            {/* Shadow Filter for "Lift" Effect */}
                            <filter id="lift-shadow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="blur" />
                                <feOffset in="blur" dx="1" dy="1" result="offsetBlur" />
                                <feFlood floodColor="rgba(0,0,0,0.7)" result="color" />
                                <feComposite in="color" in2="offsetBlur" operator="in" result="shadow" />
                                <feMerge>
                                    <feMergeNode in="shadow" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* The Full Color Map Image - Revealed ONLY where clipped. */}
                        <AnimatePresence>
                            {activePlots.length > 0 && (
                                <motion.image
                                    href="/map-v3.png"
                                    x="0" y="0" width="100" height="100"
                                    clipPath="url(#active-clip)"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.5 }}
                                    preserveAspectRatio="none"
                                />
                            )}
                        </AnimatePresence>

                        {/* 3. Stroke/Outline for Active Plots */}
                        <AnimatePresence>
                            {activePlots.map((plot, index) => (
                                <motion.polygon
                                    key={`outline-${plot.id}-${index}`}
                                    points={plot.polygon.map(pt => `${pt[0]},${pt[1]}`).join(" ")}
                                    fill="transparent"
                                    stroke="#facc15" // Gold/Yellow Highlight
                                    strokeWidth="0.4"
                                    filter="url(#lift-shadow)" // Apply shadow
                                    initial={{ opacity: 0, scale: 1 }}
                                    animate={{
                                        opacity: 1,
                                        scale: 1.05, // Slight scale up for "lift"
                                        translateX: -0.5, // Center the scale (approx)
                                        translateY: -0.5
                                    }}
                                    exit={{ opacity: 0, scale: 1 }}
                                    transition={{ duration: 0.8, ease: "easeInOut" }}
                                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                                />
                            ))}
                        </AnimatePresence>
                    </svg>

                    {/* 4. Sold Plots Overlay - Just faint green fill */}
                    <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
                        {mapPlots.filter(p => p.status === 'sold' && !p.isCurrent).map((plot, i) => (
                            <polygon
                                key={`sold-${i}`}
                                points={plot.polygon.map(pt => `${pt[0]},${pt[1]}`).join(" ")}
                                fill="rgba(34, 197, 94, 0.3)" // Green
                                stroke="rgba(34, 197, 94, 0.5)"
                                strokeWidth="0.05"
                            />
                        ))}
                    </svg>

                    {/* 5. Active Plot Pulse/Glow */}
                    {activePlots.map((plot, i) => (
                        <svg key={`pulse-${i}`} viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" preserveAspectRatio="none">
                            <motion.polygon
                                points={plot.polygon.map(pt => `${pt[0]},${pt[1]}`).join(" ")}
                                fill="transparent"
                                stroke="#fbbf24"
                                strokeWidth={0.2}
                                animate={{
                                    opacity: [0.8, 0.4, 0.8], // Pulse opacity only
                                    strokeWidth: [0.2, 0.5, 0.2]
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                style={{ vectorEffect: "non-scaling-stroke" }}
                            />
                        </svg>
                    ))}
                </motion.div>
            </AnimatePresence>

            {/* Overlay Info */}
            <div className="absolute top-4 left-4 pointer-events-none z-10">
                <div className="bg-[var(--color-surface)] px-3 py-1.5 border-2 border-black font-bold text-xs text-black shadow-[2px_2px_0_black]">
                    {currentPlotNumber ? `Viewing Plot ${currentPlotNumber}` : "Overview"}
                </div>
            </div>
        </div>
    );
}
