import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { Server, Socket } from "socket.io";

import {
  confirmedPlayers,
  currentTurn,
  disconnectedPlayers,
  ensureRoomState,
  gameStatus,
  playerWords,
  revealedWords,
  rooms,
  socketToPlayer,
  clearTurnTimer,
  turnDeadlines,
  turnTimeouts,
  wrongGuesses,
} from "../state";
import { createConfirmWordsHandler } from "../handlers/confirmWords";
import { createJoinRoomHandler } from "../handlers/joinRoom";
import { createMakeGuessHandler } from "../handlers/makeGuess";
import { createResetGameHandler } from "../handlers/resetGame";
import { createDisconnectHandler } from "../handlers/disconnect";
import type { Player } from "../types";

type EmittedEvent = {
  room: string;
  event: string;
  payload: unknown;
};

const ROOM_CODE = "HANDLER_ROOM";

const createMockIo = () => {
  const events: EmittedEvent[] = [];
  const io = {
    to: (room: string) => ({
      emit: (event: string, payload?: unknown) => {
        events.push({ room, event, payload });
      },
    }),
  } as unknown as Server;

  return { io, events };
};

const createMockSocket = (id: string) => {
  const emitted: { event: string; payload: unknown }[] = [];
  const joined: string[] = [];

  const socket = {
    id,
    emit: (event: string, payload?: unknown) => {
      emitted.push({ event, payload });
    },
    join: (room: string) => {
      joined.push(room);
    },
  } as unknown as Socket;

  return { socket, emitted, joined };
};

const clearRoomState = (roomCode: string) => {
  clearTurnTimer(roomCode);
  delete rooms[roomCode];
  delete playerWords[roomCode];
  delete confirmedPlayers[roomCode];
  delete revealedWords[roomCode];
  delete wrongGuesses[roomCode];
  delete currentTurn[roomCode];
  delete gameStatus[roomCode];
  delete disconnectedPlayers[roomCode];
  delete turnDeadlines[roomCode];
  delete turnTimeouts[roomCode];
  for (const socketId of Object.keys(socketToPlayer)) {
    if (socketToPlayer[socketId].roomCode === roomCode) {
      delete socketToPlayer[socketId];
    }
  }
};

const addPlayersToRoom = (roomCode: string, players: Player[]) => {
  rooms[roomCode] = players.map((player) => ({ ...player }));
  for (const player of players) {
    playerWords[roomCode][player.id] = playerWords[roomCode][player.id] || [];
    revealedWords[roomCode][player.id] = revealedWords[roomCode][player.id] || [];
  }
};

beforeEach(() => {
  ensureRoomState(ROOM_CODE);
});

afterEach(() => {
  clearRoomState(ROOM_CODE);
});

describe("createJoinRoomHandler", () => {
  it("adds a new player and broadcasts the updated room", () => {
    const { io, events } = createMockIo();
    const { socket, joined } = createMockSocket("socket-1");

    const joinHandler = createJoinRoomHandler(io, socket);

    joinHandler({ roomCode: ROOM_CODE, playerName: "Alice" });

    assert.equal(rooms[ROOM_CODE].length, 1);
    assert.deepEqual(rooms[ROOM_CODE][0], {
      id: "socket-1",
      name: "Alice",
      connected: true,
      socketId: "socket-1",
    });
    assert.deepEqual(playerWords[ROOM_CODE]["socket-1"], []);
    assert.deepEqual(revealedWords[ROOM_CODE]["socket-1"], []);
    assert.equal(confirmedPlayers[ROOM_CODE].has("socket-1"), false);
    assert.deepEqual(socketToPlayer["socket-1"], {
      roomCode: ROOM_CODE,
      playerId: "socket-1",
    });
    assert.deepEqual(joined, [ROOM_CODE]);

    const playerUpdates = events.filter((event) => event.event === "players_updated");
    assert.equal(playerUpdates.length, 1);
    assert.deepEqual(playerUpdates[0], {
      room: ROOM_CODE,
      event: "players_updated",
      payload: rooms[ROOM_CODE],
    });

    const roomStates = events.filter((event) => event.event === "room_state");
    assert.equal(roomStates.length, 1);
    assert.deepEqual(roomStates[0], {
      room: ROOM_CODE,
      event: "room_state",
      payload: {
        players: rooms[ROOM_CODE],
        confirmedPlayers: [],
        gameStarted: false,
        currentTurn: "",
        playerWords: {
          "socket-1": [],
        },
        revealedWords: {
          "socket-1": [],
        },
        wrongGuesses: [],
        winner: null,
        finalWords: [],
        turnDeadline: null,
      },
    });
  });
});

