export interface WordAnalysis {
  tailCharacters: string[];
  characterIndexToLetterIndex: Record<number, number>;
  missingLettersCount: number;
}

export const sanitizeLetterInput = (value: string): string => {
  const trimmed = value.slice(-1);
  return trimmed.replace(/[^a-zA-Z]/g, "").toUpperCase();
};

export const analyzeWordStructure = (word: string): WordAnalysis => {
  const tailCharacters = word.slice(1).split("");
  const characterIndexToLetterIndex: Record<number, number> = {};
  let letterIndex = 0;
  tailCharacters.forEach((char, idx) => {
    if (char !== " ") {
      characterIndexToLetterIndex[idx] = letterIndex;
      letterIndex += 1;
    }
  });
  return {
    tailCharacters,
    characterIndexToLetterIndex,
    missingLettersCount: letterIndex,
  };
};

export const buildGuessFromLetters = (
  firstLetter: string,
  tailCharacters: string[],
  characterIndexToLetterIndex: Record<number, number>,
  letters: string[],
): string => {
  const tailGuess = tailCharacters
    .map((char, idx) =>
      char === " " ? " " : letters[characterIndexToLetterIndex[idx]] ?? "",
    )
    .join("");
  return `${firstLetter}${tailGuess}`;
};
