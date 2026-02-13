"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../../context/socket-context";
import Map from "../../components/Map";
import { motion } from "framer-motion";
import { Play, SkipForward, Pause, RefreshCw, Trophy, ShieldAlert, Users } from "lucide-react";

export default function AdminPage() {
    const { socket } = useSocket();
    const [plots, setPlots] = useState<any[]>([]);
    const [teams, setTeams] = useState<any[]>([]);
    const [currentPlot, setCurrentPlot] = useState<any>(null);
    const [auctionState, setAuctionState] = useState<any>(null);
    const [confirmReset, setConfirmReset] = useState(false);
    const [connectedCount, setConnectedCount] = useState(0);
    const [connectedTeams, setConnectedTeams] = useState<string[]>([]);

    // Fetch Data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [plotsRes, teamsRes, stateRes] = await Promise.all([
                    fetch("/api/data/plots"),
                    fetch("/api/data/teams"),
                    fetch("/api/admin/state")
                ]);

                if (plotsRes.ok) setPlots(await plotsRes.json());
                if (teamsRes.ok) setTeams(await teamsRes.json());
                if (stateRes.ok) {
                    const stateData = await stateRes.json();
                    setAuctionState(stateData);
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
            if (data.current_plot_number) {
                setPlots(prev => prev.map(p => ({
                    ...p,
                    status: p.number === data.current_plot_number ? 'active' :
                        p.status === 'active' ? 'sold' : p.status
                })));
                setCurrentPlot({ number: data.current_plot_number });
            }
        };

        const handleNewBid = (data: any) => {
            // Will be updated on next poll
        };

        socket.on("auction_state_update", handleStateUpdate);
        socket.on("new_bid", handleNewBid);
        socket.on("connection_count", (data: any) => {
            setConnectedCount(data.count);
            setConnectedTeams(data.teams || []);
        });
        socket.on("auction_reset", () => {
            window.location.reload();
        });

        return () => {
            socket.off("auction_state_update");
            socket.off("new_bid");
            socket.off("connection_count");
            socket.off("auction_reset");
        };
    }, [socket]);

    // Derive button states from auction status
    const status = auctionState?.status || 'not_started';
    const isRunning = status === 'running';
    const isPaused = status === 'paused';
    const isCompleted = status === 'completed';
    const isNotStarted = status === 'not_started';

    // Admin Actions
    const sendAction = async (action: string) => {
        try {
            await fetch(`/api/admin/${action}`, { method: 'POST' });
        } catch (err) {
            console.error(`Admin action '${action}' failed:`, err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <header className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                <h1 className="text-3xl font-bold text-purple-400 flex items-center gap-2">
                    <ShieldAlert /> ADMIN PANEL
                </h1>
                <div className="flex gap-4">
                    <div className="bg-gray-800 px-4 py-2 rounded flex items-center gap-2">
                        <Users size={16} className="text-blue-400" />
                        <span className="font-bold text-blue-400">{connectedCount}</span> Online
                    </div>
                    <div className="bg-gray-800 px-4 py-2 rounded">
                        Status: <span className={`font-bold ${isRunning ? 'text-green-400' : isPaused ? 'text-yellow-400' : isCompleted ? 'text-red-400' : 'text-gray-400'}`}>{status}</span>
                    </div>
                    <div className="bg-gray-800 px-4 py-2 rounded">
                        Current Plot: <span className="font-bold text-yellow-400">#{auctionState?.current_plot_number || "-"}</span>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Controls & Leaderboard */}
                <div className="space-y-8">
                    {/* Controls */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 text-gray-400">Auction Controls</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => sendAction('start')}
                                disabled={isRunning}
                                className={`flex items-center justify-center gap-2 p-4 rounded-lg font-bold transition-all ${isRunning
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-500 text-white'
                                    }`}
                            >
                                <Play /> {isNotStarted ? 'START' : isCompleted ? 'RESTART' : 'RESUME'}
                            </button>
                            <button
                                onClick={() => sendAction('next')}
                                disabled={!isRunning}
                                className={`flex items-center justify-center gap-2 p-4 rounded-lg font-bold transition-all ${!isRunning
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                                    }`}
                            >
                                <SkipForward /> NEXT PLOT
                            </button>
                            <button
                                onClick={() => sendAction('pause')}
                                disabled={!isRunning}
                                className={`flex items-center justify-center gap-2 p-4 rounded-lg font-bold transition-all ${!isRunning
                                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                    : 'bg-yellow-600 hover:bg-yellow-500 text-white'
                                    }`}
                            >
                                <Pause /> PAUSE
                            </button>
                            <button
                                onClick={() => {
                                    if (confirmReset) {
                                        sendAction('reset');
                                        setConfirmReset(false);
                                    } else {
                                        setConfirmReset(true);
                                        setTimeout(() => setConfirmReset(false), 3000);
                                    }
                                }}
                                className={`flex items-center justify-center gap-2 p-4 rounded-lg font-bold transition-all ${confirmReset ? 'bg-red-600 text-white animate-pulse' : 'bg-red-900/30 text-red-400 border border-red-500/40 hover:bg-red-800/50 hover:text-red-300'}`}
                            >
                                <RefreshCw className={confirmReset ? 'animate-spin' : ''} />
                                {confirmReset ? "CONFIRM RESET?" : "RESET"}
                            </button>
                        </div>
                    </div>

                    {/* Connected Teams */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 text-gray-400 flex items-center gap-2">
                            <Users size={18} className="text-blue-400" /> Connected ({connectedCount})
                        </h2>
                        <div className="space-y-2 max-h-[200px] overflow-y-auto">
                            {connectedTeams.length > 0 ? connectedTeams.map((name, i) => (
                                <div key={i} className="flex items-center gap-2 bg-gray-900/50 p-2 rounded border border-gray-700 text-sm">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                    <span className="font-semibold">{name}</span>
                                </div>
                            )) : (
                                <p className="text-gray-500 text-sm italic">No one connected yet...</p>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 text-gray-400 flex items-center gap-2">
                            <Trophy className="text-yellow-500" /> Leaderboard
                        </h2>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                            {teams.map((team, i) => (
                                <div key={team.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded border border-gray-700">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-gray-500 w-6">#{i + 1}</span>
                                        <span className="font-bold">{team.name}</span>
                                    </div>
                                    <div className="text-right text-xs">
                                        <div className="text-green-400">Wins: {team.plots_won}</div>
                                        <div className="text-gray-400">Spent: ₹{(team.spent || 0).toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Map View */}
                <div className="lg:col-span-2 bg-gray-800 p-2 rounded-xl border border-gray-700 flex flex-col">
                    <div className="flex-1 min-h-[500px]">
                        <Map plots={plots} currentPlotNumber={currentPlot?.number} />
                    </div>
                    {/* Plots Status Table */}
                    <div className="mt-4 p-4 border-t border-gray-700 max-h-48 overflow-y-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs uppercase bg-gray-900/50">
                                <tr>
                                    <th className="px-4 py-2">Plot #</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2">Winning Team</th>
                                    <th className="px-4 py-2">Current Bid</th>
                                </tr>
                            </thead>
                            <tbody>
                                {plots.map(p => (
                                    <tr key={p.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="px-4 py-2 font-bold">{p.number}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-1 rounded text-xs ${p.status === 'sold' ? 'bg-green-500/20 text-green-400' :
                                                p.status === 'active' ? 'bg-purple-500/20 text-purple-400' :
                                                    'bg-gray-700 text-gray-500'
                                                }`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2">{p.winner_team_id || "-"}</td>
                                        <td className="px-4 py-2">{p.current_bid ? `₹${p.current_bid}` : "-"}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
