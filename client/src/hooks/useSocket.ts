import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type {
  Player,
  GameEndData,
  GuessResult,
  RoomStatePayload,
  StartGameData,
  WrongGuess,
} from "../types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

const STORAGE_KEY = "connect8:lastJoinDetails";

export function useSocket(room: string, name: string) {
  const [socket] = useState<Socket>(() => io(SOCKET_URL));
  const [players, setPlayers] = useState<Player[]>([]);
  const [confirmedPlayers, setConfirmedPlayers] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [opponentWords, setOpponentWords] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string>("");
  const [myGuessedWords, setMyGuessedWords] = useState<number[]>([]);
  const [opponentGuessedWords, setOpponentGuessedWords] = useState<number[]>([]);
  const [myWrongGuesses, setMyWrongGuesses] = useState<string[]>([]);
  const [opponentWrongGuesses, setOpponentWrongGuesses] = useState<string[]>([]);
  const [lastGuessResult, setLastGuessResult] = useState<GuessResult | null>(null);
  const [winner, setWinner] = useState<string | null>(null);
  const [finalWords, setFinalWords] = useState<GameEndData["players"]>([]);

  let initialJoinDetails: { room: string; name: string; lastSocketId: string | null } | null =
    null;
  if (typeof window !== "undefined") {
    const storedJoinDetails = window.sessionStorage.getItem(STORAGE_KEY);
    if (storedJoinDetails) {
      try {
        initialJoinDetails = JSON.parse(storedJoinDetails);
      } catch (error) {
        console.warn("Failed to parse stored join details", error);
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }
  const lastJoinDetailsRef = useRef<
    { room: string; name: string; lastSocketId: string | null } | null
  >(initialJoinDetails);

  const persistJoinDetails = useCallback(() => {
    const details = lastJoinDetailsRef.current;
    if (typeof window === "undefined") return;
    if (details) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(details));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

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
      setMyGuessedWords([]);
      setOpponentGuessedWords([]);
      setMyWrongGuesses([]);
      setOpponentWrongGuesses([]);
      setLastGuessResult(null);
    });
    socket.on("guess_result", (result: GuessResult) => {
      if (result.correct && result.revealed.length > 0) {
        if (result.playerId === socket.id) {
          setMyGuessedWords((prev) => {
            const additions = result.revealed.filter((idx) => !prev.includes(idx));
            return additions.length ? [...prev, ...additions] : prev;
          });
        } else {
          setOpponentGuessedWords((prev) => {
            const additions = result.revealed.filter((idx) => !prev.includes(idx));
            return additions.length ? [...prev, ...additions] : prev;
          });
        }
      }
      if (!result.correct) {
        if (result.playerId === socket.id) {
          setMyWrongGuesses((prev) => [...prev, result.guess]);
        } else {
          setOpponentWrongGuesses((prev) => [...prev, result.guess]);
        }
      }
      setCurrentTurn(result.nextTurn);
      setLastGuessResult(result);
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
      setMyGuessedWords([]);
      setOpponentGuessedWords([]);
      setMyWrongGuesses([]);
      setOpponentWrongGuesses([]);
      setCurrentTurn("");
      setWinner(null);
      setFinalWords([]);
      setLastGuessResult(null);
    });
    const handleConnect = () => {
      const lastJoinDetails = lastJoinDetailsRef.current;
      if (lastJoinDetails) {
        const previousSocketId =
          lastJoinDetails.lastSocketId && lastJoinDetails.lastSocketId !== socket.id
            ? lastJoinDetails.lastSocketId
            : undefined;
        socket.emit("join_room", {
          roomCode: lastJoinDetails.room,
          playerName: lastJoinDetails.name,
          previousSocketId,
        });
        lastJoinDetails.lastSocketId = socket.id ?? null;
        persistJoinDetails();
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !socket.connected) {
        socket.connect();
      }
    };
    const handleRoomState = (state: RoomStatePayload) => {
      setPlayers(state.players);
      setConfirmedPlayers(state.confirmedPlayers);
      setWinner(state.winner);
      setFinalWords(state.finalWords);
      const myId = socket.id ?? "";
      const opponent = state.players.find((p) => p.id !== myId);
      const opponentId = opponent?.id ?? "";
      if (state.gameStarted) {
        setGameStarted(true);
        setOpponentWords(state.playerWords[opponentId] || []);
        setMyGuessedWords(state.revealedWords[opponentId] || []);
        setOpponentGuessedWords(state.revealedWords[myId] || []);
        const myWrong: string[] = [];
        const opponentWrong: string[] = [];
        (state.wrongGuesses as WrongGuess[] | undefined)?.forEach((entry) => {
          if (entry.playerId === myId) {
            myWrong.push(entry.guess);
          } else if (entry.playerId) {
            opponentWrong.push(entry.guess);
          }
        });
        setMyWrongGuesses(myWrong);
        setOpponentWrongGuesses(opponentWrong);
        setCurrentTurn(state.currentTurn);
      } else {
        setGameStarted(false);
        setCurrentTurn(state.currentTurn || "");
        if (!state.winner) {
          setOpponentWords([]);
          setMyGuessedWords([]);
          setOpponentGuessedWords([]);
          setMyWrongGuesses([]);
          setOpponentWrongGuesses([]);
        }
      }
    };
    const handleDisconnect = () => {
      if (lastJoinDetailsRef.current) {
        lastJoinDetailsRef.current.lastSocketId = socket.id ?? null;
        persistJoinDetails();
      }
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room_state", handleRoomState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socket.off("players_updated");
      socket.off("player_confirmed");
      socket.off("start_game");
      socket.off("guess_result");
      socket.off("game_end");
      socket.off("game_reset");
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room_state", handleRoomState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [persistJoinDetails, socket]);

  const joinRoom = useCallback(() => {
    if (!name || !room) return;
    const previousSocketId = lastJoinDetailsRef.current?.lastSocketId;
    lastJoinDetailsRef.current = {
      room,
      name,
      lastSocketId: socket.id ?? null,
    };
    persistJoinDetails();
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit("join_room", {
      roomCode: room,
      playerName: name,
      previousSocketId:
        previousSocketId && previousSocketId !== (socket.id ?? "")
          ? previousSocketId
          : undefined,
    });
  }, [name, persistJoinDetails, room, socket]);

  return {
    socket,
    players,
    confirmedPlayers,
    gameStarted,
    opponentWords,
    currentTurn,
    myGuessedWords,
    opponentGuessedWords,
    myWrongGuesses,
    opponentWrongGuesses,
    lastGuessResult,
    winner,
    finalWords,
    joinRoom,
  };
}
