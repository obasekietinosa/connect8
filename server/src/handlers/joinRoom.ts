import { Server, Socket } from "socket.io";

import {
  confirmedPlayers,
  disconnectedPlayers,
  ensureRoomState,
  playerWords,
  revealedWords,
  rooms,
  socketToPlayer,
} from "../state";
import { emitRoomState } from "../utils/emitRoomState";
import { Player } from "../types";

type JoinRoomPayload = {
  roomCode: string;
  playerName: string;
  previousSocketId?: string;
  playerId?: string;
};
const ensurePlayerContainers = (roomCode: string, playerId: string) => {
  if (!playerWords[roomCode][playerId]) {
    playerWords[roomCode][playerId] = [];
  }
  if (!revealedWords[roomCode][playerId]) {
    revealedWords[roomCode][playerId] = [];
  }
};

const getExistingPlayer = (
  roomCode: string,
  {
    playerId,
    playerName,
    previousSocketId,
  }: { playerId?: string; playerName: string; previousSocketId?: string }
) => {
  const playersInRoom = rooms[roomCode];

  if (playerId) {
    const byId = playersInRoom.find((player) => player.id === playerId);
    if (byId) {
      return byId;
    }
  }

  if (previousSocketId) {
    const bySocket = playersInRoom.find((player) => player.socketId === previousSocketId);
    if (bySocket) {
      return bySocket;
    }
  }

  const byName = playersInRoom.find(
    (player) => player.name.toLowerCase() === playerName.toLowerCase()
  );

  return byName;
};

export const createJoinRoomHandler = (io: Server, socket: Socket) =>
  ({ roomCode, playerName, previousSocketId, playerId }: JoinRoomPayload) => {
    ensureRoomState(roomCode);

    const playersInRoom = rooms[roomCode];
    const existingPlayer = getExistingPlayer(roomCode, {
      playerId,
      playerName,
      previousSocketId,
    });

    const effectivePlayerId = existingPlayer?.id || playerId || socket.id;
    const snapshotForId =
      !existingPlayer && playerId
        ? disconnectedPlayers[roomCode]?.[playerId]
        : undefined;

    if (existingPlayer) {
      existingPlayer.name = playerName;
      existingPlayer.connected = true;
      existingPlayer.socketId = socket.id;

      const snapshot = disconnectedPlayers[roomCode]?.[existingPlayer.id];
      if (snapshot) {
        playerWords[roomCode][existingPlayer.id] = snapshot.words;
        revealedWords[roomCode][existingPlayer.id] = snapshot.revealed;
        if (snapshot.confirmed) {
          confirmedPlayers[roomCode].add(existingPlayer.id);
        } else {
          confirmedPlayers[roomCode].delete(existingPlayer.id);
        }
        delete disconnectedPlayers[roomCode][existingPlayer.id];
      }

      ensurePlayerContainers(roomCode, existingPlayer.id);

      if (previousSocketId && previousSocketId !== socket.id) {
        delete socketToPlayer[previousSocketId];
      }
    } else if (snapshotForId) {
      const revivedPlayer: Player = {
        id: playerId!,
        name: snapshotForId.name ?? playerName,
        connected: true,
        socketId: socket.id,
      };
      playersInRoom.push(revivedPlayer);
      playerWords[roomCode][playerId!] = snapshotForId.words;
      revealedWords[roomCode][playerId!] = snapshotForId.revealed;
      if (snapshotForId.confirmed) {
        confirmedPlayers[roomCode].add(playerId!);
      } else {
        confirmedPlayers[roomCode].delete(playerId!);
      }
      delete disconnectedPlayers[roomCode][playerId!];
      ensurePlayerContainers(roomCode, playerId!);
    } else {
      if (playersInRoom.length >= 2) {
        socket.emit("room_full");
        return;
      }

      const newPlayer: Player = {
        id: effectivePlayerId,
        name: playerName,
        connected: true,
        socketId: socket.id,
      };
      playersInRoom.push(newPlayer);
      ensurePlayerContainers(roomCode, effectivePlayerId);
      confirmedPlayers[roomCode].delete(effectivePlayerId);
    }

    socketToPlayer[socket.id] = { roomCode, playerId: effectivePlayerId };
    for (const [sockId, mapping] of Object.entries(socketToPlayer)) {
      if (sockId !== socket.id && mapping.playerId === effectivePlayerId) {
        delete socketToPlayer[sockId];
      }
    }

    socket.join(roomCode);
    io.to(roomCode).emit("players_updated", rooms[roomCode]);
    emitRoomState(io, roomCode);
  };
