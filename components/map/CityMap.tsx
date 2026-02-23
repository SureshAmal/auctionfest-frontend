"use client";
import React, { useEffect, useRef, useState } from "react";
import { City1SVG } from "./City1SVG";

interface CityMapProps {
    currentPlotNumber?: string | number | null;
    plots?: any[];
    allTeams?: any[];
}

export default function CityMap({ currentPlotNumber, plots = [], allTeams = [] }: CityMapProps) {
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
            if (id && id !== "city_1" && id !== "road" && !isNaN(Number(id))) {
                const bbox = (g as SVGGElement).getBBox();
                newCenters[id] = {
                    x: bbox.x + bbox.width / 2,
                    y: bbox.y + bbox.height / 2
                };
            }
        });

        setCenters(newCenters);
    }, []);

    // Track mouse over the container
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;

        // Find if we are hovering a plot group
        const target = e.target as Element;
        const group = target.closest('g[id]');

        if (group) {
            const id = group.getAttribute('id');
            if (id && id !== "city_1" && id !== "road" && !isNaN(Number(id))) {
                const plotData = plots.find(p => p.number.toString() === id);
                if (plotData && plotData.status === 'sold') {
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

    // Calculate dynamic styles for sold plots
    const soldPlotsStyles = plots
        .filter(p => p.status === 'sold')
        .map(p => {
            // Using attribute selector for numbers is robust in React style tags
            return `
                g[id="${p.number}"] path { fill: #4ade80 !important; opacity: 0.9 !important; stroke: #16a34a; stroke-width: 6px; }
                g[id="${p.number}"]:hover path { fill: #22c55e !important; stroke: black; stroke-width: 8px; }
            `;
        })
        .join("\n");

    return (
        <div
            className="relative w-full h-full"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <style>{`
                .plot-group { transition: all 0.3s ease; }
                .plot-group:hover path { fill: var(--color-surface); opacity: 0.8; stroke: var(--color-primary); stroke-width: 8px; }
                .plot-active path { fill: var(--color-primary) !important; opacity: 1 !important; stroke: black; stroke-width: 12px; }
                #road { fill: #cccccc; opacity: 0.5; }
                ${soldPlotsStyles}
            `}</style>

            <City1SVG ref={svgRef} currentPlotNumber={currentPlotNumber?.toString() || ""} />

            <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 3169 3024" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
                {Object.entries(centers).map(([id, pos]) => (
                    <text
                        key={id}
                        x={pos.x}
                        y={pos.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={id === currentPlotNumber?.toString() ? "60" : "40"}
                        fontWeight="900"
                        fill={id === currentPlotNumber?.toString() ? "white" : "black"}
                        style={{
                            textShadow: id === currentPlotNumber?.toString() ? "0 0 15px rgba(0,0,0,0.5)" : "none",
                            transition: "all 0.3s ease"
                        }}
                    >
                        {id}
                    </text>
                ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPlot && (
                <div
                    className="fixed z-[100] pointer-events-none bg-black text-white p-3 border-4 border-white shadow-[6px_6px_0_rgba(0,0,0,0.5)] transform -translate-x-1/2 -translate-y-[120%]"
                    style={{ left: mousePos.x, top: mousePos.y }}
                >
                    <div className="flex flex-col items-center">
                        <span className="font-black text-lg mb-1">Plot #{hoveredPlot.number}</span>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="opacity-70 text-xs font-bold uppercase">Team:</span>
                            <span className="text-[var(--color-primary)] font-bold">
                                {allTeams.find(t => t.id === hoveredPlot.winner_team_id)?.name || hoveredPlot.winner_team_id}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="opacity-70 text-xs font-bold uppercase">Price:</span>
                            <span className="font-mono font-bold">₹ {(Number(hoveredPlot.current_bid || hoveredPlot.total_plot_price || 0) + Number(hoveredPlot.round_adjustment || 0)).toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
