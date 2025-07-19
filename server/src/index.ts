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
        const wordSequences: Record<string, string[]> = {};
        for (const player of playersInRoom) {
          wordSequences[player.id] = playerWords[roomCode][player.id] || [];
        }
        io.to(roomCode).emit("start_game", wordSequences);
      }
    }
  );

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
