import React from "react";

interface JoinRoomProps {
  name: string;
  setName: (name: string) => void;
  room: string;
  setRoom: (room: string) => void;
  onJoin: () => void;
  error: string;
  onBack: () => void;
}

const JoinRoom: React.FC<JoinRoomProps> = ({ name, setName, room, setRoom, onJoin, error, onBack }) => (
  <div style={{ padding: 32, maxWidth: 400, margin: "auto", textAlign: "center" }}>
    <h2>{room ? `Join Room: ${room}` : "Join a Game"}</h2>
    <input
      placeholder="Your name"
      value={name}
      onChange={e => setName(e.target.value)}
      style={{ marginBottom: 12, width: "100%" }}
    />
    <input
      placeholder="Room code"
      value={room}
      onChange={e => setRoom(e.target.value.toUpperCase())}
      style={{ marginBottom: 12, width: "100%" }}
      maxLength={8}
    />
    <button onClick={onJoin} style={{ width: "100%" }}>Join Room</button>
    {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
    <div style={{ marginTop: 24 }}>
      <button onClick={onBack}>Back to Home</button>
    </div>
  </div>
);

export default JoinRoom;
