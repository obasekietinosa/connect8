import { Server, Socket } from "socket.io";

import {
  confirmedPlayers,
  disconnectedPlayers,
  playerWords,
  revealedWords,
  rooms,
  socketToPlayer,
} from "../state";
import { emitRoomState } from "../utils/emitRoomState";

export const createDisconnectHandler = (io: Server, socket: Socket) => () => {
  const mapping = socketToPlayer[socket.id];

  if (!mapping) {
    console.log("User disconnected without mapping:", socket.id);
    return;
  }

  const { roomCode, playerId } = mapping;
  const playersInRoom = rooms[roomCode];

  if (!playersInRoom) {
    delete socketToPlayer[socket.id];
    return;
  }

  const playerIndex = playersInRoom.findIndex((p) => p.id === playerId);

  if (playerIndex === -1) {
    delete socketToPlayer[socket.id];
    return;
  }

  const player = playersInRoom[playerIndex];

  if (!disconnectedPlayers[roomCode]) {
    disconnectedPlayers[roomCode] = {};
  }

  disconnectedPlayers[roomCode][playerId] = {
    playerId,
    name: player.name,
    words: playerWords[roomCode]?.[playerId] || [],
    confirmed: confirmedPlayers[roomCode]?.has(playerId) ?? false,
    revealed: revealedWords[roomCode]?.[playerId] || [],
  };

  rooms[roomCode][playerIndex] = { ...player, connected: false };
  io.to(roomCode).emit("players_updated", rooms[roomCode]);
  emitRoomState(io, roomCode);

  delete socketToPlayer[socket.id];

  console.log("User disconnected:", socket.id);
};
