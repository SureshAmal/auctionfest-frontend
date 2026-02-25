import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X, Gavel, DollarSign, MapPin } from "lucide-react";
import NeoBadge from "./neo/NeoBadge";
import NeoButton from "./neo/NeoButton";
import CityMap from "@/components/map/CityMap";
import NeoTable from "@/components/neo/NeoTable";
import { ColumnDef } from "@tanstack/react-table";

interface TrackingWindowProps {
    currentPlot: any;
    status: string; // 'not_started', 'running', 'paused', 'completed'
    plots?: any[];
    allTeams?: any[];
    userTeam?: any;
    /** The current auction round (determines which city SVG to use). */
    currentRound?: number;
}

export default function TrackingWindow({ currentPlot, status, plots = [], allTeams = [], userTeam, currentRound = 1 }: TrackingWindowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [scale, setScale] = useState(1);
    const [activeTab, setActiveTab] = useState<"my" | "all">("my");
    const containerRef = useRef(null);

    // Track drag state to prevent click-on-drag
    const isDragging = useRef(false);

    /** Called on drag start — set flag. */
    const handleDragStart = useCallback(() => {
        isDragging.current = true;
    }, []);

    /** Called on click — only open if we weren't dragging. */
    const handleClick = useCallback(() => {
        if (!isDragging.current) {
            setIsOpen(true);
        }
        isDragging.current = false;
    }, []);

    // Calculate Sold Plots Ledger
    const soldPlots = useMemo(() => {
        return plots
            .filter(p => p.status?.toLowerCase() === 'sold' && p.winner_team_id)
            .map(p => {
                const team = allTeams.find(t => t.id === p.winner_team_id);
                return {
                    plotNumber: p.number,
                    teamName: team ? team.name : p.winner_team_id,
                    price: Number(p.current_bid) || 0,
                    adjustment: Number(p.round_adjustment || 0),
                    currentValue: (Number(p.current_bid) || 0) + Number(p.round_adjustment || 0)
                };
            });
    }, [plots, allTeams]);

    // My team's owned plots
    const myPlots = useMemo(() => {
        if (!userTeam) return [];
        return soldPlots.filter(p => {
            const plot = plots.find(pp => pp.number === p.plotNumber);
            return plot && plot.winner_team_id === userTeam.id;
        });
    }, [soldPlots, plots, userTeam]);

    const totalRevenue = soldPlots.reduce((sum, p) => sum + p.price, 0);
    const myPortfolioValue = myPlots.reduce((sum, p) => sum + p.currentValue, 0);

    const trackingColumns: ColumnDef<any>[] = [
        {
            accessorKey: "plotNumber",
            header: "Plot #",
            cell: ({ row }) => <div className="font-black text-center">#{row.original.plotNumber}</div>
        },
        {
            accessorKey: "teamName",
            header: () => <div className="text-center">Team</div>,
            cell: ({ row }) => <div className="text-[var(--color-primary)] truncate max-w-[150px] text-center w-full">{row.original.teamName}</div>
        },
        {
            accessorKey: "price",
            header: () => <div className="text-center">Price</div>,
            cell: ({ row }) => <div className="text-right font-mono w-full pr-4">₹ {row.original.price.toLocaleString("en-IN")}</div>
        }
    ];

    const myPlotsColumns: ColumnDef<any>[] = [
        {
            accessorKey: "plotNumber",
            header: "Plot #",
            cell: ({ row }) => <div className="font-black text-center">#{row.original.plotNumber}</div>
        },
        {
            accessorKey: "price",
            header: () => <div className="text-center">Bought At</div>,
            cell: ({ row }) => <div className="text-right font-mono w-full pr-2">₹{row.original.price.toLocaleString("en-IN")}</div>
        },
        {
            accessorKey: "adjustment",
            header: () => <div className="text-center">Adj</div>,
            cell: ({ row }) => {
                const adj = row.original.adjustment;
                if (adj === 0) return <div className="text-center opacity-40">—</div>;
                return (
                    <div className={`text-right font-mono font-bold w-full pr-2 ${adj > 0 ? "text-green-600" : "text-red-600"}`}>
                        {adj > 0 ? "+" : ""}₹{adj.toLocaleString("en-IN")}
                    </div>
                );
            }
        },
        {
            accessorKey: "currentValue",
            header: () => <div className="text-center">Value</div>,
            cell: ({ row }) => <div className="text-right font-mono font-black w-full pr-2">₹{row.original.currentValue.toLocaleString("en-IN")}</div>
        }
    ];

    return (
        <>
            {/* The Floating Draggable Trigger — drag-safe */}
            <motion.div
                drag
                dragMomentum={false}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onDragStart={handleDragStart}
                onClick={handleClick}
                className="fixed bottom-6 right-6 z-40 cursor-pointer"
                style={{ borderRadius: "var(--neo-radius)" }}
            >
                {/* Mini Dashboard Style Floating Tracker */}
                <div className="bg-[var(--color-bg)] border-[length:var(--neo-border-width)] border-[var(--color-border)] shadow-[var(--neo-shadow-offset-x)_var(--neo-shadow-offset-y)_0_var(--neo-shadow-color)] flex flex-col w-72 overflow-hidden" style={{ borderRadius: "var(--neo-radius)" }}>
                    {/* Header */}
                    <div className="bg-[var(--color-primary)] text-[var(--color-bg)] p-2 px-3 flex justify-between items-center border-b-[length:var(--neo-border-width)] border-[var(--color-border)]">
                        <span className="font-black uppercase text-sm flex items-center gap-2">
                            <Activity size={16} className={status === "RUNNING" ? "animate-pulse" : ""} />
                            Live Tracker
                        </span>
                        <span className="text-[10px] font-bold uppercase bg-[var(--color-bg)] text-[var(--color-text)] px-2 py-0.5 border-2 border-[var(--color-border)]" style={{ borderRadius: "calc(var(--neo-radius) / 2)" }}>
                            {status}
                        </span>
                    </div>
                    {/* Stats Body */}
                    <div className="p-3 bg-[var(--color-surface)] text-[var(--color-text)] flex justify-between items-center">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase opacity-60">Plots Sold</span>
                            <span className="font-black text-xl">{soldPlots.length}</span>
                        </div>
                        <div className="w-[1px] h-8 bg-[var(--color-border)] opacity-20"></div>
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold uppercase opacity-60">Total Revenue</span>
                            <span className="font-black text-xl text-[var(--color-success)] truncate max-w-[120px]">
                                ₹{(totalRevenue / 10000000).toFixed(2)}Cr
                            </span>
                        </div>
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
                            className="relative bg-[var(--color-bg)] border-4 border-[var(--color-border)] shadow-[8px_8px_0_var(--neo-shadow-color)] w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
                        >
                            {/* 1. Full Image Top */}
                            <div className="relative bg-[var(--color-bg)] border-b-4 border-[var(--color-border)] h-[40vh] min-h-[250px] shrink-0 overflow-hidden">
                                <div
                                    className="relative w-full h-full cursor-zoom-in group"
                                    onClick={() => {
                                        setIsFullScreen(true);
                                        setScale(1);
                                    }}
                                >
                                    <div className="absolute inset-0 w-full h-full object-contain group-hover:scale-[1.02] transition-transform pointer-events-none p-4">
                                        <CityMap currentPlotNumber={currentPlot?.number} plots={plots} allTeams={allTeams} currentRound={currentRound} />
                                    </div>
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity pointer-events-none">
                                        <span className="bg-[var(--color-text)] text-[var(--color-bg)] px-2 py-1 text-xs font-bold uppercase">Click to Zoom</span>
                                    </div>
                                </div>
                                {/* Absolute Close Button */}
                                <div className="absolute top-2 right-2">
                                    <NeoButton variant="secondary" size="sm" onClick={() => setIsOpen(false)}>
                                        <X size={20} />
                                    </NeoButton>
                                </div>
                            </div>

                            {/* 2. Tab Header */}
                            <div className="flex items-center border-b-4 border-[var(--color-border)] bg-[var(--color-surface)]">
                                <button
                                    onClick={() => setActiveTab("my")}
                                    className={`flex-1 py-3 px-4 text-sm font-black uppercase flex items-center justify-center gap-2 transition-all border-b-4 -mb-[4px] ${activeTab === "my" ? "border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-primary)]" : "border-transparent hover:bg-[var(--color-bg)]/50 opacity-60"}`}
                                >
                                    <MapPin size={16} /> My Plots ({myPlots.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab("all")}
                                    className={`flex-1 py-3 px-4 text-sm font-black uppercase flex items-center justify-center gap-2 transition-all border-b-4 -mb-[4px] ${activeTab === "all" ? "border-[var(--color-primary)] bg-[var(--color-bg)] text-[var(--color-primary)]" : "border-transparent hover:bg-[var(--color-bg)]/50 opacity-60"}`}
                                >
                                    <Gavel size={16} /> All Sold ({soldPlots.length})
                                </button>
                            </div>

                            {/* 3. Tab Content */}
                            <div className="min-h-0 flex-1 relative bg-[var(--color-bg)] w-full overflow-y-auto">
                                {activeTab === "my" ? (
                                    <>
                                        {/* My plots summary bar */}
                                        <div className="flex justify-between items-center px-4 py-2 bg-[var(--color-surface)] border-b-2 border-[var(--color-border)]">
                                            <span className="text-xs font-bold uppercase opacity-60">Portfolio Value</span>
                                            <span className="font-mono font-black text-lg">₹{myPortfolioValue.toLocaleString("en-IN")}</span>
                                        </div>
                                        {myPlots.length === 0 ? (
                                            <div className="text-center py-10 text-[var(--color-text)] opacity-40 font-bold uppercase border-2 border-dashed border-[var(--color-border)] opacity-30 m-4">
                                                You don&apos;t own any plots yet.
                                            </div>
                                        ) : (
                                            <NeoTable columns={myPlotsColumns} data={myPlots} />
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between items-center px-4 py-2 bg-[var(--color-surface)] border-b-2 border-[var(--color-border)]">
                                            <span className="text-xs font-bold uppercase opacity-60">Total Revenue</span>
                                            <span className="font-mono font-black text-lg">₹{totalRevenue.toLocaleString("en-IN")}</span>
                                        </div>
                                        {soldPlots.length === 0 ? (
                                            <div className="text-center py-10 text-[var(--color-text)] opacity-40 font-bold uppercase border-2 border-dashed border-[var(--color-border)] opacity-30 m-4">
                                                No plots sold yet.
                                            </div>
                                        ) : (
                                            <NeoTable columns={trackingColumns} data={soldPlots} />
                                        )}
                                    </>
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
                                className="w-[80vw] h-[80vh] shadow-2xl bg-[var(--color-bg)] border-4 border-[var(--color-border)]"
                            >
                                <CityMap currentPlotNumber={currentPlot?.number} plots={plots} allTeams={allTeams} currentRound={currentRound} />
                            </motion.div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}
