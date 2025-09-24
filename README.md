# Connect8

Connect8 is a real-time, two-player word-guessing game. It was developed almost exclusively by prompting GitHub Copilot and AI tools, with minimal manual coding.

## How to Play

- Two players join a room by entering a name and room code.
- Each player enters a sequence of 8 logically connected words.
- The first word of each sequence is revealed to the opponent; the rest are shown as first letter + underscores (with spacing for clarity).
- Players take turns guessing the opponent’s words. Correct guesses reveal the word and allow the player to continue their turn. A wrong guess ends the turn.
- The first player to reveal all of the opponent’s words (except the first, which is always visible) wins.
- The game is case-insensitive and requires exact word length matches.
- After a game ends, players can play again in the same room.

## Features
- Real-time lobby and player sync using Socket.IO
- Word entry and confirmation UI
- Turn-based guessing with visual feedback and celebratory animations
- Game state and word reveals synced in real time
- Play-again/rematch support

## Development
- Built with React + Vite + TypeScript (client) and Express + Socket.IO (server)
- Most of the code and features were implemented by prompting AI tools, with a focus on rapid prototyping and iteration.

## Running the Game
See the `client/README.md` and `server/README.md` for setup and run instructions for each part.
