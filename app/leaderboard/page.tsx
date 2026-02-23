"use client";
import React, { useEffect, useState } from "react";
import { useSocket } from "../../context/socket-context";
import NeoLayout from "../../components/neo/NeoLayout";
import NeoCard from "../../components/neo/NeoCard";
import { Trophy, TrendingUp, Anchor } from "lucide-react";

interface Team {
    id: string;
    name: string;
    budget: string | number;
    spent: string | number;
    plots_won: number;
}

interface Plot {
    number: number;
    status: string;
    winner_team_id: string | null;
    current_bid: number | null;
    total_plot_price: number;
    round_adjustment: number;
}

export default function LeaderboardPage() {
    const [teams, setTeams] = useState<Team[]>([]);
    const [plots, setPlots] = useState<Plot[]>([]);
    const { socket, isConnected } = useSocket();
    const [auctionStatus, setAuctionStatus] = useState("not_started");

    useEffect(() => {
        // Fetch Initial Data via Next.js proxy (relative paths)
        const fetchInitialData = async () => {
            try {
                const [plotsRes, teamsRes, stateRes] = await Promise.all([
                    fetch(`/api/data/plots`),
                    fetch(`/api/data/teams`),
                    fetch(`/api/admin/state`),
                ]);

                if (plotsRes.ok) setPlots(await plotsRes.json());
                if (teamsRes.ok) setTeams(await teamsRes.json());
                if (stateRes.ok) {
                    const data = await stateRes.json();
                    if (data.status) setAuctionStatus(data.status);
                }
            } catch (err) {
                console.error("Failed to fetch initial state:", err);
            }
        };

        fetchInitialData();
    }, []);

    useEffect(() => {
        if (!socket) return;

        const joinRoom = () => {
            socket.emit("join_auction", { role: "leaderboard" });
        };

        if (isConnected) {
            joinRoom();
        } else {
            socket.on("connect", joinRoom);
        }

        // Listen for bid updates (someone won a plot)
        socket.on("bid_update", (data: any) => {
            setPlots(prev => prev.map(p => p.number === data.plot_number ? { ...p, current_bid: data.amount, winner_team_id: data.team_id } : p));
        });

        // Listen for plot status changes (sold, active, pending)
        socket.on("auction_state_update", (data: any) => {
            setAuctionStatus(data.status);
            if (data.current_plot) {
                setPlots(prev => prev.map(p => p.number === data.current_plot.number ? { ...p, ...data.current_plot } : p));
            }
        });

        // Listen for plot adjustments (policy rounds)
        socket.on("plot_adjustment", (data: any) => {
            setPlots(prev => prev.map(p => p.number === data.plot_number ? { ...p, round_adjustment: data.plot.round_adjustment } : p));
        });

        // Listen for direct team updates
        socket.on("team_update", (data: any) => {
            setTeams(prev => prev.map(t => t.id === (data.id || data.team_id) ? { ...t, ...data } : t));
        });

        // Listen for generic plot updates
        socket.on("plot_update", (data: any) => {
            setPlots(prev => prev.map(p => p.number === data.number ? { ...p, ...data } : p));
        });

        // Listen for new bids
        socket.on("new_bid", (data: any) => {
            setPlots(prev => prev.map(p => p.number === data.plot.number ? { ...p, current_bid: data.plot.current_bid, winner_team_id: data.plot.winner_team_id } : p));
        });

        // Complete synchronization
        socket.on("sync_state", (data: any) => {
            if (data.teams) setTeams(data.teams);
            if (data.plots) setPlots(data.plots);
        });

        return () => {
            socket.off("connect", joinRoom);
            socket.off("bid_update");
            socket.off("auction_state_update");
            socket.off("plot_adjustment");
            socket.off("team_update");
            socket.off("plot_update");
            socket.off("new_bid");
            socket.off("sync_state");
        };
    }, [socket, isConnected]);

    // Calculate aggregated stats and net worth
    const leaderboardData = teams.map(t => {
        const remaining = Number(t.budget) - Number(t.spent || 0);
        const teamPlots = plots.filter(p => p.winner_team_id === t.id && p.status === 'sold');
        const propertyValue = teamPlots.reduce((sum, p) => sum + ((Number(p.current_bid) || Number(p.total_plot_price) || 0) + Number(p.round_adjustment || 0)), 0);
        const netWorth = remaining + propertyValue;

        return {
            ...t,
            remaining,
            propertyValue,
            plotsWon: teamPlots.length,
            netWorth
        };
    }).sort((a, b) => b.netWorth - a.netWorth);

    const maxNetWorth = Math.max(...leaderboardData.map(t => t.netWorth), 1);

    return (
        <NeoLayout containerized={false} className="min-h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
            <header className="flex justify-between items-end p-4 lg:p-6 bg-[var(--color-surface)] neo-border shadow-[8px_8px_0_black] z-10 mb-2">
                <div>
                    <h1 className="text-3xl md:text-5xl font-black uppercase text-[var(--color-primary)] flex items-center gap-3 tracking-tighter">
                        <Trophy size={40} className="text-[var(--color-primary)]" /> LIVE LEADERBOARD
                    </h1>
                    <div className="flex items-center gap-3 mt-2">
                        <div className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black flex items-center gap-1.5 ${isConnected ? "bg-[var(--color-success)] text-white" : "bg-[var(--color-danger)] text-white animate-pulse"
                            }`}>
                            <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-white" : "bg-black"}`} />
                            {isConnected ? "connected" : "disconnected"}
                        </div>
                        <div className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-black ${auctionStatus === "completed" ? "bg-[var(--color-primary)] text-white" : "bg-white text-black"
                            }`}>
                            STATUS: {auctionStatus}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden sm:flex flex-col items-end">
                        <p className="text-xs font-bold uppercase opacity-60">Total Teams</p>
                        <p className="text-2xl font-black font-mono leading-none">{teams.length}</p>
                    </div>
                </div>
            </header>

            <div className="flex-1 w-full overflow-y-auto p-4 md:p-6 lg:p-8">
                <div className="w-full mx-auto columns-1 lg:columns-2 2xl:columns-3 gap-6 lg:gap-10">
                    {leaderboardData.map((team, index) => {
                        const BASE_NW = 500000000; // 50 Cr
                        // Make the chart responsive to the highest net worth, but at least 100 Cr so 50 Cr is ideally ~50%
                        const maxChartRange = Math.max(1000000000, maxNetWorth * 1.05);

                        const percentage = Math.max(1, (team.netWorth / maxChartRange) * 100);

                        // Color progression based on Net Worth performance
                        // Start at Yellow (45) for 50Cr. Go to Green (120) for gains. Go to Red (0) for losses.
                        let hue = 50;
                        if (team.netWorth > BASE_NW) {
                            const ratio = Math.min(1, (team.netWorth - BASE_NW) / 250000000); // 25Cr gain maxes out green
                            hue = 50 + (ratio * 70); // Up to 120 (Green)
                        } else if (team.netWorth < BASE_NW) {
                            const ratio = Math.min(1, (BASE_NW - team.netWorth) / 250000000); // 25Cr loss maxes out red
                            hue = 50 - (ratio * 50); // Down to 0 (Red)
                        }
                        const barColor = `hsl(${hue}, 85%, 55%)`;

                        const formatCurrency = (val: number) => {
                            if (val >= 10000000) return (val / 10000000).toFixed(2) + 'Cr';
                            if (val >= 100000) return (val / 100000).toFixed(1) + 'L';
                            return val.toLocaleString("en-IN");
                        };

                        return (
                            <div
                                key={team.id}
                                className={`relative flex items-center justify-between h-10 md:h-12 lg:h-[3.25rem] w-full break-inside-avoid mb-2 lg:mb-2.5 bg-[var(--color-surface)] border border-black/10 rounded-r-md`}
                            >
                                {/* The solid colored bar acting as background and chart */}
                                <div
                                    className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out z-0 rounded-r-md opacity-30"
                                    style={{
                                        width: `100%`,
                                        backgroundColor: barColor,
                                    }}
                                />
                                <div
                                    className="absolute inset-y-0 left-0 transition-all duration-1000 ease-out z-0 rounded-r-md"
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: barColor,
                                    }}
                                />

                                {/* Content overlaid on the bar */}
                                <div className="relative z-10 flex items-center gap-2 md:gap-3 pl-2 md:pl-3 w-full h-full overflow-hidden">
                                    {/* Avatar bubble */}
                                    <div className={`shrink-0 flex items-center justify-center w-6 h-6 md:w-8 md:h-8 rounded-full bg-[var(--color-bg)] shadow-sm overflow-hidden border border-[var(--color-text)] opacity-90 text-[10px] md:text-xs font-black text-[var(--color-text)]`}>
                                        <span className={index === 0 ? 'text-[var(--color-primary)]' : ''}>
                                            {index + 1}
                                        </span>
                                    </div>

                                    {/* Team Name */}
                                    <h3 className={`font-bold text-sm md:text-base whitespace-nowrap overflow-hidden text-ellipsis text-[var(--color-text)] flex-1`}>
                                        {team.name} <span className={`text-[9px] md:text-[10px] opacity-60 ml-1 font-normal hidden md:inline`}>({team.plotsWon} plots)</span>
                                    </h3>

                                    {/* Net Worth value right-aligned within the bar */}
                                    <div className="shrink-0 pr-3 md:pr-4 flex flex-col items-end justify-center h-full">
                                        <span className={`font-black text-sm md:text-lg text-[var(--color-text)] tracking-tight leading-none whitespace-nowrap`}>
                                            NW: ₹{formatCurrency(team.netWorth)}
                                        </span>
                                        <span className="text-[8px] md:text-[10px] font-bold text-[var(--color-text)] opacity-70 uppercase mt-0.5 whitespace-nowrap">
                                            CASH: ₹{formatCurrency(team.remaining)} • AST: ₹{formatCurrency(team.propertyValue)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

        </NeoLayout>
    );
}
