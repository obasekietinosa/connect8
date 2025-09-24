import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import type { Player, GameEndData, GuessResult, StartGameData } from "../types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

export function useSocket(room: string, name: string) {
  const [socket] = useState<Socket>(() => io(SOCKET_URL));
  const [players, setPlayers] = useState<Player[]>([]);
  const [confirmedPlayers, setConfirmedPlayers] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [opponentWords, setOpponentWords] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string>("");
  const [guessedWords, setGuessedWords] = useState<number[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [finalWords, setFinalWords] = useState<GameEndData["players"]>([]);

  useEffect(() => {
    socket.on("players_updated", setPlayers);
    socket.on("player_confirmed", (playerId: string) => {
      setConfirmedPlayers((prev) => prev.includes(playerId) ? prev : [...prev, playerId]);
    });
    socket.on("start_game", (data: StartGameData) => {
      const opponent = data.players.find((p) => p.id !== socket.id);
      setOpponentWords(opponent?.words || []);
      setGameStarted(true);
      setCurrentTurn(data.firstTurn);
      setGuessedWords([]);
      setWrongGuesses([]);
    });
    socket.on("guess_result", (result: GuessResult) => {
      if (result.correct && result.playerId === socket.id && result.revealed.length > 0) {
        setGuessedWords((prev) => [...prev, ...result.revealed]);
      }
      if (!result.correct) {
        setWrongGuesses((prev) => [...prev, result.guess]);
      }
      setCurrentTurn(result.nextTurn);
    });
    socket.on("game_end", (data: GameEndData) => {
      setGameStarted(false);
      setWinner(data.winner);
      setFinalWords(data.players);
    });
    socket.on("game_reset", () => {
      setConfirmedPlayers([]);
      setGameStarted(false);
      setOpponentWords([]);
      setGuessedWords([]);
      setWrongGuesses([]);
      setCurrentTurn("");
      setWinner(null);
      setFinalWords([]);
    });
    return () => {
      socket.off("players_updated");
      socket.off("player_confirmed");
      socket.off("start_game");
      socket.off("guess_result");
      socket.off("game_end");
      socket.off("game_reset");
    };
  }, [socket]);

  const joinRoom = useCallback(() => {
    if (!name || !room) return;
    socket.emit("join_room", { roomCode: room, playerName: name });
  }, [name, room, socket]);

  return {
    socket,
    players,
    confirmedPlayers,
    gameStarted,
    opponentWords,
    currentTurn,
    guessedWords,
    wrongGuesses,
    winner,
    finalWords,
    joinRoom,
  };
}
