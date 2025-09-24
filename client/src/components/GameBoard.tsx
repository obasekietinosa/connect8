import React from "react";
import type { GameState } from "../types";

interface GameBoardProps {
  state: GameState;
  onGuess: (guess: string) => void;
  guessValue: string;
  setGuessValue: (v: string) => void;
  error: string;
  celebratory: boolean;
}

const GameBoard: React.FC<GameBoardProps> = ({ state, onGuess, guessValue, setGuessValue, error, celebratory }) => (
  <div style={{ padding: 32, maxWidth: 600, margin: "auto", textAlign: "center" }}>
    <h2>8Words Game</h2>
    <div style={{ margin: 16 }}>
      <b>Your words left:</b> {state.myWordsLeft.join(", ")}
    </div>
    <div style={{ margin: 16 }}>
      <b>Opponent's words left:</b> {state.opponentWordsLeft.map((w) => {
        if (w.revealed) return w.word;
        // Show first letter + underscores for unrevealed words
        if (w.word.length === 0) return "";
        return w.word[0] + w.word.slice(1).replace(/./g, "_");
      }).join(", ")}
    </div>
    <form onSubmit={e => { e.preventDefault(); onGuess(guessValue); }}>
      <input
        value={guessValue}
        onChange={e => setGuessValue(e.target.value)}
        placeholder="Guess a word"
        style={{ marginRight: 8 }}
        disabled={!state.isMyTurn}
      />
      <button type="submit" disabled={!state.isMyTurn || !guessValue}>Guess</button>
    </form>
    {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
    {celebratory && <div style={{ color: "green", marginTop: 8 }}>🎉 Correct!</div>}
    {!state.isMyTurn && <div style={{ marginTop: 16, color: "#888" }}>Waiting for opponent's turn...</div>}
  </div>
);

export default GameBoard;
