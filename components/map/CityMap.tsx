"use client";
import React, { useEffect, useRef, useState } from "react";
import { City1SVG } from "./City1SVG";
import { City2SVG } from "./City2SVG";

interface CityMapProps {
    /** The currently active plot number to highlight. */
    currentPlotNumber?: string | number | null;
    /** All plot data for the map. */
    plots?: any[];
    /** All teams for name lookup. */
    allTeams?: any[];
    /** Adjustments from the current policy only: { plotNumber: deltaAmount }. */
    recentAdjustments?: Record<number, number>;
    /** The current auction round. */
    currentRound?: number;
    /** Callback when a plot is clicked. */
    onPlotClick?: (plotNumber: string) => void;
}

/**
 * CityMap component that renders the SVG map with plot highlights.
 *
 * - Sold plots (no current policy change): Green, hoverable
 * - Recently adjusted plots (current policy): Orange/Red with pulse, hoverable
 * - Active plot: Primary color
 * - Hover tooltip shows team, value, and adjustment details
 */
export default function CityMap({ currentPlotNumber, plots = [], allTeams = [], recentAdjustments = {}, currentRound = 1, onPlotClick }: CityMapProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [centers, setCenters] = useState<Record<string, { x: number; y: number }>>({});

    // Tooltip state
    const [hoveredPlot, setHoveredPlot] = useState<any>(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!svgRef.current) return;

        const newCenters: Record<string, { x: number; y: number }> = {};
        const groups = svgRef.current.querySelectorAll("g[id]");

        groups.forEach((g) => {
            const id = g.getAttribute("id");
            if (id && id !== "city_1" && id !== "city 1" && id !== "road" && !isNaN(Number(id))) {
                const bbox = (g as SVGGElement).getBBox();
                newCenters[id] = {
                    x: bbox.x + bbox.width / 2,
                    y: bbox.y + bbox.height / 2
                };
            }
        });

        setCenters(newCenters);
    }, []);

    // Throttle helper to reduce hover lag
    const hoverTimeout = useRef<NodeJS.Timeout | null>(null);

    // Track mouse over the container for tooltips
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;

        // Throttling for performance on massive SVGs
        if (hoverTimeout.current) return;
        hoverTimeout.current = setTimeout(() => {
            hoverTimeout.current = null;
        }, 50);

        const target = e.target as Element;
        const group = target.closest('g[id]');

        if (group) {
            const id = group.getAttribute('id');
            if (id && id !== "city_1" && id !== "city 1" && id !== "road" && !isNaN(Number(id))) {
                const plotData = plots.find(p => p.number.toString() === id);
                // Show tooltip for any plot with data
                if (plotData) {
                    setHoveredPlot(plotData);
                    setMousePos({ x: e.clientX, y: e.clientY });
                    return;
                }
            }
        }

        setHoveredPlot(null);
    };

    const handleMouseLeave = () => {
        setHoveredPlot(null);
    };

    const handleClick = (e: React.MouseEvent) => {
        if (!svgRef.current || !onPlotClick) return;

        const target = e.target as Element;
        const group = target.closest('g[id]');

        if (group) {
            const id = group.getAttribute('id');
            if (id && id !== "city_1" && id !== "city 1" && id !== "road" && !isNaN(Number(id))) {
                onPlotClick(id);
            }
        }
    };

    // Check which plots have recent (current policy) adjustments
    const recentPlotNumbers = new Set(Object.keys(recentAdjustments).map(Number));

    // The user requested NOT to highlight all sold plots, only currently changing plots
    // Therefore, soldPlotsStyles is removed
    const soldPlotsStyles = "";

    // Dynamic styles for recently adjusted plots (current policy only — orange/red with pulse)
    const adjustedPlotsStyles = Object.entries(recentAdjustments)
        .map(([plotNum, delta]) => {
            const fillColor = delta > 0 ? "#fb923c" : "#f87171";
            const strokeColor = delta > 0 ? "#ea580c" : "#dc2626";
            const hoverFill = delta > 0 ? "#f97316" : "#ef4444";
            return `
                g[id="${plotNum}"] path {
                    fill: ${fillColor} !important;
                    opacity: 0.9 !important;
                    stroke: ${strokeColor};
                    stroke-width: 6px;
                    animation: plotPulse 2s ease-in-out infinite;
                }
                g[id="${plotNum}"]:hover path {
                    fill: ${hoverFill} !important;
                    stroke: black;
                    stroke-width: 8px;
                    animation: none;
                }
            `;
        })
        .join("\n");

    return (
        <div
            className="relative w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={handleClick}
        >
            <style>{`
                @keyframes plotPulse {
                    0%, 100% { opacity: 0.7; }
                    50% { opacity: 1; }
                }
                .plot-group { transition: all 0.3s ease; }
                .plot-group:hover path { fill: var(--color-surface); opacity: 0.8; stroke: var(--color-primary); stroke-width: 8px; }
                .plot-active path { fill: var(--color-primary) !important; opacity: 1 !important; stroke: black; stroke-width: 12px; }
                #road { fill: #cccccc; opacity: 0.5; }
                ${soldPlotsStyles}
                ${adjustedPlotsStyles}
            `}</style>

            {currentRound > 1 ? (
                <City2SVG ref={svgRef} currentPlotNumber={currentPlotNumber?.toString() || ""} />
            ) : (
                <City1SVG ref={svgRef} currentPlotNumber={currentPlotNumber?.toString() || ""} />
            )}

            <svg
                className="absolute inset-0 pointer-events-none"
                viewBox={currentRound > 1 ? "0 0 3714 3385" : "0 0 3169 3024"}
                preserveAspectRatio="xMidYMid meet"
                style={{ width: '100%', height: '100%' }}
            >
                {Object.entries(centers).map(([id, pos]) => {
                    const isRecent = recentPlotNumbers.has(Number(id));

                    return (
                        <text
                            key={id}
                            x={pos.x}
                            y={pos.y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize={id === currentPlotNumber?.toString() ? "60" : "40"}
                            fontWeight="900"
                            fill={id === currentPlotNumber?.toString() ? "white" : isRecent ? "white" : "black"}
                            style={{
                                textShadow: id === currentPlotNumber?.toString() ? "0 0 15px rgba(0,0,0,0.5)" : isRecent ? "0 0 8px rgba(0,0,0,0.7)" : "none",
                                transition: "all 0.3s ease"
                            }}
                        >
                            {id}
                        </text>
                    );
                })}
            </svg>

            {/* Hover Tooltip — shown for ALL sold plots */}
            {hoveredPlot && (
                <div
                    className="fixed z-[100] pointer-events-none bg-black text-white p-3 border-4 border-white shadow-[6px_6px_0_rgba(0,0,0,0.5)] transform -translate-x-1/2 -translate-y-[120%]"
                    style={{ left: mousePos.x, top: mousePos.y }}
                >
                    <div className="flex flex-col items-center">
                        <span className="font-black text-lg mb-1">Plot #{hoveredPlot.number}</span>
                        {/* Type */}
                        {(hoveredPlot.plot_type || hoveredPlot.type) && (
                            <div className="flex items-center gap-2 mb-1">
                                <span className="opacity-70 text-xs font-bold uppercase">Type:</span>
                                <span className="font-bold text-xs">{hoveredPlot.plot_type || hoveredPlot.type}</span>
                            </div>
                        )}
                        {/* Owner team */}
                        {hoveredPlot.winner_team_id && (
                            <div className="flex items-center gap-2 mb-1">
                                <span className="opacity-70 text-xs font-bold uppercase">Team:</span>
                                <span className="text-[var(--color-primary)] font-bold">
                                    {allTeams.find(t => t.id === hoveredPlot.winner_team_id)?.name || hoveredPlot.winner_team_id}
                                </span>
                            </div>
                        )}
                        {/* Area */}
                        {(hoveredPlot.total_area || hoveredPlot.actual_area) && (
                            <div className="flex items-center gap-2 mb-1">
                                <span className="opacity-70 text-xs font-bold uppercase">Area:</span>
                                <span className="font-mono font-bold text-xs">
                                    {hoveredPlot.total_area} sqft <span className="opacity-50">(Actual: {hoveredPlot.actual_area} sqft)</span>
                                </span>
                            </div>
                        )}
                        {/* Base price (before adjustments) */}
                        <div className="flex items-center gap-2">
                            <span className="opacity-70 text-xs font-bold uppercase">Price:</span>
                            <span className="font-mono font-bold">
                                ₹ {Number(hoveredPlot.current_bid || hoveredPlot.total_plot_price || 0).toLocaleString('en-IN')}
                            </span>
                        </div>
                        {/* Adjustment + Current value after adj */}
                        {Number(hoveredPlot.round_adjustment || 0) !== 0 && (
                            <>
                                <div className={`flex items-center gap-2 mt-1 px-2 py-0.5 border ${Number(hoveredPlot.round_adjustment) > 0 ? "border-green-400/50 text-green-400" : "border-red-400/50 text-red-400"}`}>
                                    <span className="text-[10px] font-bold uppercase">Adj:</span>
                                    <span className="font-mono font-bold text-xs">
                                        {Number(hoveredPlot.round_adjustment) > 0 ? "+" : ""}₹{Number(hoveredPlot.round_adjustment).toLocaleString('en-IN')}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 bg-white/10 px-2 py-0.5">
                                    <span className="text-[10px] font-black uppercase">Current:</span>
                                    <span className="font-mono font-black text-sm">
                                        ₹ {(Number(hoveredPlot.current_bid || hoveredPlot.total_plot_price || 0) + Number(hoveredPlot.round_adjustment || 0)).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            </>
                        )}
                        {/* Current policy delta (only for recently changed plots) */}
                        {recentAdjustments[hoveredPlot.number] !== undefined && (
                            <div className={`flex items-center gap-2 mt-1 px-2 py-0.5 border-2 ${recentAdjustments[hoveredPlot.number] > 0 ? "border-orange-400 text-orange-300" : "border-red-400 text-red-300"}`}>
                                <span className="text-[10px] font-black uppercase">This Policy:</span>
                                <span className="font-mono font-black text-sm">
                                    {recentAdjustments[hoveredPlot.number] > 0 ? "+" : ""}₹{recentAdjustments[hoveredPlot.number].toLocaleString('en-IN')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
