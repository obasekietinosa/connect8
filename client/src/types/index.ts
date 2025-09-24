export interface Player {
  id: string;
  name: string;
  words?: string[];
}

export interface GameEndData {
  winner: string;
  players: { id: string; words: string[] }[];
}

export interface GuessResult {
  correct: boolean;
  index?: number;
  guess: string;
  nextTurn: string;
  revealed: number[];
  playerId: string;
}

export interface StartGameData {
  players: Player[];
  firstTurn: string;
}
