// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeWordStructure,
  buildGuessFromLetters,
  sanitizeLetterInput,
} from "../src/utils/wordHelpers.js";

test("sanitizeLetterInput keeps only the last alphabetical character in uppercase", () => {
  assert.equal(sanitizeLetterInput("a"), "A");
  assert.equal(sanitizeLetterInput("ab"), "B");
  assert.equal(sanitizeLetterInput("7z"), "Z");
  assert.equal(sanitizeLetterInput("!"), "");
});

test("analyzeWordStructure returns mapping for non-space characters", () => {
  const result = analyzeWordStructure("SPIDER MAN");
  assert.deepEqual(result.tailCharacters, [
    "P",
    "I",
    "D",
    "E",
    "R",
    " ",
    "M",
    "A",
    "N",
  ]);
  assert.deepEqual(result.characterIndexToLetterIndex, {
    0: 0,
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    6: 5,
    7: 6,
    8: 7,
  });
  assert.equal(result.missingLettersCount, 8);
});

test("buildGuessFromLetters recreates the final guess while preserving spaces", () => {
  const { tailCharacters, characterIndexToLetterIndex } = analyzeWordStructure("SPIDER MAN");
  const guess = buildGuessFromLetters("S", tailCharacters, characterIndexToLetterIndex, [
    "P",
    "I",
    "D",
    "E",
    "R",
    "M",
    "A",
    "N",
  ]);
  assert.equal(guess, "SPIDER MAN");
});
