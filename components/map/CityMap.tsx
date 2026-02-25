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

    // Map display mode: highlight 'changes' (recent policy) or 'types' (plot types)
    const [highlightMode, setHighlightMode] = useState<'changes' | 'types'>('changes');

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
    const isRound1 = currentRound <= 1;

    // Round 1: highlight sold plots in green so users can see who bought what
    const soldPlotsStyles = isRound1
        ? plots
            .filter(p => p.status === 'sold')
            .map(p => `
                g[id="${p.number}"] path { fill: #4ade80 !important; opacity: 0.9 !important; stroke: #16a34a; stroke-width: 6px; }
                g[id="${p.number}"]:hover path { fill: #22c55e !important; stroke: black; stroke-width: 8px; }
            `)
            .join("\n")
        : "";

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

    // ---------------------------------------------
    // Type-Based Plot Highlighting (Round 2+ only)
    // ---------------------------------------------
    const TYPE_COLORS: Record<string, { fill: string; stroke: string; hover: string }> = {
        // Residential & Housing
        "RESIDENTIAL": { fill: "#60a5fa", stroke: "#2563eb", hover: "#3b82f6" },  // Blue
        "AFFORDABLE HOUSE SCHEME": { fill: "#93c5fd", stroke: "#3b82f6", hover: "#60a5fa" },  // Light Blue
        "SLUM AREA": { fill: "#cbd5e1", stroke: "#64748b", hover: "#94a3b8" },  // Slate
        // Commercial & Business
        "COMMERCIAL": { fill: "#f472b6", stroke: "#db2777", hover: "#ec4899" },  // Pink
        "MERCHANTILE": { fill: "#fb7185", stroke: "#e11d48", hover: "#f43f5e" },  // Rose
        "HOTEL": { fill: "#c084fc", stroke: "#9333ea", hover: "#a855f7" },  // Purple
        "THEATRE": { fill: "#e879f9", stroke: "#c026d3", hover: "#d946ef" },  // Fuchsia
        "MARKETING YARD": { fill: "#f0abfc", stroke: "#a855f7", hover: "#e879f9" },  // Light Purple
        // Industrial & Utility
        "INDUSTRIAL": { fill: "#a78bfa", stroke: "#7c3aed", hover: "#8b5cf6" },  // Violet
        "ELECTRIC SUB STATION": { fill: "#fbbf24", stroke: "#d97706", hover: "#f59e0b" },  // Amber
        "WATER TREATMENT": { fill: "#22d3ee", stroke: "#0891b2", hover: "#06b6d4" },  // Cyan
        "SOLID WASTE SITE": { fill: "#a1a1aa", stroke: "#52525b", hover: "#71717a" },  // Dark Gray
        // Green / Nature
        "AGRICULTURE": { fill: "#4ade80", stroke: "#16a34a", hover: "#22c55e" },  // Green
        "GARDEN": { fill: "#86efac", stroke: "#22c55e", hover: "#4ade80" },  // Light Green
        "GOLF COURSE": { fill: "#34d399", stroke: "#059669", hover: "#10b981" },  // Emerald
        "FOREST": { fill: "#14b8a6", stroke: "#0f766e", hover: "#0d9488" },  // Teal
        "CENTRAL LAKE": { fill: "#67e8f9", stroke: "#06b6d4", hover: "#22d3ee" },  // Sky Blue
        // Government & Public
        "GOVERNMENT": { fill: "#fcd34d", stroke: "#d97706", hover: "#fbbf24" },  // Yellow
        "POLICE STATION": { fill: "#fdba74", stroke: "#ea580c", hover: "#f97316" },  // Orange
        "FIRE STATION": { fill: "#fb923c", stroke: "#c2410c", hover: "#f97316" },  // Deep Orange
        "AIRPORT": { fill: "#7dd3fc", stroke: "#0284c7", hover: "#38bdf8" },  // Sky
        // Education & Health
        "SCHOOL": { fill: "#fda4af", stroke: "#e11d48", hover: "#fb7185" },  // Light Rose
        "HOSPITAL": { fill: "#f87171", stroke: "#dc2626", hover: "#ef4444" },  // Red
        // Religious & Cultural
        "TEMPLE": { fill: "#fde68a", stroke: "#ca8a04", hover: "#facc15" },  // Gold
        "GRAVEYARD": { fill: "#d4d4d8", stroke: "#71717a", hover: "#a1a1aa" },  // Gray
        // Transport
        "RAILWAY STATION": { fill: "#fdba74", stroke: "#c2410c", hover: "#fb923c" },  // Warm Orange
        "METRO STATION": { fill: "#5eead4", stroke: "#0d9488", hover: "#2dd4bf" },  // Teal Light
        "BUS STATION": { fill: "#a5b4fc", stroke: "#6366f1", hover: "#818cf8" },  // Indigo Light
        "OFF STREET PARKING": { fill: "#d8b4fe", stroke: "#9333ea", hover: "#c084fc" },  // Lavender
        // Dangerous
        "HAZARDOUS": { fill: "#fca5a5", stroke: "#b91c1c", hover: "#f87171" },  // Danger Red
    };
    const defaultTypeColor = { fill: "#9ca3af", stroke: "#4b5563", hover: "#6b7280" }; // Gray fallback for unknown types

    const typePlotsStyles = isRound1 ? "" : plots
        .filter(p => p.plot_type || p.type)
        .map(p => {
            const typeStr = (p.plot_type || p.type || "").trim().toUpperCase();
            const colors = TYPE_COLORS[typeStr] || defaultTypeColor;
            return `
                g[id="${p.number}"] path {
                    fill: ${colors.fill} !important;
                    opacity: 0.9 !important;
                    stroke: ${colors.stroke};
                    stroke-width: 6px;
                    transition: fill 0.3s ease;
                }
                g[id="${p.number}"]:hover path {
                    fill: ${colors.hover} !important;
                    stroke: black;
                    stroke-width: 8px;
                }
            `;
        })
        .join("\n");

    // Decide which styles to apply based on round and mode
    const mapGlobalStyles = isRound1 ? "" : (highlightMode === 'changes' ? adjustedPlotsStyles : typePlotsStyles);

    return (
        <div className="relative w-full h-full overflow-hidden bg-[var(--color-bg)]">
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
                    /* Custom scrollbar for legend strip */
                    .legend-scroll::-webkit-scrollbar { height: 4px; }
                    .legend-scroll::-webkit-scrollbar-track { background: var(--color-bg); border-radius: 2px; }
                    .legend-scroll::-webkit-scrollbar-thumb { background: var(--color-primary); border-radius: 2px; }
                    .legend-scroll::-webkit-scrollbar-thumb:hover { background: var(--color-text); }
                    .legend-scroll { scrollbar-width: thin; scrollbar-color: var(--color-primary) var(--color-bg); }
                    ${soldPlotsStyles}
                    ${mapGlobalStyles}
                `}</style>

                {currentRound > 1 ? (
                    <City2SVG ref={svgRef} currentPlotNumber={currentPlotNumber?.toString() || ""} className="w-full h-full object-contain" />
                ) : (
                    <City1SVG ref={svgRef} currentPlotNumber={currentPlotNumber?.toString() || ""} className="w-full h-full object-contain" />
                )}

                <svg
                    className="absolute inset-4 pointer-events-none"
                    viewBox={currentRound > 1 ? "0 0 3714 3385" : "0 0 3169 3024"}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ width: 'calc(100% - 2rem)', height: 'calc(100% - 2rem)' }}
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

                {/* Hover Tooltip */}
                {hoveredPlot && (
                    <div
                        className="fixed z-[100] pointer-events-none bg-black text-white p-3 border-4 border-white shadow-[6px_6px_0_rgba(0,0,0,0.5)] transform -translate-x-1/2 -translate-y-[120%]"
                        style={{ left: mousePos.x, top: mousePos.y }}
                    >
                        <div className="flex flex-col items-center">
                            <span className="font-black text-lg mb-1">Plot #{hoveredPlot.number}</span>

                            {/* Round 1: simple — only team + price */}
                            {isRound1 ? (
                                <>
                                    {hoveredPlot.winner_team_id && (
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="opacity-70 text-xs font-bold uppercase">Team:</span>
                                            <span className="text-[var(--color-primary)] font-bold">
                                                {allTeams.find(t => t.id === hoveredPlot.winner_team_id)?.name || "—"}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <span className="opacity-70 text-xs font-bold uppercase">Price:</span>
                                        <span className="font-mono font-bold">
                                            ₹ {Number(hoveredPlot.current_bid || hoveredPlot.total_plot_price || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                /* Round 2+: full details */
                                <>
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
                                    {/* Price */}
                                    <div className="flex items-center gap-2">
                                        <span className="opacity-70 text-xs font-bold uppercase">Price:</span>
                                        <span className="font-mono font-bold">
                                            ₹ {Number(hoveredPlot.current_bid || hoveredPlot.total_plot_price || 0).toLocaleString('en-IN')}
                                        </span>
                                    </div>
                                    {/* Adjustment + Current value */}
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
                                    {/* Current policy delta */}
                                    {recentAdjustments[hoveredPlot.number] !== undefined && (
                                        <div className={`flex items-center gap-2 mt-1 px-2 py-0.5 border-2 ${recentAdjustments[hoveredPlot.number] > 0 ? "border-orange-400 text-orange-300" : "border-red-400 text-red-300"}`}>
                                            <span className="text-[10px] font-black uppercase">This Policy:</span>
                                            <span className="font-mono font-black text-sm">
                                                {recentAdjustments[hoveredPlot.number] > 0 ? "+" : ""}₹{recentAdjustments[hoveredPlot.number].toLocaleString('en-IN')}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Round 2+ only: Toggle and Legend overlays */}
                {!isRound1 && (
                    <>
                        {/* Top Right Toggle */}
                        <div className="absolute top-4 right-4 pointer-events-auto backdrop-blur-sm p-3 flex items-center gap-3 z-50" style={{ backgroundColor: 'var(--color-surface)', border: '3px solid var(--color-text)', boxShadow: '3px 3px 0 var(--color-text)' }}>
                            <span className="font-black text-sm uppercase" style={{ color: highlightMode === 'changes' ? 'var(--color-text)' : 'var(--color-text-muted, #999)' }}>Changes</span>
                            <button
                                onClick={() => setHighlightMode(highlightMode === 'changes' ? 'types' : 'changes')}
                                className="relative w-14 h-7 box-content flex transition-colors"
                                style={{ backgroundColor: highlightMode === 'changes' ? '#fb923c' : '#60a5fa', border: '3px solid var(--color-text)' }}
                            >
                                <div
                                    className="absolute top-0 bottom-0 w-7 transition-transform duration-300 ease-in-out"
                                    style={{ backgroundColor: 'var(--color-surface)', transform: highlightMode === 'changes' ? 'translateX(0)' : 'translateX(28px)', borderRightWidth: highlightMode === 'changes' ? '3px' : '0', borderLeftWidth: highlightMode === 'types' ? '3px' : '0', borderColor: 'var(--color-text)', boxShadow: '2px 0 0 rgba(0,0,0,0.3)' }}
                                />
                            </button>
                            <span className="font-black text-sm uppercase" style={{ color: highlightMode === 'types' ? 'var(--color-text)' : 'var(--color-text-muted, #999)' }}>Types</span>
                        </div>

                        {/* Bottom Center Legend — compact scrollable strip */}
                        <div className="absolute bottom-2 left-2 right-2 pointer-events-auto backdrop-blur-sm px-3 py-1.5 z-50 overflow-x-auto legend-scroll" style={{ backgroundColor: 'var(--color-surface)', border: '3px solid var(--color-text)', boxShadow: '3px 3px 0 var(--color-text)' }}>
                            {highlightMode === 'changes' ? (
                                <div className="flex items-center justify-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-orange-400 border-[2px] border-orange-600 animate-pulse shrink-0" />
                                        <span className="text-[10px] font-bold uppercase whitespace-nowrap" style={{ color: 'var(--color-text)' }}>Increased</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-3 h-3 rounded-full bg-red-400 border-[2px] border-red-600 animate-pulse shrink-0" />
                                        <span className="text-[10px] font-bold uppercase whitespace-nowrap" style={{ color: 'var(--color-text)' }}>Decreased</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 overflow-x-auto legend-scroll">
                                    {Array.from(new Set(plots.map(p => (p.plot_type || p.type || "").trim().toUpperCase()).filter(Boolean))).map(typeStr => {
                                        const colors = TYPE_COLORS[typeStr] || defaultTypeColor;
                                        return (
                                            <div key={typeStr} className="flex items-center gap-1 shrink-0">
                                                <div className="w-2.5 h-2.5 shrink-0" style={{ backgroundColor: colors.fill, border: '1.5px solid var(--color-text)' }} />
                                                <span className="text-[8px] font-black uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--color-text)' }}>{typeStr}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
