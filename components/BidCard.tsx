"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Gavel } from "lucide-react";
import { useSocket } from "../context/socket-context";

interface BidCardProps {
    currentPlot: any;
    userTeam: any;
}

export default function BidCard({ currentPlot, userTeam }: BidCardProps) {
    const { socket } = useSocket();
    const [bidAmount, setBidAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    useEffect(() => {
        if (currentPlot) {
            // Reset state on new plot
            setBidAmount("");
            setError("");
            setSuccessMsg("");
        }
    }, [currentPlot?.number]); // Reset when plot number changes

    const handlePlaceBid = () => {
        if (!socket || !currentPlot || !userTeam) return;

        const amount = parseInt(bidAmount);
        if (isNaN(amount) || amount <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (currentPlot.current_bid && amount <= currentPlot.current_bid) {
            setError(`Bid must be higher than ₹${currentPlot.current_bid}`);
            return;
        }

        // Auto-calculate minimum increment if needed, but for now just higher
        // also check budget
        if (amount > userTeam.budget) {
            setError("Bid exceeds your budget!");
            return;
        }

        setIsSubmitting(true);
        setError("");

        socket.emit("place_bid", {
            team_id: userTeam.id,
            amount: amount
        });

        // We listen for 'bid_placed' or 'exception' via global listeners or specific callback if implemented
        // For now, let's assume optimistic update or wait for global state change?
        // Actually, socket emits don't have callbacks by default unless ack is requested.
        // We should listen to errors from server.
        // socket_manager.py emits 'exception' on error.
    };

    // Listen for socket errors/success
    useEffect(() => {
        if (!socket) return;

        const handleError = (data: any) => {
            setIsSubmitting(false);
            setError(data.message || "Error placing bid");
        };

        // We need to know if *our* bid was accepted.
        // The server broadcasts 'new_bid' to room. 
        // If we see a new bid from US, then success.
        const handleNewBid = (data: any) => {
            if (data.team_name === userTeam.name) {
                setIsSubmitting(false);
                setSuccessMsg("Bid Placed!");
                setBidAmount("");
                setTimeout(() => setSuccessMsg(""), 2000);
            }
        };

        socket.on("exception", handleError);
        socket.on("new_bid", handleNewBid);

        return () => {
            socket.off("exception", handleError);
            socket.off("new_bid", handleNewBid);
        };
    }, [socket, userTeam]);

    if (!currentPlot) {
        return (
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 text-center text-gray-400">
                <p>Waiting for next plot...</p>
            </div>
        );
    }

    const minBid = currentPlot.current_bid ? currentPlot.current_bid + 100 : 1000; // Default base price if None

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-xl rounded-xl p-6 border border-white/20 shadow-2xl relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Gavel size={64} className="text-white" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-1">Plot #{currentPlot.number}</h2>
            <div className="inline-block px-3 py-1 rounded-full bg-green-500/20 text-green-300 text-xs font-bold border border-green-500/30 mb-6">
                ACTIVE AUCTION
            </div>

            <div className="space-y-6">
                <div className="bg-black/20 rounded-lg p-4 border border-white/5">
                    <p className="text-gray-400 text-sm mb-1">Current Highest Bid</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-white">
                            ₹ {currentPlot.current_bid ? currentPlot.current_bid.toLocaleString() : "0"}
                        </span>
                        {currentPlot.winner_team_id && (
                            <span className="text-sm text-purple-300">
                                (held by someone)
                            </span>
                        )}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                        <span>Your Budget</span>
                        <span className="font-mono">₹ {Number(userTeam.budget).toLocaleString('en-IN')}</span>
                    </div>

                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 pl-8 text-xl font-bold text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            placeholder={`Min ${minBid}`}
                            min={minBid}
                        />
                    </div>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20"
                        >
                            {error}
                        </motion.div>
                    )}
                    {successMsg && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20"
                        >
                            {successMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                <button
                    onClick={handlePlaceBid}
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-purple-900/20 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Gavel size={20} /> PLACE BID</>}
                </button>
            </div>
        </motion.div>
    );
}
