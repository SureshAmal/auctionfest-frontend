"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../../context/socket-context";
import BidCard from "../../components/BidCard";
import Map from "../../components/Map";
import TrackingWindow from "../../components/TrackingWindow";
import { motion } from "framer-motion";
import { LogOut } from "lucide-react";

export default function Dashboard() {
    const router = useRouter();
    const { socket, isConnected } = useSocket();
    const [userTeam, setUserTeam] = useState<any>(null);
    const [plots, setPlots] = useState<any[]>([]);
    const [currentPlot, setCurrentPlot] = useState<any>(null);
    const [auctionStatus, setAuctionStatus] = useState("NOT_STARTED"); // NOT_STARTED, RUNNING, PAUSED
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
                // Fetch Team
                const teamRes = await fetch(`/api/data/team/${teamId}`);
                if (teamRes.ok) setUserTeam(await teamRes.json());

                // Fetch Plots
                const plotsRes = await fetch("/api/data/plots");
                if (plotsRes.ok) {
                    const plotsData = await plotsRes.json();
                    setPlots(plotsData);
                }

                // Fetch current auction state (so we know which plot is active on load)
                const stateRes = await fetch("/api/admin/state");
                if (stateRes.ok) {
                    const stateData = await stateRes.json();
                    setAuctionStatus(stateData.status);
                    if (stateData.current_plot) {
                        setCurrentPlot(stateData.current_plot);
                    }
                }
            } catch (e) {
                console.error("Failed to load initial data", e);
            }
        };

        fetchData();
    }, [router]);

    // 2. Socket Listeners
    useEffect(() => {
        if (!socket || !userTeam) return;

        socket.emit("join_auction", { team_id: userTeam.id });

        const handleStateUpdate = (data: any) => {
            console.log("State Update:", data);
            setAuctionStatus(data.status);

            if (data.current_plot_number) {
                // Update plots: mark new plot active, mark old active plots as sold
                setPlots(prev => prev.map(p => {
                    if (p.number === data.current_plot_number) {
                        return { ...p, status: 'active' };
                    }
                    if (p.status === 'active') {
                        return { ...p, status: 'sold' };
                    }
                    return p;
                }));

                // Set current plot directly from socket data
                if (data.current_plot) {
                    setCurrentPlot(data.current_plot);
                }
            }
        };

        const handleNewBid = (data: any) => {
            console.log("New Bid:", data);
            setRecentBids(prev => [data, ...prev].slice(0, 5));

            // Update current plot bid
            setCurrentPlot((prev: any) => prev ? { ...prev, current_bid: data.amount, winner_team_id: "some_id" } : null);
            // Also update in plots list
            setPlots(prev => prev.map(p =>
                p.number === data.plot_number ? { ...p, current_bid: data.amount } : p
            ));
        };

        const handleReset = () => {
            window.location.reload(); // Simple reset
        };

        socket.on("auction_state_update", handleStateUpdate);
        socket.on("new_bid", handleNewBid);
        socket.on("auction_reset", handleReset);

        return () => {
            socket.off("auction_state_update");
            socket.off("new_bid");
            socket.off("auction_reset");
        };
    }, [socket, userTeam]);

    // currentPlot is now set directly from socket data and initial API fetch
    // No need for a separate useEffect to find active plot from list

    if (!userTeam) return null;

    return (
        <div className="min-h-screen bg-black text-white p-4">
            {/* Header */}
            <header className="flex justify-between items-center mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
                        AU-FEST 2026
                    </h1>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                        <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                        {isConnected ? 'Connected' : 'Disconnected'}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Team Budget</p>
                        <p className="font-mono font-bold text-xl">₹ {Number(userTeam.budget).toLocaleString('en-IN')}</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center font-bold">
                        {userTeam.name.charAt(0)}
                    </div>
                    <button onClick={() => {
                        localStorage.clear();
                        router.push("/");
                    }} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left: Map (Takes 2 cols) */}
                <div className="lg:col-span-2 space-y-6">
                    <Map plots={plots} currentPlotNumber={currentPlot?.number} />

                    {/* Recent Bids Feed */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                        <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Live Feed</h3>
                        <div className="space-y-2">
                            {recentBids.map((bid, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: -20, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    className="flex justify-between items-center bg-white/5 p-2 rounded text-sm"
                                >
                                    <span className="font-semibold text-purple-300">{bid.team_name}</span>
                                    <span className="text-gray-400">bid</span>
                                    <span className="font-mono font-bold text-white">₹ {bid.amount.toLocaleString()}</span>
                                </motion.div>
                            ))}
                            {recentBids.length === 0 && (
                                <p className="text-gray-500 italic text-sm">No bids yet...</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="lg:col-span-1">
                    <BidCard currentPlot={currentPlot} userTeam={userTeam} />
                </div>
            </div>

            <TrackingWindow currentPlot={currentPlot} status={auctionStatus} />
        </div>
    );
}
