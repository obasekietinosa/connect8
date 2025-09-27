import { Server, Socket } from "socket.io";

import {
  confirmedPlayers,
  currentTurn,
  disconnectedPlayers,
  ensureRoomState,
  playerWords,
  revealedWords,
  rooms,
} from "../state";
import { emitRoomState } from "../utils/emitRoomState";
import { Player } from "../types";

type JoinRoomPayload = {
  roomCode: string;
  playerName: string;
  previousSocketId?: string;
};

const restoreDisconnectedPlayer = (
  roomCode: string,
  previousSocketId: string,
  socket: Socket
) => {
  const snapshot = disconnectedPlayers[roomCode]?.[previousSocketId];

  if (!snapshot) {
    return false;
  }

  const playerIndex = rooms[roomCode].findIndex((p) => p.id === previousSocketId);

  if (playerIndex !== -1) {
    rooms[roomCode][playerIndex] = {
      id: socket.id,
      name: snapshot.name,
      connected: true,
    };
  } else {
    rooms[roomCode].push({
      id: socket.id,
      name: snapshot.name,
      connected: true,
    });
  }

  playerWords[roomCode][socket.id] = snapshot.words;

  if (snapshot.confirmed) {
    confirmedPlayers[roomCode].add(socket.id);
  }

  revealedWords[roomCode][socket.id] = snapshot.revealed;

  if (currentTurn[roomCode] === previousSocketId) {
    currentTurn[roomCode] = socket.id;
  }

  delete playerWords[roomCode][previousSocketId];
  delete revealedWords[roomCode][previousSocketId];
  confirmedPlayers[roomCode].delete(previousSocketId);
  delete disconnectedPlayers[roomCode][previousSocketId];

  return true;
};

export const createJoinRoomHandler = (io: Server, socket: Socket) =>
  ({ roomCode, playerName, previousSocketId }: JoinRoomPayload) => {
    ensureRoomState(roomCode);

    const restored = previousSocketId
      ? restoreDisconnectedPlayer(roomCode, previousSocketId, socket)
      : false;

    if (!restored) {
      const playersInRoom = rooms[roomCode];
      const newPlayer: Player = { id: socket.id, name: playerName, connected: true };
      playersInRoom.push(newPlayer);
    }

    socket.join(roomCode);
    io.to(roomCode).emit("players_updated", rooms[roomCode]);
    emitRoomState(io, roomCode);
  };
