import { Server, Socket } from "socket.io";

import {
  confirmedPlayers,
  currentTurn,
  disconnectedPlayers,
  ensureRoomState,
  playerWords,
  revealedWords,
  rooms,
  wrongGuesses,
} from "../state";
import { emitRoomState } from "../utils/emitRoomState";
import { DisconnectedPlayerSnapshot, Player } from "../types";

const migratePlayerState = (
  roomCode: string,
  previousSocketId: string,
  socket: Socket,
  playerName: string,
  snapshot?: DisconnectedPlayerSnapshot
) => {
  const playersInRoom = rooms[roomCode];
  const playerIndex = playersInRoom.findIndex((p) => p.id === previousSocketId);
  const updatedPlayer: Player = {
    id: socket.id,
    name: snapshot?.name ?? playerName,
    connected: true,
  };

  if (playerIndex !== -1) {
    playersInRoom[playerIndex] = updatedPlayer;
  } else {
    playersInRoom.push(updatedPlayer);
  }

  const previousWords = snapshot?.words ?? playerWords[roomCode][previousSocketId] ?? [];
  playerWords[roomCode][socket.id] = previousWords;

  const previousRevealed =
    snapshot?.revealed ?? revealedWords[roomCode][previousSocketId] ?? [];
  revealedWords[roomCode][socket.id] = previousRevealed;

  const wasConfirmed = snapshot?.confirmed ?? confirmedPlayers[roomCode].has(previousSocketId);
  if (wasConfirmed) {
    confirmedPlayers[roomCode].add(socket.id);
  } else {
    confirmedPlayers[roomCode].delete(socket.id);
  }

  if (wrongGuesses[roomCode]) {
    wrongGuesses[roomCode] = wrongGuesses[roomCode].map((entry) =>
      entry.playerId === previousSocketId ? { ...entry, playerId: socket.id } : entry
    );
  }

  if (currentTurn[roomCode] === previousSocketId) {
    currentTurn[roomCode] = socket.id;
  }

  if (previousSocketId !== socket.id) {
    delete playerWords[roomCode][previousSocketId];
    delete revealedWords[roomCode][previousSocketId];
    confirmedPlayers[roomCode].delete(previousSocketId);
    if (disconnectedPlayers[roomCode]) {
      delete disconnectedPlayers[roomCode][previousSocketId];
    }
  }
};

const reviveExistingPlayer = (roomCode: string, playerName: string, socket: Socket) => {
  const playersInRoom = rooms[roomCode];
  const existingPlayerIndex = playersInRoom.findIndex(
    (player) => player.name.toLowerCase() === playerName.toLowerCase()
  );

  if (existingPlayerIndex === -1) {
    return false;
  }

  const previousSocketId = playersInRoom[existingPlayerIndex].id;
  migratePlayerState(roomCode, previousSocketId, socket, playerName);
  return true;
};

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

  migratePlayerState(roomCode, previousSocketId, socket, snapshot.name, snapshot);

  return true;
};

export const createJoinRoomHandler = (io: Server, socket: Socket) =>
  ({ roomCode, playerName, previousSocketId }: JoinRoomPayload) => {
    ensureRoomState(roomCode);

    const restored = previousSocketId
      ? restoreDisconnectedPlayer(roomCode, previousSocketId, socket)
      : false;

    const revived = restored ? false : reviveExistingPlayer(roomCode, playerName, socket);

    if (!restored && !revived) {
      const playersInRoom = rooms[roomCode];

      if (playersInRoom.length >= 2) {
        socket.emit("room_full");
        return;
      }

      const newPlayer: Player = { id: socket.id, name: playerName, connected: true };
      playersInRoom.push(newPlayer);
    }

    socket.join(roomCode);
    io.to(roomCode).emit("players_updated", rooms[roomCode]);
    emitRoomState(io, roomCode);
  };
