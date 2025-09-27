import { Server } from "socket.io";

import { emitRoomState } from "../utils/emitRoomState";
import { resetRoomState } from "../state";

type ResetGamePayload = {
  roomCode: string;
};

export const createResetGameHandler = (io: Server) =>
  ({ roomCode }: ResetGamePayload) => {
    resetRoomState(roomCode);
    io.to(roomCode).emit("game_reset");
    emitRoomState(io, roomCode);
  };
