import React from "react";

interface ShareRoomProps {
  room: string;
  shareUrl: string;
  onShare: () => void;
}

const ShareRoom: React.FC<ShareRoomProps> = ({ room, shareUrl, onShare }) => (
  <div style={{ margin: "16px 0" }}>
    <button onClick={onShare}>Share Room Link</button>
    <div style={{ fontSize: 12, color: "#888" }}>
      or share code: <b>{room}</b>
    </div>
  </div>
);

export default ShareRoom;
