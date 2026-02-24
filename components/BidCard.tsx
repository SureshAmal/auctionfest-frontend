"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Gavel, AlertCircle, CheckCircle, IndianRupee, Clock } from "lucide-react";
import { useSocket } from "../context/socket-context";
import NeoCard from "./neo/NeoCard";
import NeoButton from "./neo/NeoButton";
import NeoBadge from "./neo/NeoBadge";

interface BidCardProps {
    /** The currently active plot object. */
    currentPlot: any;
    /** The logged-in user's team. */
    userTeam: any;
    /** All teams for name lookup. */
    allTeams?: any[];
    /** Current auction round (1-4). */
    currentRound?: number;
    /** The current auction status. */
    auctionStatus?: string;
    /** Optional parent className. */
    className?: string;
}

/**
 * BidCard component for placing bids on the current plot.
 *
 * Displays bid input with increment/decrement controls during bidding rounds (1 & 4).
 * Shows an "Adjustment Round" waiting message during rounds 2 & 3.
 */
export default function BidCard({ currentPlot, userTeam, allTeams = [], currentRound = 1, auctionStatus = "not_started", className = "" }: BidCardProps) {
    const { socket } = useSocket();
    const [bidAmount, setBidAmount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    const getTeamName = (id: string) => {
        const team = allTeams?.find(t => t.id === id);
        return team ? team.name : id;
    };

    useEffect(() => {
        if (currentPlot) {
            setBidAmount("");
            setError("");
            setSuccessMsg("");
        }
    }, [currentPlot?.number]);

    /** Place a bid via socket, with client-side validation. */
    const handlePlaceBid = () => {
        if (!socket || !currentPlot || !userTeam) return;

        // Prevent bids during adjustment rounds
        if (currentRound === 2 || currentRound === 3 || currentRound === 5 || currentRound === 6) {
            setError("Bidding not allowed during adjustment rounds");
            return;
        }

        // Prevent consecutive bids by same team
        if (currentPlot.winner_team_id === userTeam.id) {
            setError("You already hold the highest bid!");
            return;
        }

        const amount = parseInt(bidAmount);
        if (isNaN(amount) || amount <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        if (currentPlot.current_bid && amount <= currentPlot.current_bid) {
            setError(`Bid must be higher than ₹${currentPlot.current_bid}`);
            return;
        }

        const remaining = Number(userTeam.budget) - Number(userTeam.spent || 0);
        if (amount > remaining) {
            setError(`Bid exceeds remaining budget (₹${remaining.toLocaleString("en-IN")})!`);
            return;
        }

        setIsSubmitting(true);
        setError("");

        socket.emit("place_bid", {
            team_id: userTeam.id,
            amount: amount,
        });
    };

    // Listen for socket errors/success
    useEffect(() => {
        if (!socket) return;

        const handleError = (data: any) => {
            setIsSubmitting(false);
            setError(data.message || "Error placing bid");
        };

        const handleNewBid = (data: any) => {
            if (data.team_name === userTeam.name) {
                setIsSubmitting(false);
                setSuccessMsg("Bid Placed!");
                setBidAmount("");
                setTimeout(() => setSuccessMsg(""), 2000);
            }
        };

        socket.on("exception", handleError);
        socket.on("bid_error", handleError);
        socket.on("new_bid", handleNewBid);

        return () => {
            socket.off("exception", handleError);
            socket.off("bid_error", handleError);
            socket.off("new_bid", handleNewBid);
        };
    }, [socket, userTeam]);

    // Determine if bidding is allowed
    const isBiddingRound = currentRound === 1 || currentRound === 4;

    if (!currentPlot) {
        return (
            <NeoCard className="flex flex-col items-center justify-center min-h-[150px] text-center bg-[var(--color-bg)] border-dashed">
                <Loader2 className="animate-spin mb-2 text-[var(--color-text)] opacity-40" size={32} />
                <p className="font-bold text-sm uppercase text-[var(--color-text)] opacity-40">Waiting for next plot...</p>
            </NeoCard>
        );
    }

    // Show waiting message during adjustment rounds
    if (!isBiddingRound) {
        return (
            <NeoCard className="bg-[var(--color-bg)]">
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Clock size={48} className="text-[var(--color-primary)] mb-3" />
                    <h3 className="text-xl font-black uppercase mb-2">Adjustment Round</h3>
                    <p className="text-sm font-bold text-[var(--color-text)] opacity-50 uppercase">
                        Waiting for admin to apply adjustments...
                    </p>
                    <div className="mt-3"><NeoBadge variant="warning">Round {currentRound}</NeoBadge></div>
                </div>
            </NeoCard>
        );
    }

    // Show selling countdown lock state
    if (auctionStatus === "selling") {
        return (
            <NeoCard className="bg-[var(--color-danger)] border-[var(--color-border)] animate-pulse shadow-[8px_8px_0_black]">
                <div className="flex flex-col items-center justify-center py-10 text-center">
                    <Clock size={48} className="text-white mb-3" />
                    <h3 className="text-4xl font-black uppercase mb-3 text-white tracking-widest leading-none">GOING...</h3>
                    <div className="bg-black text-white px-4 py-2 border-2 border-white shadow-[4px_4px_0_white]">
                        {currentPlot.winner_team_id ? (
                            (() => {
                                const winTeam = allTeams?.find(t => t.id === currentPlot.winner_team_id);
                                const newBalance = winTeam ? (Number(winTeam.budget) - Number(winTeam.spent) - Number(currentPlot.current_bid)) : 0;
                                return (
                                    <>
                                        <p className="text-xs uppercase font-bold text-[var(--color-text)] opacity-30">Highest Bidder</p>
                                        <p className="text-2xl font-black">{getTeamName(currentPlot.winner_team_id)}</p>
                                        <p className="text-lg font-mono text-[var(--color-success)]">₹{Number(currentPlot.current_bid).toLocaleString("en-IN")}</p>
                                        {winTeam && (
                                            <p className="text-sm font-bold text-[var(--color-surface)] mt-2 border-t border-dashed border-[var(--color-border)] opacity-50 pt-1">
                                                New Balance: ₹{newBalance.toLocaleString("en-IN")}
                                            </p>
                                        )}
                                    </>
                                );
                            })()
                        ) : (
                            <p className="text-lg font-black uppercase">NO BIDS RECEIVED</p>
                        )}
                    </div>
                </div>
            </NeoCard>
        );
    }

    // Actual bid placed (without adjustment)
    const actualBid = Number(currentPlot.current_bid) || 0;
    // Adjusted total value of the plot (for display as starting/base price)
    const adjustedValue = (Number(currentPlot.current_bid) || Number(currentPlot.total_plot_price) || 0) + (Number(currentPlot.round_adjustment) || 0);
    // Min bid is based on actual bid, not adjusted value
    const minBid = actualBid > 0
        ? actualBid + 100
        : (adjustedValue || 1000);
    /** Convert number to Indian words (Crore, Lakh, Thousand). */
    const numberToIndianWords = (num: number): string => {
        if (!num || num <= 0) return "";
        const crore = Math.floor(num / 10000000);
        const lakh = Math.floor((num % 10000000) / 100000);
        const thousand = Math.floor((num % 100000) / 1000);
        const remainder = num % 1000;

        const parts: string[] = [];
        if (crore > 0) parts.push(`${crore} Crore`);
        if (lakh > 0) parts.push(`${lakh} Lakh`);
        if (thousand > 0) parts.push(`${thousand} Thousand`);
        if (remainder > 0) parts.push(`${remainder}`);
        return parts.join(" ") || "0";
    };

    /** Format number with Indian commas for display. */
    const formatIndianNumber = (val: string): string => {
        const num = parseInt(val.replace(/,/g, ""));
        if (isNaN(num)) return "";
        return num.toLocaleString("en-IN");
    };

    /** Handle bid input change — strip commas for storage, show formatted. */
    const handleBidInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/,/g, "").replace(/[^0-9]/g, "");
        setBidAmount(raw);
    };

    const displayBidAmount = bidAmount ? formatIndianNumber(bidAmount) : "";
    const bidAmountNum = parseInt(bidAmount) || 0;

    return (
        <NeoCard className={`bg-[var(--color-bg)] flex flex-col ${className}`}>
            <div className="flex items-center justify-between mb-4 shrink-0">
                <h3 className="text-lg font-black uppercase flex items-center gap-2">
                    <Gavel size={20} /> Place Bid
                </h3>
                {currentRound === 4 && (
                    <NeoBadge variant="danger">Final Bidding</NeoBadge>
                )}
            </div>

            <div className="space-y-4">
                {/* Current Price / Highest Bid */}
                <div className="neo-border p-3 bg-[var(--color-surface)]">
                    <p className="text-xs font-bold uppercase mb-1">{actualBid > 0 ? "Current Highest Bid" : "Starting Price"}</p>
                    <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-black">
                            ₹ {(actualBid > 0 ? actualBid : adjustedValue).toLocaleString("en-IN")}
                        </span>
                        {currentPlot.winner_team_id && (
                            <span className="text-xs font-bold uppercase bg-black text-white px-2 py-0.5">
                                {getTeamName(currentPlot.winner_team_id)}
                            </span>
                        )}
                    </div>
                </div>

                {/* Projected Balance on Win */}
                {(bidAmountNum > 0 || currentPlot?.winner_team_id === userTeam.id) && (
                    <div className="flex justify-between items-center text-xs font-black uppercase neo-border p-2 bg-[var(--color-success)] text-[var(--color-text)] shadow-[3px_3px_0_black] mb-3">
                        <span>If {bidAmountNum > 0 ? "Bid" : "Current Bid"} Won</span>
                        <span className="font-mono text-sm leading-none bg-[var(--color-bg)] px-2 py-1 border-2 border-[var(--color-border)]">
                            ₹ {Math.max(0,
                                (Number(userTeam.budget) - Number(userTeam.spent || 0)) -
                                (bidAmountNum > 0 ? bidAmountNum : Number(currentPlot.current_bid))
                            ).toLocaleString("en-IN")}
                        </span>
                    </div>
                )}

                {/* Bid Input with +/- */}
                <div className="relative flex items-center gap-4">
                    <NeoButton
                        variant="secondary"
                        className="w-12 h-12 flex items-center justify-center font-black text-2xl shrink-0"
                        onClick={() => {
                            const currentVal = parseInt(bidAmount) || minBid;
                            const newVal = Math.max(minBid, currentVal - 500);
                            setBidAmount(newVal.toString());
                        }}
                    >
                        -
                    </NeoButton>

                    <div className="relative flex-1">
                        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text)] opacity-40" size={20} />
                        <input
                            type="text"
                            inputMode="numeric"
                            value={displayBidAmount}
                            onChange={handleBidInputChange}
                            className="w-full neo-input pl-12 text-2xl font-black text-center"
                            placeholder={`${minBid.toLocaleString("en-IN")}`}
                            min={minBid}
                        />
                    </div>

                    <NeoButton
                        variant="primary"
                        className="w-12 h-12 flex items-center justify-center font-black text-2xl shrink-0"
                        onClick={() => {
                            const currentVal = parseInt(bidAmount) || (minBid - 500);
                            const newVal = currentVal + 500;
                            setBidAmount(newVal.toString());
                        }}
                    >
                        +
                    </NeoButton>
                </div>

                {/* Price in words hint */}
                {bidAmountNum > 0 && (
                    <p className="text-xs font-bold text-[var(--color-text)] opacity-50 text-center -mt-2">
                        ₹ {numberToIndianWords(bidAmountNum)}
                    </p>
                )}

                {/* Error / Success Messages */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-[var(--color-danger)]/20 border-l-8 border-[var(--color-danger)] p-3 font-bold text-[var(--color-danger)] flex items-center gap-2"
                        >
                            <AlertCircle size={20} /> {error}
                        </motion.div>
                    )}
                    {successMsg && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-[var(--color-success)]/20 border-l-8 border-[var(--color-danger)] p-3 font-bold text-[var(--color-success)] flex items-center gap-2"
                        >
                            <CheckCircle size={20} /> {successMsg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Submit Button */}
                <div className="mt-auto pt-2">
                    <NeoButton
                        variant="primary"
                        size="lg"
                        onClick={handlePlaceBid}
                        disabled={isSubmitting || currentPlot.winner_team_id === userTeam.id}
                        className={`w-full text-xl ${isSubmitting || currentPlot.winner_team_id === userTeam.id ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" /> : "PLACE BID"}
                    </NeoButton>
                </div>
            </div>
        </NeoCard>
    );
}
