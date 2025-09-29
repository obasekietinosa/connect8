import { DisconnectedPlayerSnapshot, Room, RoomStatus } from "./types";

export const rooms: Room = {};
export const playerWords: Record<string, Record<string, string[]>> = {};
export const confirmedPlayers: Record<string, Set<string>> = {};
export const revealedWords: Record<string, Record<string, number[]>> = {};
export const wrongGuesses: Record<string, { playerId: string; guess: string }[]> = {};
export const currentTurn: Record<string, string> = {};
export const gameStatus: Record<string, RoomStatus> = {};
export const disconnectedPlayers: Record<string, Record<string, DisconnectedPlayerSnapshot>> = {};
export const turnDeadlines: Record<string, number | null> = {};
export const turnTimeouts: Record<string, NodeJS.Timeout | null> = {};
export const socketToPlayer: Record<
  string,
  { roomCode: string; playerId: string }
> = {};

export const ensureRoomState = (roomCode: string) => {
  if (!rooms[roomCode]) rooms[roomCode] = [];
  if (!playerWords[roomCode]) playerWords[roomCode] = {};
  if (!confirmedPlayers[roomCode]) confirmedPlayers[roomCode] = new Set<string>();
  if (!revealedWords[roomCode]) revealedWords[roomCode] = {};
  if (!wrongGuesses[roomCode]) wrongGuesses[roomCode] = [];
  if (!gameStatus[roomCode]) {
    gameStatus[roomCode] = { started: false, winner: null, finalWords: [] };
  }
  if (!disconnectedPlayers[roomCode]) disconnectedPlayers[roomCode] = {};
  if (!(roomCode in turnDeadlines)) turnDeadlines[roomCode] = null;
  if (!(roomCode in turnTimeouts)) turnTimeouts[roomCode] = null;
};

export const clearTurnTimer = (roomCode: string) => {
  const existing = turnTimeouts[roomCode];
  if (existing) {
    clearTimeout(existing);
  }
  turnTimeouts[roomCode] = null;
  turnDeadlines[roomCode] = null;
};

export const resetRoomState = (roomCode: string) => {
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
  clearTurnTimer(roomCode);
};
