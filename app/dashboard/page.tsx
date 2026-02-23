"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../context/socket-context";
import BidCard from "../../components/BidCard";
import TrackingWindow from "../../components/TrackingWindow";
import NeoLayout from "../../components/neo/NeoLayout";
import { MapPin, Info, ArrowUpCircle, AlertTriangle, LogOut, CheckCircle2, Activity } from "lucide-react";
import CityMap from "@/components/map/CityMap";
import NeoCard from "../../components/neo/NeoCard";
import NeoBadge from "../../components/neo/NeoBadge";
import { motion, AnimatePresence } from "framer-motion";

/** Component to dynamically fetch, parse, and animate SVG plots from /plots_svg/ */
const AnimatedSvgPlot = ({ plotNumber }: { plotNumber: number | string }) => {
    const [svgData, setSvgData] = useState<{ viewBox: string, points: string } | null>(null);

    useEffect(() => {
        const fetchSvg = async () => {
            try {
                const res = await fetch(`/plots_svg/${plotNumber}.svg`);
                if (res.ok) {
                    const text = await res.text();
                    // extract viewBox and polygon points using regex
                    const viewBoxMatch = text.match(/viewBox="([^"]+)"/);
                    const pointsMatch = text.match(/points="([^"]+)"/);

                    if (viewBoxMatch && pointsMatch) {
                        setSvgData({ viewBox: viewBoxMatch[1], points: pointsMatch[1] });
                    }
                }
            } catch (e) {
                console.error("Failed to load SVG", e);
            }
        };

        setSvgData(null);
        fetchSvg();
    }, [plotNumber]);

    if (!svgData) {
        return (
            <div className="text-center text-[var(--color-text)] opacity-40 w-full h-full flex flex-col items-center justify-center">
                <MapPin size={64} className="mx-auto mb-2 opacity-30 animate-pulse" />
                <p className="font-bold uppercase text-sm">Loading Shape...</p>
            </div>
        );
    }

    const [minX, minY, w, h] = svgData.viewBox.split(' ').map(Number);
    const centerX = minX + w / 2;
    const centerY = minY + h / 2;
    // Calculate a responsive font size based on the bounding box height/width
    const fontSize = Math.min(w, h) * 0.15;

    return (
        <svg
            id={plotNumber.toString()}
            viewBox={svgData.viewBox}
            className="w-full h-full drop-shadow-2xl overflow-visible p-8"
        >
            <motion.polygon
                points={svgData.points}
                fill="rgba(250, 204, 21, 0.5)" // yellow-400 semi-transparent
                stroke="#facc15" // yellow-400
                strokeWidth={svgData.viewBox.includes("1280") ? "10" : "4"} // dynamic stroke based on common viewBox size
                strokeLinejoin="round"
                initial={{ pathLength: 0, fillOpacity: 0 }}
                animate={{ pathLength: 1, fillOpacity: 0.5 }}
                transition={{
                    pathLength: { duration: 1.5, ease: "easeInOut" },
                    fillOpacity: { duration: 1, delay: 0.8 }
                }}
            />

            <motion.text
                x={centerX}
                y={centerY}
                textAnchor="middle"
                dominantBaseline="middle"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 1.5, type: "spring" }}
                className="font-black fill-black drop-shadow-md pointer-events-none"
                style={{ fontSize: fontSize }}
            >
                {plotNumber}
            </motion.text>
        </svg>
    );
};

