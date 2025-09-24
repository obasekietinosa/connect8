import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useLocation } from "react-router-dom";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3001");

function generateRoomCode(length: number = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0, O, 1, I
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function useQuery(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

interface Player {
  id: string;
  name: string;
  words?: string[];
}

function App() {
  const [name, setName] = useState<string>("");
  const [room, setRoom] = useState<string>("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [joined, setJoined] = useState<boolean>(false);
  const [words, setWords] = useState<string[]>(Array(8).fill(""));
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [confirmedPlayers, setConfirmedPlayers] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [opponentWords, setOpponentWords] = useState<string[]>([]);
  const [viewOpponent, setViewOpponent] = useState<boolean>(true);
  const [guessedWords, setGuessedWords] = useState<number[]>([]); // indices of guessed words
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [guess, setGuess] = useState<string>("");
  const [currentTurn, setCurrentTurn] = useState<string>(""); // playerId of current turn
  const [winner, setWinner] = useState<string | null>(null);
  const [finalWords, setFinalWords] = useState<
    { id: string; words: string[] }[]
  >([]);
  const [showLanding, setShowLanding] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const location = useLocation();
  const query = useQuery();

  useEffect((): void => {
    // If there's a join code in the URL, prefill and go to join screen
    const code = query.get("code");
    if (code) {
      setRoom(code.toUpperCase());
      setShowLanding(false);
    }
  }, [location.search]);

  useEffect((): (() => void) => {
    socket.on("players_updated", (updatedPlayers: Player[]) => {
      setPlayers(updatedPlayers);
    });

    socket.on("player_confirmed", (playerId: string) => {
      setConfirmedPlayers((prev) => {
        if (!prev.includes(playerId)) {
          return [...prev, playerId];
        }
        return prev;
      });
    });

    socket.on(
      "start_game",
      (data: { players: Player[]; firstTurn: string }) => {
        // Defensive: check if data.players exists and is an array
        const playersArr = Array.isArray(data?.players) ? data.players : [];
        const opponent = playersArr.find((p: Player) => p.id !== socket.id);
        setOpponentWords(opponent && opponent.words ? opponent.words : []);
        setGameStarted(true);
        setCurrentTurn(data?.firstTurn ?? "");
        setGuessedWords([]);
        setWrongGuesses([]);
        setViewOpponent(true);
      }
    );

    socket.on(
      "guess_result",
      (result: {
        correct: boolean;
        index?: number;
        guess: string;
        nextTurn: string;
        revealed: number[];
        playerId: string;
      }) => {
        // Only update guessedWords if this client made the guess
        if (
          result.correct &&
          result.playerId === socket.id &&
          result.revealed.length > 0
        ) {
          setGuessedWords((prev) => [...prev, ...result.revealed]);
        }
        if (!result.correct) {
          setWrongGuesses((prev) => [...prev, result.guess]);
        }
        setCurrentTurn(result.nextTurn);
        setGuess("");
      }
    );

    socket.on(
      "game_end",
      (data: {
        winner: string;
        players: { id: string; words: string[] }[];
      }) => {
        setGameStarted(false);
        setWinner(data.winner);
        setFinalWords(data.players);
      }
    );

    socket.on("game_reset", () => {
      // Reset all game state except room/joined/players
      setWords(Array(8).fill(""));
      setConfirmed(false);
      setConfirmedPlayers([]);
      setGameStarted(false);
      setOpponentWords([]);
      setViewOpponent(true);
      setGuessedWords([]);
      setWrongGuesses([]);
      setGuess("");
      setCurrentTurn("");
      setWinner(null);
      setFinalWords([]);
    });

    return (): void => {
      socket.off("players_updated");
      socket.off("player_confirmed");
      socket.off("start_game");
      socket.off("guess_result");
      socket.off("game_end");
      socket.off("game_reset");
    };
  }, []);

  const handleStartGame = (): void => {
    const newCode = generateRoomCode();
    setRoom(newCode);
    setShowLanding(false);
  };

  const handleJoinGame = (): void => {
    setShowLanding(false);
    setRoom("");
    setError("");
  };

  const joinRoom = (): void => {
    if (!name || !room) return;
    socket.emit("join_room", { roomCode: room, playerName: name });
    setJoined(true);
    setError("");
  };

  const handleWordChange = (index: number, value: string): void => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const allWordsFilled: boolean = words.every((word) => word.trim() !== "");

  const confirmWords = (): void => {
    socket.emit("confirm_words", {
      roomCode: room,
      playerId: socket.id ?? "",
      words,
    });
    setConfirmed(true);
    setConfirmedPlayers((prev) => {
      if (socket.id && !prev.includes(socket.id)) {
        return [...prev, socket.id];
      }
      return prev;
    });
  };

  const handleGuess = (): void => {
    if (!guess.trim()) return;
    socket.emit("make_guess", {
      roomCode: room,
      playerId: socket.id,
      guess,
      viewOpponent,
    });
  };

  const renderOpponentWords = (): React.JSX.Element => {
    return (
      <div>
        <h3>Opponent's Words</h3>
        <ul>
          {opponentWords.map((word: string, idx: number) => {
            if (idx === 0) return <li key={idx}>{word}</li>;
            const revealed = guessedWords.includes(idx);
            return (
              <li key={idx}>
                {revealed
                  ? word
                  : word
                  ? word[0] +
                    word
                      .slice(1)
                      .split("")
                      .map((_, i) => (
                        <span
                          style={{ marginRight: 4, letterSpacing: 2 }}
                          key={i}
                        >
                          _
                        </span>
                      ))
                  : ""}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderOwnWords = (): React.JSX.Element => {
    return (
      <div>
        <h3>Your Words</h3>
        <ul>
          {words.map((word: string, idx: number) => {
            const guessed = guessedWords.includes(idx);
            return (
              <li key={idx} style={{ color: guessed ? "green" : undefined }}>
                {word} {guessed ? "(guessed)" : ""}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const waitingForOpponent: boolean =
    confirmed && confirmedPlayers.length === 1 && players.length > 1;

  const handlePlayAgain = (): void => {
    // Reset all game state except room/joined/players
    setWords(Array(8).fill(""));
    setConfirmed(false);
    setConfirmedPlayers([]);
    setGameStarted(false);
    setOpponentWords([]);
    setViewOpponent(true);
    setGuessedWords([]);
    setWrongGuesses([]);
    setGuess("");
    setCurrentTurn("");
    setWinner(null);
    setFinalWords([]);
    // Notify server to reset game state for this room
    socket.emit("reset_game", { roomCode: room });
  };

  // Share URL logic
  const shareUrl: string = `${window.location.origin}/join?code=${room}`;
  const handleShare = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert("Room link copied to clipboard!");
    } catch {
      window.prompt("Copy this link to share:", shareUrl);
    }
  };

  if (showLanding) {
    return (
      <div
        style={{
          padding: 32,
          maxWidth: 500,
          margin: "auto",
          textAlign: "center",
        }}
      >
        <img
          src="/logo.png"
          alt="8Words Logo"
          style={{ width: 80, marginBottom: 16 }}
        />
        <h1>Welcome to 8Words</h1>
        <p>
          8Words is a real-time, two-player word guessing game. Enter 8
          connected words, take turns guessing, and race to reveal your
          opponent's sequence!
        </p>
        <div style={{ margin: 24 }}>
          <button onClick={handleStartGame} style={{ marginRight: 16 }}>
            Start a New Game
          </button>
          <button onClick={handleJoinGame}>Join a Game</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 20 }}>
      {!joined ? (
        <div
          style={{
            padding: 32,
            maxWidth: 400,
            margin: "auto",
            textAlign: "center",
          }}
        >
          <h2>{room ? `Join Room: ${room}` : "Join a Game"}</h2>
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginBottom: 12, width: "100%" }}
          />
          <input
            placeholder="Room code"
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase())}
            style={{ marginBottom: 12, width: "100%" }}
            maxLength={8}
          />
          <button onClick={joinRoom} style={{ width: "100%" }}>
            Join Room
          </button>
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => {
                setShowLanding(true);
                setRoom("");
              }}
            >
              Back to Home
            </button>
          </div>
        </div>
      ) : (
        <>
          <h2>Room: {room}</h2>
          <h3>Players</h3>
          <ul>
            {players.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
          {!gameStarted && joined && (
            <div style={{ margin: "16px 0" }}>
              <button onClick={handleShare}>Share Room Link</button>
              <div style={{ fontSize: 12, color: "#888" }}>
                or share code: <b>{room}</b>
              </div>
            </div>
          )}
          {gameStarted ? (
            <>
              <h2>Game Started!</h2>
              <div>
                <button
                  onClick={() => setViewOpponent(true)}
                  disabled={viewOpponent}
                >
                  View Opponent's Words
                </button>
                <button
                  onClick={() => setViewOpponent(false)}
                  disabled={!viewOpponent}
                >
                  View Your Words
                </button>
              </div>
              <div style={{ marginTop: 16 }}>
                {viewOpponent ? renderOpponentWords() : renderOwnWords()}
              </div>
              <div style={{ marginTop: 16 }}>
                <strong>
                  {currentTurn === socket.id ? "Your turn!" : "Opponent's turn"}
                </strong>
              </div>
              {currentTurn === socket.id && (
                <div style={{ marginTop: 16 }}>
                  <input
                    placeholder="Guess a word"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                  />
                  <button onClick={handleGuess}>Submit Guess</button>
                </div>
              )}
              {wrongGuesses.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>Wrong Guesses</h4>
                  <ul>
                    {wrongGuesses.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ margin: "16px 0" }}>
                <button onClick={handleShare}>Share Room Link</button>
                <div style={{ fontSize: 12, color: "#888" }}>
                  or share code: <b>{room}</b>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3>Enter Your Words</h3>
              {words.map((word, index) => (
                <input
                  key={index}
                  placeholder={`Word ${index + 1}`}
                  value={word}
                  onChange={(e) => handleWordChange(index, e.target.value)}
                  style={{ display: "block", marginBottom: 8 }}
                  disabled={confirmed}
                />
              ))}
              <button
                disabled={!allWordsFilled || confirmed}
                onClick={confirmWords}
              >
                Confirm Words
              </button>
              {waitingForOpponent && <p>Waiting for opponent to confirm...</p>}
            </>
          )}
          {winner && (
            <div style={{ marginTop: 32 }}>
              <h2>Game Over!</h2>
              <h3>{winner === socket.id ? "You win!" : "Opponent wins!"}</h3>
              <div>
                {finalWords.map((p) => (
                  <div key={p.id}>
                    <h4>
                      {p.id === socket.id ? "Your Words" : "Opponent's Words"}
                    </h4>
                    <ul>
                      {p.words.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <button onClick={handlePlayAgain} style={{ marginTop: 16 }}>
                Play Again
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