describe("createConfirmWordsHandler", () => {
  const alice: Player = {
    id: "alice",
    name: "Alice",
    connected: true,
    socketId: "socket-1",
  };
  const bob: Player = {
    id: "bob",
    name: "Bob",
    connected: true,
    socketId: "socket-2",
  };

  beforeEach(() => {
    addPlayersToRoom(ROOM_CODE, [alice, bob]);
  });

  it("records confirmed words and starts the game when both players confirm", () => {
    const { io, events } = createMockIo();
    const aliceSocket = createMockSocket("socket-1");
    const bobSocket = createMockSocket("socket-2");

    socketToPlayer["socket-1"] = { roomCode: ROOM_CODE, playerId: "alice" };
    socketToPlayer["socket-2"] = { roomCode: ROOM_CODE, playerId: "bob" };

    const confirmAlice = createConfirmWordsHandler(io, aliceSocket.socket);
    const confirmBob = createConfirmWordsHandler(io, bobSocket.socket);

    confirmAlice({ roomCode: ROOM_CODE, words: ["Alpha", "Beta"] });
    assert.equal(confirmedPlayers[ROOM_CODE].has("alice"), true);
    assert.deepEqual(playerWords[ROOM_CODE]["alice"], ["Alpha", "Beta"]);

    confirmBob({ roomCode: ROOM_CODE, words: ["Gamma", "Delta"] });

    assert.equal(confirmedPlayers[ROOM_CODE].has("bob"), true);
    assert.deepEqual(playerWords[ROOM_CODE]["bob"], ["Gamma", "Delta"]);

    assert.equal(gameStatus[ROOM_CODE].started, true);
    assert.equal(gameStatus[ROOM_CODE].winner, null);
    assert.ok(["alice", "bob"].includes(currentTurn[ROOM_CODE]));

    assert.deepEqual(revealedWords[ROOM_CODE]["alice"], [0]);
    assert.deepEqual(revealedWords[ROOM_CODE]["bob"], [0]);

    const playerConfirmedEvents = events.filter((event) => event.event === "player_confirmed");
    assert.equal(playerConfirmedEvents.length, 2);
    assert.deepEqual(playerConfirmedEvents.map((event) => event.payload), ["alice", "bob"]);

    const startGameEvents = events.filter((event) => event.event === "start_game");
    assert.equal(startGameEvents.length, 1);
    const startGamePayload = startGameEvents[0].payload as {
      players: Player[];
      firstTurn: string;
      turnDeadline: number | null;
    };
    assert.equal(startGamePayload.players.length, 2);
    assert.ok(["alice", "bob"].includes(startGamePayload.firstTurn));
    assert.equal(typeof startGamePayload.turnDeadline, "number");
    assert.equal(typeof turnDeadlines[ROOM_CODE], "number");

    const roomStates = events.filter((event) => event.event === "room_state");
    assert.equal(roomStates.length >= 2, true);
  });
});

describe("createMakeGuessHandler", () => {
  const alice: Player = {
    id: "alice",
    name: "Alice",
    connected: true,
    socketId: "socket-1",
  };
  const bob: Player = {
    id: "bob",
    name: "Bob",
    connected: true,
    socketId: "socket-2",
  };

  beforeEach(() => {
    addPlayersToRoom(ROOM_CODE, [alice, bob]);
    playerWords[ROOM_CODE]["alice"] = ["Anchor", "Bridge"];
    playerWords[ROOM_CODE]["bob"] = ["Castle", "Dragon"];
    revealedWords[ROOM_CODE]["alice"] = [];
    revealedWords[ROOM_CODE]["bob"] = [];
    wrongGuesses[ROOM_CODE] = [];
    gameStatus[ROOM_CODE] = { started: true, winner: null, finalWords: [] };
  });

  it("marks correct guesses and keeps the turn", () => {
    const { io, events } = createMockIo();
    const guessHandler = createMakeGuessHandler(io);

    guessHandler({
      roomCode: ROOM_CODE,
      playerId: "alice",
      guess: "Castle",
      viewOpponent: true,
    });

    const guessEvents = events.filter((event) => event.event === "guess_result");
    assert.equal(guessEvents.length, 1);
    const payload = guessEvents[0].payload as {
      correct: boolean;
      index?: number;
      nextTurn: string;
      revealed: number[];
      turnDeadline: number | null;
    };

    assert.equal(payload.correct, true);
    assert.equal(payload.index, 0);
    assert.deepEqual(payload.revealed, [0]);
    assert.equal(payload.nextTurn, "alice");
    assert.equal(typeof payload.turnDeadline, "number");
    assert.equal(currentTurn[ROOM_CODE], "alice");
    assert.deepEqual(revealedWords[ROOM_CODE]["bob"], [0]);
    assert.deepEqual(wrongGuesses[ROOM_CODE], []);
  });

  it("records wrong guesses and switches the turn", () => {
    const { io, events } = createMockIo();
    const guessHandler = createMakeGuessHandler(io);

    guessHandler({
      roomCode: ROOM_CODE,
      playerId: "alice",
      guess: "Elephant",
      viewOpponent: true,
    });

    const guessEvents = events.filter((event) => event.event === "guess_result");
    assert.equal(guessEvents.length, 1);
    const payload = guessEvents[0].payload as {
      correct: boolean;
      nextTurn: string;
      revealed: number[];
      turnDeadline: number | null;
    };

    assert.equal(payload.correct, false);
    assert.equal(payload.nextTurn, "bob");
    assert.deepEqual(payload.revealed, []);
    assert.equal(typeof payload.turnDeadline, "number");
    assert.equal(currentTurn[ROOM_CODE], "bob");
    assert.deepEqual(wrongGuesses[ROOM_CODE], [{ playerId: "alice", guess: "Elephant" }]);
  });
});

