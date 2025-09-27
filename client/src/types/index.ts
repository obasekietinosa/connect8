export interface Player {
  id: string;
  name: string;
  words?: string[];
  connected?: boolean;
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

export interface WrongGuess {
  playerId: string;
  guess: string;
}

export interface StartGameData {
  players: Player[];
  firstTurn: string;
}

export interface RevealedWord {
  word: string;
  revealed: boolean;
}

export interface GameState {
  myWordsLeft: string[];
  opponentWordsLeft: RevealedWord[];
  isMyTurn: boolean;
}

export interface RoomStatePayload {
  players: Player[];
  confirmedPlayers: string[];
  gameStarted: boolean;
  currentTurn: string;
  playerWords: Record<string, string[]>;
  revealedWords: Record<string, number[]>;
  wrongGuesses: WrongGuess[];
  winner: string | null;
  finalWords: { id: string; words: string[] }[];
}
