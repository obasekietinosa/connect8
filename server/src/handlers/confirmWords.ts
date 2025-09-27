import { Server, Socket } from "socket.io";

import {
  confirmedPlayers,
  currentTurn,
  ensureRoomState,
  gameStatus,
  playerWords,
  rooms,
} from "../state";
import { emitRoomState } from "../utils/emitRoomState";

type ConfirmWordsPayload = {
  roomCode: string;
  words: string[];
};

export const createConfirmWordsHandler = (io: Server, socket: Socket) =>
  ({ roomCode, words }: ConfirmWordsPayload) => {
    ensureRoomState(roomCode);

    playerWords[roomCode][socket.id] = words;
    confirmedPlayers[roomCode].add(socket.id);

    io.to(roomCode).emit("player_confirmed", socket.id);
    emitRoomState(io, roomCode);

    const playersInRoom = rooms[roomCode] || [];

    if (confirmedPlayers[roomCode].size === 2 && playersInRoom.length === 2) {
      const playersWithWords = playersInRoom.map((player) => ({
        id: player.id,
        name: player.name,
        words: playerWords[roomCode][player.id] || [],
      }));

      const firstTurn =
        playersWithWords[Math.floor(Math.random() * playersWithWords.length)].id;

      currentTurn[roomCode] = firstTurn;
      gameStatus[roomCode] = { started: true, winner: null, finalWords: [] };

      io.to(roomCode).emit("start_game", {
        players: playersWithWords,
        firstTurn,
      });

      emitRoomState(io, roomCode);
    }
  };
