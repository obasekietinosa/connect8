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
  boxSizing: "border-box",
};

const inputStyle: React.CSSProperties = {
  ...boxStyle,
  background: "#fff",
  textTransform: "uppercase",
  outline: "none",
};

const getInputStateStyles = (enabled: boolean): React.CSSProperties =>
  enabled
    ? {
        background: "#fff",
        borderColor: "#444",
        color: "#222",
        cursor: "text",
      }
    : {
        background: "#edf2f7",
        borderColor: "#cbd5e0",
        color: "#718096",
        cursor: "not-allowed",
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

  const revealedWords = useMemo(
    () => state.opponentWordsLeft.filter((entry) => entry.revealed && entry.word.length > 0),
    [state.opponentWordsLeft],
  );

  const upcomingWords = useMemo(
    () => state.opponentWordsLeft.filter((entry) => !entry.revealed && entry.word.length > 0),
    [state.opponentWordsLeft],
  );

  const upcomingAfterCurrent = useMemo(
    () => (upcomingWords.length > 1 ? upcomingWords.slice(1) : []),
    [upcomingWords],
  );

  const firstLetter = currentWord?.word?.[0] ?? "";
  const currentWordText = currentWord?.word ?? "";

  const tailCharacters = useMemo(() => currentWordText.slice(1).split(""), [currentWordText]);

  const characterIndexToLetterIndex = useMemo(() => {
    const map: Record<number, number> = {};
    let letterIndex = 0;
    tailCharacters.forEach((char, idx) => {
      if (char !== " ") {
        map[idx] = letterIndex;
        letterIndex += 1;
      }
    });
    return map;
  }, [tailCharacters]);

  const missingLettersCount = useMemo(() => Object.keys(characterIndexToLetterIndex).length, [
    characterIndexToLetterIndex,
  ]);

  const [letters, setLetters] = useState<string[]>(() => Array(missingLettersCount).fill(""));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setLetters(Array(missingLettersCount).fill(""));
    inputsRef.current = [];
  }, [missingLettersCount, currentWordText]);

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
    const tailGuess = tailCharacters
      .map((char, idx) => (char === " " ? " " : letters[characterIndexToLetterIndex[idx]] ?? ""))
      .join("");
    const guess = `${firstLetter}${tailGuess}`;
    if (!guess.trim()) return;
    onGuess(guess);
  };

  const canSubmit =
    state.isMyTurn &&
    !celebratory &&
    !!currentWord &&
    (letters.length === 0 || letters.every((letter) => letter.length === 1));

  const renderWordSkeleton = (word: string) => (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
      {word.split("").map((char, idx) => (
        <div
          key={`${word}-${idx}`}
          style={{
            ...boxStyle,
            background: idx === 0 ? "#fff" : "#f8f8f8",
            borderColor: "#cbd5e0",
            color: idx === 0 ? "#2d3748" : "#cbd5e0",
          }}
        >
          {idx === 0 ? char.toUpperCase() : ""}
        </div>
      ))}
    </div>
  );

  const renderCompletedWord = (word: string) => (
    <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
      {word.split("").map((char, idx) => (
        <div
          key={`${word}-revealed-${idx}`}
          style={{
            ...boxStyle,
            background: "#f0fff4",
            borderColor: "#38a169",
            color: "#22543d",
          }}
        >
          {char.toUpperCase()}
        </div>
      ))}
    </div>
  );

  const guessableTotal = Math.max(state.opponentWordsLeft.length - 1, 1);
  const defendTotal = Math.max(state.myWordsLeft.length - 1, 1);

  const isWaiting = !state.isMyTurn && !celebratory;

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

      {revealedWords.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#2f855a",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              marginBottom: 12,
            }}
          >
            Completed words
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {revealedWords.map((entry, idx) => (
              <div key={`${entry.word}-completed-${idx}`}>{renderCompletedWord(entry.word)}</div>
            ))}
          </div>
        </div>
      )}

      {upcomingAfterCurrent.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: "#2c5282",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              marginBottom: 12,
            }}
          >
            Coming up next
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {upcomingAfterCurrent.map((entry, idx) => (
              <div key={`${entry.word}-upcoming-${idx}`}>{renderWordSkeleton(entry.word)}</div>
            ))}
          </div>
        </div>
      )}

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
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              padding: 24,
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              background: isWaiting ? "#f7fafc" : "#fff",
              boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
              opacity: isWaiting ? 0.7 : 1,
            }}
          >
            <div style={{ fontSize: 18, color: "#2d3748", fontWeight: 600 }}>Current word</div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <div
                style={{
                  ...boxStyle,
                  ...(isWaiting
                    ? { background: "#edf2f7", borderColor: "#cbd5e0", color: "#4a5568" }
                    : {}),
                }}
              >
                {firstLetter.toUpperCase()}
              </div>
              {tailCharacters.map((char, idx) => {
                if (char === " ") {
                  return <div key={`space-${idx}`} style={{ width: 24 }} />;
                }

                const letterIndex = characterIndexToLetterIndex[idx];
                const letterValue = letters[letterIndex] ?? "";

                return (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputsRef.current[letterIndex] = el;
                    }}
                    type="text"
                    inputMode="text"
                    maxLength={1}
                    value={letterValue}
                    onChange={(event) => handleLetterChange(letterIndex, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(letterIndex, event)}
                    disabled={!state.isMyTurn}
                    style={{
                      ...inputStyle,
                      ...getInputStateStyles(state.isMyTurn),
                    }}
                  />
                );
              })}
            </div>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                padding: "12px 24px",
                fontSize: 16,
                borderRadius: 999,
                border: "none",
                background: canSubmit ? "#3182ce" : "#a0aec0",
                color: "white",
                cursor: canSubmit ? "pointer" : "not-allowed",
                transition: "background 0.2s ease",
              }}
            >
              Submit guess
            </button>
          </form>
        ) : (
          <div style={{ fontSize: 20, color: "#555" }}>All opponent words have been revealed!</div>
        )}
      </div>

      {error && <div style={{ color: "#c53030", marginBottom: 16 }}>{error}</div>}
      {isWaiting && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            borderRadius: 999,
            background: "#ebf8ff",
            color: "#2b6cb0",
            fontWeight: 600,
          }}
        >
          <span role="img" aria-hidden="true">
            ⏳
          </span>
          Waiting for opponent's turn
        </div>
      )}
    </div>
  );
};

export default GameBoard;
