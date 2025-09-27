import React, { useEffect, useMemo, useRef, useState } from "react";
import type { GameState } from "../types";

interface GameBoardProps {
  state: GameState;
  onGuess: (guess: string) => void;
  error: string;
  celebratory: boolean;
  myGuessedCount: number;
  opponentGuessedCount: number;
  myWrongGuesses: string[];
  opponentWrongGuesses: string[];
}

const boxStyle: React.CSSProperties = {
  width: 48,
  height: 56,
  border: "2px solid #444",
  borderRadius: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 28,
  fontWeight: 600,
  background: "#f8f8f8",
  color: "#222",
};

const inputStyle: React.CSSProperties = {
  ...boxStyle,
  background: "#fff",
  textTransform: "uppercase",
  outline: "none",
};

const GameBoard: React.FC<GameBoardProps> = ({
  state,
  onGuess,
  error,
  celebratory,
  myGuessedCount,
  opponentGuessedCount,
  myWrongGuesses,
  opponentWrongGuesses,
}) => {
  const currentWord = useMemo(
    () => state.opponentWordsLeft.find((entry) => !entry.revealed && entry.word.length > 0),
    [state.opponentWordsLeft],
  );

  const firstLetter = currentWord?.word?.[0] ?? "";
  const missingLettersCount = Math.max((currentWord?.word?.length ?? 0) - 1, 0);
  const [letters, setLetters] = useState<string[]>(() => Array(missingLettersCount).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setLetters(Array(missingLettersCount).fill(""));
    inputsRef.current = [];
  }, [missingLettersCount, currentWord?.word]);

  useEffect(() => {
    if (!state.isMyTurn || celebratory || letters.length === 0) return;
    const firstEmpty = letters.findIndex((letter) => letter === "");
    const targetIndex = firstEmpty === -1 ? letters.length - 1 : firstEmpty;
    if (targetIndex >= 0) {
      const input = inputsRef.current[targetIndex];
      input?.focus();
      input?.select();
    }
  }, [letters, state.isMyTurn, celebratory]);

  const handleLetterChange = (index: number, value: string) => {
    const trimmed = value.slice(-1);
    const sanitized = trimmed.replace(/[^a-zA-Z]/g, "").toUpperCase();
    setLetters((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
    if (sanitized && index < letters.length - 1) {
      const nextInput = inputsRef.current[index + 1];
      nextInput?.focus();
      nextInput?.select();
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && letters[index] === "" && index > 0) {
      event.preventDefault();
      const prevInput = inputsRef.current[index - 1];
      prevInput?.focus();
      prevInput?.select();
      return;
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputsRef.current[index - 1]?.focus();
      inputsRef.current[index - 1]?.select();
    }
    if (event.key === "ArrowRight" && index < letters.length - 1) {
      event.preventDefault();
      inputsRef.current[index + 1]?.focus();
      inputsRef.current[index + 1]?.select();
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!state.isMyTurn || celebratory || !currentWord) return;
    const guess = `${firstLetter}${letters.join("")}`;
    if (!guess.trim()) return;
    onGuess(guess);
  };

  const canSubmit =
    state.isMyTurn &&
    !celebratory &&
    !!currentWord &&
    (letters.length === 0 || letters.every((letter) => letter.length === 1));

  const guessableTotal = Math.max(state.opponentWordsLeft.length - 1, 1);
  const defendTotal = Math.max(state.myWordsLeft.length - 1, 1);

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
      <h2 style={{ marginBottom: 24 }}>8Words Game</h2>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 32,
          marginBottom: 24,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 14, color: "#555", textTransform: "uppercase", letterSpacing: 1.4 }}>
            Your correct guesses
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#2f855a" }}>
            {myGuessedCount}/{guessableTotal}
          </div>
        </div>
        <div style={{ minWidth: 160 }}>
          <div style={{ fontSize: 14, color: "#555", textTransform: "uppercase", letterSpacing: 1.4 }}>
            Opponent's correct guesses
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#c53030" }}>
            {opponentGuessedCount}/{defendTotal}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginBottom: 24 }}>
        <details style={{ textAlign: "left", minWidth: 220 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Your wrong guesses ({myWrongGuesses.length})
          </summary>
          {myWrongGuesses.length ? (
            <ul style={{ marginTop: 8 }}>
              {myWrongGuesses.map((guess, idx) => (
                <li key={`${guess}-${idx}`}>{guess}</li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: 8, color: "#666" }}>No misses yet.</p>
          )}
        </details>
        <details style={{ textAlign: "left", minWidth: 220 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>
            Opponent's wrong guesses ({opponentWrongGuesses.length})
          </summary>
          {opponentWrongGuesses.length ? (
            <ul style={{ marginTop: 8 }}>
              {opponentWrongGuesses.map((guess, idx) => (
                <li key={`${guess}-${idx}`}>{guess}</li>
              ))}
            </ul>
          ) : (
            <p style={{ marginTop: 8, color: "#666" }}>No misses yet.</p>
          )}
        </details>
      </div>

      <div
        style={{
          minHeight: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 24,
        }}
      >
        {celebratory ? (
          <div style={{ fontSize: 96, color: "#38a169" }}>✓</div>
        ) : currentWord ? (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 18, color: "#555" }}>Current word</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <div style={boxStyle}>{firstLetter.toUpperCase()}</div>
              {letters.map((letter, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputsRef.current[idx] = el;
                  }}
                  type="text"
                  inputMode="text"
                  maxLength={1}
                  value={letter}
                  onChange={(event) => handleLetterChange(idx, event.target.value)}
                  onKeyDown={(event) => handleKeyDown(idx, event)}
                  disabled={!state.isMyTurn}
                  style={inputStyle}
                />
              ))}
            </div>
            <button type="submit" disabled={!canSubmit} style={{ padding: "12px 24px", fontSize: 16 }}>
              Submit guess
            </button>
          </form>
        ) : (
          <div style={{ fontSize: 20, color: "#555" }}>All opponent words have been revealed!</div>
        )}
      </div>

      {error && <div style={{ color: "#c53030", marginBottom: 16 }}>{error}</div>}
      {!state.isMyTurn && !celebratory && (
        <div style={{ color: "#666" }}>Waiting for opponent's turn...</div>
      )}
    </div>
  );
};

export default GameBoard;