export default function Dashboard() {
    const router = useRouter();
    const { socket, isConnected } = useSocket();
    const [userTeam, setUserTeam] = useState<any>(null);
    const [allTeams, setAllTeams] = useState<any[]>([]);
    const [plots, setPlots] = useState<any[]>([]);
    const [currentPlot, setCurrentPlot] = useState<any>(null);
    const [auctionStatus, setAuctionStatus] = useState<string>("NOT_STARTED");
    const [currentRound, setCurrentRound] = useState(1);
    const [recentBids, setRecentBids] = useState<any[]>([]);

    // 1. Check Auth & Load Initial Data
    useEffect(() => {
        const teamId = localStorage.getItem("team_id");
        if (!teamId) {
            router.push("/");
            return;
        }

        const fetchData = async () => {
            try {
                const teamRes = await fetch(`/api/data/team/${teamId}`);
                if (teamRes.ok) setUserTeam(await teamRes.json());

                const allTeamsRes = await fetch("/api/data/teams");
                if (allTeamsRes.ok) setAllTeams(await allTeamsRes.json());

                let plotsData: any[] = [];
                const plotsRes = await fetch("/api/data/plots");
                if (plotsRes.ok) {
                    plotsData = await plotsRes.json();
                    setPlots(plotsData);
                }

                const stateRes = await fetch("/api/admin/state");
                if (stateRes.ok) {
                    const stateData = await stateRes.json();
                    setAuctionStatus(stateData.status);
                    setCurrentRound(stateData.current_round || 1);
                    if (stateData.current_plot) {
                        // Use the plot from the /api/data/plots array if available to retain full bids/winner data
                        const fullPlot = plotsData.find((p: any) => p.number === stateData.current_plot.number);
                        setCurrentPlot(fullPlot || stateData.current_plot);
                    }
                }

                // Load recent bids for feed persistence
                const bidsRes = await fetch("/api/data/bids/recent");
                if (bidsRes.ok) setRecentBids(await bidsRes.json());
            } catch (e) {
                console.error("Failed to load initial data", e);
            }
        };

        fetchData();
    }, [router]);

    const [sellCountdown, setSellCountdown] = useState(3);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (auctionStatus === "selling") {
            setSellCountdown(3);
            interval = setInterval(() => {
                setSellCountdown(prev => (prev > 1 ? prev - 1 : 1));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [auctionStatus]);

    // 2. Socket Listeners
    useEffect(() => {
        if (!socket || !userTeam) return;

        socket.emit("join_auction", { team_id: userTeam.id });

        const handleStateUpdate = (data: any) => {
            console.log("State Update:", data);
            setAuctionStatus(data.status);
            if (data.current_round) setCurrentRound(data.current_round);

            if (data.current_plot_number) {
                setPlots(prev => prev.map(p => {
                    if (p.number === data.current_plot_number) {
                        return { ...p, status: "active" };
                    }
                    if (p.status === "active") {
                        return { ...p, status: "sold" };
                    }
                    return p;
                }));

                if (data.current_plot) {
                    setCurrentPlot(data.current_plot);
                }
            }
        };

        const handleNewBid = (data: any) => {
            console.log("New Bid:", data);
            setRecentBids(prev => [data, ...prev].slice(0, 10));

            setCurrentPlot((prev: any) => prev ? {
                ...prev,
                current_bid: data.amount,
                winner_team_id: data.team_id,
            } : null);

            setPlots(prev => prev.map(p =>
                p.number === data.plot_number ? { ...p, current_bid: data.amount, winner_team_id: data.team_id } : p
            ));
        };

        const handleRoundChange = (data: any) => {
            console.log("Round Change:", data);
            setCurrentRound(data.current_round);
        };

        const handlePlotAdjustment = (data: any) => {
            console.log("Plot Adjustment:", data);
            if (data.plot) {
                setPlots(prev => prev.map(p =>
                    p.number === data.plot_number ? { ...p, ...data.plot } : p
                ));
                if (currentPlot?.number === data.plot_number) {
                    setCurrentPlot((prev: any) => prev ? { ...prev, ...data.plot } : null);
                }
            }
        };

        const handleReset = () => {
            window.location.reload();
        };

        const handleTeamUpdate = (data: any) => {
            if (data.team_id === userTeam.id) {
                setUserTeam((prev: any) => prev ? { ...prev, spent: data.spent, budget: data.budget } : null);
            }
        };

        socket.on("auction_state_update", handleStateUpdate);
        socket.on("new_bid", handleNewBid);
        socket.on("round_change", handleRoundChange);
        socket.on("plot_adjustment", handlePlotAdjustment);
        socket.on("auction_reset", handleReset);
        socket.on("team_update", handleTeamUpdate);

        return () => {
            socket.off("auction_state_update");
            socket.off("new_bid");
            socket.off("round_change");
            socket.off("plot_adjustment");
            socket.off("auction_reset");
            socket.off("team_update");
        };
    }, [socket, userTeam]);

    /** Get team name from ID. */
    const getTeamName = (id: string) => {
        const team = allTeams?.find(t => t.id === id);
        return team ? team.name : id;
    };

    /** Get round label for display. */
    const getRoundLabel = (round: number) => {
        switch (round) {
            case 1: return "Round 1 — Bidding";
            case 2: return "Round 2 — Adjustments";
            case 3: return "Round 3 — Adjustments";
            case 4: return "Round 4 — Final Bid";
            default: return `Round ${round}`;
        }
    };

    if (!userTeam) return null;

    return (
        <NeoLayout className="h-screen overflow-hidden" containerized={false}>
            <div className="flex flex-col h-full p-2 sm:p-4 pb-2">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center mb-3 gap-2 border-b-4 border-[var(--color-border)] pb-3 bg-[var(--color-bg)] shrink-0">
                    <div>
                        <h1 className="text-2xl sm:text-4xl font-black uppercase text-[var(--color-primary)]">
                            AU-FEST 2026
                        </h1>
                        <div className="flex items-center gap-3 text-xs font-bold uppercase mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 border-2 border-[var(--color-border)] ${isConnected ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`}>
                                <span className={`w-2 h-2 border border-[var(--color-border)] ${isConnected ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`} />
                                {isConnected ? "Live" : "Offline"}
                            </span>
                            <NeoBadge variant="info">{getRoundLabel(currentRound)}</NeoBadge>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center justify-end">
                        <div className="flex flex-col justify-center items-end neo-border px-3 sm:px-4 py-2 bg-[var(--color-secondary)] text-black shadow-[4px_4px_0_black]">
                            <p className="text-[10px] sm:text-xs font-black uppercase text-black/70 mb-1">Remaining Budget</p>
                            <p className="font-mono font-black text-lg sm:text-2xl tracking-normal bg-[var(--color-bg)] px-2 border-2 border-[var(--color-border)] shadow-[2px_2px_0_black]">
                                ₹ {(
                                    Number(userTeam.budget) -
                                    Number(userTeam.spent || 0) -
                                    (currentPlot?.winner_team_id === userTeam.id ? Number(currentPlot?.current_bid || 0) : 0)
                                ).toLocaleString("en-IN")}
                            </p>
                        </div>

                        <div className="flex items-center gap-2 neo-border px-3 py-2 bg-[var(--color-secondary)] text-white shadow-[4px_4px_0_black]">
                            <span className="font-black text-xl">{userTeam.name.charAt(0)}</span>
                            <span className="font-black text-sm uppercase">{userTeam.name}</span>
                        </div>

                        <button
                            onClick={() => {
                                localStorage.clear();
                                router.push("/");
                            }}
                            className="p-3 bg-[var(--color-danger)] text-white border-4 border-[var(--color-border)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none shadow-[4px_4px_0_black] transition-all"
                        >
                            <LogOut size={20} strokeWidth={3} />
                        </button>
                    </div>
                </header>

                {/* Main 3-Column Grid */}
                {auctionStatus !== "running" && auctionStatus !== "selling" ? (
                    /* NOT RUNNING: Show only grayscale plot image */
                    <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                        <NeoCard className="p-0 overflow-hidden relative bg-[var(--color-bg)] w-full max-w-3xl h-full">
                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
                                <div className="text-center">
                                    <MapPin size={64} className="mx-auto mb-3 text-white opacity-70" />
                                    <p className="font-black text-2xl uppercase text-white tracking-wider">
                                        Waiting for Auction
                                    </p>
                                    <p className="text-white/70 font-bold text-sm uppercase mt-1">
                                        {auctionStatus === "paused" ? "Auction is paused" :
                                            auctionStatus === "completed" ? "Auction completed" :
                                                "Auction has not started yet"}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute inset-0 pointer-events-none p-4 opacity-50">
                                <CityMap currentPlotNumber={currentPlot?.number} plots={plots} allTeams={allTeams} />
                            </div>
                        </NeoCard>
                    </div>
                ) : (
                    /* RUNNING: Show 3-column layout */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">

                        {/* LEFT: Plot Image */}
                        <div className="lg:col-span-5 min-h-[200px] sm:min-h-[300px] lg:min-h-0 overflow-hidden">
                            <NeoCard className="p-0 overflow-hidden h-full relative bg-[var(--color-bg)]">
                                <div className="absolute top-3 left-3 z-10">
                                    <NeoBadge variant="neutral">
                                        <MapPin size={14} className="mr-1" />
                                        Plot #{currentPlot?.number || "-"}
                                    </NeoBadge>
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentPlot?.number || "empty"}
                                        initial={{ x: 300, opacity: 0 }}
                                        animate={{ x: 0, opacity: 1 }}
                                        exit={{ x: -300, opacity: 0 }}
                                        transition={{ type: "tween", duration: 0.3 }}
                                        className="w-full h-full flex items-center justify-center relative"
                                    >
                                        {currentPlot ? (
                                            <>
                                                <AnimatedSvgPlot plotNumber={currentPlot.number} />
                                                {/* Countdown Overlay Layer */}
                                                <AnimatePresence>
                                                    {auctionStatus === "selling" && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.5 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            exit={{ opacity: 0, scale: 1.5 }}
                                                            className="absolute inset-0 bg-[var(--color-danger)]/90 z-20 flex flex-col items-center justify-center backdrop-blur-sm shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]"
                                                        >
                                                            <motion.span
                                                                key={sellCountdown}
                                                                initial={{ scale: 2, opacity: 0 }}
                                                                animate={{ scale: 1, opacity: 1 }}
                                                                className="text-white font-black text-[15rem] leading-none drop-shadow-[10px_10px_0_black]"
                                                            >
                                                                {sellCountdown}
                                                            </motion.span>
                                                            <p className="text-white font-black text-4xl mt-4 tracking-widest uppercase bg-black px-6 py-2 border-4 border-white">
                                                                Going Once...
                                                            </p>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </>
                                        ) : (
                                            <div className="text-center text-[var(--color-text)] opacity-40">
                                                <MapPin size={64} className="mx-auto mb-2 opacity-30" />
                                                <p className="font-bold uppercase text-sm">Waiting for plot...</p>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </NeoCard>
                        </div>

                        {/* CENTER: Plot Details + Bid Input */}
                        <div className="lg:col-span-4 flex flex-col gap-3 min-h-0 lg:overflow-y-auto">
                            {/* Plot Details Card */}
                            {currentPlot ? (
                                <NeoCard>
                                    <h2 className="text-lg sm:text-2xl font-black uppercase mb-3 sm:mb-4 flex items-center gap-2">
                                        <Info size={20} /> Plot #{currentPlot.number} Details
                                    </h2>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="neo-border p-3 bg-[var(--color-surface)]">
                                            <p className="text-xs font-bold uppercase text-[var(--color-text)] opacity-50">Type</p>
                                            <p className="font-black text-lg uppercase">{currentPlot.plot_type || "N/A"}</p>
                                        </div>
                                        <div className="neo-border p-3 bg-[var(--color-surface)]">
                                            <p className="text-xs font-bold uppercase text-[var(--color-text)] opacity-50">Total Area</p>
                                            <p className="font-black text-lg">{currentPlot.total_area?.toLocaleString() || "0"} sq ft</p>
                                        </div>
                                        <div className="neo-border p-3 bg-[var(--color-surface)]">
                                            <p className="text-xs font-bold uppercase text-[var(--color-text)] opacity-50">Actual Area</p>
                                            <p className="font-black text-lg">{currentPlot.actual_area?.toLocaleString() || "0"} sq ft</p>
                                        </div>
                                        <div className="neo-border p-3 bg-[var(--color-surface)]">
                                            <p className="text-xs font-bold uppercase text-[var(--color-text)] opacity-50">Total Plot Price</p>
                                            <p className="font-black text-lg">₹ {currentPlot.total_plot_price?.toLocaleString() || "0"}</p>
                                        </div>
                                        {Number(currentPlot.round_adjustment) !== 0 && (
                                            <div className={`neo-border p-3 col-span-2 ${currentPlot.round_adjustment > 0 ? "bg-[var(--color-success)]/20" : "bg-[var(--color-danger)]/20"}`}>
                                                <p className="text-xs font-bold uppercase text-[var(--color-text)] opacity-50">Round Adjustment</p>
                                                <p className={`font-black text-lg ${currentPlot.round_adjustment > 0 ? "text-[var(--color-success)]" : "text-[var(--color-danger)]"}`}>
                                                    {currentPlot.round_adjustment > 0 ? "+" : ""}₹ {currentPlot.round_adjustment?.toLocaleString()}
                                                </p>
                                            </div>
                                        )}
                                        {currentPlot.winner_team_id && (
                                            <div className="neo-border p-3 bg-[var(--color-surface)] col-span-2">
                                                <p className="text-xs font-bold uppercase text-[var(--color-text)] opacity-50">Current High Bid Team</p>
                                                <p className="font-black text-lg uppercase">{getTeamName(currentPlot.winner_team_id)}</p>
                                            </div>
                                        )}
                                    </div>
                                </NeoCard>
                            ) : (
                                <NeoCard className="flex flex-col items-center justify-center min-h-[200px] text-center bg-[var(--color-bg)] border-dashed">
                                    <p className="font-bold text-xl uppercase text-[var(--color-text)] opacity-40">Waiting for plot...</p>
                                </NeoCard>
                            )}

                            {/* Bid Input */}
                            <BidCard
                                currentPlot={currentPlot}
                                userTeam={userTeam}
                                allTeams={allTeams}
                                currentRound={currentRound}
                                auctionStatus={auctionStatus}
                                className="flex-1"
                            />

                            {/* Sold Plots Summary - visible during adjustment rounds */}
                            {(currentRound === 2 || currentRound === 3) && (
                                <NeoCard className="shrink-0">
                                    <h3 className="text-sm font-black uppercase mb-2 flex items-center gap-2">
                                        🏆 Sold Plots
                                    </h3>
                                    <div className="max-h-[200px] overflow-y-auto">
                                        {plots.filter(p => p.status?.toLowerCase() === "sold" && p.winner_team_id).length > 0 ? (
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="border-b-2 border-[var(--color-border)] text-left uppercase">
                                                        <th className="py-1 px-1">Plot</th>
                                                        <th className="py-1 px-1">Team</th>
                                                        <th className="py-1 px-1 text-right">Price</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {plots.filter(p => p.status?.toLowerCase() === "sold" && p.winner_team_id).map(p => (
                                                        <tr key={p.number} className="border-b border-[var(--color-border)] opacity-20">
                                                            <td className="py-1 px-1 font-bold">#{p.number}</td>
                                                            <td className="py-1 px-1">{getTeamName(p.winner_team_id)}</td>
                                                            <td className="py-1 px-1 text-right font-mono">₹{Number(p.current_bid).toLocaleString("en-IN")}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p className="text-[var(--color-text)] opacity-40 text-xs italic">No plots sold yet.</p>
                                        )}
                                    </div>
                                </NeoCard>
                            )}
                        </div>

                        {/* RIGHT: Live Feed */}
                        <div className="lg:col-span-3 min-h-[200px] lg:min-h-0 overflow-hidden">
                            <NeoCard className="h-full overflow-hidden flex flex-col">
                                <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                                    <Activity size={20} /> Feed
                                </h3>
                                <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
                                    {recentBids
                                        .filter(b => b.plot_number === currentPlot?.number)
                                        .map((bid, i) => (
                                            <motion.div
                                                key={`${bid.timestamp}-${i}`}
                                                initial={{ x: 20, opacity: 0 }}
                                                animate={{ x: 0, opacity: 1 }}
                                                className="flex flex-col bg-[var(--color-surface)] p-2 border-2 border-[var(--color-border)] font-bold shadow-[3px_3px_0_black]"
                                            >
                                                <div className="flex justify-between items-center">
                                                    <span className="uppercase text-sm">{bid.team_name}</span>
                                                    <span className="font-mono text-sm font-black">₹ {bid.amount?.toLocaleString("en-IN")}</span>
                                                </div>
                                            </motion.div>
                                        ))}
                                    {recentBids.filter(b => b.plot_number === currentPlot?.number).length === 0 && (
                                        <p className="text-[var(--color-text)] opacity-50 italic text-sm border-2 border-dashed border-[var(--color-border)] opacity-30 p-4 text-center">
                                            No bids yet...
                                        </p>
                                    )}
                                </div>
                            </NeoCard>
                        </div>
                    </div>
                )}

                <TrackingWindow currentPlot={currentPlot} status={auctionStatus} plots={plots} allTeams={allTeams} />
            </div>
        </NeoLayout>
    );
}
