"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "../context/socket-context";
import NeoLayout from "../components/neo/NeoLayout";
import NeoCard from "../components/neo/NeoCard";
import NeoButton from "../components/neo/NeoButton";
import NeoInput from "../components/neo/NeoInput";
import { Loader2, Users, ArrowRight, ShieldAlert } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const router = useRouter();
  const { isConnected } = useSocket();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [teamName, setTeamName] = useState<string>("");
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch("/api/data/teams");
        if (res.ok) {
          const data = await res.json();
          setTeams(data);
        }
      } catch (err) {
        console.error("Failed to load teams", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const handleLogin = () => {
    if (!teamName.trim()) {
      setError("Please enter your team name");
      return;
    }
    // Match team by name (case-insensitive)
    const team = teams.find(
      (t) => t.name.toLowerCase() === teamName.trim().toLowerCase(),
    );
    if (!team) {
      setError("Team not found! Please check the team name.");
      return;
    }
    if (passcode.length < 3) {
      setError("Enter a valid passcode (any 3+ chars for demo)");
      return;
    }

    localStorage.setItem("team_id", team.id);
    router.push("/dashboard");
  };

  const handleAdminLogin = () => {
    if (passcode === "admin123") {
      router.push("/admin");
    } else {
      setError("Invalid Admin Passcode");
    }
  };

  return (
    <NeoLayout
      className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden"
      containerized={false}
    >
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none z-0 flex flex-wrap">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="w-24 h-24 border-r border-b border-[var(--color-border)]/20"
          />
        ))}
      </div>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="z-10 w-full max-w-md px-4 sm:px-0"
      >
        <div className="mb-8 text-center relative">
          <div className="absolute -top-12 -left-12 w-24 h-24 bg-[var(--color-secondary)] rounded-full blur-3xl opacity-30" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-[var(--color-primary)] rounded-full blur-3xl opacity-30" />

          <h1
            className="text-4xl sm:text-6xl font-black uppercase tracking-normal mb-2"
            style={{ textShadow: "4px 4px 0 var(--color-surface)" }}
          >
            AU-FEST
          </h1>
          <p className="text-lg sm:text-xl font-bold uppercase tracking-widest bg-[var(--color-text)] text-[var(--color-bg)] px-4 py-1 inline-block -rotate-2">
            2026 Auction
          </p>
        </div>

        <NeoCard className="bg-[var(--color-bg)]">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-[var(--color-primary)] border-4 border-[var(--color-border)] flex items-center justify-center shadow-[4px_4px_0_var(--neo-shadow-color)]">
              <Users size={32} className="text-[var(--color-bg)]" />
            </div>
          </div>

          <h2 className="text-2xl font-black uppercase text-center mb-1">
            Team Login
          </h2>
          <p className="text-center text-[var(--color-text)] opacity-50 font-bold text-sm mb-6">
            Enter your team name to join the bidding war
          </p>

          <div className="space-y-4">
            <NeoInput
              label="Team Name"
              type="text"
              placeholder="Enter your team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
            />

            <NeoInput
              label="Passcode"
              type="password"
              placeholder="Enter passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
            />

            {error && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: "auto" }}
                className="text-[var(--color-danger)] font-bold text-sm bg-[var(--color-danger)]/20 p-2 border-2 border-[var(--color-danger)] flex items-center gap-2"
              >
                <ShieldAlert size={16} />
                {error}
              </motion.div>
            )}

            <NeoButton
              className="w-full text-xl"
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  ENTER AUCTION <ArrowRight size={20} className="ml-2" />
                </>
              )}
            </NeoButton>
          </div>
        </NeoCard>

        <div className="mt-8 text-center">
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-[var(--color-border)] font-bold uppercase text-xs ${isConnected ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`}
          >
            <span
              className={`w-3 h-3 border-2 border-[var(--color-border)] ${isConnected ? "bg-[var(--color-success)]" : "bg-[var(--color-danger)]"}`}
            />
            {isConnected ? "Server Online" : "Connecting..."}
          </div>
        </div>
      </motion.div>
    </NeoLayout>
  );
}
