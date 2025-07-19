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

type Player = { id: string; name: string };
type Room = Record<string, Player[]>;

const rooms: Room = {};

// Store each player's words per room: playerWords[roomCode][playerId] = string[]
const playerWords: Record<string, Record<string, string[]>> = {};
// Track confirmed players per room
const confirmedPlayers: Record<string, Set<string>> = {};
// Track revealed words and wrong guesses per room
const revealedWords: Record<string, Record<string, number[]>> = {};
const wrongGuesses: Record<string, string[]> = {};
let turnOrder: Record<string, string[]> = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on(
    "join_room",
    ({ roomCode, playerName }: { roomCode: string; playerName: string }) => {
      if (!rooms[roomCode]) rooms[roomCode] = [];
      rooms[roomCode].push({ id: socket.id, name: playerName });
      socket.join(roomCode);
      io.to(roomCode).emit("players_updated", rooms[roomCode]);
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
        io.to(roomCode).emit("start_game", {
          players: playersWithWords,
          firstTurn,
        });
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
      let revealedForGuesser = revealedWords[roomCode][opponentId].filter(
        (idx) => {
          // Only show words guessed by this player
          return correct && playerId === socket.id ? idx === index : false;
        }
      );
      if (correct && index !== -1) {
        revealedWords[roomCode][opponentId].push(index);
        // Check for win (exclude first word, index 0)
        const revealedNonFirst = revealedWords[roomCode][opponentId].filter(
          (i) => i !== 0
        );
        if (revealedNonFirst.length === 7) {
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
        wrongGuesses[roomCode].push(guess);
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
    // Notify clients to re-enter words
    io.to(roomCode).emit("game_reset");
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const filtered = rooms[roomCode].filter((p) => p.id !== socket.id);
      rooms[roomCode] = filtered;
      io.to(roomCode).emit("players_updated", filtered);
      // Clean up playerWords and confirmedPlayers for this player
      if (playerWords[roomCode]) {
        delete playerWords[roomCode][socket.id];
      }
      if (confirmedPlayers[roomCode]) {
        confirmedPlayers[roomCode].delete(socket.id);
      }
    }
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3001, () =>
  console.log("Server listening on http://localhost:3001")
);
