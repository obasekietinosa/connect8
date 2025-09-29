import { useEffect, useMemo, useState } from "react";

interface TurnTimerProps {
  turnDeadline: number | null;
  isMyTurn: boolean;
  activePlayerName: string;
  totalSeconds: number;
  gameStarted: boolean;
  winner: string | null;
}

const containerStyle: React.CSSProperties = {
  position: "fixed",
  top: 16,
  right: 16,
  background: "#1a202c",
  color: "#fff",
  padding: "16px 20px",
  borderRadius: 16,
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.35)",
  zIndex: 1000,
  minWidth: 220,
  maxWidth: "calc(100% - 32px)",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: 1.6,
  opacity: 0.75,
  marginBottom: 8,
};

const progressTrackStyle: React.CSSProperties = {
  height: 6,
  background: "rgba(255, 255, 255, 0.2)",
  borderRadius: 999,
  overflow: "hidden",
  marginTop: 12,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const formatSeconds = (seconds: number) => seconds.toString().padStart(2, "0");

const TurnTimer = ({
  turnDeadline,
  isMyTurn,
  activePlayerName,
  totalSeconds,
  gameStarted,
  winner,
}: TurnTimerProps) => {
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!gameStarted || !turnDeadline) {
      setRemainingMs(0);
      return;
    }

    const updateRemaining = () => {
      setRemainingMs(Math.max(0, turnDeadline - Date.now()));
    };

    updateRemaining();
    const interval = window.setInterval(updateRemaining, 200);
    return () => window.clearInterval(interval);
  }, [gameStarted, turnDeadline]);

  const secondsLeft = useMemo(() => {
    if (!gameStarted || !turnDeadline) {
      return 0;
    }
    return Math.ceil(remainingMs / 1000);
  }, [gameStarted, remainingMs, turnDeadline]);

  const timeDisplay = gameStarted && turnDeadline ? formatSeconds(clamp(secondsLeft, 0, totalSeconds)) : "--";

  const accentColor = useMemo(() => {
    if (!gameStarted || !turnDeadline) {
      return "#63b3ed";
    }
    if (secondsLeft <= 5) {
      return "#fc8181";
    }
    return isMyTurn ? "#68d391" : "#f6ad55";
  }, [gameStarted, isMyTurn, secondsLeft, turnDeadline]);

  const progress = gameStarted && turnDeadline
    ? clamp(remainingMs / (totalSeconds * 1000), 0, 1)
    : 0;

  const statusText = useMemo(() => {
    if (winner) {
      return "Game over";
    }
    if (!gameStarted) {
      return "Waiting for play";
    }
    if (!turnDeadline) {
      return "Syncing timer";
    }
    if (isMyTurn) {
      return "Your turn";
    }
    const opponentName = activePlayerName?.trim();
    return opponentName ? `${opponentName}'s turn` : "Opponent's turn";
  }, [activePlayerName, gameStarted, isMyTurn, turnDeadline, winner]);

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>Turn timer</div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 36, fontWeight: 700, color: accentColor }}>{timeDisplay}</div>
        <div style={{ fontSize: 14, lineHeight: 1.4, textAlign: "right" }}>{statusText}</div>
      </div>
      <div style={progressTrackStyle}>
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: accentColor,
            borderRadius: 999,
            transition: "width 0.2s linear",
          }}
        />
      </div>
    </div>
  );
};

export default TurnTimer;
