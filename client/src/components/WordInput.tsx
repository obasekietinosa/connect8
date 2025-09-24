import React, { useState } from "react";

interface WordInputProps {
  onSubmit: (words: string[]) => void;
  loading: boolean;
}

const WordInput: React.FC<WordInputProps> = ({ onSubmit, loading }) => {
  const [words, setWords] = useState<string[]>(Array(8).fill(""));

  const handleChange = (i: number, value: string) => {
    setWords((prev) => prev.map((w, idx) => (idx === i ? value : w)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (words.every((w) => w.trim())) {
      onSubmit(words.map((w) => w.trim()));
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: "auto", textAlign: "center" }}>
      <h3>Enter 8 connected words</h3>
      {words.map((word, i) => (
        <input
          key={i}
          value={word}
          onChange={e => handleChange(i, e.target.value)}
          placeholder={`Word ${i + 1}`}
          style={{ display: "block", margin: "8px auto", width: "90%" }}
          maxLength={20}
          required
        />
      ))}
      <button type="submit" disabled={loading} style={{ marginTop: 16 }}>
        {loading ? "Submitting..." : "Submit Words"}
      </button>
    </form>
  );
};

export default WordInput;
