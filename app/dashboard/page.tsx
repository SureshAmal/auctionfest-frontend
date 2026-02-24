"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../context/socket-context";
import BidCard from "../../components/BidCard";
import TrackingWindow from "../../components/TrackingWindow";
import NeoLayout from "../../components/neo/NeoLayout";
import { MapPin, Info, ArrowUpCircle, AlertTriangle, LogOut, CheckCircle2, Activity } from "lucide-react";
import CityMap from "@/components/map/CityMap";
import NeoCard from "../../components/neo/NeoCard";
import NeoBadge from "../../components/neo/NeoBadge";
import NeoButton from "../../components/neo/NeoButton";
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

    // Policy Screen State
    const [activeQuestion, setActiveQuestion] = useState<string | null>(null);

    // Rebid Market State
    const [rebidPhaseActive, setRebidPhaseActive] = useState(false);
    const [rebidOffers, setRebidOffers] = useState<any[]>([]);
    const [markupInput, setMarkupInput] = useState<Record<number, string>>({});

    // Round 4 phase: 'sell' | 'bid' | null
    const [round4Phase, setRound4Phase] = useState<string | null>(null);

    // Track adjustments from the CURRENT policy only: { plotNumber: deltaAmount }
    const [recentAdjustments, setRecentAdjustments] = useState<Record<number, number>>({});

    // 1. Check Auth & Load Initial Data
    useEffect(() => {
        const teamId = localStorage.getItem("team_id");
        if (!teamId) {
            router.push("/");
            return;
        }

        const fetchData = async () => {
            try {
                const t = Date.now();
                const teamRes = await fetch(`/api/data/team/${teamId}?t=${t}`, { cache: "no-store" });
                if (teamRes.ok) setUserTeam(await teamRes.json());

                const allTeamsRes = await fetch(`/api/data/teams?t=${t}`, { cache: "no-store" });
                if (allTeamsRes.ok) setAllTeams(await allTeamsRes.json());

                let plotsData: any[] = [];
                const plotsRes = await fetch(`/api/data/plots?t=${t}`, { cache: "no-store" });
                if (plotsRes.ok) {
                    plotsData = await plotsRes.json();
                    setPlots(plotsData);
                }

                const stateRes = await fetch(`/api/admin/state?t=${t}`, { cache: "no-store" });
                if (stateRes.ok) {
                    const stateData = await stateRes.json();
                    setAuctionStatus(stateData.status);
                    setCurrentRound(stateData.current_round || 1);
                    setRebidPhaseActive(stateData.rebid_phase_active || false);

                    if (stateData.current_plot) {
                        const fullPlot = plotsData.find((p: any) => p.number === stateData.current_plot.number);
                        setCurrentPlot(fullPlot || stateData.current_plot);
                    }
                    if (stateData.current_question) {
                        setActiveQuestion(stateData.current_question);
                    }

                    // Load Round 4 phase
                    if (stateData.round4_phase) {
                        setRound4Phase(stateData.round4_phase);
                    }

                    // Load persisted current policy deltas from backend
                    if (stateData.current_policy_deltas && Object.keys(stateData.current_policy_deltas).length > 0) {
                        const adjMap: Record<number, number> = {};
                        for (const [key, val] of Object.entries(stateData.current_policy_deltas)) {
                            adjMap[Number(key)] = Number(val);
                        }
                        setRecentAdjustments(adjMap);
                    }
                }

                const bidsRes = await fetch(`/api/data/bids/recent?t=${t}`, { cache: "no-store" });
                if (bidsRes.ok) setRecentBids(await bidsRes.json());

                const offersRes = await fetch(`/api/data/rebid-offers?t=${t}`, { cache: "no-store" });
                if (offersRes.ok) setRebidOffers(await offersRes.json());

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
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [auctionStatus]);
    // -----------------------------------------------------

    // Refs to access latest state inside socket handlers without adding them to dependencies
    const userTeamRef = useRef(userTeam);
    const currentPlotRef = useRef(currentPlot);

    useEffect(() => {
        userTeamRef.current = userTeam;
    }, [userTeam]);

    useEffect(() => {
        currentPlotRef.current = currentPlot;
    }, [currentPlot]);

    // 2. Socket Listeners
    useEffect(() => {
        if (!socket || !userTeam?.id) return;

        // Only join once
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
            if (data.current_question !== undefined) {
                setActiveQuestion(data.current_question);
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
                // Compute the delta for this specific policy application
                setPlots(prev => {
                    const oldPlot = prev.find(p => p.number === data.plot_number);
                    const oldAdj = Number(oldPlot?.round_adjustment || 0);
                    const newAdj = Number(data.plot.round_adjustment || 0);
                    const delta = newAdj - oldAdj;

                    // Track this delta in recentAdjustments
                    if (delta !== 0) {
                        setRecentAdjustments(ra => ({
                            ...ra,
                            [data.plot_number]: (ra[data.plot_number] || 0) + delta
                        }));
                    }

                    return prev.map(p =>
                        p.number === data.plot_number ? { ...p, ...data.plot } : p
                    );
                });
                if (currentPlotRef.current?.number === data.plot_number) {
                    setCurrentPlot((prev: any) => prev ? { ...prev, ...data.plot } : null);
                }
            }
        };

        const handleReset = () => {
            window.location.reload();
        };

        const handleTeamUpdate = (data: any) => {
            const dataId = String(data.id || data.team_id);

            // We read the current userTeam ID from the ref to avoid dependency cycles
            const myTeamId = userTeamRef.current ? String(userTeamRef.current.id) : null;

            if (myTeamId === dataId) {
                setUserTeam((prev: any) => prev ? { ...prev, spent: data.spent, budget: data.budget, plots_won: data.plots_won } : null);
            }

            // Also update the allTeams array so sidebar/leaderboard stays in sync
            setAllTeams(prev => prev.map(t =>
                String(t.id) === dataId ? { ...t, spent: data.spent, budget: data.budget, plots_won: data.plots_won } : t
            ));
        };

        const handlePlotUpdate = (data: any) => {
            setPlots(prev => prev.map(p => p.number === data.number ? { ...p, ...data } : p));
            if (currentPlotRef.current?.number === data.number) {
                setCurrentPlot((prev: any) => prev ? { ...prev, ...data } : null);
            }
        };

        const handleActiveQuestion = (data: any) => {
            console.log("Active Question Update:", data);
            setActiveQuestion(data.question);
            // Clear recent adjustments when a new policy question is pushed
            setRecentAdjustments({});
        };

        socket.on("auction_state_update", handleStateUpdate);
        socket.on("new_bid", handleNewBid);
        socket.on("round_change", handleRoundChange);
        socket.on("plot_adjustment", handlePlotAdjustment);
        socket.on("auction_reset", handleReset);
        socket.on("team_update", handleTeamUpdate);
        socket.on("active_question", handleActiveQuestion);
        socket.on("plot_update", handlePlotUpdate);

        // Rebid Listeners
        socket.on("rebid_phase_update", (data: any) => setRebidPhaseActive(data.is_active));
        socket.on("new_rebid_offer", (offer: any) => {
            setRebidOffers(prev => [offer, ...prev]);
        });
        socket.on("rebid_offer_sold", (offer: any) => {
            setRebidOffers(prev => prev.map(o => o.id === offer.id ? offer : o));
        });

        // Round 4 phase listener
        socket.on("round4_phase_update", (data: any) => {
            setRound4Phase(data.phase);
            if (data.phase === 'sell') {
                setRebidPhaseActive(true);
            } else if (data.phase === 'bid') {
                setRebidPhaseActive(false);
            }
        });

        // Handle cancelled offers (unsell)
        socket.on("rebid_offer_cancelled", (offer: any) => {
            setRebidOffers(prev => prev.filter(o => o.id !== offer.id));
        });

        return () => {
            socket.off("auction_state_update");
            socket.off("new_bid");
            socket.off("round_change");
            socket.off("plot_adjustment");
            socket.off("auction_reset");
            socket.off("team_update");
            socket.off("active_question");
            socket.off("plot_update");
            socket.off("rebid_phase_update");
            socket.off("new_rebid_offer");
            socket.off("rebid_offer_sold");
            socket.off("round4_phase_update");
            socket.off("rebid_offer_cancelled");
        };
    }, [socket, userTeam?.id]); // Only depend on ID, not the whole object, to prevent reconnects on budget updates

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
            case 4: return "Round 4 — Final Bidding";
            case 5: return "Round 5 — Adjustments";
            case 6: return "Round 6 — Final Adjustments";
            default: return `Round ${round}`;
        }
    };

    if (!userTeam) return null;

    return (
        <NeoLayout className="min-h-screen lg:h-screen lg:overflow-hidden" containerized={false}>
            <div className="flex flex-col h-full min-h-screen lg:min-h-0 p-2 sm:p-4 pb-2">
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

                    <div className="flex flex-wrap gap-2 sm:gap-4 items-center justify-end">
                        {(() => {
                            const remainingCash = Number(userTeam.budget) - Number(userTeam.spent || 0) -
                                (currentPlot?.winner_team_id === userTeam.id && currentPlot?.status === "active" ? Number(currentPlot?.current_bid || 0) : 0);
                            const portfolioValue = plots
                                .filter(p => p.winner_team_id === userTeam.id && p.status === 'sold')
                                .reduce((sum, p) => sum + (Number(p.current_bid || p.total_plot_price || 0) + Number(p.round_adjustment || 0)), 0);
                            return (
                                <div className="flex gap-1 neo-border bg-[var(--color-secondary)] text-black shadow-[4px_4px_0_black] overflow-hidden">
                                    <div className="flex flex-col justify-center items-center px-2 sm:px-3 py-1.5">
                                        <p className="text-[8px] sm:text-[10px] font-black uppercase text-black/60">Cash</p>
                                        <p className="font-mono font-black text-sm sm:text-lg leading-tight">
                                            ₹{remainingCash.toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                    <div className="w-[2px] bg-black/20" />
                                    <div className="flex flex-col justify-center items-center px-2 sm:px-3 py-1.5">
                                        <p className="text-[8px] sm:text-[10px] font-black uppercase text-black/60">Plots</p>
                                        <p className="font-mono font-black text-sm sm:text-lg leading-tight text-[var(--color-primary)]">
                                            ₹{portfolioValue.toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                    <div className="w-[2px] bg-black/20" />
                                    <div className="flex flex-col justify-center items-center px-2 sm:px-3 py-1.5 bg-black/10">
                                        <p className="text-[8px] sm:text-[10px] font-black uppercase text-black/60">Net Worth</p>
                                        <p className="font-mono font-black text-sm sm:text-lg leading-tight">
                                            ₹{(remainingCash + portfolioValue).toLocaleString("en-IN")}
                                        </p>
                                    </div>
                                </div>
                            );
                        })()}

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
                {auctionStatus === "completed" ? (
                    <div className="flex-1 min-h-0 flex items-center justify-center overflow-auto p-4 md:p-8 relative">
                        {/* Confetti / Background decoration could go here */}
                        <NeoCard className="w-full max-w-4xl bg-white border-8 border-black shadow-[12px_12px_0_var(--color-primary)] p-6 lg:p-10 flex flex-col max-h-full">
                            <h2 className="text-4xl md:text-6xl font-black uppercase text-center mb-2 tracking-tighter">
                                FINAL <span className="text-[var(--color-primary)]">LEADERBOARD</span>
                            </h2>
                            <p className="text-center font-bold text-sm uppercase opacity-50 border-b-4 border-dashed border-black pb-4 mb-6">
                                Ranked by Total Net Worth (Remaining Cash + Plot Valuation)
                            </p>
                            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                                {allTeams.map(t => {
                                    const remainingBudget = Number(t.budget) - Number(t.spent || 0);
                                    const teamPlots = plots.filter(p => p.winner_team_id === t.id && p.status === 'sold');
                                    const propertyValue = teamPlots.reduce((sum, p) => sum + ((Number(p.current_bid) || Number(p.total_plot_price) || 0) + Number(p.round_adjustment || 0)), 0);
                                    return {
                                        ...t,
                                        remainingBudget,
                                        propertyValue,
                                        plotsWon: teamPlots.length,
                                        netWorth: remainingBudget + propertyValue
                                    };
                                }).sort((a, b) => b.netWorth - a.netWorth).map((team, index) => (
                                    <div
                                        key={team.id}
                                        className={`flex flex-col md:flex-row items-center gap-4 justify-between border-4 border-black p-4 transition-transform ${index === 0 ? 'bg-[var(--color-success)] text-white shadow-[6px_6px_0_black] scale-[1.02] -rotate-1 z-10' : 'bg-[var(--color-surface)] shadow-[4px_4px_0_black]'}`}
                                    >
                                        <div className="flex items-center gap-4 w-full md:w-auto">
                                            <div className={`shrink-0 w-12 h-12 flex items-center justify-center font-black text-2xl border-4 ${index === 0 ? 'border-white bg-white text-[var(--color-success)]' : 'border-black bg-[var(--color-bg)]'}`}>
                                                #{index + 1}
                                            </div>
                                            <div className="flex flex-col flex-1">
                                                <span className="font-black text-2xl uppercase whitespace-nowrap overflow-hidden text-ellipsis">{team.name}</span>
                                                <span className="text-xs uppercase font-bold opacity-80 mt-1">{team.plotsWon} Plots Owned</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center md:items-end w-full md:w-auto bg-black/5 p-2 border-2 border-black/10">
                                            <span className="text-xs font-bold uppercase opacity-80">Net Worth</span>
                                            <span className="font-mono font-black text-2xl md:text-3xl">₹ {team.netWorth.toLocaleString("en-IN")}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </NeoCard>
                    </div>
                ) : auctionStatus !== "running" && auctionStatus !== "selling" ? (
                    /* NOT RUNNING: Show only grayscale plot image */
                    <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
                        <NeoCard className="p-0 overflow-hidden relative bg-[var(--color-bg)] w-full max-w-3xl aspect-square lg:aspect-auto lg:h-full">
                            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
                                <div className="text-center">
                                    <MapPin size={64} className="mx-auto mb-3 text-white opacity-70" />
                                    <p className="font-black text-2xl uppercase text-white tracking-wider">
                                        Waiting for Auction
                                    </p>
                                    <p className="text-white/70 font-bold text-sm uppercase mt-1">
                                        {auctionStatus === "paused" ? "Auction is paused" : "Auction has not started yet"}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute inset-0 pointer-events-none p-4 opacity-50">
                                <CityMap currentPlotNumber={currentPlot?.number} plots={plots} allTeams={allTeams} recentAdjustments={recentAdjustments} />
                            </div>
                        </NeoCard>
                    </div>
                ) : ([2, 3, 5, 6].includes(currentRound) && activeQuestion) ? (
                    /* POLICY/QUESTION SCREEN: Show Map + Question + Leaderboard */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden">

                        {/* LEFT: Map Panel */}
                        <div className="lg:col-span-8 flex flex-col gap-3 min-h-0">
                            <NeoCard className="flex flex-col shrink-0 lg:flex-none border-4 border-black bg-[var(--color-primary)] text-white shadow-[8px_8px_0_black]">
                                <h2 className="text-sm font-black uppercase mb-2 opacity-80 flex items-center gap-2">
                                    <AlertTriangle size={16} /> Active Policy (Round {currentRound})
                                </h2>
                                <p className="font-extrabold text-lg sm:text-2xl leading-snug">
                                    {activeQuestion}
                                </p>
                            </NeoCard>

                            <NeoCard className="flex-1 min-h-[300px] lg:min-h-0 p-0 overflow-hidden relative bg-[var(--color-bg)]">
                                <div className="absolute inset-0 p-2 sm:p-4">
                                    <CityMap currentPlotNumber={undefined} plots={plots} allTeams={allTeams} recentAdjustments={recentAdjustments} />
                                </div>
                            </NeoCard>
                        </div>

                        {/* RIGHT: Team Leaderboard & Status */}
                        <div className="lg:col-span-4 min-h-[300px] lg:min-h-0 overflow-hidden">
                            <NeoCard className="h-full overflow-hidden flex flex-col bg-[var(--color-bg)]">
                                <h3 className="text-lg font-black uppercase mb-4 flex items-center gap-2">
                                    <Activity size={20} /> Team Overview
                                </h3>
                                <div className="space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
                                    {[...allTeams].map(team => {
                                        const remaining = Number(team.budget) - Number(team.spent || 0) -
                                            (currentPlot?.winner_team_id === team.id && currentPlot?.status === "active" ? Number(currentPlot?.current_bid || 0) : 0);
                                        const portfolioValue = plots
                                            .filter(p => p.winner_team_id === team.id && p.status === 'sold')
                                            .reduce((sum, p) => sum + (Number(p.current_bid || p.total_plot_price || 0) + Number(p.round_adjustment || 0)), 0);
                                        return { ...team, remaining, portfolioValue, netWorth: remaining + portfolioValue };
                                    }).sort((a, b) => b.netWorth - a.netWorth).map((team, idx) => {
                                        return (
                                            <div key={team.id} className="flex flex-col bg-[var(--color-surface)] p-2 neo-border">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-black text-sm uppercase">#{idx + 1} {team.name}</span>
                                                    <span className="font-bold text-xs text-[var(--color-success)] tracking-wider">★ {team.plots_won} WON</span>
                                                </div>
                                                <div className="flex justify-between items-center pt-1 border-t-2 border-[var(--color-border)]">
                                                    <span className="text-xs font-bold opacity-60 uppercase">Net Worth</span>
                                                    <span className="font-mono text-sm font-black">₹{team.netWorth.toLocaleString("en-IN")}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </NeoCard>
                        </div>
                    </div>
                ) : (currentRound === 4 && rebidPhaseActive) ? (
                    /* REBID MARKETPLACE SCREEN */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden">

                        {/* Portfolio (Sell) */}
                        <div className="lg:col-span-12 w-full max-w-3xl mx-auto flex flex-col gap-3 min-h-0">
                            <NeoCard className="flex flex-col h-full bg-[var(--color-bg)]">
                                <h2 className="text-lg font-black uppercase mb-3 flex items-center gap-2 text-[var(--color-primary)]">
                                    <MapPin size={20} /> My Portfolio
                                </h2>
                                <div className="overflow-y-auto pr-1 flex-1 space-y-2">
                                    {plots.filter(p => p.winner_team_id === userTeam.id && p.status?.toLowerCase() === 'sold').length === 0 && (
                                        <p className="text-sm font-bold opacity-50 p-4 text-center">You don't own any plots to sell.</p>
                                    )}
                                    {plots.filter(p => p.winner_team_id === userTeam.id && p.status?.toLowerCase() === 'sold').map(plot => {
                                        const currentValue = (parseFloat(plot.current_bid || plot.total_plot_price || 0) + parseFloat(plot.round_adjustment || 0));
                                        const basePrice = parseFloat(plot.current_bid || plot.total_plot_price || 0);
                                        const maxAllowed = currentValue * 1.10;
                                        const activeOffer = rebidOffers.find(o => o.plot_number === plot.number && o.status === "active");

                                        return (
                                            <div key={plot.number} className="neo-border p-3 bg-[var(--color-surface)]">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-black text-sm uppercase">Plot #{plot.number}</span>
                                                    <span className="font-bold text-xs opacity-70">Value: ₹{currentValue.toLocaleString("en-IN")}</span>
                                                </div>

                                                {activeOffer ? (
                                                    <div className="bg-[var(--color-warning)] p-2 neo-border flex justify-between items-center text-black gap-2">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-bold uppercase">Listed for ₹{Number(activeOffer.asking_price).toLocaleString("en-IN")}</span>
                                                            <span className="text-[10px] font-black animate-pulse">WAITING FOR BUYER...</span>
                                                        </div>
                                                        <NeoButton
                                                            variant="danger"
                                                            className="text-[10px] py-1 px-2 shrink-0"
                                                            onClick={async () => {
                                                                try {
                                                                    const res = await fetch("/api/rebid/cancel-offer", {
                                                                        method: "POST",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({
                                                                            offer_id: activeOffer.id,
                                                                            team_id: userTeam.id
                                                                        })
                                                                    });
                                                                    if (!res.ok) alert((await res.json()).detail);
                                                                } catch (e) { console.error(e); }
                                                            }}
                                                        >
                                                            UNSELL
                                                        </NeoButton>
                                                    </div>
                                                ) : (
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="number"
                                                            placeholder={`₹${Math.floor(basePrice)} - ₹${Math.floor(maxAllowed)}`}
                                                            className="neo-input flex-1 text-sm py-1 px-2 min-w-0 bg-[var(--color-bg)]"
                                                            value={markupInput[plot.number] ?? Math.floor(basePrice)}
                                                            onChange={(e) => setMarkupInput(prev => ({ ...prev, [plot.number]: e.target.value }))}
                                                            max={maxAllowed}
                                                        />
                                                        <NeoButton
                                                            variant="primary"
                                                            className="text-xs py-1 px-3"
                                                            onClick={async () => {
                                                                const price = parseFloat(markupInput[plot.number]);
                                                                if (!price || price > Math.floor(maxAllowed) || price < 1) return alert(`Invalid price! Max: ₹${Math.floor(maxAllowed).toLocaleString("en-IN")}`);

                                                                try {
                                                                    const res = await fetch("/api/rebid/offer", {
                                                                        method: "POST",
                                                                        headers: { "Content-Type": "application/json" },
                                                                        body: JSON.stringify({
                                                                            team_id: userTeam.id,
                                                                            plot_number: plot.number,
                                                                            asking_price: price
                                                                        })
                                                                    });
                                                                    if (!res.ok) alert((await res.json()).detail);
                                                                    else setMarkupInput(prev => ({ ...prev, [plot.number]: "" }));
                                                                } catch (e) { console.error(e); }
                                                            }}
                                                        >
                                                            SELL
                                                        </NeoButton>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </NeoCard>
                        </div>


                    </div>
                ) : (
                    /* RUNNING (Standard): Show 3-column layout */
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 flex-1 lg:min-h-0 lg:overflow-hidden">

                        {/* LEFT: Plot Image */}
                        <div className="lg:col-span-5 min-h-[200px] sm:min-h-[350px] lg:min-h-0 lg:overflow-hidden flex flex-col">
                            <NeoCard className="p-0 flex-1 overflow-hidden relative bg-[var(--color-bg)]">
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
                                            <div className="text-center text-[var(--color-text)] opacity-40 py-10">
                                                <MapPin size={64} className="mx-auto mb-2 opacity-30" />
                                                <p className="font-bold uppercase text-sm">Waiting for plot...</p>
                                            </div>
                                        )}
                                    </motion.div>
                                </AnimatePresence>
                            </NeoCard>
                        </div>

                        {/* CENTER: Plot Details + Bid Input */}
                        <div className="lg:col-span-4 flex flex-col gap-3 lg:min-h-0 lg:overflow-y-auto">
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
                                            <p className="text-xs font-bold uppercase text-[var(--color-text)] opacity-50">Current Price</p>
                                            <p className="font-black text-lg">₹ {(Number(currentPlot.current_bid || currentPlot.total_plot_price || 0) + Number(currentPlot.round_adjustment || 0)).toLocaleString("en-IN")}</p>
                                        </div>
                                        {Number(currentPlot.round_adjustment) !== 0 && currentRound !== 4 && (
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
                                className="shrink-0"
                            />

                            {/* Sold Plots Summary - visible during adjustment rounds */}
                            {(currentRound === 2 || currentRound === 3 || currentRound === 5 || currentRound === 6) && (
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
                        <div className="lg:col-span-3 min-h-[300px] lg:min-h-0 lg:overflow-hidden flex flex-col">
                            <NeoCard className="flex-1 overflow-hidden flex flex-col">
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
                                        <p className="text-[var(--color-text)] opacity-50 italic text-sm border-2 border-dashed border-[var(--color-border)] p-4 text-center">
                                            No bids yet...
                                        </p>
                                    )}
                                </div>
                            </NeoCard>
                        </div>
                    </div>
                )}

                <TrackingWindow currentPlot={currentPlot} status={auctionStatus} plots={plots} allTeams={allTeams} userTeam={userTeam} />
            </div>
        </NeoLayout>
    );
}
