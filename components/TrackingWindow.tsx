import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X, Gavel, DollarSign } from "lucide-react";
import NeoBadge from "./neo/NeoBadge";
import NeoButton from "./neo/NeoButton";
import CityMap from "@/components/map/CityMap";

interface TrackingWindowProps {
    currentPlot: any;
    status: string; // 'not_started', 'running', 'paused', 'completed'
    plots?: any[];
    allTeams?: any[];
}

export default function TrackingWindow({ currentPlot, status, plots = [], allTeams = [] }: TrackingWindowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [scale, setScale] = useState(1);
    const [sortKey, setSortKey] = useState<string>("price");
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
    const containerRef = useRef(null);

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDirection(prev => prev === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortDirection("desc");
        }
    };

    // Calculate Sold Plots Ledger
    const soldPlots = useMemo(() => {
        const sorted = plots
            .filter(p => p.status?.toLowerCase() === 'sold' && p.winner_team_id)
            .map(p => {
                const team = allTeams.find(t => t.id === p.winner_team_id);
                return {
                    plotNumber: p.number,
                    teamName: team ? team.name : p.winner_team_id,
                    price: Number(p.current_bid) || 0
                };
            });

        sorted.sort((a, b) => {
            const modifier = sortDirection === "asc" ? 1 : -1;
            if (sortKey === "plotNumber") return (a.plotNumber - b.plotNumber) * modifier;
            if (sortKey === "teamName") return a.teamName.localeCompare(b.teamName) * modifier;
            if (sortKey === "price") return (a.price - b.price) * modifier;
            return 0;
        });
        return sorted;
    }, [plots, allTeams, sortKey, sortDirection]);

    const totalRevenue = soldPlots.reduce((sum, p) => sum + p.price, 0);

    return (
        <>
            {/* The Floating Draggable Trigger */}
            <motion.div
                drag
                dragMomentum={false}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 z-40 cursor-pointer"
            >
                <div className="bg-[var(--color-primary)] text-white border-4 border-[var(--color-border)] shadow-[4px_4px_0_black] p-4 flex items-center gap-3 rounded-full">
                    <Activity size={24} className="animate-pulse" />
                    <div className="flex flex-col">
                        <span className="font-black uppercase text-sm leading-none">Live Tracker</span>
                        <span className="text-xs font-bold uppercase opacity-80">{status} • {soldPlots.length} Sold</span>
                    </div>
                </div>
            </motion.div>

            {/* The Popup Modal */}
            <AnimatePresence>
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />

                        {/* Content */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-[var(--color-bg)] border-4 border-[var(--color-border)] shadow-[8px_8px_0_black] w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
                        >
                            {/* 1. Full Image Top */}
                            <div className="relative bg-[var(--color-bg)] border-b-4 border-[var(--color-border)] h-[40vh] min-h-[250px] shrink-0 overflow-hidden">
                                <div
                                    className="relative w-full h-full cursor-zoom-in group"
                                    onClick={() => {
                                        console.log("Opening full screen");
                                        setIsFullScreen(true);
                                        setScale(1);
                                    }}
                                >
                                    <div className="absolute inset-0 w-full h-full object-contain group-hover:scale-[1.02] transition-transform pointer-events-none p-4">
                                        <CityMap currentPlotNumber={currentPlot?.number} />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity pointer-events-none">
                                        <span className="bg-black text-white px-2 py-1 text-xs font-bold uppercase">Click to Zoom</span>
                                    </div>
                                </div>
                                {/* Absolute Close Button */}
                                <div className="absolute top-2 right-2">
                                    <NeoButton variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
                                        <X size={20} />
                                    </NeoButton>
                                </div>
                            </div>

                            {/* 2. Header */}
                            <div className="flex justify-between items-center px-6 py-4 border-b-4 border-[var(--color-border)] bg-[var(--color-surface)]">
                                <div>
                                    <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                                        <Gavel size={28} /> Auction Ledger
                                    </h2>
                                    <p className="text-xs font-bold uppercase mt-1 text-[var(--color-text)] opacity-60">
                                        Total Revenue: ₹ {totalRevenue.toLocaleString("en-IN")}
                                    </p>
                                </div>
                            </div>

                            {/* 3. Scrollable List */}
                            <div className="overflow-y-auto p-4 bg-[var(--color-bg)] relative flex-1">
                                {soldPlots.length === 0 ? (
                                    <div className="text-center py-10 text-[var(--color-text)] opacity-40 font-bold uppercase border-2 border-dashed border-[var(--color-border)] opacity-30">
                                        No plots sold yet.
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-separate border-spacing-0 border-4 border-black border-b-0 border-r-0">
                                        <thead className="text-[var(--color-text)]">
                                            <tr>
                                                <th className="sticky top-0 z-30 bg-[var(--color-surface)] p-2 font-black uppercase border-r-4 border-b-4 border-black cursor-pointer hover:bg-[#ffe55c] active:bg-[#ffed99] transition-colors" onClick={() => handleSort("plotNumber")}>
                                                    <div className="flex items-center gap-1">Plot # {sortKey === "plotNumber" && <span className="text-[10px]">{sortDirection === "asc" ? "▲" : "▼"}</span>}</div>
                                                </th>
                                                <th className="sticky top-0 z-30 bg-[var(--color-surface)] p-2 font-black uppercase border-r-4 border-b-4 border-black cursor-pointer hover:bg-[#ffe55c] active:bg-[#ffed99] transition-colors" onClick={() => handleSort("teamName")}>
                                                    <div className="flex items-center gap-1">Team {sortKey === "teamName" && <span className="text-[10px]">{sortDirection === "asc" ? "▲" : "▼"}</span>}</div>
                                                </th>
                                                <th className="sticky top-0 z-30 bg-[var(--color-surface)] p-2 font-black uppercase border-b-4 border-black cursor-pointer hover:bg-[#ffe55c] active:bg-[#ffed99] transition-colors" onClick={() => handleSort("price")}>
                                                    <div className="flex items-center justify-end gap-1">Price {sortKey === "price" && <span className="text-[10px]">{sortDirection === "asc" ? "▲" : "▼"}</span>}</div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-[var(--color-bg)] [&>tr>td]:border-b-4 [&>tr>td]:border-r-4 [&>tr>td]:border-black [&>tr>td:last-child]:border-r-0">
                                            {soldPlots.map((plot, i) => (
                                                <tr key={i} className="hover:bg-black/5 transition-colors odd:bg-[var(--color-bg)] even:bg-[var(--color-bg)] font-bold text-sm">
                                                    <td className="p-2 font-black">#{plot.plotNumber}</td>
                                                    <td className="p-2 text-[var(--color-primary)] truncate max-w-[100px]">{plot.teamName}</td>
                                                    <td className="p-2 text-right font-mono">₹ {plot.price.toLocaleString("en-IN")}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Full Screen Image Viewer */}
            <AnimatePresence>
                {isFullScreen && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
                        {/* Controls */}
                        <div className="absolute top-4 right-4 flex gap-2 z-50">
                            <NeoButton variant="base" onClick={() => setScale(s => Math.max(0.5, s - 0.5))}>
                                -
                            </NeoButton>
                            <span className="bg-[var(--color-bg)] px-2 py-1 font-bold flex items-center border-2 border-[var(--color-border)]">{Math.round(scale * 100)}%</span>
                            <NeoButton variant="base" onClick={() => setScale(s => Math.min(5, s + 0.5))}>
                                +
                            </NeoButton>
                            <NeoButton variant="secondary" onClick={() => setIsFullScreen(false)}>
                                <X size={20} />
                            </NeoButton>
                        </div>

                        {/* Image Container */}
                        <motion.div
                            ref={containerRef}
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            className="w-full h-full overflow-hidden relative cursor-grab active:cursor-grabbing flex items-center justify-center p-8"
                        >
                            <motion.div
                                style={{ scale, x: 0, y: 0 }}
                                drag
                                dragConstraints={containerRef}
                                dragElastic={0.2}
                                dragMomentum={false}
                                className="w-[80vw] h-[80vh] shadow-2xl bg-white border-4 border-black"
                            >
                                <CityMap currentPlotNumber={currentPlot?.number} />
                            </motion.div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

