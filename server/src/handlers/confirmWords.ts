import { Server, Socket } from "socket.io";

import {
  confirmedPlayers,
  currentTurn,
  ensureRoomState,
  gameStatus,
  playerWords,
  revealedWords,
  rooms,
  socketToPlayer,
  turnDeadlines,
} from "../state";
import { emitRoomState } from "../utils/emitRoomState";
import { scheduleTurnTimer } from "../utils/turnTimer";

type ConfirmWordsPayload = {
  roomCode: string;
  words: string[];
};

export const createConfirmWordsHandler = (io: Server, socket: Socket) =>
  ({ roomCode, words }: ConfirmWordsPayload) => {
    ensureRoomState(roomCode);

    const mapping = socketToPlayer[socket.id];

    if (!mapping || mapping.roomCode !== roomCode) {
      return;
    }

    const { playerId } = mapping;

    playerWords[roomCode][playerId] = words;
    confirmedPlayers[roomCode].add(playerId);

    io.to(roomCode).emit("player_confirmed", playerId);
    emitRoomState(io, roomCode);

    const playersInRoom = rooms[roomCode] || [];

    if (confirmedPlayers[roomCode].size === 2 && playersInRoom.length === 2) {
      const playersWithWords = playersInRoom.map((player) => ({
        id: player.id,
        name: player.name,
        words: playerWords[roomCode][player.id] || [],
        socketId: player.socketId,
        connected: player.connected,
      }));

      if (!revealedWords[roomCode]) {
        revealedWords[roomCode] = {};
      }

      playersWithWords.forEach(({ id, words }) => {
        if (!revealedWords[roomCode][id]) {
          revealedWords[roomCode][id] = [];
        }
        const firstWord = words[0]?.trim();
        if (firstWord && !revealedWords[roomCode][id].includes(0)) {
          revealedWords[roomCode][id].push(0);
        }
      });

      const firstTurn =
        playersWithWords[Math.floor(Math.random() * playersWithWords.length)].id;

      currentTurn[roomCode] = firstTurn;
      gameStatus[roomCode] = { started: true, winner: null, finalWords: [] };

      scheduleTurnTimer(io, roomCode, firstTurn);

      io.to(roomCode).emit("start_game", {
        players: playersWithWords,
        firstTurn,
        turnDeadline: turnDeadlines[roomCode] ?? null,
      });

      emitRoomState(io, roomCode);
    }
  };
