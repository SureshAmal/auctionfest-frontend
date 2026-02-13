"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

interface TrackingWindowProps {
    currentPlot: any;
    status: string; // 'not_started', 'running', 'paused', 'completed'
}

export default function TrackingWindow({ currentPlot, status }: TrackingWindowProps) {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-6 left-6 z-50 w-72 bg-black/80 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
            <div className="bg-white/5 px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <Activity size={16} className="text-purple-400" />
                    <span>Live Tracking</span>
                </div>
                <div className={`px-2 py-0.5 rounded text-[10px] font-bold border ${status === 'running' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    status === 'paused' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}>
                    {status}
                </div>
            </div>

            <div className="p-4 space-y-4">
                <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Current Plot</p>
                    <p className="text-xl font-bold text-white">
                        {currentPlot ? `Plot #${currentPlot.number}` : "Waiting..."}
                    </p>
                </div>

                {currentPlot && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Winning</p>
                        <div className="flex justify-between items-baseline">
                            <span className="text-white font-medium">
                                {currentPlot.current_bid ? `₹ ${Number(currentPlot.current_bid).toLocaleString('en-IN')}` : "No Bids"}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

