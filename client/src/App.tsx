import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

interface Player {
  id: string;
  name: string;
}

function App() {
  const [name, setName] = useState("");
  const [room, setRoom] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [joined, setJoined] = useState(false);
  const [words, setWords] = useState<string[]>(Array(8).fill(""));
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedPlayers, setConfirmedPlayers] = useState<string[]>([]);

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
      console.log("Game started with data:", data);
    });

    return () => {
      socket.off("players_updated");
      socket.off("player_confirmed");
      socket.off("start_game");
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
      playerId: socket.id,
      words,
    });
    setConfirmed(true);
    setConfirmedPlayers((prev) => {
      if (!prev.includes(socket.id)) {
        return [...prev, socket.id];
      }
      return prev;
    });
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
    </div>
  );
}

export default App;
