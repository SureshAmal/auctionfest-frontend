"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  Clock,
  Save,
  X,
  Search,
  ChevronRight,
  Menu,
  Users,
  RotateCcw,
  Edit,
  Gavel,
  FileOutput,
  MapPin,
  Undo2,
  Play,
  SkipForward,
  Pause,
  RefreshCw,
  Trophy,
  ShieldAlert,
  Settings,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Rocket,
  WifiOff,
  Download,
  Trash2,
  RotateCw,
  CheckCircle,
} from "lucide-react";
import NeoCard from "@/components/neo/NeoCard";
import NeoButton from "@/components/neo/NeoButton";
import NeoInput from "@/components/neo/NeoInput";
import NeoBadge from "@/components/neo/NeoBadge";
import NeoTable from "@/components/neo/NeoTable";
import CityMap from "@/components/map/CityMap";
import { ThemeChanger } from "@/components/ThemeChanger";
import { ColumnDef } from "@tanstack/react-table";
import { useSocket } from "../../context/socket-context";
import NeoLayout from "../../components/neo/NeoLayout";

interface Plot {
  id: number;
  number: number;
  plot_type: string;
  actual_area: number;
  base_price: number;
  total_plot_price: number;
  round_adjustment: number;
  status: string;
  winner_team_id: string | null;
  current_bid: number | null;
}

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

  // Admin Authentication Gate
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [adminPassInput, setAdminPassInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Check localStorage for existing admin session on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem("admin_auth");
    if (storedAuth === "true") {
      setIsAdminAuth(true);
    }
  }, []);

  /** Verify admin password via the backend API. */
  const handleAdminLogin = async () => {
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassInput }),
      });
      if (res.ok) {
        setIsAdminAuth(true);
        localStorage.setItem("admin_auth", "true");
        setAuthError("");
      } else {
        setAuthError("Incorrect password!");
        setAdminPassInput("");
      }
    } catch {
      setAuthError("Server error, try again.");
    }
  };

  const [plots, setPlots] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [currentPlot, setCurrentPlot] = useState<any>(null);
  const [auctionState, setAuctionState] = useState<any>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);
  const [connectedTeams, setConnectedTeams] = useState<string[]>([]);

  // Sorting state
  const [sortKey, setSortKey] = useState<string>("number");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Round & Adjustment state
  const [currentRound, setCurrentRound] = useState(1);
  const [adjustPlotNumber, setAdjustPlotNumber] = useState("");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustMessage, setAdjustMessage] = useState("");

  // Policy Mode State
  const [policyQuestions, setPolicyQuestions] = useState<any[]>([]);
  const [activeQuestion, setActiveQuestion] = useState<string>("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isConnectedModalOpen, setIsConnectedModalOpen] = useState(false);
  const [isSaveLoadModalOpen, setIsSaveLoadModalOpen] = useState(false);

  // Countdown / Live Widget State
  const [sellCountdown, setSellCountdown] = useState(3);

  // Round 4 sell offers
  const [sellOffers, setSellOffers] = useState<any[]>([]);

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const t = Date.now();
        const [plotsRes, teamsRes, stateRes] = await Promise.all([
          fetch(`/api/data/plots?t=${t}`, { cache: "no-store" }),
          fetch(`/api/data/teams?t=${t}`, { cache: "no-store" }),
          fetch(`/api/admin/state?t=${t}`, { cache: "no-store" }),
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
  }, []);

  // Fetch sell offers during Round 4
  useEffect(() => {
    if (currentRound !== 4) {
      setSellOffers([]);
      return;
    }
    const fetchOffers = async () => {
      try {
        const res = await fetch("/api/rebid/offers");
        if (res.ok) setSellOffers(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchOffers();
  }, [currentRound]);

  // Fetch Questions when round changes to a policy round
  useEffect(() => {
    if ([2, 3, 5, 6].includes(currentRound)) {
      fetch(`/api/admin/questions/${currentRound}`)
        .then((res) => res.json())
        .then((data) => {
          setPolicyQuestions(data);
          setCurrentQuestionIndex(0);
        })
        .catch(console.error);
    } else {
      setPolicyQuestions([]);
      setCurrentQuestionIndex(0);
    }
  }, [currentRound]);

  // Countdown Timer Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (auctionState?.status === "selling") {
      setSellCountdown(3);
      interval = setInterval(() => {
        setSellCountdown((prev) => (prev > 1 ? prev - 1 : 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [auctionState?.status]);

  // Socket Listeners
  useEffect(() => {
    if (!socket) return;

    const joinRoom = () => {
      socket.emit("join_auction", { role: "admin" });
    };

    if (socket.connected) {
      joinRoom();
    }

    socket.on("connect", joinRoom);

    const handleStateUpdate = (data: any) => {
      setAuctionState(data);
      if (data.current_round) setCurrentRound(data.current_round);

      if (data.current_plot === null) {
        // End of round reached. Clear active plot.
        setPlots((prev) =>
          prev.map((p) =>
            p.status === "active"
              ? { ...p, status: data.status === "reversed" ? "pending" : "sold" }
              : p
          )
        );
        setCurrentPlot(null);
      } else if (data.current_plot_number) {
        setPlots((prev) =>
          prev.map((p) => ({
            ...p,
            status:
              p.number === data.current_plot_number
                ? "active"
                : p.status === "active"
                  ? data.status === "reversed"
                    ? "pending"
                    : "sold"
                  : p.status,
          })),
        );
        setCurrentPlot({ number: data.current_plot_number });
      }
    };

    const handleRoundChange = (data: any) => {
      if (data.current_round) setCurrentRound(data.current_round);
    };

    const handlePlotAdjustment = (data: any) => {
      if (data.plot) {
        setPlots((prev) =>
          prev.map((p) =>
            p.number === data.plot_number ? { ...p, ...data.plot } : p,
          ),
        );
      }
    };

    const handleRebidPhaseUpdate = (data: any) => {
      setAuctionState((prev: any) => ({
        ...prev,
        rebid_phase_active: data.is_active,
      }));
    };

    socket.on("auction_state_update", handleStateUpdate);
    socket.on("round_change", handleRoundChange);
    socket.on("plot_adjustment", handlePlotAdjustment);
    socket.on("rebid_phase_update", handleRebidPhaseUpdate);

    socket.on("round4_phase_update", (data: any) => {
      setAuctionState((prev: any) => ({
        ...prev,
        round4_phase: data.phase,
        round4_bid_queue: data.bid_queue || prev?.round4_bid_queue,
      }));
    });

    socket.on("plot_update", (data: any) => {
      setPlots((prev) =>
        prev.map((p) => (p.number === data.number ? { ...p, ...data } : p)),
      );
      setCurrentPlot((prev: any) =>
        prev?.number === data.number ? { ...prev, ...data } : prev,
      );
    });

    socket.on("team_update", (data: any) => {
      setTeams((prev) =>
        prev.map((t) =>
          t.id === data.team_id
            ? {
              ...t,
              spent: data.spent,
              budget: data.budget,
              plots_won: data.plots_won,
            }
            : t,
        ),
      );
    });

    socket.on("new_rebid_offer", (offer: any) => {
      setSellOffers((prev) => [offer, ...prev]);
    });

    socket.on("rebid_offer_cancelled", (offer: any) => {
      setSellOffers((prev) => prev.filter((o) => o.id !== offer.id));
    });

    socket.on("new_bid", (data: any) => {
      setPlots((prev) =>
        prev.map((p) =>
          p.number === data.plot_number
            ? { ...p, current_bid: data.amount, winner_team_id: data.team_id }
            : p,
        ),
      );
      setCurrentPlot((prev: any) =>
        prev?.number === data.plot_number
          ? { ...prev, current_bid: data.amount, winner_team_id: data.team_id }
          : prev,
      );
    });
    socket.on("connection_count", (data: any) => {
      setConnectedCount(data.count);
      setConnectedTeams(data.teams || []);
    });
    socket.on("auction_reset", () => window.location.reload());

    return () => {
      socket.off("connect", joinRoom);
      socket.off("auction_state_update");
      socket.off("round_change");
      socket.off("plot_adjustment");
      socket.off("rebid_phase_update");
      socket.off("round4_phase_update");
      socket.off("plot_update");
      socket.off("team_update");
      socket.off("new_rebid_offer");
      socket.off("rebid_offer_cancelled");
      socket.off("new_bid");
      socket.off("connection_count");
      socket.off("auction_reset");
    };
  }, [socket]);

  const handleRebidToggle = async (isActive: boolean) => {
    try {
      await fetch("/api/admin/rebid/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });
    } catch (err) {
      console.error("Failed to toggle rebid", err);
    }
  };

  const status = auctionState?.status || "notstarted";
  const isRunning = status === "running" || status === "selling";
  const isPaused = status === "paused";
  const isCompleted = status === "completed";
  const isNotStarted = status === "not_started";

  /** Look up team name by ID. */
  const getTeamName = (teamId: string) => {
    if (!teamId) return "-";
    const team = teams.find((t) => t.id === teamId);
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
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
    const percent = parseFloat(adjustAmount);

    if (plotNums.length === 0 || isNaN(percent)) {
      setAdjustMessage("Enter valid plot number(s) and percentage");
      return;
    }

    try {
      const res = await fetch("/api/admin/adjust-plot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plot_numbers: plotNums,
          adjustment_percent: percent,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const count = data.results?.length || 0;
        setAdjustMessage(
          `${percent > 0 ? "+" : ""}${percent}% applied to ${count} plot(s)`,
        );
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

  /** Undo the last plot adjustment */
  const handleUndoAdjustment = async () => {
    try {
      const res = await fetch("/api/admin/undo-adjustment", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAdjustMessage(data.message || "Undo successful");
      } else {
        setAdjustMessage("Undo failed");
      }
    } catch {
      setAdjustMessage("Network error on undo");
    }
    setTimeout(() => setAdjustMessage(""), 3000);
  };

  /** Push a policy question to the teams */
  const handlePushQuestion = async (desc: string) => {
    try {
      await fetch("/api/admin/push-question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policy_description: desc }),
      });
      setActiveQuestion(desc);
      setAdjustMessage("Question Pushed!");
    } catch {
      setAdjustMessage("Error pushing question");
    }
    setTimeout(() => setAdjustMessage(""), 3000);
  };

  /** Toggle a team's ban status */
  const handleToggleBan = async (teamId: string) => {
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/toggle-ban`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setTeams((prev) =>
          prev.map((t) =>
            t.id === teamId ? { ...t, is_banned: data.is_banned } : t,
          ),
        );
        setAdjustMessage(data.is_banned ? "Team Banned!" : "Team Unbanned!");
      } else {
        setAdjustMessage("Failed to toggle ban");
      }
    } catch (e) {
      setAdjustMessage("Network error on toggle ban");
    }
    setTimeout(() => setAdjustMessage(""), 3000);
  };

  /** Get round label for display. */
  const getRoundLabel = (round: number) => {
    switch (round) {
      case 1:
        return "Bidding";
      case 2:
        return "Adjust";
      case 3:
        return "Adjust";
      case 4:
        return "Bidding";
      case 5:
        return "Adjust";
      case 6:
        return "Final Adj";
      default:
        return `R${round}`;
    }
  };

  // --- Admin Password Gate ---
  if (!isAdminAuth) {
    return (
      <NeoLayout containerized={false}>
        <div className="h-screen flex items-center justify-center bg-[var(--color-bg)]">
          <NeoCard className="w-full max-w-md p-8 text-center">
            <ShieldAlert
              size={64}
              className="text-[var(--color-primary)] mx-auto mb-4"
              strokeWidth={3}
            />
            <h1 className="text-3xl font-black uppercase mb-2 tracking-tight">
              Admin Access
            </h1>
            <p className="text-sm font-bold text-[var(--color-text)] opacity-50 mb-6 uppercase">
              Enter admin password to continue
            </p>

            <div className="space-y-4">
              <NeoInput
                type="password"
                placeholder="Enter Password"
                value={adminPassInput}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setAdminPassInput(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent) =>
                  e.key === "Enter" && handleAdminLogin()
                }
                className="text-center text-lg font-bold"
              />
              {authError && (
                <p className="text-[var(--color-danger)] font-black text-sm uppercase animate-pulse">
                  {authError}
                </p>
              )}
              <NeoButton
                onClick={handleAdminLogin}
                className="w-full text-lg font-black uppercase py-3"
              >
                <ShieldAlert size={20} className="mr-2" /> Unlock Admin
              </NeoButton>
            </div>
          </NeoCard>
        </div>
      </NeoLayout>
    );
  }

  return (
    <NeoLayout containerized={false}>
      <div className="min-h-screen lg:h-screen flex flex-col lg:overflow-hidden px-3 py-2">
        <header className="flex flex-col md:flex-row justify-between items-center mb-3 md:mb-2 gap-2 md:gap-2 border-b-4 border-[var(--color-border)] pb-2 md:pb-2">
          <div className="flex items-center gap-3 md:gap-4">
            <ShieldAlert
              size={48}
              className="text-[var(--color-primary)] hidden md:block"
              strokeWidth={3}
            />
            <ShieldAlert
              size={36}
              className="text-[var(--color-primary)] md:hidden"
              strokeWidth={3}
            />
            <h1 className="text-2xl md:text-4xl font-black uppercase tracking-normal">
              ADMIN
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 md:gap-4 items-stretch min-h-[3rem] md:min-h-[3rem]">
            <div className="flex items-center gap-1 md:gap-2 neo-border px-2 md:px-4 min-h-[3rem] min-w-[80px] md:min-w-[100px] bg-[var(--color-bg)]">
              <Users
                size={20}
                className="text-[var(--color-secondary)] hidden md:block"
              />
              <Users
                size={16}
                className="text-[var(--color-secondary)] md:hidden"
              />
              <span className="font-black text-lg md:text-xl">
                {connectedCount}
              </span>
              <span className="hidden md:inline font-bold uppercase text-sm">
                Online
              </span>
            </div>

            <NeoBadge
              variant={
                isRunning
                  ? "success"
                  : isPaused
                    ? "neutral"
                    : isCompleted
                      ? "danger"
                      : "neutral"
              }
              className="min-h-[3rem] min-w-[80px] md:min-w-[100px] flex items-center justify-center px-2 md:px-6"
            >
              {status.replace("_", " ")}
            </NeoBadge>

            <div className="neo-border px-2 md:px-4 min-h-[3rem] min-w-[60px] md:min-w-[80px] flex flex-col justify-center items-center bg-[var(--color-surface)]">
              <div className="flex flex-col items-center justify-center leading-none">
                <span className="font-bold uppercase text-[8px] md:text-[10px] opacity-70">
                  Plot
                </span>
                <span className="font-black text-lg md:text-xl">
                  #{auctionState?.current_plot_number || "-"}
                </span>
              </div>
            </div>

            <div className="neo-border px-2 md:px-4 min-h-[3rem] min-w-[60px] md:min-w-[80px] flex flex-col justify-center items-center bg-[var(--color-surface)]">
              <div className="flex flex-col items-center justify-center leading-none">
                <span className="font-bold uppercase text-[8px] md:text-[10px] opacity-70">
                  Round
                </span>
                <span className="font-black text-lg md:text-xl">
                  {currentRound}
                </span>
              </div>
            </div>

            <ThemeChanger className="min-h-[3rem]" isAdmin={true} />

            <NeoButton
              variant="danger"
              className="text-xs md:text-sm font-black min-h-[3rem] min-w-[50px] md:min-w-[80px] px-2 md:px-6 flex items-center justify-center"
              onClick={() => {
                localStorage.removeItem("admin_auth");
                setIsAdminAuth(false);
              }}
            >
              <span className="md:hidden">🔒</span>
              <span className="hidden md:inline">🔒 Lock</span>
            </NeoButton>
          </div>
        </header>

        {/* Main Content: Controls + Leaderboard + Connected | Plot Table */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1 min-h-0 overflow-hidden">
          {/* Left: Controls + Leaderboard + Connected */}
          <div className="lg:col-span-1 flex flex-col gap-3 min-h-0 overflow-y-auto">
            {/* Connected / Disconnected Teams Card */}
            <NeoCard className="shrink-0 bg-[var(--color-bg)] mb-3">
              {(() => {
                const onlineTeams = connectedTeams.filter(t => t !== "Admin" && t !== "Leaderboard");
                const offlineTeams = teams.filter(t => !connectedTeams.includes(t.name));
                return (
                  <div className="flex flex-col gap-2">
                    <div>
                      <h2 className="text-[11px] font-black uppercase mb-1 flex items-center gap-1.5 opacity-80 text-[var(--color-success)]">
                        <Users size={12} /> Online ({onlineTeams.length})
                      </h2>
                      <div className="flex flex-wrap gap-1 overflow-y-auto pr-1 custom-scrollbar">
                        {onlineTeams.length > 0 ? (
                          onlineTeams.map((team, idx) => (
                            <span key={idx} className="text-[9px] font-bold bg-[var(--color-surface)] border border-[var(--color-border)] px-1.5 py-0.5 tracking-tight flex-shrink-0">
                              {team}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] opacity-50 font-bold uppercase py-0.5">None</span>
                        )}
                      </div>
                    </div>
                    <div className="border-t-2 border-dashed border-[var(--color-border)]/20 pt-2">
                      <h2 className="text-[11px] font-black uppercase mb-1 flex items-center gap-1.5 opacity-80 text-[var(--color-danger)]">
                        <Users size={12} /> Offline ({offlineTeams.length})
                      </h2>
                      <div className="flex flex-wrap gap-1 overflow-y-auto pr-1 custom-scrollbar">
                        {offlineTeams.length > 0 ? (
                          offlineTeams.map((team, idx) => (
                            <span key={idx} className="text-[9px] font-bold bg-[var(--color-surface)] border border-[var(--color-border)] opacity-60 px-1.5 py-0.5 tracking-tight flex-shrink-0">
                              {team.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-[9px] opacity-50 font-bold uppercase py-0.5">None</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </NeoCard>

            {/* Admin Controls Card */}
            <NeoCard className="shrink-0 bg-[var(--color-bg)]">
              <h2 className="text-sm font-black uppercase mb-2 flex items-center gap-2">
                <Settings size={16} /> Admin Controls
              </h2>

              {/* Auction Actions */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                <NeoButton
                  variant="success"
                  onClick={() => sendAction("start")}
                  disabled={isRunning}
                  className={`text-xs py-2 ${isRunning ? "opacity-50" : ""}`}
                >
                  <Play size={14} className="mr-1" />{" "}
                  {isNotStarted ? "START" : isCompleted ? "RESTART" : "RESUME"}
                </NeoButton>
                <NeoButton
                  variant="base"
                  onClick={() => sendAction("pause")}
                  disabled={!isRunning}
                  className={`text-xs py-2 ${!isRunning ? "opacity-50 bg-[var(--color-surface)]" : "bg-[var(--color-surface)]"}`}
                >
                  <Pause size={14} className="mr-1" /> PAUSE
                </NeoButton>
                <NeoButton
                  variant="secondary"
                  onClick={() => sendAction("prev")}
                  disabled={
                    !isRunning || auctionState?.current_plot_number <= 1
                  }
                  className={`text-xs py-2 ${!isRunning || auctionState?.current_plot_number <= 1 ? "opacity-30" : ""}`}
                >
                  <SkipForward size={14} className="mr-1 rotate-180" /> PREV
                </NeoButton>
                <NeoButton
                  variant="secondary"
                  onClick={() => sendAction("next")}
                  disabled={!isRunning}
                  className={`text-xs py-2 ${!isRunning ? "opacity-50" : ""}`}
                >
                  NEXT <SkipForward size={14} className="ml-1" />
                </NeoButton>
              </div>

              {/* Sell Action */}
              <div className="mb-3">
                <NeoButton
                  variant="primary"
                  className="text-xs py-2 font-black w-full shadow-[4px_4px_0_var(--color-primary)] hover:translate-x-[2px] border-2 border-[var(--color-primary)]"
                  onClick={() => sendAction("sell")}
                  disabled={!isRunning || status === "selling"}
                >
                  <Clock size={14} className="mr-1" /> START COUNTDOWN (SELL)
                </NeoButton>
              </div>

              {/* Live Bid Widget (R1 & R4) */}
              {[1, 4].includes(currentRound) && currentPlot?.number && (
                <div className="neo-border p-3 bg-[var(--color-surface)] mb-3 relative overflow-hidden flex flex-col items-center">
                  <h3 className="text-[10px] font-black uppercase text-[var(--color-text)] opacity-60 w-full text-left mb-1">
                    Live Plot {currentPlot.number}
                  </h3>

                  {currentPlot.current_bid ? (
                    <div className="flex flex-col items-center justify-center p-2 w-full animate-in fade-in duration-300">
                      <span className="text-[10px] font-bold uppercase opacity-80">
                        Highest Bid
                      </span>
                      <span className="font-mono font-black text-2xl text-[var(--color-success)] leading-none my-1">
                        ₹
                        {Number(currentPlot.current_bid).toLocaleString(
                          "en-IN",
                        )}
                      </span>
                      <span className="text-xs font-black uppercase bg-[var(--color-primary)] text-[var(--color-bg)] px-2 py-0.5 mt-1 border-2 border-[var(--color-border)]">
                        ★ {getTeamName(currentPlot.winner_team_id)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4 w-full">
                      <span className="text-xs font-bold uppercase opacity-50">
                        No bids yet
                      </span>
                    </div>
                  )}

                  {/* Selling Overlay */}
                  {status === "selling" && (
                    <div className="absolute inset-0 bg-[var(--color-danger)]/90 z-10 flex flex-col items-center justify-center backdrop-blur-[2px]">
                      <span className="text-[var(--color-bg)] font-black text-6xl leading-none drop-shadow-md">
                        {sellCountdown}
                      </span>
                      <p className="text-[var(--color-bg)] font-black text-xs mt-1 tracking-widest uppercase bg-[var(--color-text)] px-2 py-1 border-2 border-[var(--color-bg)]">
                        Selling...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Reset Action */}
              <div className="mb-3">
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
                  <RefreshCw
                    size={14}
                    className={`mr-1 ${confirmReset ? "animate-spin" : ""}`}
                  />
                  {confirmReset ? "CONFIRM" : "RESET"}
                </NeoButton>
              </div>

              {/* Round Selector */}
              <div className="flex gap-1 justify-between items-center neo-border px-1 bg-[var(--color-bg)] mb-3">
                {[1, 2, 3, 4, 5, 6].map((r) => (
                  <button
                    key={r}
                    onClick={() => handleSetRound(r)}
                    className={`flex-1 py-1.5 text-[10px] font-black uppercase border-2 border-transparent transition-all ${currentRound === r ? "bg-[var(--color-primary)] text-[var(--color-bg)] border-[var(--color-border)]" : "hover:bg-[var(--color-surface)]"}`}
                  >
                    R{r}
                  </button>
                ))}
              </div>

              {/* Round 4 Two-Phase Panel */}
              {currentRound === 4 && (
                <div className="space-y-2 neo-border p-2 bg-[var(--color-surface)] mb-3">
                  <h3 className="text-xs font-black uppercase flex items-center gap-2 text-[var(--color-secondary)]">
                    <Settings size={14} /> Round 4 — Sell &amp; Rebid
                  </h3>
                  <div className="flex gap-2">
                    <NeoButton
                      variant={
                        auctionState?.round4_phase === "sell"
                          ? "danger"
                          : "success"
                      }
                      className="text-xs py-2 flex-1 font-bold"
                      onClick={async () => {
                        if (auctionState?.round4_phase === "sell") {
                          // Move to bid phase
                          if (
                            confirm(
                              "Close sell phase and start bidding on unsold listed plots?",
                            )
                          ) {
                            await fetch("/api/admin/start-round4-bidding", {
                              method: "POST",
                            });
                          }
                        } else {
                          await fetch("/api/admin/start-round4-sell", {
                            method: "POST",
                          });
                        }
                      }}
                    >
                      {auctionState?.round4_phase === "sell"
                        ? "END SELL → START BIDDING"
                        : auctionState?.round4_phase === "bid"
                          ? "BID PHASE ACTIVE"
                          : "START SELL PHASE"}
                    </NeoButton>
                  </div>
                  <p className="text-[10px] font-medium opacity-70">
                    {auctionState?.round4_phase === "sell"
                      ? "Sell phase ACTIVE — teams can list plots. Click to close and start bidding on unsold plots."
                      : auctionState?.round4_phase === "bid"
                        ? `Bidding on ${(auctionState?.round4_bid_queue || []).length} unsold listed plots. Use Next/Sell to advance.`
                        : "Start the sell phase to let teams list their plots for sale."}
                  </p>
                </div>
              )}

              {/* Round 4 Sell Offers Table */}
              {currentRound === 4 && sellOffers.length > 0 && (
                <div className="neo-border p-2 bg-[var(--color-bg)] mb-3">
                  <h3 className="text-xs font-black uppercase mb-2 opacity-60">
                    📋 Listed for Sale ({sellOffers.length})
                  </h3>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {sellOffers.map((offer: any) => (
                      <div
                        key={offer.id}
                        className="flex justify-between items-center bg-[var(--color-surface)] neo-border px-2 py-1 text-xs"
                      >
                        <span className="font-black">#{offer.plot_number}</span>
                        <span className="font-bold text-[var(--color-primary)] truncate max-w-[100px]">
                          {offer.team_name}
                        </span>
                        <span className="font-mono font-bold">
                          ₹{Number(offer.asking_price).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* End Game Button (visible on round 6) */}
              {currentRound >= 6 && auctionState?.status !== "completed" && (
                <div className="neo-border p-2 bg-red-100 mb-3">
                  <NeoButton
                    variant="danger"
                    className="w-full text-sm py-3 font-black"
                    onClick={async () => {
                      if (
                        confirm(
                          "END THE GAME? This will show the final leaderboard to all teams.",
                        )
                      ) {
                        await fetch("/api/admin/end-game", { method: "POST" });
                      }
                    }}
                  >
                    🏁 END GAME — SHOW FINAL LEADERBOARD
                  </NeoButton>
                </div>
              )}

              {/* Policy / Adjustment Panel */}
              {[2, 3, 5, 6].includes(currentRound) && (
                <div className="space-y-2 neo-border p-2 bg-[var(--color-surface)] mb-3">
                  <h3 className="text-xs font-black uppercase flex items-center gap-2 text-[var(--color-secondary)]">
                    <AlertCircle size={14} /> Policy Mode (Round {currentRound})
                  </h3>

                  {/* Questions Display */}
                  {policyQuestions.length > 0 && (
                    <div className="flex flex-col gap-2 mb-3">
                      <div className="bg-[var(--color-bg)] neo-border p-2">
                        <p className="text-xs font-bold mb-2">
                          Question {currentQuestionIndex + 1} of{" "}
                          {policyQuestions.length}
                        </p>
                        <p className="text-sm font-black mb-3">
                          {
                            policyQuestions[currentQuestionIndex]
                              .policy_description
                          }
                        </p>
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex gap-1 flex-1">
                            <NeoButton
                              variant="secondary"
                              className="px-2 py-1 flex-1"
                              disabled={currentQuestionIndex === 0}
                              onClick={() =>
                                setCurrentQuestionIndex((prev) =>
                                  Math.max(0, prev - 1),
                                )
                              }
                            >
                              <ChevronRight
                                className="rotate-180 mx-auto"
                                size={16}
                              />
                            </NeoButton>
                            <NeoButton
                              variant="secondary"
                              className="px-2 py-1 flex-1"
                              disabled={
                                currentQuestionIndex ===
                                policyQuestions.length - 1
                              }
                              onClick={() =>
                                setCurrentQuestionIndex((prev) =>
                                  Math.min(
                                    policyQuestions.length - 1,
                                    prev + 1,
                                  ),
                                )
                              }
                            >
                              <ChevronRight className="mx-auto" size={16} />
                            </NeoButton>
                          </div>
                          <NeoButton
                            variant="primary"
                            className="px-4 py-1"
                            onClick={() =>
                              handlePushQuestion(
                                policyQuestions[currentQuestionIndex]
                                  .policy_description,
                              )
                            }
                          >
                            PUSH
                          </NeoButton>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual Plot Adjustment Inputs */}
                  <p className="text-[10px] font-black uppercase mt-2">
                    Manual Plot Adjusment
                  </p>
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
                      className="neo-input text-xs w-1/2"
                    />
                    <NeoButton
                      variant="primary"
                      className="text-xs w-1/4"
                      onClick={handleAdjustPlot}
                    >
                      APPLY
                    </NeoButton>
                    <NeoButton
                      variant="secondary"
                      className="text-xs w-1/4 p-0 shrink-0"
                      onClick={handleUndoAdjustment}
                      title="Undo Last Transaction"
                    >
                      <Undo2 size={16} className="mx-auto" />
                    </NeoButton>
                  </div>
                  {adjustMessage && (
                    <p className="text-[10px] font-bold text-[var(--color-success)] leading-tight mt-1">
                      {adjustMessage}
                    </p>
                  )}
                </div>
              )}
            </NeoCard>
          </div>

          {/* Right: Plot Status Table - full remaining space */}
          <div className="lg:col-span-3 min-h-0 min-w-0 overflow-hidden flex flex-col">
            <NeoCard className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <h3 className="text-sm font-black uppercase mb-2">Plot Status</h3>
              <div className="flex-1 min-h-0 overflow-auto">
                {(() => {
                  const tableColumns: ColumnDef<Plot>[] = [
                    {
                      accessorKey: "number",
                      header: "#",
                      cell: ({ row }) => (
                        <span className="font-bold text-sm">
                          {row.original.number}
                        </span>
                      ),
                    },
                    {
                      accessorKey: "plot_type",
                      header: "Type",
                      cell: ({ row }) => (
                        <span className="text-xs font-bold uppercase">
                          {row.original.plot_type || "-"}
                        </span>
                      ),
                    },
                    {
                      id: "base_price",
                      header: "Base Price",
                      cell: ({ row }) => {
                        const basePrice = Number(row.original.base_price || 0);
                        const area = Number(row.original.actual_area || 0);
                        const totalBase = basePrice * area > 0 ? basePrice * area : Number(row.original.total_plot_price || 0);
                        return (
                          <span className="font-mono text-xs opacity-70">
                            ₹{totalBase.toLocaleString("en-IN")}
                          </span>
                        );
                      }
                    },
                    {
                      accessorKey: "total_plot_price",
                      header: "Curr. Price",
                      cell: ({ row }) => (
                        <span className="font-mono text-xs font-bold">
                          ₹{Number(row.original.current_bid || row.original.total_plot_price || 0).toLocaleString("en-IN")}
                        </span>
                      ),
                    },
                    {
                      accessorKey: "round_adjustment",
                      header: "Adj.",
                      cell: ({ row }) => {
                        const adj = Number(row.original.round_adjustment || 0);
                        return (
                          <span
                            className={`font-mono text-xs font-bold ${adj > 0 ? "text-[var(--color-success)]" : adj < 0 ? "text-[var(--color-danger)]" : ""}`}
                          >
                            {adj !== 0
                              ? `${adj > 0 ? "+" : ""}₹${adj.toLocaleString("en-IN")}`
                              : "-"}
                          </span>
                        );
                      },
                    },
                    {
                      accessorKey: "status",
                      header: "Status",
                      cell: ({ row }) => (
                        <NeoBadge
                          variant={
                            row.original.status === "sold"
                              ? "success"
                              : row.original.status === "unsold"
                                ? "danger"
                                : row.original.status === "active"
                                  ? "info"
                                  : "neutral"
                          }
                        >
                          {row.original.status}
                        </NeoBadge>
                      ),
                    },
                    {
                      accessorKey: "winner_team_id",
                      header: "Team",
                      cell: ({ row }) => (
                        <span className="text-xs font-bold uppercase">
                          {row.original.winner_team_id
                            ? getTeamName(row.original.winner_team_id)
                            : "-"}
                        </span>
                      ),
                    },
                    {
                      id: "actions",
                      header: "Actions",
                      cell: ({ row }) => {
                        if (row.original.status === "sold") {
                          return (
                            <NeoButton
                              variant="secondary"
                              className="text-[10px] px-2 py-1"
                              onClick={async () => {
                                try {
                                  await fetch(`/api/admin/force-resell/${row.original.number}`, {
                                    method: "POST"
                                  });
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                            >
                              Resell
                            </NeoButton>
                          );
                        }
                        return null;
                      }
                    }
                  ];

                  return (
                    <NeoTable
                      columns={tableColumns}
                      data={plots}
                      highlightKey="number"
                      highlightValue={auctionState?.current_plot_number}
                    />
                  );
                })()}
              </div>
            </NeoCard>
          </div>
        </div>

        {/* Floating Admin FAB Menu */}
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3 pointer-events-none">
          {isFabMenuOpen && (
            <div className="flex flex-col gap-3 mb-1 animate-in slide-in-from-bottom-5 duration-200 pointer-events-auto">
              <button
                onClick={() => {
                  setIsImageModalOpen(true);
                  setIsFabMenuOpen(false);
                }}
                className="flex items-center gap-3 group"
              >
                <span className="neo-border bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--color-border)] group-hover:scale-105 transition-transform">
                  Show Map
                </span>
                <div className="w-12 h-12 bg-[var(--color-primary)] text-[var(--color-bg)] rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                  <MapPin size={24} />
                </div>
              </button>
              <button
                onClick={() => {
                  setIsSidebarOpen(true);
                  setIsFabMenuOpen(false);
                }}
                className="flex items-center gap-3 group"
              >
                <span className="neo-border bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--color-border)] group-hover:scale-105 transition-transform">
                  Team Infos
                </span>
                <div className="w-12 h-12 bg-[var(--color-secondary)] text-[var(--color-bg)] rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                  <Users size={24} />
                </div>
              </button>
              <button
                onClick={() => {
                  setIsConnectedModalOpen(true);
                  setIsFabMenuOpen(false);
                }}
                className="flex items-center gap-3 group"
              >
                <span className="neo-border bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--color-border)] group-hover:scale-105 transition-transform">
                  Connections
                </span>
                <div className="w-12 h-12 bg-[var(--color-success)] text-[var(--color-bg)] rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                  <WifiOff size={24} />
                </div>
              </button>
              <button
                onClick={() => {
                  setIsSaveLoadModalOpen(true);
                  setIsFabMenuOpen(false);
                }}
                className="flex items-center gap-3 group"
              >
                <span className="neo-border bg-[var(--color-surface)] text-[var(--color-text)] px-3 py-1 text-xs font-black uppercase shadow-[2px_2px_0_var(--color-border)] group-hover:scale-105 transition-transform">
                  Save / Load
                </span>
                <div className="w-12 h-12 bg-[var(--color-warning)] text-[var(--color-bg)] rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all">
                  <Save size={24} />
                </div>
              </button>
            </div>
          )}
          <button
            onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
            className={`w-14 h-14 ${isFabMenuOpen ? "bg-[var(--color-danger)] text-[var(--color-bg)]" : "bg-[var(--color-bg)] text-[var(--color-text)]"} rounded-full flex items-center justify-center border-4 border-[var(--color-border)] shadow-[4px_4px_0_var(--color-border)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all pointer-events-auto`}
          >
            {isFabMenuOpen ? <X size={28} /> : <Rocket size={28} />}
          </button>
        </div>

        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            />
            <div className="relative w-full max-w-6xl h-[85vh] bg-[var(--color-bg)] border-4 border-[var(--color-border)] shadow-[12px_12px_0_rgba(0,0,0,1)] flex flex-col pointer-events-auto overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-4 border-b-4 border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
                <h2 className="font-black text-2xl uppercase tracking-wider">
                  Extra Info
                </h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-1 hover:bg-[var(--color-bg)] border-2 border-transparent hover:border-[var(--color-border)] transition-colors rounded-sm"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                  {/* Left: Team Management */}
                  <div className="h-full flex flex-col gap-4 min-h-0">
                    <div className="flex items-center gap-3 neo-border px-4 py-3 bg-[var(--color-surface)] shrink-0">
                      <ShieldAlert
                        size={28}
                        className="text-[var(--color-danger)]"
                      />
                      <div className="flex-1">
                        <span className="font-black text-3xl leading-none block">
                          {teams.length}
                        </span>
                        <span className="font-bold uppercase text-xs block opacity-70 tracking-wider">
                          Total Teams
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto neo-border bg-[var(--color-surface)] p-2 min-h-0">
                      <div className="space-y-2">
                        {teams.map((t) => (
                          <div
                            key={t.id}
                            className={`flex items-center justify-between gap-2 p-2 border-2 ${t.is_banned ? "border-[var(--color-danger)] bg-[var(--color-danger)]/5" : "border-[var(--color-border)] bg-[var(--color-bg)]"} transition-all`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-2 h-2 shrink-0 ${t.is_banned ? "bg-[var(--color-danger)]" : "bg-[var(--color-success)]"} rounded-full shadow-[1px_1px_0_var(--neo-shadow-color)]`}
                              />
                              <span
                                className={`font-black text-[10px] uppercase truncate ${t.is_banned ? "line-through opacity-50" : ""}`}
                              >
                                {t.name}
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleBan(t.id)}
                              className={`px-2 py-0.5 font-black text-[9px] uppercase border-2 transition-all ${t.is_banned
                                ? "bg-[var(--color-success)] text-[var(--color-bg)] border-[var(--color-success)] hover:shadow-none translate-x-[1px] translate-y-[1px]"
                                : "bg-[var(--color-danger)] text-[var(--color-bg)] border-[var(--color-danger)] shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                                }`}
                            >
                              {t.is_banned ? "Unban" : "Ban"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: Connected Users */}
                  <div className="h-full flex flex-col gap-4 min-h-0">
                    <div className="flex items-center gap-3 neo-border px-4 py-3 bg-[var(--color-surface)] shrink-0">
                      <Users
                        size={28}
                        className="text-[var(--color-secondary)]"
                      />
                      <div className="flex-1">
                        <span className="font-black text-3xl leading-none block">
                          {connectedCount}
                        </span>
                        <span className="font-bold uppercase text-xs block opacity-70 tracking-wider">
                          Connected Teams
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto neo-border bg-[var(--color-surface)] p-2 min-h-0 flex flex-col gap-4">
                      {/* Connected List */}
                      <div>
                        <h4 className="font-black text-[10px] uppercase opacity-50 mb-2 px-1">Online ({connectedTeams.length})</h4>
                        <div className="space-y-2">
                          {connectedTeams.length > 0 ? (
                            connectedTeams.map((name, i) => (
                              <div
                                key={i}
                                className="flex items-center gap-3 bg-[var(--color-bg)] p-3 border-2 border-[var(--color-border)] font-black text-sm uppercase"
                              >
                                <span className="w-3 h-3 bg-[var(--color-success)] border-2 border-[var(--color-border)] shadow-[2px_2px_0_var(--color-border)]" />
                                <span className="truncate">{name}</span>
                              </div>
                            ))
                          ) : (
                            <div className="flex flex-col items-center justify-center p-3 text-[var(--color-text)] opacity-40 border-2 border-dashed border-[var(--color-border)] text-center">
                              <p className="font-bold uppercase text-[10px]">No active connections</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Disconnected List */}
                      <div>
                        {(() => {
                          const disconnected = teams.filter(t => !connectedTeams.includes(t.name));
                          return (
                            <>
                              <h4 className="font-black text-[10px] uppercase opacity-50 mb-2 px-1 mt-2">Offline ({disconnected.length})</h4>
                              <div className="space-y-2 opacity-60">
                                {disconnected.length > 0 ? (
                                  disconnected.map((team, i) => (
                                    <div
                                      key={i}
                                      className="flex items-center gap-3 bg-[var(--color-surface)] p-3 border-2 border-[var(--color-border)] font-black text-sm uppercase"
                                    >
                                      <span className="w-3 h-3 bg-[var(--color-danger)] border-2 border-[var(--color-border)] shadow-[2px_2px_0_var(--color-border)]" />
                                      <span className="truncate">{team.name}</span>
                                    </div>
                                  ))
                                ) : (
                                  <div className="flex flex-col items-center justify-center p-3 text-[var(--color-text)] opacity-40 border-2 border-dashed border-[var(--color-border)] text-center">
                                    <p className="font-bold uppercase text-[10px]">All teams connected</p>
                                  </div>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Full Screen Image Modal */}
        {isImageModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => setIsImageModalOpen(false)}
            />
            <div className="relative w-full max-w-5xl h-[80vh] bg-[var(--color-bg)] p-2 neo-border flex flex-col pointer-events-auto shadow-[12px_12px_0_rgba(0,0,0,1)]">
              <div className="flex justify-between items-center bg-[var(--color-primary)] text-[var(--color-bg)] p-2 border-2 border-[var(--color-border)] mb-2 shrink-0">
                <h2 className="font-black text-lg uppercase flex items-center gap-2">
                  <MapPin size={20} /> Plot Map
                </h2>
                <button
                  onClick={() => setIsImageModalOpen(false)}
                  className="hover:bg-black/20 p-1 rounded-sm"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 bg-[var(--color-bg)] border-2 border-[var(--color-border)] relative overflow-hidden flex items-center justify-center p-4">
                <CityMap
                  currentPlotNumber={currentPlot?.number}
                  plots={plots}
                  allTeams={teams}
                  currentRound={currentRound}
                  onPlotClick={(id) => {
                    const p = plots.find((p) => p.number.toString() === id);
                    if (p && !isImageModalOpen) setCurrentPlot(p);
                    else if (p && isImageModalOpen) {
                      setCurrentPlot(p);
                      setIsImageModalOpen(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <SaveLoadModal
        isOpen={isSaveLoadModalOpen}
        onClose={() => setIsSaveLoadModalOpen(false)}
      />
      <ConnectedTeamsModal
        isOpen={isConnectedModalOpen}
        onClose={() => setIsConnectedModalOpen(false)}
        teams={teams}
        connectedTeams={connectedTeams}
      />
    </NeoLayout>
  );
}

function ConnectedTeamsModal({
  isOpen,
  onClose,
  teams,
  connectedTeams,
}: {
  isOpen: boolean;
  onClose: () => void;
  teams: any[];
  connectedTeams: string[];
}) {
  if (!isOpen) return null;

  const handleDisconnect = async (teamId: string, teamName: string) => {
    if (!confirm(`Disconnect team "${teamName}"? They can reconnect freely.`)) return;
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/disconnect`, { method: "POST" });
      const data = await res.json();
      if (data.status === "not_connected") {
        alert(`${teamName} was not connected.`);
      }
    } catch (err) {
      console.error("Disconnect failed:", err);
      alert("Failed to disconnect team.");
    }
  };

  const onlineTeams = teams.filter((t) => connectedTeams.includes(t.name));
  const offlineTeams = teams.filter((t) => !connectedTeams.includes(t.name));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[var(--color-bg)] border-4 border-[var(--color-border)] shadow-[12px_12px_0_rgba(0,0,0,1)] flex flex-col pointer-events-auto overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b-4 border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <h2 className="font-black text-xl uppercase tracking-wider flex items-center gap-2">
            <Users size={20} /> Manage Connections
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-bg)] transition-colors rounded-sm">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Online Teams */}
          <div>
            <h3 className="text-xs font-black uppercase mb-2 text-[var(--color-success)] flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[var(--color-success)] rounded-full" /> Online ({onlineTeams.length})
            </h3>
            <div className="space-y-1.5">
              {onlineTeams.length > 0 ? (
                onlineTeams.map((team) => (
                  <div
                    key={team.id}
                    className="flex items-center justify-between gap-2 p-2 border-2 border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    <span className="text-xs font-black uppercase truncate">{team.name}</span>
                    <button
                      onClick={() => handleDisconnect(team.id, team.name)}
                      className="shrink-0 px-2 py-0.5 text-[9px] font-black uppercase bg-[var(--color-danger)] text-[var(--color-bg)] border-2 border-[var(--color-danger)] shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all flex items-center gap-1"
                    >
                      <WifiOff size={10} /> Kick
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-[10px] font-bold uppercase opacity-50 p-2">No teams connected</p>
              )}
            </div>
          </div>

          {/* Offline Teams */}
          <div className="border-t-2 border-dashed border-[var(--color-border)]/30 pt-3">
            <h3 className="text-xs font-black uppercase mb-2 opacity-50 flex items-center gap-1.5">
              <span className="w-2 h-2 bg-[var(--color-danger)] rounded-full" /> Offline ({offlineTeams.length})
            </h3>
            <div className="flex flex-wrap gap-1">
              {offlineTeams.map((team) => (
                <span key={team.id} className="text-[9px] font-bold px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] opacity-50">
                  {team.name}
                </span>
              ))}
              {offlineTeams.length === 0 && (
                <p className="text-[10px] font-bold uppercase opacity-50 p-2">All teams connected!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SaveLoadModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [saveLabel, setSaveLabel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Custom feedback state
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: "success" | "error" | "info" | null;
  }>({ msg: "", type: null });

  // Custom confirm state
  const [confirmReq, setConfirmReq] = useState<{
    msg: string;
    action: () => void;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSnapshots();
      setFeedback({ msg: "", type: null });
      setConfirmReq(null);
      setSearchQuery("");
    }
  }, [isOpen]);

  const showFeedback = (msg: string, type: "success" | "error" | "info") => {
    setFeedback({ msg, type });
    if (type !== "error") {
      setTimeout(() => setFeedback({ msg: "", type: null }), 3000);
    }
  };

  const fetchSnapshots = async () => {
    try {
      const res = await fetch("/api/admin/saved-states");
      if (res.ok) {
        const data = await res.json();
        setSnapshots(data);
      }
    } catch (err) {
      console.error("Failed to fetch snapshots:", err);
    }
  };

  const handleSave = async () => {
    if (!saveLabel.trim()) {
      showFeedback("Please enter a label for the snapshot.", "error");
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch("/api/admin/save-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: saveLabel }),
      });
      if (res.ok) {
        setSaveLabel("");
        await fetchSnapshots();
        showFeedback("Game state saved successfully!", "success");
      } else {
        showFeedback("Failed to save state.", "error");
      }
    } catch (err) {
      console.error("Save error:", err);
      showFeedback("Error saving state.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const executeRestore = async (id: number) => {
    setConfirmReq(null);
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/restore-state/${id}`, { method: "POST" });
      if (res.ok) {
        showFeedback("State restored successfully! Refreshing...", "success");
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const err = await res.json();
        showFeedback(`Restore failed: ${err.detail || "Unknown error"}`, "error");
      }
    } catch (err) {
      console.error("Restore error:", err);
      showFeedback("Error restoring state.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreClick = (id: number, label: string) => {
    setConfirmReq({
      msg: `Are you sure you want to RESTORE snapshot "${label}"? This will overwrite current game state!`,
      action: () => executeRestore(id),
    });
  };

  const executeDelete = async (id: number) => {
    setConfirmReq(null);
    try {
      setIsLoading(true);
      const res = await fetch(`/api/admin/saved-states/${id}`, { method: "DELETE" });
      if (res.ok) {
        await fetchSnapshots();
        showFeedback("Snapshot deleted.", "success");
      } else {
        showFeedback("Failed to delete snapshot.", "error");
      }
    } catch (err) {
      console.error("Delete error:", err);
      showFeedback("Error deleting state.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => {
    setConfirmReq({
      msg: "Are you sure you want to delete this snapshot?",
      action: () => executeDelete(id),
    });
  };

  const filteredSnapshots = snapshots.filter(snap => {
    const term = searchQuery.toLowerCase();
    const dateStr = new Date(snap.created_at).toLocaleString().toLowerCase();
    return snap.label.toLowerCase().includes(term) || dateStr.includes(term);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[var(--color-bg)] border-4 border-[var(--color-border)] shadow-[12px_12px_0_rgba(0,0,0,1)] flex flex-col pointer-events-auto overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-4 border-b-4 border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <h2 className="font-black text-xl uppercase tracking-wider flex items-center gap-2">
            <Save size={20} /> Save & Load State
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-[var(--color-bg)] transition-colors rounded-sm">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] relative">

          {/* Custom Confirm Overlay */}
          {confirmReq && (
            <div className="absolute inset-0 z-10 bg-[var(--color-bg)]/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="neo-border bg-[var(--color-surface)] p-6 max-w-md w-full text-center shadow-[8px_8px_0_var(--neo-shadow-color)]">
                <AlertTriangle size={48} className="mx-auto text-[var(--color-danger)] mb-4" />
                <h3 className="font-black uppercase text-lg mb-2 text-[var(--color-danger)]">Confirm Action</h3>
                <p className="font-bold text-sm mb-6 opacity-80">{confirmReq.msg}</p>
                <div className="flex gap-4">
                  <NeoButton variant="secondary" className="flex-1" onClick={() => setConfirmReq(null)}>
                    Cancel
                  </NeoButton>
                  <NeoButton variant="danger" className="flex-1" onClick={confirmReq.action}>
                    Yes, Proceed
                  </NeoButton>
                </div>
              </div>
            </div>
          )}

          {/* Custom Feedback Banner */}
          {feedback.msg && (
            <div className={`p-4 font-bold border-l-8 flex items-center gap-2 ${feedback.type === "success" ? "bg-[var(--color-success)]/20 border-[var(--color-success)] text-[var(--color-success)]" :
              feedback.type === "error" ? "bg-[var(--color-danger)]/20 border-[var(--color-danger)] text-[var(--color-danger)]" :
                "bg-[var(--color-primary)]/20 border-[var(--color-primary)] text-[var(--color-primary)]"
              } animate-in slide-in-from-top-4 duration-300`}>
              {feedback.type === "error" ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
              {feedback.msg}
            </div>
          )}

          {/* Save Section */}
          <div className="neo-border p-4 bg-[var(--color-surface)]">
            <h3 className="text-sm font-black uppercase mb-3 flex items-center gap-2">
              <Download size={16} /> Create Snapshot
            </h3>
            <div className="flex gap-2">
              <NeoInput
                placeholder="Required: Snapshot label (e.g. 'Before Round 4')"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
                className="flex-1"
                disabled={isLoading}
              />
              <NeoButton onClick={handleSave} disabled={isLoading || !saveLabel.trim()} variant="primary">
                Save
              </NeoButton>
            </div>
          </div>

          {/* Load Section */}
          <div className="flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black uppercase flex items-center gap-2">
                <RotateCw size={16} /> Restore Snapshot
              </h3>
              <div className="relative w-full sm:w-64">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
                <NeoInput
                  placeholder="Search snapshots..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-3">
              {snapshots.length === 0 ? (
                <p className="text-sm font-bold opacity-50 uppercase p-4 text-center neo-border border-dashed">
                  No saved snapshots found.
                </p>
              ) : filteredSnapshots.length === 0 ? (
                <p className="text-sm font-bold opacity-50 uppercase p-4 text-center neo-border border-dashed">
                  No snapshots match your search.
                </p>
              ) : (
                filteredSnapshots.map((snap) => (
                  <div key={snap.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 neo-border bg-[var(--color-surface)]">
                    <div>
                      <h4 className="font-black text-lg">{snap.label}</h4>
                      <p className="text-xs font-bold opacity-60 uppercase">
                        {new Date(snap.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <NeoButton
                        variant="secondary"
                        size="sm"
                        onClick={() => handleRestoreClick(snap.id, snap.label)}
                        disabled={isLoading}
                      >
                        Restore
                      </NeoButton>
                      <button
                        onClick={() => handleDeleteClick(snap.id)}
                        disabled={isLoading}
                        className="w-10 h-10 flex items-center justify-center bg-[var(--color-danger)] text-white border-2 border-[var(--color-danger)] shadow-[2px_2px_0_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
