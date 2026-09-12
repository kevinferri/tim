import { Socket } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import jwt, { JwtPayload } from "jsonwebtoken";
import { getInitialActiveUserState } from "./lib/user-change-handler";

function invalidCredentialsError(next: (err?: ExtendedError) => void) {
  next(new Error("Invalid credentials"));
}

export function middleware(
  socket: Socket,
  next: (err?: ExtendedError) => void,
) {
  const token = socket.handshake.auth.token;
  if (!token) return invalidCredentialsError(next);

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as JwtPayload;
    const state = getInitialActiveUserState();

    socket.data.user = { ...user, state };
  } catch {
    return invalidCredentialsError(next);
  }

  next();
}
