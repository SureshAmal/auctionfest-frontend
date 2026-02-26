import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, X, Gavel, DollarSign, MapPin, Tag, ShoppingCart } from "lucide-react";
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
    /** Active rebid/sell offers */
    rebidOffers?: any[];
    /** Sold offers (from rebid marketplace) */
    rebidOffersSold?: any[];
    /** Force open the tracker modal */
    forceOpen?: boolean;
    /** Callback when tracker should close */
    onClose?: () => void;
}

export default function TrackingWindow({ currentPlot, status, plots = [], allTeams = [], userTeam, currentRound = 1, rebidOffers = [], rebidOffersSold = [], forceOpen = false, onClose }: TrackingWindowProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
    const [activeFabOption, setActiveFabOption] = useState<"my" | "listed" | "sold" | "all" | "map" | null>(null);
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [scale, setScale] = useState(1);
    const [activeTab, setActiveTab] = useState<"my" | "listed" | "sold" | "all">("my");
    const containerRef = useRef(null);
    const isDragging = useRef(false);

    const handleDragStart = useCallback(() => {
        isDragging.current = true;
    }, []);

    // Sync with forceOpen prop
    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
        }
    }, [forceOpen]);

    const handleClose = () => {
        setIsOpen(false);
        onClose?.();
    };

    // Handle close from X button in modal
    const handleModalClose = () => {
        setIsOpen(false);
    };

    // Also export setIsOpen so parent can control it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const setOpen = (open: boolean) => setIsOpen(open);

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

    // My team's plots listed for sale (active offers)
    const myListedPlots = useMemo(() => {
        if (!userTeam) return [];
        return rebidOffers
            .filter(o => o.offering_team_id === userTeam.id || o.offering_team_id === userTeam.id?.toString())
            .map(offer => {
                const plot = plots.find(p => p.number === offer.plot_number);
                const originalPrice = plot ? (Number(plot.current_bid) || Number(plot.total_plot_price) || 0) : 0;
                return {
                    plotNumber: offer.plot_number,
                    askingPrice: Number(offer.asking_price),
                    originalPrice,
                    status: offer.status
                };
            });
    }, [rebidOffers, userTeam, plots]);

    // My team's plots sold via rebid marketplace
    const mySoldPlots = useMemo(() => {
        if (!userTeam) return [];
        return rebidOffersSold
            .filter(o => o.offering_team_id === userTeam.id || o.offering_team_id === userTeam.id?.toString())
            .map(offer => {
                const plot = plots.find(p => p.number === offer.plot_number);
                const originalPrice = plot ? (Number(plot.current_bid) || Number(plot.total_plot_price) || 0) : 0;
                const buyer = allTeams.find(t => t.id === offer.buyer_team_id || t.id === offer.buyer_team_id?.toString());
                return {
                    plotNumber: offer.plot_number,
                    soldPrice: Number(offer.asking_price),
                    buyerName: buyer?.name || offer.buyer_name || "Unknown",
                    originalPrice,
                    profit: Number(offer.asking_price) - originalPrice
                };
            });
    }, [rebidOffersSold, userTeam, plots, allTeams]);

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

    // Columns for plots listed for sale
    const listedPlotsColumns: ColumnDef<any>[] = [
        {
            accessorKey: "plotNumber",
            header: "Plot #",
            cell: ({ row }) => <div className="font-black text-center">#{row.original.plotNumber}</div>
        },
        {
            accessorKey: "askingPrice",
            header: () => <div className="text-center">Listed At</div>,
            cell: ({ row }) => <div className="text-right font-mono font-bold w-full pr-2 text-[var(--color-primary)]">₹{row.original.askingPrice.toLocaleString("en-IN")}</div>
        }
    ];

    // Columns for plots sold via rebid
    const soldRebidColumns: ColumnDef<any>[] = [
        {
            accessorKey: "plotNumber",
            header: "Plot #",
            cell: ({ row }) => <div className="font-black text-center">#{row.original.plotNumber}</div>
        },
        {
            accessorKey: "buyerName",
            header: () => <div className="text-center">Sold To</div>,
            cell: ({ row }) => <div className="text-[var(--color-primary)] truncate max-w-[80px] text-center w-full font-bold">{row.original.buyerName}</div>
        },
        {
            accessorKey: "soldPrice",
            header: () => <div className="text-center">Sold</div>,
            cell: ({ row }) => <div className="text-right font-mono font-bold w-full pr-2">₹{row.original.soldPrice.toLocaleString("en-IN")}</div>
        },
        {
            accessorKey: "profit",
            header: () => <div className="text-center">Profit</div>,
            cell: ({ row }) => {
                const profit = row.original.profit;
                return (
                    <div className={`text-right font-mono font-black w-full pr-2 ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                        {profit >= 0 ? "+" : ""}₹{profit.toLocaleString("en-IN")}
                    </div>
                );
            }
        }
    ];

    return (
        <>
            {/* Floating Action Button Menu - Draggable */}
            <motion.div
                drag
                dragMomentum={false}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onDragStart={handleDragStart}
                onClick={() => {
                    if (!isDragging.current) {
                        setIsFabMenuOpen(prev => !prev);
                    }
                    isDragging.current = false;
                }}
                className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 pointer-events-none"
            >
                <div className="flex flex-col items-end gap-3 pointer-events-auto">
                    {isFabMenuOpen && (
                        <div className="flex flex-col gap-3 mb-1 animate-in slide-in-from-bottom-5 duration-200">
                            <button
                                onClick={() => { setActiveFabOption("my"); setIsFabMenuOpen(false); }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="neo-border bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--color-border)] group-hover:scale-105 transition-transform">My Plots ({myPlots.length})</span>
                                <div className="w-12 h-12 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                                    <MapPin size={24} />
                                </div>
                            </button>
                            <button
                                onClick={() => { setActiveFabOption("listed"); setIsFabMenuOpen(false); }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="neo-border bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--color-border)] group-hover:scale-105 transition-transform">Listed ({myListedPlots.length})</span>
                                <div className="w-12 h-12 bg-[var(--color-secondary)] text-[var(--color-bg)] rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                                    <Tag size={24} />
                                </div>
                            </button>
                            <button
                                onClick={() => { setActiveFabOption("sold"); setIsFabMenuOpen(false); }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="neo-border bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--color-border)] group-hover:scale-105 transition-transform">Sold ({mySoldPlots.length})</span>
                                <div className="w-12 h-12 bg-green-600 text-[var(--color-bg)] rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                                    <ShoppingCart size={24} />
                                </div>
                            </button>
                            <button
                                onClick={() => { setActiveFabOption("all"); setIsFabMenuOpen(false); }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="neo-border bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--color-border)] group-hover:scale-105 transition-transform">All Sold ({soldPlots.length})</span>
                                <div className="w-12 h-12 bg-[var(--color-danger)] text-[var(--color-bg)] rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                                    <Gavel size={24} />
                                </div>
                            </button>
                            <button
                                onClick={() => { setActiveFabOption("map"); setIsFabMenuOpen(false); }}
                                className="flex items-center gap-3 group"
                            >
                                <span className="neo-border bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--color-border)] group-hover:scale-105 transition-transform">Map</span>
                                <div className="w-12 h-12 bg-blue-600 text-[var(--color-bg)] rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                                    <MapPin size={24} />
                                </div>
                            </button>
                        </div>
                    )}
                    <button
                        className={`w-14 h-14 ${isFabMenuOpen ? "bg-[var(--color-danger)] text-[var(--color-bg)]" : "bg-[var(--color-bg)] text-[var(--color-text)]"} rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all pointer-events-auto`}
                    >
                        {isFabMenuOpen ? <X size={28} /> : <Activity size={28} />}
                    </button>
                </div>
            </motion.div>

            {/* The Popup Modal for selected option */}
            <AnimatePresence>
                {activeFabOption && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setActiveFabOption(null)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />

                        {/* Content */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-[var(--color-bg)] border-4 border-[var(--color-border)] shadow-[8px_8px_0_var(--neo-shadow-color)] w-full max-w-4xl max-h-[90vh] flex flex-col pointer-events-auto overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center border-b-4 border-[var(--color-border)] bg-[var(--color-surface)] shrink-0 p-4">
                                <h2 className="font-black text-xl uppercase flex items-center gap-2">
                                    {activeFabOption === "my" && <><MapPin size={20} /> My Plots ({myPlots.length})</>}
                                    {activeFabOption === "listed" && <><Tag size={20} /> Listed ({myListedPlots.length})</>}
                                    {activeFabOption === "sold" && <><ShoppingCart size={20} /> Sold ({mySoldPlots.length})</>}
                                    {activeFabOption === "all" && <><Gavel size={20} /> All Sold ({soldPlots.length})</>}
                                    {activeFabOption === "map" && <><MapPin size={20} /> City Map</>}
                                </h2>
                                <NeoButton variant="secondary" size="sm" onClick={() => setActiveFabOption(null)}>
                                    <X size={20} />
                                </NeoButton>
                            </div>

                            {/* Content Area */}
                            <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-4">
                                {activeFabOption === "map" ? (
                                    <div className="relative flex-1 min-h-[300px] sm:min-h-[400px] h-[50vh] bg-[var(--color-surface)] flex flex-col">
                                        <div 
                                            className="flex-1 cursor-zoom-in flex items-center justify-center overflow-hidden"
                                            onClick={() => {
                                                setIsFullScreen(true);
                                                setScale(1);
                                            }}
                                        >
                                            <div className="w-full h-full p-2 sm:p-4 flex items-center justify-center">
                                                <CityMap currentPlotNumber={currentPlot?.number} plots={plots} allTeams={allTeams} currentRound={currentRound} />
                                            </div>
                                        </div>
                                        <div className="bg-[var(--color-bg)] px-2 py-1 text-xs font-bold uppercase border-t-2 border-[var(--color-border)] text-center">
                                            Click to Zoom
                                        </div>
                                    </div>
                                ) : activeFabOption === "my" ? (
                                    <>
                                        {myPlots.length === 0 ? (
                                            <div className="text-center py-10 text-[var(--color-text)] opacity-40 font-bold uppercase border-2 border-dashed border-[var(--color-border)] opacity-30 m-4">
                                                You don&apos;t own any plots yet.
                                            </div>
                                        ) : (
                                            <NeoTable columns={myPlotsColumns} data={myPlots} />
                                        )}
                                    </>
                                ) : activeFabOption === "listed" ? (
                                    <>
                                        {myListedPlots.length === 0 ? (
                                            <div className="text-center py-10 text-[var(--color-text)] opacity-40 font-bold uppercase border-2 border-dashed border-[var(--color-border)] opacity-30 m-4">
                                                No plots listed for sale.
                                            </div>
                                        ) : (
                                            <NeoTable columns={listedPlotsColumns} data={myListedPlots} />
                                        )}
                                    </>
                                ) : activeFabOption === "sold" ? (
                                    <>
                                        {mySoldPlots.length === 0 ? (
                                            <div className="text-center py-10 text-[var(--color-text)] opacity-40 font-bold uppercase border-2 border-dashed border-[var(--color-border)] opacity-30 m-4">
                                                No plots sold yet.
                                            </div>
                                        ) : (
                                            <NeoTable columns={soldRebidColumns} data={mySoldPlots} />
                                        )}
                                    </>
                                ) : activeFabOption === "all" ? (
                                    <>
                                        {soldPlots.length === 0 ? (
                                            <div className="text-center py-10 text-[var(--color-text)] opacity-40 font-bold uppercase border-2 border-dashed border-[var(--color-border)] opacity-30 m-4">
                                                No plots sold yet.
                                            </div>
                                        ) : (
                                            <NeoTable columns={trackingColumns} data={soldPlots} />
                                        )}
                                    </>
                                ) : null}
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
