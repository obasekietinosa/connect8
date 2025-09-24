import React from "react";
import { Player } from "../types";

interface PlayerListProps {
  players: Player[];
}

const PlayerList: React.FC<PlayerListProps> = ({ players }) => (
  <ul>
    {players.map((p) => (
      <li key={p.id}>{p.name}</li>
    ))}
  </ul>
);

export default PlayerList;
