import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import type {
  Player,
  GameEndData,
  GuessResult,
  RoomStatePayload,
  StartGameData,
} from "../types";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3001";

const STORAGE_KEY = "connect8:lastJoinDetails";

type JoinDetails = { room: string; name: string; lastSocketId: string | null };
type PendingJoin = { room: string; name: string; previousSocketId?: string };

export function useSocket(room: string, name: string) {
  const [socket] = useState<Socket>(() =>
    io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
    })
  );
  const [players, setPlayers] = useState<Player[]>([]);
  const [confirmedPlayers, setConfirmedPlayers] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [opponentWords, setOpponentWords] = useState<string[]>([]);
  const [currentTurn, setCurrentTurn] = useState<string>("");
  const [guessedWords, setGuessedWords] = useState<number[]>([]);
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);
  const [finalWords, setFinalWords] = useState<GameEndData["players"]>([]);

  const lastJoinDetailsRef = useRef<JoinDetails | null>(null);
  const pendingJoinRef = useRef<PendingJoin | null>(null);
  const hasAttemptedStoredReconnectRef = useRef(false);

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
    if (typeof window === "undefined") return;
    const storedJoinDetails = window.sessionStorage.getItem(STORAGE_KEY);
    if (storedJoinDetails) {
      try {
        lastJoinDetailsRef.current = JSON.parse(storedJoinDetails) as JoinDetails;
      } catch (error) {
        console.warn("Failed to parse stored join details", error);
        window.sessionStorage.removeItem(STORAGE_KEY);
        lastJoinDetailsRef.current = null;
      }
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
    const emitJoin = ({
      roomCode,
      playerName,
      previousSocketId,
    }: {
      roomCode: string;
      playerName: string;
      previousSocketId?: string;
    }) => {
      const sanitizedPreviousId =
        previousSocketId && previousSocketId !== (socket.id ?? "")
          ? previousSocketId
          : undefined;
      socket.emit("join_room", {
        roomCode,
        playerName,
        previousSocketId: sanitizedPreviousId,
      });
    };

    const handleConnect = () => {
      const lastJoinDetails = lastJoinDetailsRef.current;
      const pendingJoin = pendingJoinRef.current;

      if (pendingJoin) {
        emitJoin({
          roomCode: pendingJoin.room,
          playerName: pendingJoin.name,
          previousSocketId: pendingJoin.previousSocketId,
        });
        pendingJoinRef.current = null;
      } else if (lastJoinDetails) {
        emitJoin({
          roomCode: lastJoinDetails.room,
          playerName: lastJoinDetails.name,
          previousSocketId: lastJoinDetails.lastSocketId ?? undefined,
        });
      }

      if (lastJoinDetails) {
        lastJoinDetails.lastSocketId = socket.id ?? null;
        persistJoinDetails();
      }
    };
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        socket.disconnected &&
        (pendingJoinRef.current || lastJoinDetailsRef.current)
      ) {
        socket.connect();
      }
    };
    const handleRoomState = (state: RoomStatePayload) => {
      setPlayers(state.players);
      setConfirmedPlayers(state.confirmedPlayers);
      setWrongGuesses(state.wrongGuesses);
      setWinner(state.winner);
      setFinalWords(state.finalWords);
      if (state.gameStarted) {
        setGameStarted(true);
        const opponent = state.players.find((p) => p.id !== (socket.id ?? ""));
        const opponentId = opponent?.id ?? "";
        setOpponentWords(state.playerWords[opponentId] || []);
        setGuessedWords(state.revealedWords[opponentId] || []);
        setCurrentTurn(state.currentTurn);
      } else {
        setGameStarted(false);
        setCurrentTurn(state.currentTurn || "");
        if (!state.winner) {
          setOpponentWords([]);
          setGuessedWords([]);
        }
      }
    };
    const handleDisconnect = () => {
      if (lastJoinDetailsRef.current) {
        lastJoinDetailsRef.current.lastSocketId = socket.id ?? null;
        persistJoinDetails();
        if (socket.disconnected && document.visibilityState === "visible") {
          socket.connect();
        }
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

  useEffect(() => {
    if (hasAttemptedStoredReconnectRef.current) return;
    hasAttemptedStoredReconnectRef.current = true;
    if (socket.disconnected && lastJoinDetailsRef.current) {
      socket.connect();
    }
  }, [socket]);

  const joinRoom = useCallback(() => {
    if (!name || !room) return;
    const previousSocketId = lastJoinDetailsRef.current?.lastSocketId ?? undefined;
    const sanitizedPreviousId =
      previousSocketId && previousSocketId !== (socket.id ?? "")
        ? previousSocketId
        : undefined;

    lastJoinDetailsRef.current = {
      room,
      name,
      lastSocketId: socket.id ?? null,
    };
    persistJoinDetails();

    if (socket.connected) {
      socket.emit("join_room", {
        roomCode: room,
        playerName: name,
        previousSocketId: sanitizedPreviousId,
      });
      pendingJoinRef.current = null;
    } else {
      pendingJoinRef.current = {
        room,
        name,
        previousSocketId: sanitizedPreviousId,
      };
      socket.connect();
    }
  }, [name, persistJoinDetails, room, socket]);

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
