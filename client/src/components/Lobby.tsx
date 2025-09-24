import React from "react";
import { Player } from "../types";
import PlayerList from "./PlayerList";
import ShareRoom from "./ShareRoom";

interface LobbyProps {
  room: string;
  players: Player[];
  shareUrl: string;
  onShare: () => void;
  onStart: () => void;
  isHost: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ room, players, shareUrl, onShare, onStart, isHost }) => (
  <div style={{ padding: 32, maxWidth: 500, margin: "auto", textAlign: "center" }}>
    <h2>Lobby: {room}</h2>
    <ShareRoom room={room} shareUrl={shareUrl} onShare={onShare} />
    <h3>Players</h3>
    <PlayerList players={players} />
    {isHost && (
      <button onClick={onStart} style={{ marginTop: 24 }}>Start Game</button>
    )}
    <div style={{ marginTop: 16, fontSize: 12, color: "#888" }}>
      Waiting for players to join...
    </div>
  </div>
);

export default Lobby;
