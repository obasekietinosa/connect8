import { Server, Socket } from "socket.io";

import {
  confirmedPlayers,
  disconnectedPlayers,
  playerWords,
  revealedWords,
  rooms,
} from "../state";
import { emitRoomState } from "../utils/emitRoomState";

export const createDisconnectHandler = (io: Server, socket: Socket) => () => {
  for (const roomCode in rooms) {
    const playerIndex = rooms[roomCode].findIndex((p) => p.id === socket.id);
    if (playerIndex === -1) continue;

    const player = rooms[roomCode][playerIndex];

    if (!disconnectedPlayers[roomCode]) {
      disconnectedPlayers[roomCode] = {};
    }

    disconnectedPlayers[roomCode][socket.id] = {
      name: player.name,
      words: playerWords[roomCode]?.[socket.id] || [],
      confirmed: confirmedPlayers[roomCode]?.has(socket.id) ?? false,
      revealed: revealedWords[roomCode]?.[socket.id] || [],
    };

    rooms[roomCode][playerIndex] = { ...player, connected: false };
    io.to(roomCode).emit("players_updated", rooms[roomCode]);
    emitRoomState(io, roomCode);
  }

  console.log("User disconnected:", socket.id);
};
