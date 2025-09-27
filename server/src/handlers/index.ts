import { Server, Socket } from "socket.io";

import { createConfirmWordsHandler } from "./confirmWords";
import { createDisconnectHandler } from "./disconnect";
import { createJoinRoomHandler } from "./joinRoom";
import { createMakeGuessHandler } from "./makeGuess";
import { createResetGameHandler } from "./resetGame";

export const registerSocketHandlers = (io: Server, socket: Socket) => {
  socket.on("join_room", createJoinRoomHandler(io, socket));
  socket.on("confirm_words", createConfirmWordsHandler(io, socket));
  socket.on("make_guess", createMakeGuessHandler(io));
  socket.on("reset_game", createResetGameHandler(io));
  socket.on("disconnect", createDisconnectHandler(io, socket));
};
