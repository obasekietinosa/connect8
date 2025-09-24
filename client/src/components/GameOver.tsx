import React from "react";

interface GameOverProps {
  winner: string;
  myWords: string[];
  opponentWords: string[];
  onRestart: () => void;
}

const GameOver: React.FC<GameOverProps> = ({ winner, myWords, opponentWords, onRestart }) => (
  <div style={{ padding: 32, maxWidth: 500, margin: "auto", textAlign: "center" }}>
    <h2>Game Over</h2>
    <div style={{ margin: 16 }}>
      <b>Winner:</b> {winner}
    </div>
    <div style={{ margin: 16 }}>
      <b>Your words:</b> {myWords.join(", ")}
    </div>
    <div style={{ margin: 16 }}>
      <b>Opponent's words:</b> {opponentWords.join(", ")}
    </div>
    <button onClick={onRestart} style={{ marginTop: 24 }}>Play Again</button>
  </div>
);

export default GameOver;
