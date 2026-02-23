"use client";
import React, { useEffect, useRef, useState } from "react";
import { City1SVG } from "./City1SVG";

interface CityMapProps {
    currentPlotNumber?: string | number | null;
}

export default function CityMap({ currentPlotNumber }: CityMapProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [centers, setCenters] = useState<Record<string, { x: number; y: number }>>({});

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
    
    return (
        <div className="relative w-full h-full">
            <style>{`
                .plot-group { transition: all 0.3s ease; }
                .plot-group:hover path { fill: var(--color-surface); opacity: 0.8; stroke: var(--color-primary); stroke-width: 8px; }
                .plot-active path { fill: var(--color-primary) !important; opacity: 1 !important; stroke: black; stroke-width: 12px; }
                #road { fill: #cccccc; opacity: 0.5; }
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
        </div>
    );
}
