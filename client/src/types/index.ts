export interface Player {
  id: string;
  name: string;
  socketId: string;
  connected: boolean;
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
  timeout?: boolean;
  turnDeadline?: number | null;
}

export interface WrongGuess {
  playerId: string;
  guess: string;
}

export interface StartGameData {
  players: Player[];
  firstTurn: string;
  turnDeadline: number | null;
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
  turnDeadline: number | null;
}
