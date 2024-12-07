import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import jwt, { JwtPayload } from "jsonwebtoken";
import { ActiveUserState } from "./lib/active-user-state";

function invalidCredentialsError(next: (err?: ExtendedError) => void) {
  next(new Error("Invalid credentials"));
}

export function middleware(
  socket: Socket,
  next: (err?: ExtendedError) => void
) {
  const token = socket.handshake.auth.token;
  if (!token) return invalidCredentialsError(next);

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    const state: ActiveUserState = { isIdle: false, isTyping: false };

    socket.data.user = { ...user, state };
  } catch (err) {
    return invalidCredentialsError(next);
  }

  next();
}
