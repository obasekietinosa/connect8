import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

import {
  confirmedPlayers,
  currentTurn,
  disconnectedPlayers,
  ensureRoomState,
  gameStatus,
  playerWords,
  resetRoomState,
  revealedWords,
  rooms,
  wrongGuesses,
} from "../state";
import type { RoomStatus } from "../types";

const ROOM_CODE = "TEST_ROOM";

const clearRoomState = (roomCode: string) => {
  delete rooms[roomCode];
  delete playerWords[roomCode];
  delete confirmedPlayers[roomCode];
  delete revealedWords[roomCode];
  delete wrongGuesses[roomCode];
  delete currentTurn[roomCode];
  delete gameStatus[roomCode];
  delete disconnectedPlayers[roomCode];
};

beforeEach(() => {
  ensureRoomState(ROOM_CODE);
});

afterEach(() => {
  clearRoomState(ROOM_CODE);
});

const getDefaultGameStatus = (): RoomStatus => ({ started: false, winner: null, finalWords: [] });

describe("ensureRoomState", () => {
  it("initializes empty collections for a new room", () => {
    assert.deepEqual(rooms[ROOM_CODE], []);
    assert.deepEqual(playerWords[ROOM_CODE], {});
    assert.ok(confirmedPlayers[ROOM_CODE] instanceof Set);
    assert.equal(confirmedPlayers[ROOM_CODE].size, 0);
    assert.deepEqual(revealedWords[ROOM_CODE], {});
    assert.deepEqual(wrongGuesses[ROOM_CODE], []);
    assert.deepEqual(gameStatus[ROOM_CODE], getDefaultGameStatus());
    assert.deepEqual(disconnectedPlayers[ROOM_CODE], {});
    assert.equal(currentTurn[ROOM_CODE], undefined);
  });

  it("preserves existing state containers", () => {
    const initialPlayers = confirmedPlayers[ROOM_CODE];
    initialPlayers.add("player-1");

    ensureRoomState(ROOM_CODE);

    assert.strictEqual(confirmedPlayers[ROOM_CODE], initialPlayers);
    assert.equal(confirmedPlayers[ROOM_CODE].has("player-1"), true);
  });
});

describe("resetRoomState", () => {
  it("clears per-round data while keeping room structures", () => {
    playerWords[ROOM_CODE]["p1"] = ["alpha", "beta"];
    revealedWords[ROOM_CODE]["p1"] = [0, 2];
    confirmedPlayers[ROOM_CODE].add("p1");
    wrongGuesses[ROOM_CODE] = [{ playerId: "p2", guess: "gamma" }];
    currentTurn[ROOM_CODE] = "p1";
    gameStatus[ROOM_CODE] = {
      started: true,
      winner: "p2",
      finalWords: [{ id: "p2", words: ["delta"] }],
    };

    resetRoomState(ROOM_CODE);

    assert.deepEqual(playerWords[ROOM_CODE]["p1"], []);
    assert.equal(confirmedPlayers[ROOM_CODE].size, 0);
    assert.deepEqual(revealedWords[ROOM_CODE]["p1"], []);
    assert.deepEqual(wrongGuesses[ROOM_CODE], []);
    assert.equal(currentTurn[ROOM_CODE], "");
    assert.deepEqual(gameStatus[ROOM_CODE], getDefaultGameStatus());
  });
});
