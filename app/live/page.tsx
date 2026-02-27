"use client";

import { useEffect, useState } from "react";
import { useSocket } from "../../context/socket-context";
import NeoLayout from "../../components/neo/NeoLayout";
import NeoCard from "../../components/neo/NeoCard";
import CityMap from "../../components/map/CityMap";
import {
  MapPin,
  Info,
  HelpCircle,
  Trophy,
  Users,
  Activity,
} from "lucide-react";

interface Plot {
  number: number;
  status: string;
  winner_team_id: string | null;
  current_bid: number | null;
  base_price: number;
  total_plot_price: number;
  total_area: number;
  round_adjustment: number;
  plot_type?: string;
}

interface Team {
  id: string;
  name: string;
  budget: string | number;
  spent: string | number;
  plots_won: number;
}

export default function LiveAuctionPage() {
  const { socket, isConnected } = useSocket();
  const [plots, setPlots] = useState<Plot[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentPlot, setCurrentPlot] = useState<Plot | null>(null);
  const [auctionStatus, setAuctionStatus] = useState<string>("NOT_STARTED");
  const [currentRound, setCurrentRound] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<string | null>(null);
  const [rebidOffers, setRebidOffers] = useState<any[]>([]);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const t = Date.now();
        const [plotsRes, teamsRes, stateRes, offersRes] = await Promise.all([
          fetch(`/api/data/plots?t=${t}`, { cache: "no-store" }),
          fetch(`/api/data/teams?t=${t}`, { cache: "no-store" }),
          fetch(`/api/admin/state?t=${t}`, { cache: "no-store" }),
          fetch(`/api/data/rebid-offers?t=${t}`, { cache: "no-store" }),
        ]);

        let plotsData: Plot[] = [];
        if (plotsRes.ok) {
          plotsData = await plotsRes.json();
          setPlots(plotsData);
        }
        if (teamsRes.ok) setTeams(await teamsRes.json());
        if (offersRes.ok) setRebidOffers(await offersRes.json());
        if (stateRes.ok) {
          const stateData = await stateRes.json();
          setAuctionStatus(stateData.status);
          setCurrentRound(stateData.current_round || 1);
          setCurrentQuestion(stateData.current_question || null);

          if (stateData.current_plot) {
            const fullPlot = plotsData.find(
              (p) => p.number === stateData.current_plot.number,
            );
            setCurrentPlot(fullPlot || stateData.current_plot);
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      socket.emit("join_auction", { role: "public" });
    };

    if (isConnected) {
      joinRoom();
    } else {
      socket.on("connect", joinRoom);
    }

    socket.on("auction_state_update", (data: any) => {
      setAuctionStatus(data.status);
      setCurrentRound(data.current_round);
      setCurrentQuestion(data.current_question || null);
      if (data.current_plot === null) {
        setCurrentPlot(null);
      } else if (data.current_plot) {
        setCurrentPlot(data.current_plot);
      }
    });

    socket.on("round_change", (data: any) => {
      setCurrentRound(data.current_round);
    });

    socket.on("active_question", (data: any) => {
      setCurrentQuestion(data.question || null);
    });

    socket.on("bid_update", (data: any) => {
      setPlots((prev) =>
        prev.map((p) =>
          p.number === data.plot_number
            ? { ...p, current_bid: data.amount, winner_team_id: data.team_id }
            : p,
        ),
      );
      // Also update currentPlot if it's the same plot
      setCurrentPlot((prev) =>
        prev && prev.number === data.plot_number
          ? { ...prev, current_bid: data.amount, winner_team_id: data.team_id }
          : prev,
      );
      // Increment bid count for this plot
      setBidCount((prev) => ({
        ...prev,
        [data.plot_number]: (prev[data.plot_number] || 0) + 1,
      }));
    });

    socket.on("plot_update", (data: any) => {
      const plotData = data.plot || data;
      setPlots((prev) =>
        prev.map((p) =>
          p.number === plotData.number ? { ...p, ...plotData } : p,
        ),
      );
      // Update currentPlot if it's the same plot
      setCurrentPlot((prev) =>
        prev && prev.number === plotData.number
          ? { ...prev, ...plotData }
          : prev,
      );
    });

    socket.on("plot_adjustment", (data: any) => {
      setPlots((prev) =>
        prev.map((p) =>
          p.number === data.plot_number
            ? { ...p, round_adjustment: data.plot.round_adjustment }
            : p,
        ),
      );
    });

    socket.on("sync_state", (data: any) => {
      if (data.plots) setPlots(data.plots);
      if (data.teams) setTeams(data.teams);
      if (data.status) setAuctionStatus(data.status);
      if (data.current_round) setCurrentRound(data.current_round);
      if (data.current_question) setCurrentQuestion(data.current_question);
    });

    socket.on("rebid_offer_update", (data: any) => {
      setRebidOffers(data.offers || []);
    });

    return () => {
      socket.off("connect", joinRoom);
      socket.off("auction_state_update");
      socket.off("round_change");
      socket.off("active_question");
      socket.off("bid_update");
      socket.off("plot_update");
      socket.off("plot_adjustment");
      socket.off("sync_state");
      socket.off("rebid_offer_update");
    };
  }, [socket, isConnected]);

  const isBiddingRound = currentRound === 1 || currentRound === 4;
  const isPolicyRound =
    currentRound === 2 ||
    currentRound === 3 ||
    currentRound === 5 ||
    currentRound === 6;
  const isAuctionCompleted = auctionStatus === "completed";

  const leaderboardData = teams
    .map((t) => {
      const remaining = Number(t.budget) - Number(t.spent || 0);
      const teamPlots = plots.filter(
        (p) => p.winner_team_id === t.id && p.status === "sold",
      );
      const propertyValue = teamPlots.reduce(
        (sum, p) =>
          sum +
          ((Number(p.current_bid) || Number(p.total_plot_price) || 0) +
            Number(p.round_adjustment || 0)),
        0,
      );
      const plotsWon = teamPlots.length;
      const netWorth = remaining + propertyValue;
      const PLOT_BONUS = 10000000;
      const finalScore = netWorth + plotsWon * PLOT_BONUS;

      return {
        ...t,
        remaining,
        propertyValue,
        plotsWon,
        netWorth,
        finalScore,
      };
    })
    .sort((a, b) => b.finalScore - a.finalScore);

  const formatCurrency = (val: number) => {
    if (val >= 10000000) return (val / 10000000).toFixed(2) + "Cr";
    if (val >= 100000) return (val / 100000).toFixed(1) + "L";
    return val.toLocaleString("en-IN");
  };

  const currentPrice =
    currentPlot && currentRound === 4
      ? Number(currentPlot.current_bid) ||
      Number(currentPlot.total_plot_price) ||
      0
      : Number(currentPlot?.total_plot_price) || 0;

  // Track bid count for current plot
  const [bidCount, setBidCount] = useState<Record<number, number>>({});

  return (
    <NeoLayout
      containerized={false}
      className="h-screen flex flex-col bg-[var(--color-bg)] text-[var(--color-text)] overflow-hidden"
    >
      <header className="flex justify-between items-center px-3 py-2 bg-[var(--color-surface)] border-b-4 border-[var(--color-border)] shrink-0">
        <div>
          <h1 className="text-lg md:text-2xl font-black uppercase flex items-center gap-2">
            <Activity size={20} className="text-[var(--color-primary)]" />
            Planomics
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <div
              className={`px-1.5 py-0.5 text-[9px] font-black uppercase border border-[var(--color-border)] flex items-center gap-1 ${isConnected
                  ? "bg-[var(--color-success)] text-[var(--color-bg)]"
                  : "bg-[var(--color-danger)] text-[var(--color-bg)] animate-pulse"
                }`}
            >
              {isConnected ? "LIVE" : "OFF"}
            </div>
            <div className="px-1.5 py-0.5 text-[9px] font-black uppercase border border-[var(--color-border)] bg-[var(--color-primary)] text-[var(--color-bg)]">
              R{currentRound}
            </div>
            <div
              className={`px-1.5 py-0.5 text-[9px] font-black uppercase border border-[var(--color-border)] ${auctionStatus === "running" || auctionStatus === "selling"
                  ? "bg-green-600 text-[var(--color-bg)]"
                  : auctionStatus === "completed"
                    ? "bg-[var(--color-primary)] text-[var(--color-bg)]"
                    : "bg-[var(--color-bg)] text-[var(--color-text)]"
                }`}
            >
              {auctionStatus === "completed" ? "COMPLETED" : auctionStatus}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end">
            <p className="text-[10px] font-bold uppercase opacity-60">Plots</p>
            <p className="text-sm font-black font-mono leading-none">
              {plots.filter((p) => p.status === "sold").length}/{plots.length}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 p-1 lg:p-2 overflow-hidden">
          <div className="h-full bg-[var(--color-surface)] border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--neo-shadow-color)] flex flex-col">
            <div className="p-1.5 border-b-2 border-[var(--color-border)] flex items-center justify-between shrink-0">
              <h2 className="font-black uppercase flex items-center gap-1 text-xs lg:text-sm">
                <MapPin size={14} /> City Map
              </h2>
              {currentPlot && (
                <span className="text-[10px] font-bold uppercase bg-[var(--color-primary)] text-[var(--color-bg)] px-1.5 py-0.5">
                  #{currentPlot.number}
                </span>
              )}
            </div>
            <div className="flex-1 p-1 overflow-hidden">
              <CityMap
                currentPlotNumber={currentPlot?.number}
                plots={plots}
                allTeams={teams}
                currentRound={currentRound}
                rebidOffers={rebidOffers}
              />
            </div>
          </div>
        </div>

        <div className="w-full lg:w-[300px] xl:w-[350px] p-1 lg:p-2 overflow-y-auto">
          {isBiddingRound && currentPlot ? (
            <NeoCard className="p-2 lg:p-3">
              <h2 className="text-base lg:text-lg font-black uppercase mb-2 lg:mb-3 flex items-center gap-1 lg:gap-2">
                <Info size={16} />
                Plot #{currentPlot.number}
              </h2>
              <div className="space-y-2">
                <div className="border-2 border-[var(--color-border)] p-2 bg-[var(--color-surface)]">
                  <p className="text-[10px] font-bold uppercase opacity-50">
                    Base
                  </p>
                  <p className="font-black text-sm lg:text-base">
                    ₹{" "}
                    {Number(currentPlot.base_price || 0).toLocaleString(
                      "en-IN",
                    )}
                  </p>
                </div>
                <div className="border-2 border-[var(--color-border)] p-2 bg-[var(--color-surface)]">
                  <p className="text-[10px] font-bold uppercase opacity-50">
                    Current
                  </p>
                  <p className="font-black text-sm lg:text-base text-[var(--color-primary)]">
                    ₹ {currentPrice.toLocaleString("en-IN")}
                  </p>
                </div>

                {currentRound === 4 && (
                  <div className="flex-1 border-2 border-[var(--color-border)] p-2 bg-[var(--color-surface)]">
                    <p className="text-[10px] font-bold uppercase opacity-50">
                      Type
                    </p>
                    <p className="font-black text-sm lg:text-base">
                      {currentPlot.plot_type || "N/A"}
                    </p>
                  </div>
                )}
                <div className="border-2 border-[var(--color-border)] p-2 bg-[var(--color-surface)]">
                  <p className="text-[10px] font-bold uppercase opacity-50">
                    Area
                  </p>
                  <p className="font-black text-sm lg:text-base">
                    {currentPlot.total_area?.toLocaleString() || "0"} sq ft
                  </p>
                </div>
                {currentRound === 4 && currentPlot.winner_team_id && (
                  <div className="border-2 border-[var(--color-primary)] p-2 bg-[var(--color-primary)]/10">
                    <p className="text-[10px] font-bold uppercase opacity-50">
                      Owner
                    </p>
                    <p className="font-black text-sm lg:text-base text-[var(--color-primary)]">
                      {teams.find(
                        (t) =>
                          t.id === currentPlot.winner_team_id ||
                          t.id === String(currentPlot.winner_team_id),
                      )?.name || "Unknown"}
                    </p>
                  </div>
                )}
                {currentRound !== 4 && currentPlot.winner_team_id && (
                  <div className="border-2 border-[var(--color-primary)] p-2 bg-[var(--color-primary)]/10">
                    <p className="text-[10px] font-bold uppercase opacity-50">
                      High Bidder
                    </p>
                    <p className="font-black text-sm lg:text-base text-[var(--color-primary)]">
                      {teams.find(
                        (t) =>
                          t.id === currentPlot.winner_team_id ||
                          t.id === String(currentPlot.winner_team_id),
                      )?.name || "Unknown"}
                    </p>
                  </div>
                )}
                {Number(currentPlot.round_adjustment) !== 0 && (
                  <div
                    className={`border-2 border-[var(--color-border)] p-2 ${currentPlot.round_adjustment > 0
                        ? "bg-[var(--color-success)]/20"
                        : "bg-[var(--color-danger)]/20"
                      }`}
                  >
                    <p className="text-[10px] font-bold uppercase opacity-50">
                      Adj
                    </p>
                    <p
                      className={`font-black text-sm ${currentPlot.round_adjustment > 0
                          ? "text-[var(--color-success)]"
                          : "text-[var(--color-danger)]"
                        }`}
                    >
                      {currentPlot.round_adjustment > 0 ? "+" : ""}₹{" "}
                      {currentPlot.round_adjustment?.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </NeoCard>
          ) : isPolicyRound || isAuctionCompleted ? (
            <div className="space-y-2">
              {currentQuestion && !isAuctionCompleted && (
                <NeoCard className="p-2 lg:p-3">
                  <h2 className="text-sm lg:text-base font-black uppercase mb-1 lg:mb-2 flex items-center gap-1">
                    <HelpCircle size={14} /> Question
                  </h2>
                  <div className="border-2 border-[var(--color-border)] p-2 bg-[var(--color-primary)]/10">
                    <p className="font-bold text-xs lg:text-sm">
                      {currentQuestion}
                    </p>
                  </div>
                </NeoCard>
              )}

              <NeoCard className="p-2 lg:p-3">
                <h2 className="text-sm lg:text-base font-black uppercase mb-2 flex items-center gap-1">
                  <Trophy size={14} />{" "}
                  {isAuctionCompleted ? "Final Leaderboard" : "Leaderboard"}
                </h2>
                <div className="space-y-1.5 max-h-[250px] lg:max-h-[300px] overflow-y-auto">
                  {leaderboardData.slice(0, 10).map((team, index) => (
                    <div
                      key={team.id}
                      className={`flex items-center justify-between p-1.5 border-2 ${index === 0
                          ? "border-yellow-400 bg-yellow-400/20"
                          : index === 1
                            ? "border-gray-400 bg-gray-400/20"
                            : index === 2
                              ? "border-amber-600 bg-amber-600/20"
                              : "border-[var(--color-border)] bg-[var(--color-surface)]"
                        }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-black ${index === 0
                              ? "bg-yellow-500 text-black"
                              : index === 1
                                ? "bg-gray-400 text-black"
                                : index === 2
                                  ? "bg-amber-700 text-white"
                                  : "bg-[var(--color-bg)]"
                            }`}
                        >
                          {index + 1}
                        </span>
                        <span
                          className={`font-bold text-xs truncate max-w-[80px] lg:max-w-[120px] ${index < 3 ? "text-[var(--color-text)]" : ""}`}
                        >
                          {team.name}
                        </span>
                      </div>
                      <span
                        className={`font-black text-xs ${index < 3 ? "text-[var(--color-primary)]" : ""}`}
                      >
                        {formatCurrency(team.finalScore)}
                      </span>
                    </div>
                  ))}
                </div>
              </NeoCard>
            </div>
          ) : (
            <NeoCard className="p-3">
              <div className="text-center py-4">
                <Activity
                  size={32}
                  className="mx-auto mb-2 opacity-40 animate-pulse"
                />
                <p className="font-black uppercase text-sm">
                  Waiting for Auction
                </p>
                <p className="text-xs opacity-60 mt-1">Not started yet</p>
              </div>
            </NeoCard>
          )}

          <div className="mt-2 flex items-center justify-center gap-2 text-[10px] opacity-50">
            <Users size={12} />
            <span>
              {teams.length} Teams •{" "}
              {plots.filter((p) => p.status === "sold").length} Sold
            </span>
          </div>
        </div>
      </div>
    </NeoLayout>
  );
}
