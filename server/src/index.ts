import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

type Player = { id: string; name: string; connected: boolean };
type Room = Record<string, Player[]>;

const rooms: Room = {};

// Store each player's words per room: playerWords[roomCode][playerId] = string[]
const playerWords: Record<string, Record<string, string[]>> = {};
// Track confirmed players per room
const confirmedPlayers: Record<string, Set<string>> = {};
// Track revealed words and wrong guesses per room
const revealedWords: Record<string, Record<string, number[]>> = {};
const wrongGuesses: Record<string, { playerId: string; guess: string }[]> = {};
const currentTurn: Record<string, string> = {};
const gameStatus: Record<
  string,
  { started: boolean; winner: string | null; finalWords: { id: string; words: string[] }[] }
> = {};
const disconnectedPlayers: Record<
  string,
  Record<string, { name: string; words: string[]; confirmed: boolean; revealed: number[] }>
> = {};

const emitRoomState = (roomCode: string) => {
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

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on(
    "join_room",
    ({
      roomCode,
      playerName,
      previousSocketId,
    }: {
      roomCode: string;
      playerName: string;
      previousSocketId?: string;
    }) => {
      if (!rooms[roomCode]) rooms[roomCode] = [];
      if (!playerWords[roomCode]) playerWords[roomCode] = {};
      if (!confirmedPlayers[roomCode]) confirmedPlayers[roomCode] = new Set();
      if (!revealedWords[roomCode]) revealedWords[roomCode] = {};
      if (!wrongGuesses[roomCode]) wrongGuesses[roomCode] = [];
      if (!gameStatus[roomCode]) {
        gameStatus[roomCode] = { started: false, winner: null, finalWords: [] };
      }

      let restored = false;
      if (previousSocketId) {
        const snapshot = disconnectedPlayers[roomCode]?.[previousSocketId];
        if (snapshot) {
          const playerIndex = rooms[roomCode].findIndex(
            (p) => p.id === previousSocketId
          );
          if (playerIndex !== -1) {
            rooms[roomCode][playerIndex] = {
              id: socket.id,
              name: snapshot.name,
              connected: true,
            };
          } else {
            rooms[roomCode].push({ id: socket.id, name: snapshot.name, connected: true });
          }
          playerWords[roomCode][socket.id] = snapshot.words;
          if (confirmedPlayers[roomCode] && snapshot.confirmed) {
            confirmedPlayers[roomCode].add(socket.id);
          }
          revealedWords[roomCode][socket.id] = snapshot.revealed;
          if (currentTurn[roomCode] === previousSocketId) {
            currentTurn[roomCode] = socket.id;
          }
          delete playerWords[roomCode][previousSocketId];
          delete revealedWords[roomCode][previousSocketId];
          if (confirmedPlayers[roomCode]) {
            confirmedPlayers[roomCode].delete(previousSocketId);
          }
          if (disconnectedPlayers[roomCode]) {
            delete disconnectedPlayers[roomCode][previousSocketId];
          }
          restored = true;
        }
      }

      if (!restored) {
        rooms[roomCode].push({ id: socket.id, name: playerName, connected: true });
      }

      socket.join(roomCode);
      io.to(roomCode).emit("players_updated", rooms[roomCode]);
      emitRoomState(roomCode);
    }
  );

  // Handler for confirming words
  socket.on(
    "confirm_words",
    ({ roomCode, words }: { roomCode: string; words: string[] }) => {
      // Initialize data structures if not present
      if (!playerWords[roomCode]) playerWords[roomCode] = {};
      if (!confirmedPlayers[roomCode]) confirmedPlayers[roomCode] = new Set();
      // Store the player's word sequence
      playerWords[roomCode][socket.id] = words;
      // Mark player as confirmed
      confirmedPlayers[roomCode].add(socket.id);
      // Notify room that this player has confirmed
      io.to(roomCode).emit("player_confirmed", socket.id);
      emitRoomState(roomCode);
      // If both players have confirmed, start the game
      const playersInRoom = rooms[roomCode] || [];
      if (confirmedPlayers[roomCode].size === 2 && playersInRoom.length === 2) {
        // Build both players' word sequences
        const playersWithWords = playersInRoom.map((player) => ({
          id: player.id,
          name: player.name,
          words: playerWords[roomCode][player.id] || [],
        }));
        // Randomly select first turn
        const firstTurn =
          playersWithWords[Math.floor(Math.random() * playersWithWords.length)]
            .id;
        currentTurn[roomCode] = firstTurn;
        gameStatus[roomCode] = { started: true, winner: null, finalWords: [] };
        io.to(roomCode).emit("start_game", {
          players: playersWithWords,
          firstTurn,
        });
        emitRoomState(roomCode);
      }
    }
  );

  socket.on(
    "make_guess",
    ({
      roomCode,
      playerId,
      guess,
      viewOpponent,
    }: {
      roomCode: string;
      playerId: string;
      guess: string;
      viewOpponent: boolean;
    }) => {
      // Defensive checks
      if (!playerWords[roomCode] || !rooms[roomCode]) return;
      // Determine whose words are being guessed
      const opponentId = rooms[roomCode].find((p) => p.id !== playerId)?.id;
      if (!opponentId) return;
      // Initialize revealedWords and wrongGuesses if needed
      if (!revealedWords[roomCode]) revealedWords[roomCode] = {};
      if (!revealedWords[roomCode][opponentId])
        revealedWords[roomCode][opponentId] = [];
      if (!wrongGuesses[roomCode]) wrongGuesses[roomCode] = [];
      // Get opponent's words
      const wordsToGuess = playerWords[roomCode][opponentId] || [];
      // Check if guess matches any unrevealed word
      let correct = false;
      let index = -1;
      for (let i = 0; i < wordsToGuess.length; i++) {
        if (
          wordsToGuess[i].toLowerCase() === guess.trim().toLowerCase() &&
          !revealedWords[roomCode][opponentId].includes(i)
        ) {
          correct = true;
          index = i;
          break;
        }
      }
      let nextTurn = opponentId;
      if (correct && index !== -1) {
        revealedWords[roomCode][opponentId].push(index);
        // Check for win (exclude first word, index 0)
        const revealedNonFirst = revealedWords[roomCode][opponentId].filter(
          (i) => i !== 0
        );
        if (revealedNonFirst.length === 7) {
          gameStatus[roomCode] = {
            started: false,
            winner: playerId,
            finalWords: [
              { id: playerId, words: playerWords[roomCode][playerId] || [] },
              { id: opponentId, words: playerWords[roomCode][opponentId] || [] },
            ],
          };
          emitRoomState(roomCode);
          io.to(roomCode).emit("game_end", {
            winner: playerId,
            players: [
              { id: playerId, words: playerWords[roomCode][playerId] },
              { id: opponentId, words: playerWords[roomCode][opponentId] },
            ],
          });
          return;
        }
        // Player continues turn
        nextTurn = playerId;
      } else {
        wrongGuesses[roomCode].push({ guess, playerId });
        // Switch turn
        nextTurn = opponentId;
      }
      io.to(roomCode).emit("guess_result", {
        correct,
        index: correct ? index : undefined,
        guess,
        nextTurn,
        revealed: correct ? [index] : [], // Only send the index just guessed
        playerId,
      });
      currentTurn[roomCode] = nextTurn;
      emitRoomState(roomCode);
    }
  );

  socket.on("reset_game", ({ roomCode }: { roomCode: string }) => {
    // Reset all game state for this room except player list
    if (playerWords[roomCode]) {
      for (const pid in playerWords[roomCode]) {
        playerWords[roomCode][pid] = [];
      }
    }
    if (confirmedPlayers[roomCode]) {
      confirmedPlayers[roomCode].clear();
    }
    if (revealedWords[roomCode]) {
      for (const pid in revealedWords[roomCode]) {
        revealedWords[roomCode][pid] = [];
      }
    }
    wrongGuesses[roomCode] = [];
    currentTurn[roomCode] = "";
    gameStatus[roomCode] = { started: false, winner: null, finalWords: [] };
    // Notify clients to re-enter words
    io.to(roomCode).emit("game_reset");
    emitRoomState(roomCode);
  });

  socket.on("disconnect", () => {
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
      emitRoomState(roomCode);
    }
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || process.argv[2] || 3001;

server.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);
