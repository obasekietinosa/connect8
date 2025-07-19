import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://192.168.1.233:3001");

interface Player {
  id: string;
  name: string;
  words?: string[];
}

function App() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [joined, setJoined] = useState(false);
  const [words, setWords] = useState<string[]>(Array(8).fill(""));
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedPlayers, setConfirmedPlayers] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [opponentWords, setOpponentWords] = useState<string[]>([]);
  const [viewOpponent, setViewOpponent] = useState(true);
  const [guessedWords, setGuessedWords] = useState<number[]>([]); // indices of guessed words
  const [wrongGuesses, setWrongGuesses] = useState<string[]>([]);
  const [guess, setGuess] = useState("");
  const [currentTurn, setCurrentTurn] = useState<string>(""); // playerId of current turn
  const [winner, setWinner] = useState<string | null>(null);
  const [finalWords, setFinalWords] = useState<{ id: string; words: string[] }[]>([]);

  useEffect(() => {
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

    socket.on("start_game", (data) => {
      // Defensive: check if data.players exists and is an array
      const playersArr = Array.isArray(data?.players) ? data.players : [];
      const opponent = playersArr.find((p: Player) => p.id !== socket.id);
      setOpponentWords(opponent && opponent.words ? opponent.words : []);
      setGameStarted(true);
      setCurrentTurn(data?.firstTurn ?? "");
      setGuessedWords([]);
      setWrongGuesses([]);
      setViewOpponent(true);
    });

    socket.on(
      "guess_result",
      (result: {
        correct: boolean;
        index?: number;
        guess: string;
        nextTurn: string;
      }) => {
        if (result.correct && typeof result.index === "number") {
          setGuessedWords((prev) => [...prev, result.index as number]);
        } else {
          setWrongGuesses((prev) => [...prev, result.guess]);
        }
        setCurrentTurn(result.nextTurn);
        setGuess("");
      }
    );

    socket.on("game_end", (data: { winner: string; players: { id: string; words: string[] }[] }) => {
      setGameStarted(false);
      setWinner(data.winner);
      setFinalWords(data.players);
    });

    return () => {
      socket.off("players_updated");
      socket.off("player_confirmed");
      socket.off("start_game");
      socket.off("guess_result");
      socket.off("game_end");
    };
  }, []);

  const joinRoom = () => {
    if (name && room) {
      socket.emit("join_room", { roomCode: room, playerName: name });
      setJoined(true);
    }
  };

  const handleWordChange = (index: number, value: string) => {
    const newWords = [...words];
    newWords[index] = value;
    setWords(newWords);
  };

  const allWordsFilled = words.every((word) => word.trim() !== "");

  const confirmWords = () => {
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

  const handleGuess = () => {
    if (!guess.trim()) return;
    socket.emit("make_guess", {
      roomCode: room,
      playerId: socket.id,
      guess,
      viewOpponent,
    });
  };

  const renderOpponentWords = () => {
    return (
      <div>
        <h3>Opponent's Words</h3>
        <ul>
          {opponentWords.map((word, idx) => {
            if (idx === 0) return <li key={idx}>{word}</li>;
            const revealed = guessedWords.includes(idx);
            return (
              <li key={idx}>
                {revealed
                  ? word
                  : word
                  ? word[0] + "_".repeat(word.length - 1)
                  : ""}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const renderOwnWords = () => {
    return (
      <div>
        <h3>Your Words</h3>
        <ul>
          {words.map((word, idx) => {
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

  const waitingForOpponent =
    confirmed && confirmedPlayers.length === 1 && players.length > 1;

  return (
    <div style={{ padding: 20 }}>
      {!joined ? (
        <>
          <h2>Join Connect8 Game</h2>
          <input
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            placeholder="Room code"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </>
      ) : (
        <>
          <h2>Room: {room}</h2>
          <h3>Players</h3>
          <ul>
            {players.map((p) => (
              <li key={p.id}>{p.name}</li>
            ))}
          </ul>
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
                    <h4>{p.id === socket.id ? "Your Words" : "Opponent's Words"}</h4>
                    <ul>
                      {p.words.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
