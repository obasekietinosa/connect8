export type Player = { id: string; name: string; connected: boolean };

export type Room = Record<string, Player[]>;

export type RoomStatus = {
  started: boolean;
  winner: string | null;
  finalWords: { id: string; words: string[] }[];
};

export type DisconnectedPlayerSnapshot = {
  name: string;
  words: string[];
  confirmed: boolean;
  revealed: number[];
};
