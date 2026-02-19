"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../../context/socket-context";
import NeoLayout from "../../components/neo/NeoLayout";
import NeoCard from "../../components/neo/NeoCard";
import NeoButton from "../../components/neo/NeoButton";
import NeoTable from "../../components/neo/NeoTable";
import NeoBadge from "../../components/neo/NeoBadge";
import NeoInput from "../../components/neo/NeoInput";
import {
    Play, SkipForward, Pause, RefreshCw, Trophy,
    ShieldAlert, Users, Settings, TrendingUp, TrendingDown
} from "lucide-react";

/**
 * Admin page for controlling the auction.
 *
 * Features:
 * - Auction controls (start/pause/next/reset)
 * - Round selector (1-4 rounds)
 * - Plot adjustment panel (increment/decrement for rounds 2 & 3)
 * - Connected teams display
 * - Leaderboard
 * - Plot status table with details
 */
export default function AdminPage() {
    const { socket } = useSocket();
    const [plots, setPlots] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [currentPlot, setCurrentPlot] = useState<any>(null);
    const [auctionState, setAuctionState] = useState<any>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [connectedCount, setConnectedCount] = useState(0);
    const [connectedTeams, setConnectedTeams] = useState<string[]>([]);

    // Round & Adjustment state
    const [currentRound, setCurrentRound] = useState(1);
    const [adjustPlotNumber, setAdjustPlotNumber] = useState("");
    const [adjustAmount, setAdjustAmount] = useState("");
    const [adjustMessage, setAdjustMessage] = useState("");

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plotsRes, teamsRes, stateRes] = await Promise.all([
                    fetch("/api/data/plots"),
                    fetch("/api/data/teams"),
                    fetch("/api/admin/state"),
                ]);

                if (plotsRes.ok) setPlots(await plotsRes.json());
                if (teamsRes.ok) setTeams(await teamsRes.json());
                if (stateRes.ok) {
                    const stateData = await stateRes.json();
                    setAuctionState(stateData);
                    setCurrentRound(stateData.current_round || 1);
                    if (stateData.current_plot_number) {
                        setCurrentPlot({ number: stateData.current_plot_number });
                    }
                }
            } catch (err) {
                console.error("Failed to fetch admin data:", err);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Socket Listeners
    useEffect(() => {
        if (!socket) return;
        socket.emit("join_auction", { role: "admin" });

        const handleStateUpdate = (data: any) => {
            setAuctionState(data);
            if (data.current_round) setCurrentRound(data.current_round);
            if (data.current_plot_number) {
                setPlots(prev => prev.map(p => ({
                    ...p,
                    status: p.number === data.current_plot_number ? "active" :
                        p.status === "active" ? "sold" : p.status,
                })));
                setCurrentPlot({ number: data.current_plot_number });
            }
        };

        const handleRoundChange = (data: any) => {
            if (data.current_round) setCurrentRound(data.current_round);
        };

        const handlePlotAdjustment = (data: any) => {
            if (data.plot) {
                setPlots(prev => prev.map(p =>
                    p.number === data.plot_number ? { ...p, ...data.plot } : p
                ));
            }
        };

        socket.on("auction_state_update", handleStateUpdate);
        socket.on("round_change", handleRoundChange);
        socket.on("plot_adjustment", handlePlotAdjustment);
        socket.on("new_bid", () => { /* Updated on next poll */ });
        socket.on("connection_count", (data: any) => {
            setConnectedCount(data.count);
            setConnectedTeams(data.teams || []);
        });
        socket.on("auction_reset", () => window.location.reload());

        return () => {
            socket.off("auction_state_update");
            socket.off("round_change");
            socket.off("plot_adjustment");
            socket.off("new_bid");
            socket.off("connection_count");
            socket.off("auction_reset");
        };
    }, [socket]);

    const status = auctionState?.status || "not_started";
    const isRunning = status === "running";
    const isPaused = status === "paused";
    const isCompleted = status === "completed";
    const isNotStarted = status === "not_started";

    /** Send an admin action to the server. */
    const sendAction = async (action: string) => {
        try {
            await fetch(`/api/admin/${action}`, { method: "POST" });
        } catch (err) {
            console.error(`Admin action '${action}' failed:`, err);
        }
    };

    /** Change the current auction round. */
    const handleSetRound = async (round: number) => {
        try {
            const res = await fetch("/api/admin/set-round", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ round }),
            });
            if (res.ok) {
                setCurrentRound(round);
            }
        } catch (err) {
            console.error("Failed to set round:", err);
        }
    };

    /** Apply increment/decrement adjustment to a plot. */
    const handleAdjustPlot = async () => {
        const plotNum = parseInt(adjustPlotNumber);
        const amount = parseFloat(adjustAmount);

        if (isNaN(plotNum) || isNaN(amount)) {
            setAdjustMessage("Please enter valid plot number and amount");
            return;
        }

        try {
            const res = await fetch("/api/admin/adjust-plot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plot_number: plotNum, adjustment: amount }),
            });
            if (res.ok) {
                const data = await res.json();
                setAdjustMessage(`Plot ${plotNum} adjusted by ₹${amount.toLocaleString()}. Total: ₹${data.total_adjustment.toLocaleString()}`);
                setAdjustAmount("");
            } else {
                const err = await res.json();
                setAdjustMessage(err.detail || "Adjustment failed");
            }
        } catch (err) {
            setAdjustMessage("Network error");
        }

        setTimeout(() => setAdjustMessage(""), 4000);
    };

    /** Get round label for display. */
    const getRoundLabel = (round: number) => {
        switch (round) {
            case 1: return "Bidding";
            case 2: return "Adjust";
            case 3: return "Adjust";
            case 4: return "Final Bid";
            default: return `R${round}`;
        }
    };

    return (
        <NeoLayout>
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b-4 border-black pb-4">
                <div className="flex items-center gap-4">
                    <ShieldAlert size={48} className="text-[var(--color-primary)]" strokeWidth={3} />
                    <h1 className="text-4xl font-black uppercase tracking-tighter">
                        ADMIN PANEL
                    </h1>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 neo-border px-4 py-2 bg-white">
                        <Users size={20} className="text-blue-600" />
                        <span className="font-black text-xl">{connectedCount}</span>
                        <span className="font-bold uppercase text-sm">Online</span>
                    </div>

                    <NeoBadge variant={isRunning ? "success" : isPaused ? "warning" : isCompleted ? "danger" : "neutral"}>
                        {status.replace("_", " ")}
                    </NeoBadge>

                    <div className="neo-border px-4 py-2 bg-[var(--color-surface)]">
                        <span className="font-bold uppercase text-xs block">Plot</span>
                        <span className="font-black text-2xl">#{auctionState?.current_plot_number || "-"}</span>
                    </div>

                    <div className="neo-border px-4 py-2 bg-blue-100">
                        <span className="font-bold uppercase text-xs block">Round</span>
                        <span className="font-black text-2xl">{currentRound}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Controls + Round + Adjustment */}
                <div className="space-y-6">
                    {/* Auction Controls */}
                    <NeoCard>
                        <h2 className="text-xl font-black uppercase mb-4">Auction Controls</h2>
                        <div className="grid grid-cols-1 gap-3">
                            <NeoButton
                                variant="success"
                                onClick={() => sendAction("start")}
                                disabled={isRunning}
                                className={isRunning ? "opacity-50 cursor-not-allowed" : ""}
                            >
                                <Play size={20} className="mr-2" /> {isNotStarted ? "START" : isCompleted ? "RESTART" : "RESUME"}
                            </NeoButton>

                            <NeoButton
                                variant="secondary"
                                onClick={() => sendAction("next")}
                                disabled={!isRunning}
                                className={!isRunning ? "opacity-50 cursor-not-allowed" : ""}
                            >
                                <SkipForward size={20} className="mr-2" /> NEXT PLOT
                            </NeoButton>

                            <NeoButton
                                variant="base"
                                onClick={() => sendAction("pause")}
                                disabled={!isRunning}
                                className={!isRunning ? "opacity-50 cursor-not-allowed bg-yellow-100" : "bg-yellow-400"}
                            >
                                <Pause size={20} className="mr-2" /> PAUSE
                            </NeoButton>

                            <NeoButton
                                variant="danger"
                                onClick={() => {
                                    if (confirmReset) {
                                        sendAction("reset");
                                        setConfirmReset(false);
                                    } else {
                                        setConfirmReset(true);
                                        setTimeout(() => setConfirmReset(false), 3000);
                                    }
                                }}
                            >
                                <RefreshCw size={20} className={`mr-2 ${confirmReset ? "animate-spin" : ""}`} />
                                {confirmReset ? "CONFIRM RESET?" : "RESET"}
                            </NeoButton>
                        </div>
                    </NeoCard>

                    {/* Round Selector */}
                    <NeoCard>
                        <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                            <Settings size={20} /> Round Control
                        </h2>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map(r => (
                                <NeoButton
                                    key={r}
                                    variant={currentRound === r ? "primary" : "base"}
                                    onClick={() => handleSetRound(r)}
                                    className={`text-sm font-black ${currentRound === r ? "" : "bg-gray-100"}`}
                                >
                                    R{r}
                                    <span className="block text-[10px] font-bold">{getRoundLabel(r)}</span>
                                </NeoButton>
                            ))}
                        </div>
                    </NeoCard>

                    {/* Plot Adjustment Panel (visible in rounds 2 & 3) */}
                    {(currentRound === 2 || currentRound === 3) && (
                        <NeoCard className="bg-yellow-50">
                            <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                                {currentRound === 2 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                                Plot Adjustment (Round {currentRound})
                            </h2>
                            <div className="space-y-3">
                                <NeoInput
                                    label="Plot Number"
                                    type="number"
                                    placeholder="e.g. 5"
                                    value={adjustPlotNumber}
                                    onChange={(e) => setAdjustPlotNumber(e.target.value)}
                                />
                                <NeoInput
                                    label="Adjustment Amount (+ or -)"
                                    type="number"
                                    placeholder="e.g. 5000 or -3000"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                />
                                <NeoButton
                                    variant="primary"
                                    className="w-full"
                                    onClick={handleAdjustPlot}
                                >
                                    APPLY ADJUSTMENT
                                </NeoButton>
                                {adjustMessage && (
                                    <div className="text-sm font-bold p-2 bg-white border-2 border-black">
                                        {adjustMessage}
                                    </div>
                                )}
                            </div>
                        </NeoCard>
                    )}

                    {/* Connected Teams */}
                    <NeoCard>
                        <h2 className="text-lg font-black uppercase mb-3 flex items-center gap-2">
                            <Users size={20} className="text-blue-600" /> Connected Teams
                        </h2>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                            {connectedTeams.length > 0 ? connectedTeams.map((name, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-100 p-2 border-2 border-black font-bold">
                                    <span className="w-3 h-3 bg-green-500 border border-black" />
                                    <span>{name}</span>
                                </div>
                            )) : (
                                <p className="text-gray-500 text-sm italic border-2 border-dashed border-gray-300 p-2">No one connected yet...</p>
                            )}
                        </div>
                    </NeoCard>
                </div>

                {/* Center + Right: Leaderboard & Plot Table */}
                <div className="lg:col-span-2 flex flex-col gap-8">
                    {/* Leaderboard */}
                    <NeoCard>
                        <h2 className="text-xl font-black uppercase mb-4 flex items-center gap-2">
                            <Trophy className="text-yellow-600" /> Leaderboard
                        </h2>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {teams.map((team, i) => (
                                <div key={team.id} className="flex justify-between items-center bg-white p-3 border-2 border-black hover:bg-[var(--color-surface)] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-lg w-6">#{i + 1}</span>
                                        <span className="font-bold uppercase">{team.name}</span>
                                    </div>
                                    <div className="text-right text-xs font-mono font-bold">
                                        <div className="text-green-600">★ {team.plots_won}</div>
                                        <div>₹{(team.spent || 0).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </NeoCard>

                    {/* Plots Status Table */}
                    <NeoCard>
                        <h3 className="text-lg font-black uppercase mb-4">Plot Status</h3>
                        <div className="max-h-96 overflow-y-auto">
                            <NeoTable
                                headers={["#", "Type", "Area", "Base", "Adj.", "Status", "Bid"]}
                                data={plots}
                                renderRow={(p) => (
                                    <>
                                        <td className="px-3 py-2 font-bold bg-gray-50">{p.number}</td>
                                        <td className="px-3 py-2 text-xs font-bold uppercase">{p.plot_type || "-"}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{p.actual_area?.toLocaleString() || "-"}</td>
                                        <td className="px-3 py-2 font-mono text-xs">₹{p.base_price?.toLocaleString() || "-"}</td>
                                        <td className={`px-3 py-2 font-mono text-xs font-bold ${(p.round_adjustment || 0) > 0 ? "text-green-600" : (p.round_adjustment || 0) < 0 ? "text-red-600" : ""}`}>
                                            {p.round_adjustment ? `${p.round_adjustment > 0 ? "+" : ""}₹${p.round_adjustment.toLocaleString()}` : "-"}
                                        </td>
                                        <td className="px-3 py-2">
                                            <NeoBadge variant={
                                                p.status === "sold" ? "success" :
                                                    p.status === "active" ? "info" : "neutral"
                                            }>
                                                {p.status}
                                            </NeoBadge>
                                        </td>
                                        <td className="px-3 py-2 font-mono font-bold text-xs">{p.current_bid ? `₹${p.current_bid.toLocaleString()}` : "-"}</td>
                                    </>
                                )}
                            />
                        </div>
                    </NeoCard>
                </div>
            </div>
        </NeoLayout>
    );
}