describe("createResetGameHandler", () => {
  beforeEach(() => {
    playerWords[ROOM_CODE]["alice"] = ["Alpha"];
    confirmedPlayers[ROOM_CODE].add("alice");
    revealedWords[ROOM_CODE]["alice"] = [0, 1];
    wrongGuesses[ROOM_CODE] = [{ playerId: "bob", guess: "Foo" }];
    currentTurn[ROOM_CODE] = "alice";
    gameStatus[ROOM_CODE] = { started: true, winner: "alice", finalWords: [] };
  });

  it("resets the room state and notifies clients", () => {
    const { io, events } = createMockIo();
    const resetHandler = createResetGameHandler(io);

    resetHandler({ roomCode: ROOM_CODE });

    assert.deepEqual(playerWords[ROOM_CODE]["alice"], []);
    assert.equal(confirmedPlayers[ROOM_CODE].size, 0);
    assert.deepEqual(revealedWords[ROOM_CODE]["alice"], []);
    assert.deepEqual(wrongGuesses[ROOM_CODE], []);
    assert.equal(currentTurn[ROOM_CODE], "");
    assert.equal(gameStatus[ROOM_CODE].started, false);

    const resetEvents = events.filter((event) => event.event === "game_reset");
    assert.equal(resetEvents.length, 1);
    assert.deepEqual(resetEvents[0].payload, undefined);

    const roomStates = events.filter((event) => event.event === "room_state");
    assert.equal(roomStates.length, 1);
  });
});

describe("createDisconnectHandler", () => {
  const alice: Player = {
    id: "alice",
    name: "Alice",
    connected: true,
    socketId: "socket-1",
  };
  const bob: Player = {
    id: "bob",
    name: "Bob",
    connected: true,
    socketId: "socket-2",
  };

  beforeEach(() => {
    addPlayersToRoom(ROOM_CODE, [alice, bob]);
    playerWords[ROOM_CODE]["alice"] = ["Alpha"];
    revealedWords[ROOM_CODE]["alice"] = [0];
    confirmedPlayers[ROOM_CODE].add("alice");
    socketToPlayer["socket-1"] = { roomCode: ROOM_CODE, playerId: "alice" };
  });

  it("stores a disconnect snapshot and broadcasts the updated room", () => {
    const { io, events } = createMockIo();
    const { socket } = createMockSocket("socket-1");

    const disconnectHandler = createDisconnectHandler(io, socket);
    disconnectHandler();

    assert.equal(rooms[ROOM_CODE][0].connected, false);
    assert.deepEqual(disconnectedPlayers[ROOM_CODE]["alice"], {
      playerId: "alice",
      name: "Alice",
      words: ["Alpha"],
      confirmed: true,
      revealed: [0],
    });
    assert.equal(socketToPlayer["socket-1"], undefined);

    const playerUpdates = events.filter((event) => event.event === "players_updated");
    assert.equal(playerUpdates.length, 1);
    assert.deepEqual(playerUpdates[0].payload, rooms[ROOM_CODE]);

    const roomStates = events.filter((event) => event.event === "room_state");
    assert.equal(roomStates.length, 1);
  });
});

