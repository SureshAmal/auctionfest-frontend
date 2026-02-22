import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X, Gavel, DollarSign } from "lucide-react";
import NeoBadge from "./neo/NeoBadge";
import NeoButton from "./neo/NeoButton";

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
    const containerRef = useRef(null);

    // Calculate Sold Plots Ledger
    const soldPlots = useMemo(() => {
        return plots
            .filter(p => p.status?.toLowerCase() === 'sold' && p.winner_team_id)
            .map(p => {
                const team = allTeams.find(t => t.id === p.winner_team_id);
                return {
                    plotNumber: p.number,
                    teamName: team ? team.name : p.winner_team_id,
                    price: Number(p.current_bid) || 0
                };
            })
            .sort((a, b) => b.price - a.price); // Sort by price desc
    }, [plots, allTeams]);

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
                <div className="bg-[var(--color-primary)] text-white border-4 border-black shadow-[4px_4px_0_black] p-4 flex items-center gap-3 rounded-full">
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
                            className="relative bg-white border-4 border-black shadow-[8px_8px_0_black] w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
                        >
                            {/* 1. Full Image Top */}
                            <div className="relative bg-gray-100 border-b-4 border-black h-[40vh] min-h-[250px] shrink-0 overflow-hidden">
                                <div
                                    className="relative w-full h-full cursor-zoom-in group"
                                    onClick={() => {
                                        console.log("Opening full screen");
                                        setIsFullScreen(true);
                                        setScale(1);
                                    }}
                                >
                                    <img
                                        src="/planomics.png"
                                        alt="Full Map"
                                        className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform"
                                    />
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
                            <div className="flex justify-between items-center px-6 py-4 border-b-4 border-black bg-[var(--color-surface)]">
                                <div>
                                    <h2 className="text-2xl font-black uppercase flex items-center gap-2">
                                        <Gavel size={28} /> Auction Ledger
                                    </h2>
                                    <p className="text-xs font-bold uppercase mt-1 text-gray-600">
                                        Total Revenue: ₹ {totalRevenue.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            {/* 3. Scrollable List */}
                            <div className="overflow-y-auto p-4 bg-white relative flex-1">
                                {soldPlots.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 font-bold uppercase border-2 border-dashed border-gray-300">
                                        No plots sold yet.
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-white border-b-4 border-black">
                                            <tr>
                                                <th className="p-2 font-black uppercase border-r-2 border-black">Plot #</th>
                                                <th className="p-2 font-black uppercase border-r-2 border-black">Team</th>
                                                <th className="p-2 font-black uppercase text-right">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y-2 divide-black">
                                            {soldPlots.map((plot, i) => (
                                                <tr key={i} className="hover:bg-gray-50 font-bold text-sm">
                                                    <td className="p-2 border-r-2 border-black font-black">#{plot.plotNumber}</td>
                                                    <td className="p-2 border-r-2 border-black text-[var(--color-primary)] truncate max-w-[100px]">{plot.teamName}</td>
                                                    <td className="p-2 text-right font-mono">₹{plot.price.toLocaleString()}</td>
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
                            <span className="bg-white px-2 py-1 font-bold flex items-center border-2 border-black">{Math.round(scale * 100)}%</span>
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
                            <motion.img
                                src="/planomics.png"
                                alt="Full Scale Map"
                                style={{ scale, x: 0, y: 0 }}
                                drag
                                dragConstraints={containerRef}
                                dragElastic={0.2}
                                dragMomentum={false}
                                className="max-w-full max-h-full object-contain shadow-2xl"
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}

