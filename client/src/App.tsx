import { useState, useEffect } from "react";
import { useSocket } from "./hooks/useSocket";
import { useQuery } from "./hooks/useQuery";
import { generateRoomCode } from "./utils/generateRoomCode";
import Landing from "./components/Landing";
import JoinRoom from "./components/JoinRoom";
import Lobby from "./components/Lobby";
import WordInput from "./components/WordInput";
import GameBoard from "./components/GameBoard";
import GameOver from "./components/GameOver";

function App() {
  const query = useQuery();
  const [showLanding, setShowLanding] = useState(true);
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");
  const [words, setWords] = useState<string[]>(Array(8).fill(""));
  const [confirmed, setConfirmed] = useState(false);
  const [guess, setGuess] = useState("");
  const [celebratory, setCelebratory] = useState(false);

  useEffect(() => {
    const code = query.get("code");
    if (code) {
      setRoom(code.toUpperCase());
      setShowLanding(false);
    }
  }, [query]);

  const {
    socket,
    players,
    gameStarted,
    opponentWords,
    currentTurn,
    guessedWords,
    joinRoom,
    winner,
  } = useSocket(room, name);

  const [joined, setJoined] = useState(false);
  const [viewOpponent, setViewOpponent] = useState(true);

  const handleStartGame = () => {
    setRoom(generateRoomCode());
    setShowLanding(false);
  };
  const handleJoinGame = () => {
    setShowLanding(false);
    setRoom("");
    setError("");
  };
  const handleJoinRoom = () => {
    if (!name || !room) {
      setError("Enter your name and room code");
      return;
    }
    joinRoom();
    setJoined(true);
    setError("");
  };
  const handleConfirmWords = (wordsInput: string[]) => {
    socket.emit("confirm_words", { roomCode: room, playerId: socket.id ?? "", words: wordsInput });
    setWords(wordsInput);
    setConfirmed(true);
  };
  const handleGuess = (guessValue: string) => {
    if (!guessValue.trim()) return;
    socket.emit("make_guess", { roomCode: room, playerId: socket.id ?? "", guess: guessValue, viewOpponent });
    setGuess("");
    setCelebratory(false);
  };
  const handlePlayAgain = () => {
    setWords(Array(8).fill(""));
    setConfirmed(false);
    setJoined(false);
    setViewOpponent(true);
    setGuess("");
    setCelebratory(false);
    socket.emit("reset_game", { roomCode: room });
  };
  const shareUrl = `${window.location.origin}/join?code=${room}`;
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Room link copied to clipboard!");
    } catch {
      window.prompt("Copy this link to share:", shareUrl);
    }
  };

  if (showLanding) {
    return <Landing onStart={handleStartGame} onJoin={handleJoinGame} />;
  }
  if (!joined) {
    return (
      <JoinRoom
        name={name}
        setName={setName}
        room={room}
        setRoom={setRoom}
        onJoin={handleJoinRoom}
        error={error}
        onBack={() => setShowLanding(true)}
      />
    );
  }
  if (!gameStarted && !confirmed) {
    return (
      <>
        <Lobby
          room={room}
          players={players}
          shareUrl={shareUrl}
          onShare={handleShare}
          onStart={() => {}}
          isHost={players[0]?.id === (socket.id ?? "")}
        />
        <WordInput onSubmit={handleConfirmWords} loading={confirmed} />
      </>
    );
  }
  if (gameStarted) {
    return (
      <GameBoard
        state={{
          myWordsLeft: words,
          opponentWordsLeft: opponentWords.map((word, idx) => ({ word, revealed: guessedWords.includes(idx) })),
          isMyTurn: currentTurn === (socket.id ?? ""),
        }}
        onGuess={handleGuess}
        guessValue={guess}
        setGuessValue={setGuess}
        error={error}
        celebratory={celebratory}
      />
    );
  }
  if (winner) {
    return (
      <GameOver
        winner={winner === (socket.id ?? "") ? name : players.find(p => p.id === winner)?.name || "Opponent"}
        myWords={words}
        opponentWords={opponentWords}
        onRestart={handlePlayAgain}
      />
    );
  }
  return null;
}

export default App;
