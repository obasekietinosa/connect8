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

const generatePlayerId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `player-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

type JoinDetails = {
  room: string;
  name: string;
  lastSocketId: string | null;
  playerId: string | null;
};

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
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);

  let initialJoinDetails: JoinDetails | null = null;
  if (typeof window !== "undefined") {
    const storedJoinDetails = window.sessionStorage.getItem(STORAGE_KEY);
    if (storedJoinDetails) {
      try {
        const parsed = JSON.parse(storedJoinDetails);
        initialJoinDetails = {
          room: parsed.room ?? "",
          name: parsed.name ?? "",
          lastSocketId: parsed.lastSocketId ?? null,
          playerId: typeof parsed.playerId === "string" ? parsed.playerId : null,
        };
      } catch (error) {
        console.warn("Failed to parse stored join details", error);
        window.sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  const lastJoinDetailsRef = useRef<JoinDetails | null>(initialJoinDetails);
  const playerIdRef = useRef<string | null>(initialJoinDetails?.playerId ?? null);
  const [playerId, setPlayerId] = useState<string | null>(playerIdRef.current);

  const persistJoinDetails = useCallback(() => {
    const details = lastJoinDetailsRef.current;
    if (typeof window === "undefined") return;
    if (details) {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(details));
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setAndPersistPlayerId = useCallback(
    (id: string) => {
      playerIdRef.current = id;
      setPlayerId(id);
      if (lastJoinDetailsRef.current) {
        lastJoinDetailsRef.current.playerId = id;
        persistJoinDetails();
      }
    },
    [persistJoinDetails]
  );

  const syncPlayerIdFromPlayers = useCallback(
    (list: Player[]) => {
      if (!lastJoinDetailsRef.current) return;
      if (!list.length) return;
      const currentId = playerIdRef.current;
      if (currentId && list.some((player) => player.id === currentId)) {
        return;
      }
      const match = list.find((player) => player.socketId === (socket.id ?? ""));
      if (match) {
        setAndPersistPlayerId(match.id);
      }
    },
    [setAndPersistPlayerId, socket]
  );

  useEffect(() => {
    const handlePlayersUpdated = (list: Player[]) => {
      setPlayers(list);
      syncPlayerIdFromPlayers(list);
    };
    const handlePlayerConfirmed = (confirmedId: string) => {
      setConfirmedPlayers((prev) =>
        prev.includes(confirmedId) ? prev : [...prev, confirmedId]
      );
    };
    const getCurrentPlayerId = () => playerIdRef.current ?? null;

    const handleStartGame = (data: StartGameData) => {
      syncPlayerIdFromPlayers(data.players);
      const currentId = getCurrentPlayerId();
      let me = currentId
        ? data.players.find((player) => player.id === currentId)
        : undefined;
      if (!me) {
        me = data.players.find((player) => player.socketId === (socket.id ?? ""));
        if (me) {
          setAndPersistPlayerId(me.id);
        }
      }
      const opponent = data.players.find((player) => player.id !== me?.id);
      const opponentFirstWord = opponent?.words?.[0]?.trim();
      const myFirstWord = me?.words?.[0]?.trim();
      setOpponentWords(opponent?.words || []);
      setGameStarted(true);
      setCurrentTurn(data.firstTurn);
      setMyGuessedWords(opponentFirstWord ? [0] : []);
      setOpponentGuessedWords(myFirstWord ? [0] : []);
      setMyWrongGuesses([]);
      setOpponentWrongGuesses([]);
      setLastGuessResult(null);
      setTurnDeadline(data.turnDeadline ?? null);
    };

    const handleGuessResult = (result: GuessResult) => {
      const currentId = getCurrentPlayerId();
      if (result.correct && result.revealed.length > 0) {
        if (currentId && result.playerId === currentId) {
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
        if (currentId && result.playerId === currentId) {
          setMyWrongGuesses((prev) => [...prev, result.guess]);
        } else {
          setOpponentWrongGuesses((prev) => [...prev, result.guess]);
        }
      }
      setCurrentTurn(result.nextTurn);
      setLastGuessResult(result);
      setTurnDeadline(result.turnDeadline ?? null);
    };

    const handleGameEnd = (data: GameEndData) => {
      setGameStarted(false);
      setWinner(data.winner);
      setFinalWords(data.players);
      setTurnDeadline(null);
    };

    const handleGameReset = () => {
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
      setTurnDeadline(null);
    };

    const handleConnect = () => {
      const lastJoinDetails = lastJoinDetailsRef.current;
      if (lastJoinDetails) {
        if (!lastJoinDetails.playerId) {
          const newId = playerIdRef.current ?? generatePlayerId();
          lastJoinDetails.playerId = newId;
          setAndPersistPlayerId(newId);
        }
        const previousSocketId =
          lastJoinDetails.lastSocketId && lastJoinDetails.lastSocketId !== socket.id
            ? lastJoinDetails.lastSocketId
            : undefined;
        socket.emit("join_room", {
          roomCode: lastJoinDetails.room,
          playerName: lastJoinDetails.name,
          previousSocketId,
          playerId: lastJoinDetails.playerId ?? undefined,
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
      syncPlayerIdFromPlayers(state.players);
      setConfirmedPlayers(state.confirmedPlayers);
      setWinner(state.winner);
      setFinalWords(state.finalWords);
      const myId = playerIdRef.current ?? "";
      const opponent = state.players.find((player) => player.id !== myId);
      const opponentId = opponent?.id ?? "";
      if (state.gameStarted) {
        setGameStarted(true);
        setOpponentWords(opponentId ? state.playerWords[opponentId] || [] : []);
        setMyGuessedWords(opponentId ? state.revealedWords[opponentId] || [] : []);
        setOpponentGuessedWords(myId ? state.revealedWords[myId] || [] : []);
        const myWrong: string[] = [];
        const opponentWrong: string[] = [];
        (state.wrongGuesses as WrongGuess[] | undefined)?.forEach((entry) => {
          if (myId && entry.playerId === myId) {
            myWrong.push(entry.guess);
          } else if (entry.playerId) {
            opponentWrong.push(entry.guess);
          }
        });
      setMyWrongGuesses(myWrong);
      setOpponentWrongGuesses(opponentWrong);
      setCurrentTurn(state.currentTurn);
      setTurnDeadline(state.turnDeadline ?? null);
    } else {
      setGameStarted(false);
      setCurrentTurn(state.currentTurn || "");
      setTurnDeadline(state.turnDeadline ?? null);
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

    socket.on("players_updated", handlePlayersUpdated);
    socket.on("player_confirmed", handlePlayerConfirmed);
    socket.on("start_game", handleStartGame);
    socket.on("guess_result", handleGuessResult);
    socket.on("game_end", handleGameEnd);
    socket.on("game_reset", handleGameReset);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room_state", handleRoomState);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      socket.off("players_updated", handlePlayersUpdated);
      socket.off("player_confirmed", handlePlayerConfirmed);
      socket.off("start_game", handleStartGame);
      socket.off("guess_result", handleGuessResult);
      socket.off("game_end", handleGameEnd);
      socket.off("game_reset", handleGameReset);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room_state", handleRoomState);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [persistJoinDetails, setAndPersistPlayerId, socket, syncPlayerIdFromPlayers]);

  const joinRoom = useCallback(() => {
    if (!name || !room) return;
    const previousDetails = lastJoinDetailsRef.current;
    const previousSocketId = previousDetails?.lastSocketId;
    let nextPlayerId = previousDetails?.playerId ?? playerIdRef.current ?? null;
    if (!nextPlayerId) {
      nextPlayerId = generatePlayerId();
    }
    lastJoinDetailsRef.current = {
      room,
      name,
      lastSocketId: socket.id ?? null,
      playerId: nextPlayerId,
    };
    setAndPersistPlayerId(nextPlayerId);
    if (!socket.connected) {
      socket.connect();
    }
    const currentSocketId = socket.id ?? "";
    socket.emit("join_room", {
      roomCode: room,
      playerName: name,
      previousSocketId:
        previousSocketId && previousSocketId !== currentSocketId
          ? previousSocketId
          : undefined,
      playerId: nextPlayerId,
    });
  }, [name, room, setAndPersistPlayerId, socket]);

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
    playerId,
    turnDeadline,
  };
}
