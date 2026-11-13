// No dependencies, so domain code and background jobs can throw it without pulling in auth.
const STATUS_TEXT: Record<number, string> = {
  400: "Bad request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not found",
};

/** Throw from a route (or anything it calls) to respond with this status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message = STATUS_TEXT[status] ?? "Request failed",
  ) {
    super(message);
    this.name = "ApiError";
  }
}
