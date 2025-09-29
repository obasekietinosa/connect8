import { Server } from "socket.io";

import {
  clearTurnTimer,
  currentTurn,
  gameStatus,
  playerWords,
  revealedWords,
  rooms,
  turnDeadlines,
  wrongGuesses,
} from "../state";
import { emitRoomState } from "../utils/emitRoomState";
import { scheduleTurnTimer } from "../utils/turnTimer";

type MakeGuessPayload = {
  roomCode: string;
  playerId: string;
  guess: string;
  viewOpponent: boolean;
};

export const createMakeGuessHandler = (io: Server) =>
  ({ roomCode, playerId, guess }: MakeGuessPayload) => {
    if (!playerWords[roomCode] || !rooms[roomCode]) return;

    const opponentId = rooms[roomCode].find((p) => p.id !== playerId)?.id;
    if (!opponentId) return;

    if (!revealedWords[roomCode]) revealedWords[roomCode] = {};
    if (!revealedWords[roomCode][opponentId]) {
      revealedWords[roomCode][opponentId] = [];
    }
    if (!wrongGuesses[roomCode]) wrongGuesses[roomCode] = [];

    const wordsToGuess = playerWords[roomCode][opponentId] || [];

    let correct = false;
    let index = -1;
    for (let i = 0; i < wordsToGuess.length; i++) {
      const alreadyRevealed = revealedWords[roomCode][opponentId].includes(i);
      if (alreadyRevealed) continue;

      if (wordsToGuess[i].toLowerCase() === guess.trim().toLowerCase()) {
        correct = true;
        index = i;
        break;
      }
    }

    let nextTurn = opponentId;

    if (correct && index !== -1) {
      revealedWords[roomCode][opponentId].push(index);

      const revealedNonFirst = revealedWords[roomCode][opponentId].filter((i) => i !== 0);

      if (revealedNonFirst.length === 7) {
        clearTurnTimer(roomCode);
        gameStatus[roomCode] = {
          started: false,
          winner: playerId,
          finalWords: [
            { id: playerId, words: playerWords[roomCode][playerId] || [] },
            { id: opponentId, words: playerWords[roomCode][opponentId] || [] },
          ],
        };

        emitRoomState(io, roomCode);

        io.to(roomCode).emit("game_end", {
          winner: playerId,
          players: [
            { id: playerId, words: playerWords[roomCode][playerId] },
            { id: opponentId, words: playerWords[roomCode][opponentId] },
          ],
        });
        return;
      }

      nextTurn = playerId;
    } else {
      wrongGuesses[roomCode].push({ guess, playerId });
      nextTurn = opponentId;
    }

    currentTurn[roomCode] = nextTurn;

    scheduleTurnTimer(io, roomCode, nextTurn);
    const nextDeadline = turnDeadlines[roomCode] ?? null;

    io.to(roomCode).emit("guess_result", {
      correct,
      index: correct ? index : undefined,
      guess,
      nextTurn,
      revealed: correct ? [index] : [],
      playerId,
      turnDeadline: nextDeadline,
    });

    emitRoomState(io, roomCode);
  };
