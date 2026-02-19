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

    /** Look up team name by ID. */
    const getTeamName = (teamId: string) => {
        if (!teamId) return "-";
        const team = teams.find(t => t.id === teamId);
        return team ? team.name : "-";
    };

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

    /** Apply percentage-based adjustment to one or more plots. */
    const handleAdjustPlot = async () => {
        // Parse comma-separated plot numbers
        const plotNums = adjustPlotNumber
            .split(",")
            .map(s => parseInt(s.trim()))
            .filter(n => !isNaN(n));
        const percent = parseFloat(adjustAmount);

        if (plotNums.length === 0 || isNaN(percent)) {
            setAdjustMessage("Enter valid plot number(s) and percentage");
            return;
        }

        try {
            const res = await fetch("/api/admin/adjust-plot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ plot_numbers: plotNums, adjustment_percent: percent }),
            });
            if (res.ok) {
                const data = await res.json();
                const count = data.results?.length || 0;
                setAdjustMessage(`${percent > 0 ? "+" : ""}${percent}% applied to ${count} plot(s)`);
                setAdjustAmount("");
                setAdjustPlotNumber("");
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
        <NeoLayout containerized={false}>
            <div className="h-screen flex flex-col overflow-hidden px-3 py-2">
                <header className="flex flex-col md:flex-row justify-between items-center mb-2 gap-2 border-b-4 border-black pb-2">
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



                {/* Main Content: Controls + Leaderboard + Connected | Plot Table */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
                    {/* Left: Controls + Leaderboard + Connected */}
                    <div className="lg:col-span-1 flex flex-col gap-3 min-h-0 overflow-y-auto">

                        {/* Admin Controls Card */}
                        <NeoCard className="shrink-0 bg-gray-50">
                            <h2 className="text-sm font-black uppercase mb-2 flex items-center gap-2">
                                <Settings size={16} /> Admin Controls
                            </h2>

                            {/* Auction Actions */}
                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <NeoButton
                                    variant="success"
                                    onClick={() => sendAction("start")}
                                    disabled={isRunning}
                                    className={`text-xs py-2 ${isRunning ? "opacity-50" : ""}`}
                                >
                                    <Play size={14} className="mr-1" /> {isNotStarted ? "START" : isCompleted ? "RESTART" : "RESUME"}
                                </NeoButton>
                                <NeoButton
                                    variant="secondary"
                                    onClick={() => sendAction("next")}
                                    disabled={!isRunning}
                                    className={`text-xs py-2 ${!isRunning ? "opacity-50" : ""}`}
                                >
                                    <SkipForward size={14} className="mr-1" /> NEXT
                                </NeoButton>
                                <NeoButton
                                    variant="base"
                                    onClick={() => sendAction("pause")}
                                    disabled={!isRunning}
                                    className={`text-xs py-2 ${!isRunning ? "opacity-50 bg-yellow-100" : "bg-yellow-400"}`}
                                >
                                    <Pause size={14} className="mr-1" /> PAUSE
                                </NeoButton>
                                <NeoButton
                                    variant="danger"
                                    className="text-xs py-2"
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
                                    <RefreshCw size={14} className={`mr-1 ${confirmReset ? "animate-spin" : ""}`} />
                                    {confirmReset ? "CONFIRM" : "RESET"}
                                </NeoButton>
                            </div>

                            {/* Round Selector */}
                            <div className="flex gap-1 justify-between items-center neo-border px-1 bg-white mb-3">
                                {[1, 2, 3, 4].map(r => (
                                    <button
                                        key={r}
                                        onClick={() => handleSetRound(r)}
                                        className={`flex-1 py-1.5 text-[10px] font-black uppercase border-2 border-transparent transition-all ${currentRound === r ? "bg-[var(--color-primary)] text-white border-black" : "hover:bg-gray-100"}`}
                                    >
                                        R{r}
                                    </button>
                                ))}
                            </div>

                            {/* Adjustment Panel */}
                            {(currentRound === 2 || currentRound === 3) && (
                                <div className="space-y-2 neo-border p-2 bg-yellow-50">
                                    <p className="text-[10px] font-black uppercase">Adjust Rounds</p>
                                    <input
                                        type="text"
                                        placeholder="Plots: 1,2,3"
                                        value={adjustPlotNumber}
                                        onChange={(e) => setAdjustPlotNumber(e.target.value)}
                                        className="neo-input text-xs w-full mb-1"
                                    />
                                    <div className="flex gap-1">
                                        <input
                                            type="number"
                                            placeholder="% ±"
                                            value={adjustAmount}
                                            onChange={(e) => setAdjustAmount(e.target.value)}
                                            className="neo-input text-xs w-2/3"
                                        />
                                        <NeoButton variant="primary" className="text-xs w-1/3" onClick={handleAdjustPlot}>
                                            GO
                                        </NeoButton>
                                    </div>
                                    {adjustMessage && (
                                        <p className="text-[10px] font-bold text-green-700 leading-tight">{adjustMessage}</p>
                                    )}
                                </div>
                            )}
                        </NeoCard>

                        {/* Leaderboard */}
                        <NeoCard className="shrink-0">
                            <h2 className="text-sm font-black uppercase mb-2 flex items-center gap-2">
                                <Trophy size={16} className="text-yellow-600" /> Leaderboard
                            </h2>
                            <div className="space-y-1.5">
                                {teams.map((team, i) => (
                                    <div key={team.id} className="flex justify-between items-center bg-white p-2 border-2 border-black text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-black w-5">#{i + 1}</span>
                                            <span className="font-bold uppercase">{team.name}</span>
                                        </div>
                                        <div className="text-right font-mono font-bold">
                                            <div className="text-green-600">★{team.plots_won}</div>
                                            <div>₹{Number(team.spent || 0).toLocaleString("en-IN")}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </NeoCard>

                        {/* Connected Teams */}
                        <NeoCard className="shrink-0">
                            <h2 className="text-sm font-black uppercase mb-2 flex items-center gap-2">
                                <Users size={16} className="text-blue-600" /> Online ({connectedTeams.length})
                            </h2>
                            <div className="space-y-1">
                                {connectedTeams.length > 0 ? connectedTeams.map((name, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-gray-100 p-1.5 border border-black font-bold text-xs">
                                        <span className="w-2 h-2 bg-green-500 border border-black" />
                                        <span>{name}</span>
                                    </div>
                                )) : (
                                    <p className="text-gray-500 text-xs italic border border-dashed border-gray-300 p-2">No one connected</p>
                                )}
                            </div>
                        </NeoCard>
                    </div>

                    {/* Right: Plot Status Table - full remaining space */}
                    <div className="lg:col-span-3 min-h-0 overflow-hidden flex flex-col">
                        <NeoCard className="flex-1 flex flex-col min-h-0 overflow-hidden">
                            <h3 className="text-sm font-black uppercase mb-2">Plot Status</h3>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                <NeoTable
                                    headers={["#", "Type", "Area", "Base", "Adj.", "Status", "Team", "Bid"]}
                                    data={plots}
                                    renderRow={(p) => (
                                        <>
                                            <td className="px-2 py-1.5 font-bold bg-gray-50 text-sm">{p.number}</td>
                                            <td className="px-2 py-1.5 text-xs font-bold uppercase">{p.plot_type || "-"}</td>
                                            <td className="px-2 py-1.5 font-mono text-xs">{p.actual_area?.toLocaleString() || "-"}</td>
                                            <td className="px-2 py-1.5 font-mono text-xs">₹{p.base_price?.toLocaleString() || "-"}</td>
                                            <td className={`px-2 py-1.5 font-mono text-xs font-bold ${(p.round_adjustment || 0) > 0 ? "text-green-600" : (p.round_adjustment || 0) < 0 ? "text-red-600" : ""}`}>
                                                {Number(p.round_adjustment) !== 0 ? `${p.round_adjustment > 0 ? "+" : ""}₹${Number(p.round_adjustment).toLocaleString("en-IN")}` : "-"}
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <NeoBadge variant={
                                                    p.status === "sold" ? "success" :
                                                        p.status === "active" ? "info" : "neutral"
                                                }>
                                                    {p.status}
                                                </NeoBadge>
                                            </td>
                                            <td className="px-2 py-1.5 text-xs font-bold uppercase">{getTeamName(p.winner_team_id)}</td>
                                            <td className="px-2 py-1.5 font-mono font-bold text-xs">{p.current_bid ? `₹${Number(p.current_bid).toLocaleString("en-IN")}` : "-"}</td>
                                        </>
                                    )}
                                />
                            </div>
                        </NeoCard>
                    </div>
                </div>
            </div>
        </NeoLayout>
    );
}
