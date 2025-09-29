import { Server } from "socket.io";

import {
  clearTurnTimer,
  currentTurn,
  gameStatus,
  rooms,
  turnDeadlines,
  turnTimeouts,
  wrongGuesses,
} from "../state";
import { emitRoomState } from "./emitRoomState";

const TURN_DURATION_MS = 20_000;
const TIMEOUT_GUESS_LABEL = "⏱️ Timeout";

export const scheduleTurnTimer = (io: Server, roomCode: string, playerId: string) => {
  if (!gameStatus[roomCode]?.started) {
    clearTurnTimer(roomCode);
    return;
  }

  if (!playerId) {
    clearTurnTimer(roomCode);
    return;
  }

  clearTurnTimer(roomCode);

  const deadline = Date.now() + TURN_DURATION_MS;
  turnDeadlines[roomCode] = deadline;

  const timeout = setTimeout(() => {
    if (currentTurn[roomCode] !== playerId) {
      return;
    }

    const playersInRoom = rooms[roomCode] || [];
    const opponent = playersInRoom.find((player) => player.id !== playerId);
    if (!opponent) {
      clearTurnTimer(roomCode);
      return;
    }

    if (!gameStatus[roomCode]?.started) {
      clearTurnTimer(roomCode);
      return;
    }

    if (!wrongGuesses[roomCode]) {
      wrongGuesses[roomCode] = [];
    }

    wrongGuesses[roomCode].push({ playerId, guess: TIMEOUT_GUESS_LABEL });

    currentTurn[roomCode] = opponent.id;

    scheduleTurnTimer(io, roomCode, opponent.id);
    const nextDeadline = turnDeadlines[roomCode] ?? null;

    io.to(roomCode).emit("guess_result", {
      correct: false,
      guess: TIMEOUT_GUESS_LABEL,
      nextTurn: opponent.id,
      revealed: [],
      playerId,
      timeout: true,
      turnDeadline: nextDeadline,
    });

    emitRoomState(io, roomCode);
  }, TURN_DURATION_MS);

  turnTimeouts[roomCode] = timeout;
};

export const getTurnDurationMs = () => TURN_DURATION_MS;
