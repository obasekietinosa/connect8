import { Server } from "socket.io";

import {
  confirmedPlayers,
  currentTurn,
  gameStatus,
  playerWords,
  revealedWords,
  rooms,
  wrongGuesses,
} from "../state";

export const emitRoomState = (io: Server, roomCode: string) => {
  const playersInRoom = rooms[roomCode] || [];
  const confirmed = Array.from(confirmedPlayers[roomCode] || []);
  const words = playerWords[roomCode] || {};
  const revealed = revealedWords[roomCode] || {};
  const wrong = wrongGuesses[roomCode] || [];
  const status = gameStatus[roomCode] || {
    started: false,
    winner: null,
    finalWords: [],
  };

  io.to(roomCode).emit("room_state", {
    players: playersInRoom,
    confirmedPlayers: confirmed,
    gameStarted: status.started,
    currentTurn: currentTurn[roomCode] || "",
    playerWords: words,
    revealedWords: revealed,
    wrongGuesses: wrong,
    winner: status.winner,
    finalWords: status.finalWords,
  });
};
