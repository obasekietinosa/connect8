import React from "react";

interface LandingProps {
  onStart: () => void;
  onJoin: () => void;
}

const Landing: React.FC<LandingProps> = ({ onStart, onJoin }) => (
  <div style={{ padding: 32, maxWidth: 500, margin: "auto", textAlign: "center" }}>
    <img src="/logo.png" alt="8Words Logo" style={{ width: 80, marginBottom: 16 }} />
    <h1>Welcome to 8Words</h1>
    <p>
      8Words is a real-time, two-player word guessing game. Enter 8 connected words, take turns guessing, and race to reveal your opponent's sequence!
    </p>
    <div style={{ margin: 24 }}>
      <button onClick={onStart} style={{ marginRight: 16 }}>Start a New Game</button>
      <button onClick={onJoin}>Join a Game</button>
    </div>
  </div>
);

export default Landing;
