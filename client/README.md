# Connect8 Client

This is the frontend for Connect8, a real-time, two-player word-guessing game developed almost exclusively by prompting AI tools.

## Setup & Running

1. Install dependencies:
   ```sh
   npm install
   ```
2. Create a `.env` file (optional) to specify the backend server URL:
   ```sh
   echo "VITE_SOCKET_URL=http://localhost:3001" > .env
   ```
   If not set, defaults to `http://localhost:3001`.
3. Start the development server:
   ```sh
   npm run dev
   ```

## How to Play
- Enter your name and a room code to join a game.
- Enter 8 logically connected words.
- Confirm your words and wait for your opponent.
- Take turns guessing each other's words. The first word is always visible; others are masked.
- Correct guesses reveal words and let you keep guessing. Wrong guesses end your turn.
- First to reveal all opponent's words (except the first) wins!

## Features
- Real-time updates via Socket.IO
- Animated feedback for correct and wrong guesses
- Play again/rematch support

## Development
- Built with React + Vite + TypeScript
- Most features implemented by prompting GitHub Copilot and AI tools.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
