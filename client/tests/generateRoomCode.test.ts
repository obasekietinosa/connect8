// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import { generateRoomCode } from "../src/utils/generateRoomCode.js";

const allowedCharacters = new Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789".split(""));

test("generateRoomCode returns uppercase codes of default length", () => {
  const code = generateRoomCode();
  assert.equal(code.length, 6);
  assert.equal(code, code.toUpperCase());
  for (const char of code) {
    assert.ok(allowedCharacters.has(char));
  }
});

test("generateRoomCode respects the requested length", () => {
  const lengths = [1, 4, 8, 12];
  for (const length of lengths) {
    const code = generateRoomCode(length);
    assert.equal(code.length, length);
  }
});
